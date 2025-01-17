import * as fs from 'fs';
import * as readline from 'readline';
import { EventEmitter } from "stream";
import { Metric } from "../metrics/metrics-core";

interface TelemetryDataReader {
    readTelemetryData(): Promise<any[]>;
    getTelemetryDataPath(): string;
    setTelemetryDataPath(path: string): void;
}

export class FileTelemetryDataReader implements TelemetryDataReader {
    constructor(private filePath: string) { }

    async readTelemetryData(): Promise<any[]> {
        const fileStream = fs.createReadStream(this.filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const lines: any[] = [];
        for await (const line of rl) {
            const data = JSON.parse(line);
            // Validate required attributes
            if (data.attributes && data.attributes["event_type"])
                lines.push(data);
            else
                console.warn("File Telemetry Reader: Invalid telemetry data:", data);

            lines.push(JSON.parse(line));
        }
        return lines;
    }

    getTelemetryDataPath(): string {
        return this.filePath;
    }

    setTelemetryDataPath(path: string): void {
        this.filePath = path;
    }
}

export class DatabaseTelemetryDataReader implements TelemetryDataReader {
    constructor(private uri: string) { }

    readTelemetryData(): Promise<any[]> {
        throw new Error('Database Telemetry Reader: Method not implemented yet');
    }

    getTelemetryDataPath(): string {
        return this.uri;
    }

    setTelemetryDataPath(path: string): void {
        this.uri = path;
    }
}

export class MetricsComputer {
    private eventEmitter = new EventEmitter(); // Used to notify listeners upon computing new metric values

    constructor(private metrics: Metric[], private dataReader: TelemetryDataReader) { }

    // Event handling methods
    on(event: 'metricsComputed', listener: (metrics: Metric[]) => void): void {
        this.eventEmitter.on(event, listener);
    }

    emit(event: 'metricsComputed', metrics: Metric[]): void {
        this.eventEmitter.emit(event, metrics);
    }

    /**
     * Handles new telemetry data flushes.
     */
    async onTelemetryUpdate(filePath: string): Promise<void> {
        console.log(`MetricsComputer: Processing telemetry file: ${filePath}`);
        this.dataReader.setTelemetryDataPath(filePath); // Dynamically set file path
        this.computeMetrics(); // Compute Metrics
        this.emit('metricsComputed', this.metrics); // Notify listeners of new metric data
    }

    async computeMetrics(): Promise<void> {
        const telemetryData = await this.dataReader.readTelemetryData();

        // Reset metric values before recalculating
        this.metrics.forEach(metric => metric.resetValue());

        // Recompute metrics
        this.metrics.forEach(metric => {
            metric.computeValue(telemetryData);
            console.log(`MetricsComputer: Metric "${metric.name}" computed with value: ${metric.value}`);
        });
    }
}