import { existsSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { ApplicationMetadata } from "../application-core";
import { InstrumentationBundle } from "./instrumentation-core";

/**
 * Abstract class to define a blueprint for bundle injection into different types of applications.
 * It provides a structured process to inject an instrumentation bundle into a target application,
 * accommodating for custom pre and post injection steps.
 */
export abstract class InstrumentationBundleInjector {

    /**
     * Constructor to initialize the bundle injector.
     * @param application The target application metadata.
     * @param bundle The generated instrumentation bundle.
     * @param bundleDestinationParentPath Absolute path of the parent folder in the application where the bundle will be placed.
     * @param targetHTMLPagePath Absolute path to the HTML page where the bundle will be injected.
     */
    constructor(
        protected application: ApplicationMetadata, // the target application
        protected bundle: InstrumentationBundle, // The generated instrumentation bundle.
        protected bundleDestinationParentPath: string = "", // The destination folder path in the application where the bundle will be placed.
        protected targetHTMLPagePath: string = "", // the target HTML page path where the bundle will be injected
    ) {}

    /**
     * Template method to process the bundle injection.
     * Orchestrates the injection process by calling methods in a specific sequence.
     */
    public async process(){
        await this.preInject();
        await this.inject();
        await this.postInject();
    }

    /**
     * Method to define actions to be performed before injection.
     * To be implemented by subclasses based on specific needs.
     */
    protected abstract preInject(): Promise<void>;

    /**
     * Injects the bundle into the target HTML page.
     * Default implementation can be overridden by subclasses if needed.
     */
    protected async inject(): Promise<void> {
        if (!existsSync(this.targetHTMLPagePath)) {
            console.error(`Target HTML page does not exist: ${this.targetHTMLPagePath}`);
            return;
        }

        // Prepare the instrumentation bundle's relative path for the <script> element to inject
        const bundleDestinationParentRelativePath = 
            this.bundleDestinationParentPath.includes(`src${path.sep}`) ?
        this.bundleDestinationParentPath.split(`src${path.sep}`)[1] : this.bundleDestinationParentPath;
        let bundleDestinationRelativePath = path.join(bundleDestinationParentRelativePath, this.bundle.fileName);

        // If running on Windows, make sure to replace the backslashes with slashes
        if (bundleDestinationRelativePath.includes('\\'))
            bundleDestinationRelativePath = bundleDestinationRelativePath.replace(/\\/g, '/');

        // Preparing the <script> element to inject
        const bundleScriptTag = `<script src="${bundleDestinationRelativePath}"></script>`;
    
        // Read and update the target HTML page's content by appending the script to <body>'s content
        const htmlContent = readFileSync(this.targetHTMLPagePath, 'utf8');
        const updatedHtmlContent = htmlContent.replace('</body>', `${bundleScriptTag}</body>`);

        // Write updates to the file
        writeFileSync(this.targetHTMLPagePath, updatedHtmlContent);
        console.log(`Injected the instrumentation bundle into ${this.targetHTMLPagePath}`);
    }

    /**
     * Method to define actions to be performed after injection.
     * To be implemented by subclasses based on specific needs.
     */
    protected abstract postInject(): Promise<void>;
}