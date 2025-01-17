/**
 * Represents the metadata for an application being analyzed.
 * This class encapsulates the type, codebase path, name, and URL of the application.
 */
export class ApplicationMetadata {

    /**
     * Constructs an instance of ApplicationMetadata.
     * @param _name A human-readable name for the application.
     * @param _type The platform the application is built on (e.g., Web, Desktop, Mobile, etc.).
     * @param _technology The technology stack/framework used to implement the application
     * @param _path The local file system path to the application's codebase root folder.
     * @param _url The URL where the application is accessible.
     */
    constructor(
        private _name: string,
        private _type: string,
        private _technology: string,
        private _path: string,
        private _url: string) {
    }

    /**
     * Displays the application's metadata in a formatted manner.
     */
    displayInfo(): void {
        console.log(`Application Details:
    - Name: ${this._name}
    - Type: ${this._type}
    - Technology: ${this._technology}
    - Path: ${this._path}
    - URL: ${this._url}`);
    }

    // getters & setters
    /**
     * Returns the current name of the application
     * @returns the application's current name
     */
    get name() {
        return this._name;
    }

    /**
     * Sets a new name for the application
     * @param name the new application name
     */
    set name(name: string) {
        this._name = name;
    }

    /**
     * *Returns the current technology stack or framework the application is built on.
     * @returns the application's current technology stack or framework
     */
    get type() {
        return this._type;
    }

    /**
     * Sets a new technology stack or framework for the application
     * @param type The new technology stack or framework for the application
     */
    set type(type: string) {
        this._type = type;
    }

    /**
     * Returns the current technology of the application
     * @returns the application's current technology
     */
    get technology() {
        return this._technology;
    }

    /**
     * Sets a new technology for the application
     * @param technology the new application technology
     */
    set technology(technology: string) {
        this._technology = technology;
    }

    /**
     * Returns the current codebase path of the application
     * @returns the application's current codebase path
     */
    get path() {
        return this._path;
    }

    /**
     * Sets a new codebase path for the application
     * @param path The new codebase path for the application
     */
    set path(path: string) {
        this._path = path;
    }

    /**
     * Returns the current URL of the application
     * @returns the application's current URL
     */
    get url() {
        return this._url;
    }

    /**
     * Sets a new URL for the application
     * @param url the new application URL
     */
    set url(url: string) {
        this._url = url;
    }

    /**
     * Return a normalized name of the application, by returning a lowercase, and space-free
     * version thereof
     * @param separator A separator that replaces whitespace in the application's name
     * @returns The normalized name of the application
     */
    generateNormalizedApplicationName(separator: string): string {
        return this.name.toLowerCase().replace(/\s+/, separator);
    }

    /**
     * Serializes the current ApplicationMetadata instance to a JSON string.
     * @returns A JSON string representation of the current instance.
     */
    serialize(): string {
        return JSON.stringify(this);
    }

    /**
     * Deserializes a JSON string to an ApplicationMetadata instance.
     * @param data A JSON string representing an ApplicationMetadata instance.
     * @returns An instance of ApplicationMetadata.
     */
    static deserialize(data: string): ApplicationMetadata {
        const obj = JSON.parse(data);
        return new ApplicationMetadata(obj.name, obj.type, obj.technology, obj.path, obj.url);
    }
}