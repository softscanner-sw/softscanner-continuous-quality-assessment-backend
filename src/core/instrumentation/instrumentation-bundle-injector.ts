import { AngularInstrumentationBundleInjector } from "../../modules/instrumentation/angular/angular-bundle-injector";
import { NodeInstrumentationBundleInjector } from "../../modules/instrumentation/node/node-bundle-injector";
import { ReactInstrumentationBundleInjector } from "../../modules/instrumentation/react/react-bundle-injector";
import { ApplicationMetadata } from "../application/application-metadata";
import { InstrumentationBundle, InstrumentationBundleInjector } from "./instrumentation-core";
import { InjectionReport, InstrumentationInjectionError } from "./instrumentation-injection";

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
     * @returns The injection report (bundle generated, copied, entry point modified, verified).
     * @throws InstrumentationInjectionError if the technology is unsupported or any injection stage fails.
     */
    public async injectBundle(appMetadata: ApplicationMetadata, bundle: InstrumentationBundle): Promise<InjectionReport> {
        console.log('Instrumentation Bundle Injector: Injecting instrumentation bundle...');

        // Determine the technology of the application (Angular, React or Node.js)
        const technology = appMetadata.technology.toLowerCase();
        let injector: InstrumentationBundleInjector | null = null;

        // Choose the appropriate injector based on the application's technology
        if (technology.includes('angular')) {
            injector = new AngularInstrumentationBundleInjector(appMetadata, bundle);
        } else if (technology.includes('react')) {
            injector = new ReactInstrumentationBundleInjector(appMetadata, bundle);
        } else if (technology.includes('node')) {
            injector = new NodeInstrumentationBundleInjector(appMetadata, bundle);
        }

        if (!injector) {
            throw new InstrumentationInjectionError(
                `Instrumentation Bundle Injector: no injector for technology "${appMetadata.technology}"`, 'UNSUPPORTED_TECHNOLOGY');
        }

        // Execute the injection process using the chosen injector (throws on any failure)
        const report = await injector.process();
        console.log(`Instrumentation Bundle Injector: bundle ${report.copy}, entry point ${report.entryPoint}, verified=${report.verified}`);
        return report;
    }
}