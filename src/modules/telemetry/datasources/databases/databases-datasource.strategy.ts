import { TelemetryDataSource } from "../../../../core/telemetry/telemetry";

/**
 * Abstract class for database-based telemetry data sources.
 * Defines common methods for connecting and disconnecting from a database.
 */
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

    /**
     * Abstract method to establish a connection to the database.
     */
    protected abstract createConnection(): Promise<void>;

    /**
     * Abstract method to close the connection to the database.
     */
    protected abstract closeConnection(): Promise<void>;
}
