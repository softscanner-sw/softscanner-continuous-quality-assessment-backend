import * as fs from "fs/promises";
import * as path from "path";
import { ApplicationMetadata } from "../../../core/application/application-metadata";
import { FrontendInstrumentationBundleInjector, InstrumentationBundle } from "../../../core/instrumentation/instrumentation-core";

/**
 * Injector for Angular applications that handles the injection of instrumentation bundles.
 * This class extends the generic InstrumentationBundleInjector and provides Angular-specific logic.
 */
export class AngularInstrumentationBundleInjector extends FrontendInstrumentationBundleInjector {

    /**
     * Initializes a new instance of the AngularInstrumentationBundleInjector.
     * @param application Metadata about the Angular application being instrumented.
     * @param bundle The instrumentation bundle to be injected.
     * @param bundleDestinationParentPath Optional. Default is "src/assets/js/bundles".
     * @param targetHTMLPagePath Optional. Default is "src/index.html".
     */
    constructor(
        application: ApplicationMetadata,
        bundle: InstrumentationBundle,
        bundleDestinationParentPath: string = path.join('src', 'assets', 'js', 'bundles'),
        targetHTMLPagePath: string = path.join('src', 'index.html')
    ) {
        super(application, bundle, bundleDestinationParentPath, targetHTMLPagePath);
        // Transform relative paths into absolute path
        this.bundleDestinationParentPath = path.join(this.application.path, this.bundleDestinationParentPath);
        this.targetHTMLPagePath = path.join(this.application.path, this.targetHTMLPagePath);
    }

    /**
     * Prepares the Angular application for the bundle injection.
     * This step includes verifying the existence of the bundle and preparing the destination path.
     */
    protected async preInject(): Promise<void> {
        console.log("Angular Instrumentation Bundle Injector: Preparing for bundle injection...");

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

                console.log(`Angular Instrumentation Bundle Injector: Copying bundle at ${this.bundle.path}...`);

                // Copying bundle to destination
                await fs.copyFile(this.bundle.path, destinationFullPath);

                console.log(`Angular Instrumentation Bundle Injector: Copied the bundle to ${destinationFullPath}`);

            } catch (error: any) {
                console.error(`Angular Instrumentation Bundle Injector: Error during bundle preparation: ${error}`);
            }
        }
        else
            console.error(`Angular Instrumentation Bundle Injector: Bundle doesn't have a valid path: ${this.bundle.path}`);
    }

    /**
     * Post-injection steps for Angular applications.
     * Can be used for tasks like cache busting or further configuration adjustments.
     */
    protected async postInject(): Promise<void> {
        // Any post-injection logic specific to Angular applications.
        console.log('Angular Instrumentation Bundle Injector: Finished bundle injection.');
    }
}
