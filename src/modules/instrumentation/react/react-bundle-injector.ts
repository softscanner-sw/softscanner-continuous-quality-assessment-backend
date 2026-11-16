import * as path from "path";
import { ApplicationMetadata } from "../../../core/application/application-metadata";
import { FrontendInstrumentationBundleInjector, InstrumentationBundle } from "../../../core/instrumentation/instrumentation-core";

/**
 * Injector for React applications that handles the injection of instrumentation bundles.
 * This class extends the generic FrontendInstrumentationBundleInjector, which validates the entry point,
 * copies the bundle (idempotently), inserts a single script reference and verifies the result.
 */
export class ReactInstrumentationBundleInjector extends FrontendInstrumentationBundleInjector {

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
        this.label = "React";
        // Transform relative paths into absolute path
        this.bundleDestinationParentPath = path.join(this.application.path, this.bundleDestinationParentPath);
        this.targetHTMLPagePath = path.join(this.application.path, this.targetHTMLPagePath);
    }
}
