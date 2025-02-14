import * as fs from "fs/promises";
import * as path from "path";
import { ApplicationMetadata } from "../../../core/application/application-metadata";
import { InstrumentationBundle, InstrumentationBundleInjector } from "../../../core/instrumentation/instrumentation-core";

/**
 * Injector for React applications that handles the injection of instrumentation bundles.
 * This class extends the generic InstrumentationBundleInjector and provides React-specific logic.
 */
export class ReactInstrumentationBundleInjector extends InstrumentationBundleInjector {

    /**
     * Initializes a new instance of the ReactInstrumentationBundleInjector.
     * @param application Metadata about the React application being instrumented.
     * @param bundle The instrumentation bundle to be injected.
     * @param bundleDestinationParentPath Optional. Default is "public/assets/js/bundles".
     * @param targetHTMLPagePath Optional. Default is "public/index.html".
     */
    constructor(
        application: ApplicationMetadata,
        bundle: InstrumentationBundle,
        bundleDestinationParentPath: string = path.join('public', 'assets', 'js', 'bundles'),
        targetHTMLPagePath: string = path.join('public', 'index.html')
    ) {
        super(application, bundle, bundleDestinationParentPath, targetHTMLPagePath);
        // Transform relative paths into absolute path
        this.bundleDestinationParentPath = path.join(this.application.path, this.bundleDestinationParentPath);
        this.targetHTMLPagePath = path.join(this.application.path, this.targetHTMLPagePath);
    }

    /**
     * Prepares the React project for bundle injection.
     * This involves verifying the bundle path and creating the destination directory if it doesn't exist.
     */
    protected async preInject(): Promise<void> {
        console.log("React Instrumentation Bundle Injector: Preparing for bundle injection...");

        if (this.bundle.path) {
            try {
                // console.log(`Generated bundle project root path: ${this.bundle.projectRootPath}`);
                // console.log(`Generated bundle parent path: ${this.bundle.parentPath}`);
                // console.log(`Generated bundle path: ${this.bundle.path}`);
                // console.log(`Generated bundle file name: ${this.bundle.fileName}`);

                // Verify if the original bundle path exists.
                await fs.access(this.bundle.path);

                // Ensure the destination directory exists; create it if necessary.
                await fs.mkdir(this.bundleDestinationParentPath, { recursive: true });

                // Compute the full destination path for the bundle.
                const destinationFullPath = path.join(this.bundleDestinationParentPath, this.bundle.fileName);

                console.log(`React Instrumentation Bundle Injector: Copying bundle at ${this.bundle.path}...`);

                // Copying bundle to destination
                await fs.copyFile(this.bundle.path, destinationFullPath);

                console.log(`React Instrumentation Bundle Injector: Copied the bundle to ${destinationFullPath}`);

            } catch (error: any) {
                console.error(`React Instrumentation Bundle Injector: Error during bundle preparation: ${error}`);
            }
        }
        else
            console.error(`React Instrumentation Bundle Injector: Bundle doesn't have a valid path: ${this.bundle.path}`);
    }

    /**
     * Post-injection steps for React applications.
     * Can be used for tasks like cache busting or further configuration adjustments.
     */
    protected async postInject(): Promise<void> {
        // Any post-injection logic specific to React applications.
        console.log('React Instrumentation Bundle Injector: Finished bundle injection.');
    }
}
