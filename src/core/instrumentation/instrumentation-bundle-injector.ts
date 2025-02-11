import { AngularInstrumentationBundleInjector } from "../../modules/instrumentation/angular/angular-bundle-injector";
import { ReactInstrumentationBundleInjector } from "../../modules/instrumentation/react/react-bundle-injector";
import { ApplicationMetadata } from "../application/application-metadata";
import { InstrumentationBundle, InstrumentationBundleInjector } from "./instrumentation-core";

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

        const technology = appMetadata.technology.toLowerCase();
        let injector: InstrumentationBundleInjector | null = null;

        if (technology === 'angular')
            // Create an instance of the Angular bundle injector
            injector = new AngularInstrumentationBundleInjector(appMetadata, bundle);
        else if (technology === 'react')
            injector = new ReactInstrumentationBundleInjector(appMetadata, bundle);

        if (injector) {
            // Perform the injection process
            await injector.process();

            console.log('Bundle injected successfully!');
        } else {
            console.warn('Bundle injection failed... Bundle Injector is undefined');
        }
    }
}