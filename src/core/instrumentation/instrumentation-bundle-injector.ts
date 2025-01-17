import { AngularInstrumentationBundleInjector } from "../../modules/instrumentation/angular/angular-bundle-injector";
import { ApplicationMetadata } from "../application/application-metadata";
import { InstrumentationBundle } from "./instrumentation-core";

/**
 * Handles injecting the generated instrumentation bundle into the Angular project.
 */
export class BundleInjector {
    /**
     * Injects the instrumentation bundle into the specified Angular project.
     * @param appMetadata The metadata of the application being instrumented.
     * @param bundle The instrumentation bundle to be injected.
     */
    public async injectBundle(appMetadata: ApplicationMetadata, bundle: InstrumentationBundle): Promise<void> {
        console.log('Injecting instrumentation bundle...');

        // Create an instance of the Angular bundle injector
        const injector = new AngularInstrumentationBundleInjector(appMetadata, bundle);

        // Perform the injection process
        await injector.process();

        console.log('Bundle injected successfully!');
    }
}