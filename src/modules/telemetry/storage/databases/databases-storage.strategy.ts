import { TelemetryStorageStrategy } from "../../../../core/telemetry/telemetry";

/**
 * A telemetry database storage strategy will have a database-specific connector (i.e., having its own class database connector hierarchy) and will implement at least CRUD operations on the database. etc.
 */
export class TelemetryDatabaseStorageStrategy extends TelemetryStorageStrategy {
    store(data: any): Promise<void> {
        throw new Error('Method not implemented.');
    }
    storeAll(data: any[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    read(id: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
}