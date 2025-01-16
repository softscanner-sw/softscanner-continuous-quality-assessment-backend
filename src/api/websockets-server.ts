import { WebSocketTelemetryCollector } from '../collection/websockets/websockets-telemetry-collector';
import { TelemetryCollectorConfig, TelemetryStorageEndpointType } from '../core/collection/telemetry-collector';

// Setting up telemetry collector configuration
const config: TelemetryCollectorConfig = {
    storageEndpoints: [
        {
            type: TelemetryStorageEndpointType.FILE,
            name: 'telemetry_data',
            uri: './collected_telemetry.json',
        },
    ],
    dataFormat: "JSON",
};

// Start the WebSocket telemetry collector on port 8081
const collector = new WebSocketTelemetryCollector(config, 8081);
console.log('Collector: WebSocketTelemetryCollector is running on ws://localhost:8081');

// Preventing the script from exiting immediately
// process.stdin.resume();