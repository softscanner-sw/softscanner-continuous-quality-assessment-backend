import { existsSync } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { ApplicationMetadata } from "../../../core/application/application-metadata";
import { BackendInstrumentationBundleInjector, InstrumentationBundle } from "../../../core/instrumentation/instrumentation-core";

/**
 * Injector for Node applications that handles the injection of instrumentation bundles.
 * This class extends the generic InstrumentationBundleInjector and provides Node-specific logic.
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
        // Transform relative paths into absolute path
        this.bundleDestinationParentPath = path.join(this.application.path, this.bundleDestinationParentPath);
    }

    /**
     * Prepares the Node project for bundle injection.
     * This involves verifying the bundle path and creating the destination directory if it doesn't exist.
     */
    protected async preInject(): Promise<void> {
        console.log("Node Instrumentation Bundle Injector: Preparing for bundle injection...");

        if (this.bundle.path) {
            try {
                // console.log(`Node Instrumentation Bundle Injector: Generated bundle project root path: ${this.bundle.projectRootPath}`);
                // console.log(`Node Instrumentation Bundle Injector: Generated bundle parent path: ${this.bundle.parentPath}`);
                // console.log(`Node Instrumentation Bundle Injector: Generated bundle path: ${this.bundle.path}`);
                // console.log(`Node Instrumentation Bundle Injector: Generated bundle file name: ${this.bundle.fileName}`);
                // console.log(`Node Instrumentation Bundle Injector: Destination Parent path for bundle: ${this.bundleDestinationParentPath}`);

                // Verify if the original bundle path exists.
                await fs.access(this.bundle.path);

                // Ensure the destination directory exists; create it if necessary.
                await fs.mkdir(this.bundleDestinationParentPath, { recursive: true });

                // Compute the full destination path for the bundle.
                const destinationBundlePath = path.join(this.bundleDestinationParentPath, this.bundle.fileName);

                console.log(`Node Instrumentation Bundle Injector: Copying bundle at ${this.bundle.path}...`);

                // Copying bundle to destination
                await fs.copyFile(this.bundle.path, destinationBundlePath);

                console.log(`Node Instrumentation Bundle Injector: Copied the bundle to ${destinationBundlePath}`);

            } catch (error: any) {
                console.error(`Node Instrumentation Bundle Injector: Error during bundle preparation: ${error}`);
            }
        }
        else
            console.error(`Node Instrumentation Bundle Injector: Bundle doesn't have a valid path: ${this.bundle.path}`);
    }

    /**
     * Injects the bundle into the target package.json of the frontend app by appending a <script> tag.
     * This default implementation can be overridden by subclasses if needed.
     */
    protected async inject(): Promise<void> {
        if (!existsSync(this.packageJsonPath)) {
            console.error(`Node Instrumentation Bundle Injector: Target package.json does not exist: ${this.packageJsonPath}`);
            return;
        }

        const packageJson = JSON.parse(await fs.readFile(this.packageJsonPath, 'utf8'));

        if (!packageJson.scripts || !packageJson.scripts.start) {
            console.error(`Node Instrumentation Bundle Injector: No 'start' script found in package.json: ${this.packageJsonPath}`);
            return;
        }

        // Compute the relative path from the package.json to the bundle
        // and convert backslashes to forward slashes for cross-platform compatibility
        const relativePathToBundle = path.relative(
            path.dirname(this.packageJsonPath),
            path.join(this.bundleDestinationParentPath, this.bundle.fileName)
        ).replace(/\\/g, '/');

        console.log(`Node Instrumentation Bundle Injector: Relative path for injection: ${relativePathToBundle}`);

        const requireArgument = `--require ./${relativePathToBundle}`;

        const scriptParts = packageJson.scripts.start.split(/\s+/); // Split by whitespace
        const nodeIndex = scriptParts.findIndex((part: any) => part.includes('node'));
        let requireIndex = scriptParts.findIndex((part: any) => part.includes('--require'));

        if (nodeIndex !== -1) {
            if (requireIndex == -1) // if no --require flag already defined
                requireIndex = nodeIndex + 1; // Insert after 'node'

            scriptParts.splice(requireIndex, 0, requireArgument);
            packageJson.scripts.start = scriptParts.join(' ');

            await fs.writeFile(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log(`Node Instrumentation Bundle Injector: Instrumentation bundle injected successfully into ${this.packageJsonPath}`);
        } else {
            console.error(`Node Instrumentation Bundle Injector: Unable to locate 'node' command in start script.`);
        }
    }

    /**
     * Post-injection steps for Node applications.
     * Can be used for tasks like cache busting or further configuration adjustments.
     */
    protected async postInject(): Promise<void> {
        // Any post-injection logic specific to Node applications.
        console.log('Node Instrumentation Bundle Injector: Finished bundle injection.');
    }
}