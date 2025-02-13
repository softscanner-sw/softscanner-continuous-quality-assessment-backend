import { TelemetryDataSource } from "../../../../core/telemetry/telemetry";

export abstract class DatabaseTelemetryDataSource extends TelemetryDataSource {
    protected connected = false;

    async connect(): Promise<void> {
        if (!this.connected) {
            await this.createConnection();
            this.connected = true;
        }
    }

    async disconnect(): Promise<void> {
        if (this.connected) {
            await this.closeConnection();
            this.connected = false;
        }
    }

    protected abstract createConnection(): Promise<void>;
    protected abstract closeConnection(): Promise<void>;
}
