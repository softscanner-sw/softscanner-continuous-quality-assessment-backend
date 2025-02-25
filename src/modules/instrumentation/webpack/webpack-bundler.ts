import fs from "fs";
import * as path from "path";
import TerserPlugin from 'terser-webpack-plugin';
import webpack from "webpack";
import { AbstractInstrumentationStrategy, InstrumentationBundle, InstrumentationBundler } from "../../../core/instrumentation/instrumentation-core";

export class WebpackBundler extends InstrumentationBundler {
    constructor(
        instrumentationStrategy: AbstractInstrumentationStrategy,
        instrumentationBundle: InstrumentationBundle,
        protected tsConfigPath: string
    ) {
        super(instrumentationStrategy, instrumentationBundle);
    }

    public async generateInstrumentationBundle(): Promise<void> {
        return new Promise((resolve, reject) => {

            // Generate webpack config
            const webpackConfig = this.generateWebPackConfig();
            console.log("Webpack Bundler: Generated webpack configuration file");

            // Initialize and run the webpack compiler
            const compiler = webpack(webpackConfig);

            console.log("Webpack Bundler: Generating bundle...");

            compiler.run((err, stats) => {
                if (err) {
                    const errStr = err.toString();
                    fs.writeFileSync("webpack-error.log", `Webpack Bundler: Fatal webpack Error\n${errStr}`);
                    console.error("Webpack Bundler: Fatal webpack error:", errStr);
                    reject(err);
                    return;
                }

                // Convert stats to JSON and check for compilation errors
                const info = stats?.toJson();
                if (stats && stats.hasErrors() && info && info.errors) {
                    const errorsCombined = info.errors
                        .map((e: any) =>
                            typeof e === "object" ? JSON.stringify(e, null, 2) : e.toString()
                        )
                        .join("\n");
                    fs.writeFileSync(
                        "webpack-error.log",
                        `Webpack Bundler: Webpack compilation errors:\n${errorsCombined}`
                    );
                    console.error("Webpack Bundler: Webpack compilation errors:", errorsCombined);
                    return reject(new Error(errorsCombined));
                }

                console.log(
                    stats?.toString({
                        colors: true, // Adds colors to the console output
                        modules: false, // Reduce the amount of stuff printed to the console
                        children: false // Hide child information
                    })
                );

                console.log("Webpack Bundler: Bundle generated successfully.");
                resolve();
            });
        })
    }

    /**
         * Generates the Webpack config file for the generation of the instrumentation bundle
         * of the OpenTelemetry project's instrumentation files
         * @returns - the Webpack config file for the generation of the instrumentation bundle
         * of the OpenTelemetry project's instrumentation files
         */
    private generateWebPackConfig(): any {
        return {
            mode: "development",
            entry: path.join(this.instrumentationBundle.projectRootPath!, 'src', 'index.ts').replace(/\\/g, '/'),
            output: {
                filename: this.instrumentationBundle.fileName,
                path: this.instrumentationBundle.parentPath
            },
            optimization: {
                minimize: true,
                minimizer: [new TerserPlugin()],
            },
            resolve: {
                extensions: [".ts", ".js"]
            },
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        use: {
                            loader: "babel-loader",
                            options: {
                                presets: ["@babel/preset-env"]
                            }
                        },
                        exclude: /node_modules/
                    },
                    {
                        test: /\.ts?$/,
                        use: [{
                            loader: "ts-loader",
                            options: {
                                configFile: this.tsConfigPath
                            }
                        }],
                        exclude: /node_modules/
                    }
                ]
            }
        };
    }
}