import { Metric } from "../metrics/metrics-core";
import * as fs from 'fs';
import * as readline from 'readline';

interface TelemetryDataReader {
    readTelemetryData(): Promise<any[]>;
}
  
export class FileTelemetryDataReader implements TelemetryDataReader {
    constructor(private filePath: string){}

    async readTelemetryData(): Promise<any[]> {
        const fileStream = fs.createReadStream(this.filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const lines: any[] = [];
        for await (const line of rl) {
            lines.push(JSON.parse(line));
        }
        return lines;
    }
}
  
export class MetricsComputer {
    constructor(private metrics: Metric[], private dataReader: TelemetryDataReader) {}

    async computeMetrics(): Promise<void> {
        const telemetryData = await this.dataReader.readTelemetryData();
        this.metrics.forEach(metric => {
            metric.computeValue(telemetryData);
            metric.displayInfo();
        });
    }
}