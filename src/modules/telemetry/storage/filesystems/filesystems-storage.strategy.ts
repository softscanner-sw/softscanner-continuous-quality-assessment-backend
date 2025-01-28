import * as fs from "fs";
import * as path from "path";
import { TelemetryStorageEndpoint, TelemetryStorageStrategy, TelemetryStorageStrategyConfig } from "../../../../core/telemetry/telemetry";

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
            // Ensure that `uri` is consistent with how `TelemetryService` generates it
            if (path.isAbsolute(this.storageEndpoint.uri)) {
                this._filePath = this.storageEndpoint.uri; // Use absolute path as-is
            } else {
                // Handle relative URIs (unlikely in your case)
                this._filePath = path.join(this._storageFilesRootFolder, this.storageEndpoint.uri);
            }
        }
        // console.log(`TelemetryFileStorageStrategy: Final file path: ${this._filePath}`);
        return this._filePath;
    }

    /**
     * Appends a single data value to the end of the file specified by the storage endpoint
     * @param data The data to append into the file
     */
    async store(data: any): Promise<void> {
        // Ensure the exportation destination path exists
        if (!fs.existsSync(path.dirname(this.filePath))) {
            // console.log(`TelemetryFileStorageStrategy: Creating directory: ${path.dirname(this.filePath)}`);
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        }

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