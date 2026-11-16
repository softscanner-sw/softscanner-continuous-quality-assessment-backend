import path from 'path';
import { Assessment, AssessmentEngine, NormalizationInfo } from "../core/assessment/assessment-core";
import { Goal } from "../core/goals/goals";
import { AbstractInstrumentationBundle, ApplicationInstrumentationMetadata } from "../core/instrumentation/instrumentation-core";
import { BenchmarkEntry, BenchmarkStore } from "../core/metrics/benchmarks";
import { Metric } from "../core/metrics/metrics-core";
import { TelemetryCollector, TelemetryStorageEndpoint, TelemetryStorageEndpointType } from "../core/telemetry/telemetry";
import { MongoDBBenchmarkPersistence } from "../modules/telemetry/datasources/databases/mongodb/mongodb-benchmark-persistence";
import { MetricsService } from "./metrics.service";
import { IProgressTrackable, ProgressTracker } from "./progress-tracker.service";

/** Version identifier of the normalization stored in assessment records. */
export const NORMALIZATION_VERSION = 'pass23-polarity-v1';

/**
 * Event published at the end of each assessment cycle.
 */
export interface AssessmentCycleEvent {
    status: 'completed' | 'failed';
    cycle: number;
    timestamp: string;
    bundle: string;
    telemetryCount?: number;
    error?: string;
}

/**
 * Benchmark stores shared by all assessments of the backend process, one per telemetry database,
 * so that the benchmark state of an application is consistent across its assessments.
 */
const sharedBenchmarkStores = new Map<string, BenchmarkStore>();
function benchmarkStoreFor(endpoint: TelemetryStorageEndpoint): BenchmarkStore {
    const key = `${endpoint.uri}|${endpoint.name}`;
    if (!sharedBenchmarkStores.has(key)) {
        sharedBenchmarkStores.set(key, endpoint.type === TelemetryStorageEndpointType.DATABASE && endpoint.uri.includes('mongo')
            ? new BenchmarkStore(new MongoDBBenchmarkPersistence(endpoint))
            : new BenchmarkStore());
    }
    return sharedBenchmarkStores.get(key)!;
}

/**
 * Service to manage the telemetry collection, metric computation, and quality assessment process
 * of ONE assessment (one application and instrumentation bundle).
 *
 * Each telemetry flush that contains telemetry of the assessed bundle triggers one assessment cycle:
 *   1. the collector has persisted the telemetry batch (before emitting `dataFlushed`);
 *   2. the metrics are recomputed over all telemetry of the bundle (awaited);
 *   3. the benchmark of each metric is resolved in the application's benchmark scope;
 *   4. the metric values are normalized (polarity-aware) and aggregated per goal;
 *   5. one assessment record per goal is persisted;
 *   6. the completed assessment is published to listeners (dashboard stream).
 * Cycles are serialized. A failing step fails the cycle: nothing is persisted or published as completed,
 * and a `failed` event is published instead.
 */
export class QualityAssessmentService implements IProgressTrackable {
    /**
     * Engine responsible for performing assessments on quality goals using computed metrics.
     */
    private assessmentEngine: AssessmentEngine = new AssessmentEngine();

    /**
     * Listeners notified when a cycle completes (updated goals) and when a cycle fails.
     */
    private assessmentUpdateListeners: ((goals: Goal[], event: AssessmentCycleEvent) => void)[] = [];
    private assessmentFailureListeners: ((event: AssessmentCycleEvent) => void)[] = [];

    /**
     * Service responsible for computing metrics from telemetry data.
     */
    private metricsService: MetricsService;

    /**
     * Benchmark store (injected, or shared per telemetry database).
     */
    private benchmarkStore?: BenchmarkStore;

    /**
     * Metadata about the application being instrumented, including its name, type, and bundle information.
     */
    private appInstrumentationMetadata?: ApplicationInstrumentationMetadata;

    /**
     * Collector responsible for gathering telemetry data from the instrumented application.
     */
    private collector?: TelemetryCollector;

    /**
     * List of quality goals selected for assessment. Each goal contains associated metrics and assessments.
     */
    private selectedGoals: Goal[] = [];

