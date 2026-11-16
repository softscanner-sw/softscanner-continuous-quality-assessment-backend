import { existsSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { ApplicationMetadata } from "../../../core/application/application-metadata";
import { BackendInstrumentationBundleInjector, InstrumentationBundle } from "../../../core/instrumentation/instrumentation-core";
import { countNodeRequires, InstrumentationInjectionError, planNodeStartScriptInjection, replaceStartScript, requiredPaths } from "../../../core/instrumentation/instrumentation-injection";

/**
 * Injector for Node applications that handles the injection of instrumentation bundles.
 * The bundle is preloaded with `node --require <bundle>` inserted into the `start` script of package.json.
 * The start script is validated before the bundle is copied; unsupported start commands fail explicitly.
 */
export class NodeInstrumentationBundleInjector extends BackendInstrumentationBundleInjector {

    /**
     * Initializes a new instance of the NodeInstrumentationBundleInjector.
     * @param application Metadata about the Node application being instrumented.
     * @param bundle The instrumentation bundle to be injected.
     * @param bundleDestinationParentPath Optional. Default is "src/assets/js/bundles".
     * @param packageJsonPath Absolute path to the package.json where the bundle will be co-deployed with the target application.
     *
     */
    constructor(
        application: ApplicationMetadata,
        bundle: InstrumentationBundle,
        bundleDestinationParentPath: string = path.join('src', 'assets', 'js', 'bundles'),
        public packageJsonPath: string = path.join(application.path, 'package.json')
    ) {
        super(application, bundle, bundleDestinationParentPath);
        this.label = "Node";
        // Transform relative paths into absolute path
        this.bundleDestinationParentPath = path.join(this.application.path, this.bundleDestinationParentPath);
    }

    /** `--require` argument, relative to the package.json folder (npm runs scripts from there). */
    private get requirePath(): string {
        return './' + path.relative(path.dirname(this.packageJsonPath), this.deployedBundlePath).replace(/\\/g, '/');
    }

    /** Bundle folder relative to the package.json folder. */
    private get requireDir(): string {
        return path.relative(path.dirname(this.packageJsonPath), this.bundleDestinationParentPath).replace(/\\/g, '/');
    }

    private readStartScript(): { raw: string, start: string } {
        if (!existsSync(this.packageJsonPath)) {
            throw new InstrumentationInjectionError(
                `Node Instrumentation Bundle Injector: target package.json does not exist: ${this.packageJsonPath}`, 'ENTRY_POINT_MISSING');
        }
        const raw = readFileSync(this.packageJsonPath, 'utf8');
        const start = JSON.parse(raw)?.scripts?.start;
        if (typeof start !== 'string' || start.trim() === '') {
            throw new InstrumentationInjectionError(
                `Node Instrumentation Bundle Injector: no 'start' script found in package.json: ${this.packageJsonPath}`, 'START_SCRIPT_MISSING');
        }
        return { raw, start };
    }

    /**
     * Checks that package.json has a supported `start` script (dry run, no modification, nothing copied yet).
     */
    protected resolveReference(reference: string): string {
        return path.resolve(path.dirname(this.packageJsonPath), reference);
    }

    protected currentReferences(): string[] {
        const { start } = this.readStartScript();
        return requiredPaths(start);
    }

    protected async validateEntryPoint(): Promise<void> {
        this.report.entryPointPath = this.packageJsonPath;
        const { start } = this.readStartScript();
        planNodeStartScriptInjection(start, this.requirePath, this.requireDir, this.bundleAppPrefix);
    }

    /**
     * Inserts `--require ./<bundle>` after the Node.js executable of the start script. Idempotent;
     * only the value of `scripts.start` is rewritten (see {@link replaceStartScript}).
     */
    protected async inject(): Promise<void> {
        const { raw, start } = this.readStartScript();
        const plan = planNodeStartScriptInjection(start, this.requirePath, this.requireDir, this.bundleAppPrefix);
        if (plan.status !== 'already-present') writeFileSync(this.packageJsonPath, replaceStartScript(raw, start, plan.updated));
        this.report.entryPoint = plan.status;
        this.report.replacedReferences = plan.replacedReferences;
        console.log(`Node Instrumentation Bundle Injector: start script ${plan.status}: ${plan.updated}`);
    }

    /**
     * Verifies that the start script requires the deployed bundle exactly once, that the path resolves
     * from the package.json folder, and that the deployed bundle equals the generated one.
     */
    protected async postInject(): Promise<void> {
        const { start } = this.readStartScript();
        const references = countNodeRequires(start, this.requirePath);
        const resolved = path.resolve(path.dirname(this.packageJsonPath), this.requirePath);
        if (references !== 1 || path.normalize(resolved) !== path.normalize(this.deployedBundlePath)) {
            throw new InstrumentationInjectionError(
                `Node Instrumentation Bundle Injector: expected exactly one --require ${this.requirePath} resolving to ${this.deployedBundlePath}, found ${references}`,
                'VERIFICATION_FAILED');
        }
        this.verifyDeployedBundle();
        this.report.verified = true;
        console.log('Node Instrumentation Bundle Injector: Finished bundle injection (verified).');
    }
}
