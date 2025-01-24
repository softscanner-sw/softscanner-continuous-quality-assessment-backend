import cors from 'cors';
import express, { Request, Response } from 'express';
import { ApplicationMetadata } from '../core/application/application-metadata';
import { InstrumentationService } from '../services/instrumentation.service';
import { MetricsService } from '../services/metrics.service';
import { ProgressTracker } from '../services/progress-tracker.service';
import { QualityModelService } from '../services/quality-model.service';
import { TelemetryService } from '../services/telemetry.service';

// Initialize the app
const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Shared ProgressTracker instance
const progressTracker = new ProgressTracker();

// The services necessary to interact with backend components
const modelService = new QualityModelService();
const instrumentationService = new InstrumentationService();
const telemetryService = new TelemetryService();
const metricsService = new MetricsService();

// Passing the shared tracker instance to all services
instrumentationService.setProgressTracker(progressTracker);
telemetryService.setProgressTracker(progressTracker);
metricsService.setProgressTracker(progressTracker);

// Assessment Context Store
const assessmentContext: {
    [assessmentId: string]: {
        metadata: ApplicationMetadata;
        selectedGoals: { name: string; metrics: any[] }[];
    };
} = {};


/**
 * Endpoint to retrieve the quality model and goals
 */
app.get('/api/quality-model', (req: Request, res: Response) => {
    res.json(modelService.ssqmm.qualityModel.toJSON());
});

/**
 * Endpoint to receive selected goals and application metadata and perform quality assessment
 */
app.post('/api/assessment', async (req: Request, res: Response) => {
    const { metadata, selectedGoals } = req.body;

    // console.log('Received Raw Metadata:', JSON.stringify(metadata, null, 2));

    // Ensure the metadata object is properly structured
    if (!metadata || !selectedGoals) {
        res.status(400).send({ error: 'Invalid request payload' });
        return;
    }

    // Deserialize application metadata
    const appMetadata = new ApplicationMetadata(
        metadata.name,
        metadata.type,
        metadata.technology,
        metadata.path,
        metadata.url
    );

    // Log received data
    console.log('Server: Received Application Metadata:', appMetadata);
    console.log('Server: Received Selected Goals:', selectedGoals);

    // Generate a unique assessment ID
    const assessmentId = new Date().getTime().toString();

    // Store context
    assessmentContext[assessmentId] = {
        metadata: appMetadata,
        selectedGoals: selectedGoals.map((goal: string) => ({
            name: goal,
            metrics: modelService.extractRequiredMetrics(modelService.ssqmm.goals, [goal])
        }))
    };

    // Respond immediately with the assessment ID
    res.status(202).send({
        message: 'Assessment started successfully!',
        assessmentId: assessmentId,  // Send unique ID back to the client
        progressEndpoint: `/api/progress?assessmentId=${assessmentId}`,
        metricsEndpoint: `/api/metrics?assessmentId=${assessmentId}`
    });

    // Asynchronously execute the instrumentation process
    (async () => {
        try {
            // Trigger instrumentation
            const bundleName = await instrumentationService.instrument(appMetadata, selectedGoals);

            // Setup telemetry collector
            const collector = await telemetryService.setupTelemetryCollector(appMetadata, bundleName);

            // Start metrics computation
            await metricsService.computeMetrics(collector, selectedGoals);

            progressTracker.notifyProgress('Assessment process completed successfully.');
        } catch (error: any) {
            console.error('Error during assessment:', error);
            progressTracker.notifyProgress(`Assessment process failed: ${error.message}`);
            res.status(500).send({ error: `Assessment process failed: ${error.message}` });
        }
    })();
});

/**
 * New endpoint to stream assessment progress updates via Server-Sent Events (SSE)
 * for an ongoing assessment
 */
app.get('/api/progress', (req: Request, res: Response) => {

    const { assessmentId } = req.query;

    if (!assessmentId || !assessmentContext[assessmentId as string]) {
        res.status(400).send({ error: 'Invalid or expired assessment ID' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Subscribe to progress updates
    progressTracker.onProgress((message) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', message })}\n\n`);
    });

    req.on('close', () => {
        console.log('Server: Client disconnected from progress stream');
        res.end();
    });
});

/**
 * New endpoint to stream new metric values via Server-Sent Events (SSE)
 * for an ongoing assessment
 */
app.get('/api/metrics', (req: Request, res: Response) => {
    const { assessmentId } = req.query;

    if (!assessmentId || !assessmentContext[assessmentId as string]) {
        res.status(400).send({ error: 'Invalid or expired assessment ID' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const context = assessmentContext[assessmentId as string];

    metricsService.onMetricsUpdated((metrics) => {
        const selectedGoalsWithMetrics = context.selectedGoals.map(goal => ({
            name: goal.name,
            metrics: goal.metrics.map(metric => ({
                name: metric.name,
                acronym: metric.acronym,
                description: metric.description,
                value: metrics.find(m => m.acronym === metric.acronym)?.value || 0,
                unit: metric.unit,
                history: metrics.find(m => m.acronym === metric.acronym)?.history || []
            }))
        }));

        const responseData = {
            metadata: context.metadata,
            selectedGoals: selectedGoalsWithMetrics
        };

        res.write(`data: ${JSON.stringify(responseData)}\n\n`);
    });

    req.on('close', () => {
        console.log('Server: Client disconnected from metrics stream');
        res.end();
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server: Server is running on http://localhost:${port}`);
});