    /**
     * The progress tracker for reporting progress during the quality assessment process.
     */
    private progressTracker!: ProgressTracker;

    private cycleCount = 0;
    private queue: Promise<unknown> = Promise.resolve();
    private started = false;
    private lastEvent?: AssessmentCycleEvent;

    constructor(options: { metricsService?: MetricsService, benchmarkStore?: BenchmarkStore } = {}) {
        this.metricsService = options.metricsService ?? new MetricsService();
        this.benchmarkStore = options.benchmarkStore;
    }

    /**
     * Sets the progress tracker for reporting progress during the quality assessment process.
     * @param progressTracker - An instance of the ProgressTracker.
     */
    setProgressTracker(progressTracker: ProgressTracker): void {
        this.progressTracker = progressTracker;
        this.metricsService.setProgressTracker(progressTracker);
    }

    /**
     * Sets the context for the quality assessment process, including application instrumentation metadata,
     * selected goals, and the telemetry collector.
     */
    setContext(appInstrumentationMetadata: ApplicationInstrumentationMetadata, goals: Goal[], collector: TelemetryCollector) {
        this.appInstrumentationMetadata = appInstrumentationMetadata;
        this.selectedGoals = goals;
        this.collector = collector;
    }

    /** The event of the last completed or failed cycle. */
    get status(): AssessmentCycleEvent | undefined {
        return this.lastEvent;
    }

    private get bundleName(): string {
        return path.basename(this.appInstrumentationMetadata?.bundleName ?? '');
    }

    /** Benchmark scope of the assessment: the normalized application name of the bundle. */
    private get benchmarkScope(): string {
        return AbstractInstrumentationBundle.extractNormalizedAppNameFromBundle(this.bundleName);
    }

    private selectedMetrics(): Metric[] {
        const metricSet = new Set<Metric>();
        this.selectedGoals.forEach(goal => goal.metrics.forEach(metric => metricSet.add(metric)));
        return Array.from(metricSet);
    }

    /**
     * Starts the assessment: every telemetry flush containing telemetry of the assessed bundle triggers one cycle.
     * @returns A promise resolved with the goals after the first completed cycle, or rejected if the first cycle fails.
     */
    async assessQualityGoals(): Promise<Goal[]> {
        if (!this.progressTracker) {
            throw new Error('Quality Assessment Service: Progress tracker not set in QualityAssessmentService.');
        }
        if (!this.collector || this.selectedGoals.length === 0 || !this.appInstrumentationMetadata) {
            throw new Error("Quality Assessment Service: Collector or goals not set.");
        }
        if (this.started) {
            throw new Error("Quality Assessment Service: assessment already started.");
        }
        this.started = true;

        this.progressTracker.notifyProgress('Quality Assessment Service: Starting quality goal assessment...');
        console.log('Quality Assessment Service: Starting quality goal assessment...');

        return new Promise<Goal[]>((resolve, reject) => {
            let first = true;
            this.collector!.on('dataFlushed', (storageEndpoints: TelemetryStorageEndpoint[], flushedBundles?: string[]) => {
                // Ignore flushes known to contain no telemetry of this assessment's bundle
                // (an empty or missing bundle list means the provenance is unknown: the cycle runs)
                if (flushedBundles && flushedBundles.length > 0 && !flushedBundles.includes(this.bundleName)) return;
                this.queue = this.queue.then(() => this.runCycle(storageEndpoints)).then(assessments => {
                    if (!first) return;
                    first = false;
                    if (assessments) resolve(this.selectedGoals);
                    else reject(new Error(this.lastEvent?.error ?? 'Quality Assessment Service: first assessment cycle failed'));
                });
            });
        });
    }

