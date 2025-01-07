import * as fs from "fs/promises";
import * as path from "path";
import { ApplicationMetadata } from "../../core/application-core";
import { InstrumentationBundleInjector } from "../../core/instrumentation/injection-core";
import { InstrumentationBundle } from "../../core/instrumentation/instrumentation-core";

/**
 * An injector specifically tailored for injecting instrumentation bundles into Angular applications.
 * This class extends the generic InstrumentationBundleInjector to provide Angular-specific implementation
 * of bundle injection, considering the standard project structure of Angular applications.
 */
export class AngularInstrumentationBundleInjector extends InstrumentationBundleInjector {

    /**
     * Initializes a new instance of the injector for Angular applications.
     * @param application The metadata of the Angular application where the bundle will be injected.
     * @param bundle The instrumentation bundle to be injected.
     * @param bundleDestinationParentPath (optional) The relative path within the Angular project where the bundle will be copied. Defaults to "src/assets/js/bundles".
     * @param targetHTMLPagePath (optional) The relative path to the HTML page (usually index.html) where the script tag referencing the bundle will be injected. Defaults to "src/index.html".
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
        console.log("Preparing for bundle injection...");
        
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

                console.log(`Copying bundle at ${this.bundle.path}...`);

                // Copying bundle to destination
                await fs.copyFile(this.bundle.path, destinationFullPath);

                console.log(`Copied the bundle to ${destinationFullPath}`);
                
            } catch (error: any){
                console.error(`Error during bundle preparation: ${error}`);
            }
        }
        else
            console.error(`Bundle doesn't have a valid path: ${this.bundle.path}`);
    }

    /**
     * Defines any cleanup or additional steps after injection.
     * For Angular applications, this might involve tasks like cache busting or further configuration.
     */
    protected async postInject(): Promise<void> {
        // Any post-injection logic specific to Angular applications.
        console.log('Finished bundle injection.');
    }
}
