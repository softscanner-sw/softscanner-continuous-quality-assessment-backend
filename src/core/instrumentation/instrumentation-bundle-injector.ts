import { AngularInstrumentationBundleInjector } from "../../modules/instrumentation/angular/angular-bundle-injector";
import { NodeInstrumentationBundleInjector } from "../../modules/instrumentation/node/node-bundle-injector";
import { ReactInstrumentationBundleInjector } from "../../modules/instrumentation/react/react-bundle-injector";
import { ApplicationMetadata } from "../application/application-metadata";
import { InstrumentationBundle, InstrumentationBundleInjector } from "./instrumentation-core";

/**
 * The `BundleInjector` class is responsible for injecting a generated instrumentation bundle
 * into a target application based on its technology (Angular or React).
 * 
 * It determines the appropriate injector for the given technology and executes the injection process.
 */
export class BundleInjector {
    /**
     * Injects the provided instrumentation bundle into the specified application.
     * This involves modifying the application files to include the instrumentation bundle.
     * 
     * @param appMetadata Metadata of the application, including its technology (Angular, React, etc.).
     * @param bundle The instrumentation bundle that contains the generated files to be injected.
     * @returns A promise that resolves when the injection process completes.
     */
    public async injectBundle(appMetadata: ApplicationMetadata, bundle: InstrumentationBundle): Promise<void> {
        console.log('Instrumentation Bundle Injector: Injecting instrumentation bundle...');

        // Determine the technology of the application (Angular or React)
        const technology = appMetadata.technology.toLowerCase();
        let injector: InstrumentationBundleInjector | null = null;

        // Choose the appropriate injector based on the application's technology
        if (technology.includes('angular')) {
            // Create an instance of the Angular bundle injector
            injector = new AngularInstrumentationBundleInjector(appMetadata, bundle);
        } else if (technology.includes('react')) {
            // Create an instance of the React bundle injector
            injector = new ReactInstrumentationBundleInjector(appMetadata, bundle);
        } else if (technology.includes('node')) {
            // Create an instance of the Node bundle injector
            injector = new NodeInstrumentationBundleInjector(appMetadata, bundle);
        }

        if (injector) {
            // Execute the injection process using the chosen injector
            await injector.process();
            console.log('Instrumentation Bundle Injector: Instrumentation bundle injected successfully!');
        } else {
            // Log a warning if no suitable injector is found for the specified technology
            console.warn('Instrumentation Bundle Injector: Instrumentation bundle injection failed... Instrumentation Bundle Injector is undefined');
        }
    }
}