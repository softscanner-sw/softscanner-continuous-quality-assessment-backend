import * as fs from "fs";
import * as path from "path";
import { TelemetryStorageEndpoint, TelemetryStorageStrategyConfig } from "../collection/telemetry-collector";

/**
 * Abstract base class for telemetry storage strategies.
 * Defines the basic structure and operations required 
 * for storing telemetry data.
 */
export abstract class TelemetryStorageStrategy {

    /**
     * Initializes the telemetry storage strategy with a specific storage endpoint and configuration.
     * @param {TelemetryStorageEndpoint} storageEndpoint - The storage endpoint details.
     * @param {TelemetryStorageStrategyConfig} config - The configuration for the storage strategy.
     */
    constructor(
        protected storageEndpoint: TelemetryStorageEndpoint,
        protected config: TelemetryStorageStrategyConfig) {
    }

    /**
     * Stores a single piece of data.
     * @param {any} data - The data to store.
     */
    abstract store(data: any): Promise<void>;

    /**
     * Stores an array of data items.
     * @param {any[]} data - The array of data items to store.
     */
    abstract storeAll(data: any[]): Promise<void>;

    /**
     * Reads data, optionally based on an identifier.
     * This method is primarily used data retrieval.
     * @param {string} [id] - The identifier for the data to read, if available.
     * @returns {Promise<any | undefined>} The read data, or undefined if not found.
     */
    abstract read(id?: string): Promise<any | undefined>;
}

/**
 * Implements a telemetry storage strategy that stores telemetry data in files.
 */
export class TelemetryFileStorageStrategy extends TelemetryStorageStrategy {
    protected _filePath: string = '';

    /**
     * Constructs a file-based storage strategy for telemetry data.
     * @param {TelemetryStorageEndpoint} storageEndpoint - The storage endpoint details.
     * @param {TelemetryStorageStrategyConfig} config - The configuration for the storage strategy.
     * @param {string} _storageFilesRootFolder - The root folder path where telemetry files are stored.
     */
    constructor(
        protected storageEndpoint: TelemetryStorageEndpoint,
        protected config: TelemetryStorageStrategyConfig,
        protected _storageFilesRootFolder: string = path.join('assets', 'files')) {
        super(storageEndpoint, config);
    }

    /**
     * Gets the full file path for storing telemetry data.
     * If not already set, it constructs the path using the storage endpoint URI.
     * @returns {string} The full path to the telemetry data file.
     */
    get filePath(): string {
        if (!this._filePath) {
            const projectRootPath = path.resolve(__dirname, '../../../'); // this project's root folder path

            // Check if the URI is absolute, and avoid appending it to the root path
            if (path.isAbsolute(this.storageEndpoint.uri))
                this._filePath = this.storageEndpoint.uri; // Use the absolute path as-is
            else
                this._filePath = path.join(projectRootPath, this._storageFilesRootFolder, this.storageEndpoint.uri);
        }

        return this._filePath;
    }

    /**
     * Appends a single data value to the end of the file specified by the storage endpoint
     * @param data The data to append into the file
     */
    async store(data: any): Promise<void> {
        // Ensure the exportation destination path exists
        if (!fs.existsSync(path.dirname(this.filePath)))
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

        // Use a writable stream for efficiency in case of large data sets
        const fileStream = fs.createWriteStream(this.filePath, { flags: 'a' });

        // If JSON is used
        if (this.config.dataFormat == "JSON")
            fileStream.write(JSON.stringify(data) + '\n');

        fileStream.end();
        fileStream.close();
    }

    /**
     * Appends an array of data values to the end of the file specified by the storage endpoint
     * @param data The array of data to append into the file
     */
    async storeAll(data: any[]): Promise<void> {
        data.forEach(async data => await this.store(data));
    }

    /**
     * Reads data from the file specified by the storage endpoint
     * @returns The data read from the file
     */
    async read(): Promise<any> {
        // Use a readable stream for efficiency in case of large data sets
        const fileStream = fs.createReadStream(this.filePath, { flags: 'a' });
        const data = fileStream.read();
        fileStream.close();

        return data;
    }
}

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