    /**
     * Runs one assessment cycle (see the class documentation).
     * @returns The persisted assessments, or undefined if the cycle failed (a `failed` event is then published).
     */
    async runCycle(storageEndpoints: TelemetryStorageEndpoint[]): Promise<Assessment[] | undefined> {
        const cycle = ++this.cycleCount;
        const timestamp = new Date().toISOString();
        const bundle = this.bundleName;
        try {
            const storageEndpoint = storageEndpoints?.[0];
            if (!storageEndpoint) throw new Error('Quality Assessment Service: no telemetry storage endpoint');

            this.progressTracker.notifyProgress(`Quality Assessment Service: Assessment cycle ${cycle} started...`);

            // 2. Recompute the metrics over the bundle's telemetry (awaited)
            const { metrics, telemetryCount } = await this.metricsService.computeCycle(
                storageEndpoint, this.appInstrumentationMetadata!, this.selectedMetrics(), timestamp);

            // 3. Resolve the benchmark of each metric in the application's benchmark scope
            const entries: BenchmarkEntry[] = [];
            this.selectedGoals.forEach(goal => goal.metrics.forEach(metric => {
                const interpreter = metric.getInterpter(goal);
                if (interpreter) entries.push({
                    acronym: metric.acronym, raw: metric.value, observed: interpreter.observed,
                    initial: interpreter.initialBenchmark, kind: interpreter.benchmarkKind,
                });
            }));
            const store = this.benchmarkStore ?? benchmarkStoreFor(storageEndpoint);
            const benchmarks = await store.resolve(this.benchmarkScope, entries, timestamp);
            const normalization: NormalizationInfo = {
                method: 'ratio-to-benchmark', version: NORMALIZATION_VERSION,
                benchmarkMode: store.mode, benchmarkScope: `application:${this.benchmarkScope}`,
            };

            // 4. Normalize and aggregate
            this.progressTracker.notifyProgress('Quality Assessment Service: Computing new assessments...');
            const assessments = this.assessmentEngine.assess({
                metadata: this.appInstrumentationMetadata!.appMetadata,
                selectedGoals: this.selectedGoals
            }, metrics, { timestamp, cycle, telemetryCount, benchmarks, normalization });

            // 5. Persist one consistent record per goal (failures propagate)
            await this.collector!.storeAssessments(assessments, { appInstrumentationMetadata: this.appInstrumentationMetadata });

            // 6. Attach and publish the completed assessment
            this.selectedGoals.forEach(goal => {
                const assessment = assessments.find(a => a.goal.name === goal.name);
                if (assessment) goal.addAssessment(assessment);
            });
            this.lastEvent = { status: 'completed', cycle, timestamp, bundle, telemetryCount };
            console.log(`Quality Assessment Service: Cycle ${cycle} completed and stored for bundle ${bundle}`);
            this.progressTracker.notifyProgress(`Quality Assessment Service: Assessment cycle ${cycle} completed.`);
            this.notifyAssessmentUpdated(this.selectedGoals, this.lastEvent);
            return assessments;
        } catch (error: any) {
            this.lastEvent = { status: 'failed', cycle, timestamp, bundle, error: error?.message ?? String(error) };
            console.error(`Quality Assessment Service: Cycle ${cycle} failed for bundle ${bundle}:`, error);
            this.progressTracker.notifyProgress(`Quality Assessment Service: Assessment cycle ${cycle} failed: ${this.lastEvent.error}`);
            this.assessmentFailureListeners.forEach(listener => listener(this.lastEvent!));
            return undefined;
        }
    }

    /**
     * Registers an event listener to notify when new (completed) assessments are available.
     * @param listener - The callback function to execute when assessments are updated.
     */
    onAssessmentUpdated(listener: (goals: Goal[], event: AssessmentCycleEvent) => void): void {
        this.assessmentUpdateListeners.push(listener);
    }

    /**
     * Registers an event listener to notify when an assessment cycle fails.
     */
    onAssessmentFailed(listener: (event: AssessmentCycleEvent) => void): void {
        this.assessmentFailureListeners.push(listener);
    }

    /**
     * Removes a listener registered with onAssessmentUpdated or onAssessmentFailed.
     */
    removeListener(listener: Function): void {
        this.assessmentUpdateListeners = this.assessmentUpdateListeners.filter(l => l !== listener);
        this.assessmentFailureListeners = this.assessmentFailureListeners.filter(l => l !== listener);
    }

    /**
     * Notifies all registered listeners about new assessments for the selected goals.
     */
    private notifyAssessmentUpdated(goals: Goal[], event: AssessmentCycleEvent): void {
        console.log('Quality Assessment Service: New assessments available, notifying listeners...');
        this.assessmentUpdateListeners.forEach(listener => listener(goals, event));
    }
}
