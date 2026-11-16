import * as path from "path";
import { ApplicationMetadata } from "../../../core/application/application-metadata";
import { FrontendInstrumentationBundleInjector, InstrumentationBundle } from "../../../core/instrumentation/instrumentation-core";

/**
 * Injector for Angular applications that handles the injection of instrumentation bundles.
 * This class extends the generic FrontendInstrumentationBundleInjector, which validates the entry point,
 * copies the bundle (idempotently), inserts a single script reference and verifies the result.
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
        this.label = "Angular";
        // Transform relative paths into absolute path
        this.bundleDestinationParentPath = path.join(this.application.path, this.bundleDestinationParentPath);
        this.targetHTMLPagePath = path.join(this.application.path, this.targetHTMLPagePath);
    }
}
