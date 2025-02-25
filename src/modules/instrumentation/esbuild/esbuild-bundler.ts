import * as esbuild from "esbuild";
import * as path from "path";
import { AbstractInstrumentationStrategy, InstrumentationBundle, InstrumentationBundler } from "../../../core/instrumentation/instrumentation-core";

export class EsBuildBundler extends InstrumentationBundler {
    constructor(
        instrumentationStrategy: AbstractInstrumentationStrategy,
        instrumentationBundle: InstrumentationBundle,
        protected tsConfigPath: string
    ) {
        super(instrumentationStrategy, instrumentationBundle);
    }

    public async generateInstrumentationBundle(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            // Generate esbuild config
            try {
                await this.generateEsBuild();
                console.log('EsBuild Bundler: Instrumentation bundle generated successfully.');
                resolve();
            } catch (error) {
                console.error('EsBuild Bundler: Error during bundle generation:', error);
                reject(error);
            }
        });
    }

    /**
         * Generates the EsBuild config file for the generation of the instrumentation bundle
         * of the OpenTelemetry project's instrumentation files
         * @returns - the EsBuild config file for the generation of the instrumentation bundle
         * of the OpenTelemetry project's instrumentation files
         */
    private async generateEsBuild(): Promise<any> {
        return esbuild.build({
            entryPoints: [path.join(this.instrumentationStrategy.srcPath, 'index.ts')],
            bundle: true,
            minify: true,
            platform: 'node',
            target: 'esnext',
            outfile: this.instrumentationBundle.path,
            sourcemap: true
        });
    }
}