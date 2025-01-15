import { ApplicationMetadata } from './core/application-core';
import { FileTelemetryDataReader, MetricsComputer } from './core/computation/metrics-computation';
import { TelemetryExportDestinationType, TelemetryType, UserInteractionEvent } from './core/instrumentation/instrumentation-core';
import { NUUMetric, UIFMetric } from './core/metrics/user-engagement/metrics-user-engagement';
import { SSQMM } from './core/model/model-mapping';
import { AngularInstrumentationBundleInjector } from './injection/angular/angular-injection';
import { OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationGenerator, OpenTelemetryUserInteractionEventsConfig } from './instrumentation/opentelemetry/opentelemetry-instrumentation';
import { OpenTelemetryAutomaticTracingOptions } from './instrumentation/opentelemetry/strategies/opentelemetry-instrumentation-strategy-tracing';

import { spawn } from 'child_process';
import * as path from "path";

(async () => {
    await main()
})();

async function main(){
    // await setupTelemetryCollector();
    await testCoreModules();
    // await computeMetrics('D:/git/gitlab/web-ux-quality-instrumentation-assessment/assets/files/airbusinventory/airbusinventory_2024_06_05T21_49_03_478Z.jsonl');
}

async function setupTelemetryCollector(){
    // Launching the WebSocketTelemetryCollector as a separate process
    const collectorScriptPath = path.join(__dirname, 'collection', 'websockets', 'setup.js');
    const collectorProcess = spawn('node', [collectorScriptPath], {
        stdio: 'inherit' // This will pipe the output of the child process to the parent, to see logs in the console.
    });

    collectorProcess.on('error', (error) => {
        console.error(`Failed to start WebSocketTelemetryCollector: ${error.message}`);
    });

    collectorProcess.on('close', (code) => {
        console.log(`WebSocketTelemetryCollector process exited with code ${code}`);
    });

    // Giving some time for the collector to initialize before proceeding (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000)); 
}

async function testCoreModules() {
    // Specificy an application to test by providing its metadata
    // const appMetadata = new ApplicationMetadata('EGF Evol', 'Web (Frontend)', 'angular', '', 'http://localhost:4200');

    const appMetadata = new ApplicationMetadata('NG Posts and Users', 'Web (Frontend)', 'angular', 'C:/Users/basha/git/github/OcPostProject', 'http://localhost:4200');

    // const appMetadata = new ApplicationMetadata('Hacker News', 'Web (Frontend)', 'angular', 'D:/git/github/angular2-hn', 'http://localhost:4200');

    // const appMetadata = new ApplicationMetadata('Sedit-GRH', 'Web (Frontend)', 'gwt', 'D:/git/gitlab/e-sedit-rh/BLGRHGwt', 'http://localhost:4200');

    // Display test application info
    appMetadata.displayInfo();
    console.log("");

    // Instantiate SSQMM
    const ssqmm = new SSQMM();

    // Select the appropriate Quality Model based on the user goal
    ssqmm.qualityModel.displayInfo();

    // Define OpenTelemetry instrumentation configuration
    const telemetryConfig = new OpenTelemetryInstrumentationConfig(
        [TelemetryType.TRACING], // Just tracing for this example
        [
            {
                type: TelemetryExportDestinationType.CONSOLE
            },
            // {
            //     type: TelemetryExportDestinationType.LOCAL_COLLECTOR,
            //     protocol: TelemetryExportProtocol.WEB_SOCKETS,
            //     url: 'ws://localhost:8081'
            // }
            // {
            //     type: TelemetryExportDestinationType.LOCAL_COLLECTOR,
            //     protocol: TelemetryExportProtocol.OTLP,
            //     url: 'http://localhost:4318/v1/traces'
            // },
            // {
            //     type: TelemetryExportDestinationType.REMOTE_COLLECTOR,
            //     protocol: TelemetryExportProtocol.OTLP,
            //     url: 'https://otel-collector.elastic-observability.research-bl.com/v1/traces'
            // }
        ], 
        new OpenTelemetryAutomaticTracingOptions(
            new OpenTelemetryUserInteractionEventsConfig(true,
                UserInteractionEvent.getMainEvents()), // Enable all/some events
            true, // Document load
            true, // Fetch API
            true, // AJAX requests
            true, // Session data
            true // App metadata
        )
    );

    // // Create the OpenTelemetryInstrumentationGenerator
    // const instrumentationGenerator = new OpenTelemetryInstrumentationGenerator(appMetadata, uxMetricsMapper.selectedMetrics, telemetryConfig);

    // // Generate instrumentation files
    // await instrumentationGenerator.generateInstrumentationFiles();

    // // Bundle instrumentation files
    // await instrumentationGenerator.generateInstrumentationBundle();

    // // Get generated bundle
    // const bundle = instrumentationGenerator.getInstrumentationBundle();

    // // Create the bundle injector
    // const bundleInjector = new AngularInstrumentationBundleInjector(appMetadata, bundle);

    // // Inject the bundle in the target application
    // await bundleInjector.process();
}

async function computeMetrics(telemetryDataFilePath: string) {

    // Initialize telemetry data reader
    // from the path to the .jsonl file containing telemetry data
    const dataReader = new FileTelemetryDataReader(telemetryDataFilePath);

    // Define the user interaction events considered for UIF computation
    const consideredEvents = UserInteractionEvent.getMainEvents();

    // Instantiate metrics (NUU and UIF)
    const nuuMetric = new NUUMetric(); // Assuming NUU doesn't need initial parameters
    const uifMetric = new UIFMetric(0, 1, consideredEvents);

    // Create MetricsComputer instance with the metrics and data reader
    const metricsComputer = new MetricsComputer([nuuMetric, uifMetric], dataReader);

    // Compute metrics
    await metricsComputer.computeMetrics();
}