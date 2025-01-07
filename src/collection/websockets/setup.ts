import { WebSocketTelemetryCollector } from './websockets-telemetry-collector';
import { TelemetryCollectorConfig } from '../../core/collection/telemetry-collector';

// Setting up telemetry collector configuration
const config: TelemetryCollectorConfig = {
    dataFormat: "JSON",
};

// Setting up telemetry collector using websockets
const collector = new WebSocketTelemetryCollector(config, 8081);
console.log('WebSocketTelemetryCollector is running.');

// Preventing the script from exiting immediately
process.stdin.resume();