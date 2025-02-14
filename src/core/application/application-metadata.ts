/**
 * Represents metadata for an application being analyzed.
 * This metadata provides essential details about the application, including its name, type, technology stack, file path, and URL.
 */
export class ApplicationMetadata {

    /**
     * Constructs an instance of ApplicationMetadata with the provided details.
     * @param _name A human-readable name for the application (e.g., "My Web App").
     * @param _type The type or platform of the application (e.g., "Web", "Mobile", "Desktop").
     * @param _technology The technology stack or framework used (e.g., "Angular", "React", "Spring Boot").
     * @param _path The absolute path to the application's root directory on the local file system.
     * @param _url The URL where the application is hosted or can be accessed.
     */
    constructor(
        private _name: string,
        private _type: string,
        private _technology: string,
        private _path: string,
        private _url: string) {
    }

    /**
     * Displays the details of the application in a formatted string.
     * This method logs the metadata to the console for debugging or informational purposes.
     */
    displayInfo(): void {
        console.log(`Application Details:
    - Name: ${this._name}
    - Type: ${this._type}
    - Technology: ${this._technology}
    - Path: ${this._path}
    - URL: ${this._url}`);
    }

    // Getters and Setters for each private property

    /**
     * Gets the application's name.
     * @returns The current name of the application.
     */
    get name() {
        return this._name;
    }

    /**
     * Sets a new name for the application.
     * @param name The new name to assign to the application.
     */
    set name(name: string) {
        this._name = name;
    }

    /**
     * Gets the type or platform of the application.
     * @returns The type of the application (e.g., "Web", "Mobile").
     */
    get type() {
        return this._type;
    }

    /**
     * Sets a new type or platform for the application.
     * @param type The new type of the application.
     */
    set type(type: string) {
        this._type = type;
    }

    /**
     * Gets the technology stack or framework used by the application.
     * @returns The current technology stack or framework.
     */
    get technology() {
        return this._technology;
    }

    /**
     * Sets a new technology stack or framework for the application.
     * @param technology The new technology stack or framework.
     */
    set technology(technology: string) {
        this._technology = technology;
    }

    /**
     * Gets the file system path to the application's root directory.
     * @returns The current path of the application.
     */
    get path() {
        return this._path;
    }

    /**
     * Sets a new file system path for the application's root directory.
     * @param path The new path for the application.
     */
    set path(path: string) {
        this._path = path;
    }

    /**
     * Gets the URL where the application is accessible.
     * @returns The current URL of the application.
     */
    get url() {
        return this._url;
    }

    /**
     * Sets a new URL for the application.
     * @param url The new URL of the application.
     */
    set url(url: string) {
        this._url = url;
    }

    /**
     * Generates a normalized name for the application.
     * The normalization converts the name to lowercase and replaces spaces with a given separator.
     * @param separator The separator to replace spaces (e.g., "-" or "_").
     * @returns The normalized name of the application.
     */
    generateNormalizedApplicationName(separator: string): string {
        return this.name.toLowerCase().replace(/\s+/, separator);
    }

    /**
     * Serializes the current ApplicationMetadata instance to a JSON string.
     * @returns A JSON string representing the current metadata.
     */
    serialize(): string {
        return JSON.stringify(this);
    }

    /**
     * Deserializes a JSON string into an ApplicationMetadata instance.
     * @param data A JSON string representing an ApplicationMetadata instance.
     * @returns An instance of ApplicationMetadata with the deserialized data.
     */
    static deserialize(data: string): ApplicationMetadata {
        const obj = JSON.parse(data);
        return new ApplicationMetadata(obj.name, obj.type, obj.technology, obj.path, obj.url);
    }
}