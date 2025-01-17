import { EventEmitter } from "stream";

/**
 * A utility class providing static methods for common operations such as
 * enum manipulation and string transformations.
 */
export class Utils {
    /**
     * Retrieves the string values from an enumeration.
     * @param enumeration The enumeration from which to extract string values.
     * @returns An array of string values found in the enumeration.
     */

    public static getEnumStringValues(enumeration: any): string[] {
        let enumValues: string[] = Object.values(enumeration);
        // Filter out the numeric values to only get the string representations
        enumValues = enumValues.filter(value => typeof value === 'string');

        return enumValues;
        // return Object.keys(enumeration).filter(key => !Number.isFinite(enumeration[key]));
    }

    /**
     * Converts an enum string value to a lowercase string without any separators.
     * Typically used to normalize enum keys for comparison or storage.
     * @param enumValue The enum string value to be converted.
     * @returns A lowercase, separator-free string representation of the enum value.
     */
    public static convertEnumValueToLowercaseWithNoSeparator(enumValue: string){
        return enumValue.toLowerCase().replace(/_/g, '');
    }
}

export class ProgressTracker {
    private eventEmitter = new EventEmitter();

    onProgress(listener: (message: string) => void) {
        this.eventEmitter.on('progress', listener);
    }

    notifyProgress(message: string) {
        this.eventEmitter.emit('progress', message);
    }
}