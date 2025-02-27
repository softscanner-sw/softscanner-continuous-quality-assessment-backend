
/**
 * Utility class containing static methods for various helper operations.
 * These methods are used for common tasks like enum manipulation and string transformations.
 */
export class Utils {
    /**
     * Retrieves all string values from an enumeration.
     * Useful for extracting only the string-based keys in a mixed enum (e.g., both numeric and string values).
     * @param enumeration The enum from which to extract string values.
     * @returns An array of string values present in the enum.
     */
    public static getEnumStringValues(enumeration: any): string[] {
        let enumValues: string[] = Object.values(enumeration);

        // Filter to keep only string values (exclude numeric keys).
        enumValues = enumValues.filter(value => typeof value === 'string');

        return enumValues;
    }

    /**
     * Converts an enum string value to a lowercase string without any separators.
     * This is typically used to normalize enum keys for comparison or storage.
     * Example: "USER_INTERACTION" becomes "userinteraction".
     * @param enumValue The enum string value to be converted.
     * @returns A normalized string: lowercase and separator-free.
     */
    public static convertEnumValueToLowercaseWithNoSeparator(enumValue: string) {
        return enumValue.toLowerCase().replace(/_/g, '');
    }

    /**
     * Helper to convert a time representation (number or [seconds, nanoseconds]) into milliseconds.
     * @param time number or [seconds, nanoseconds]
     * @returns time in milliseconds
     */
    public static toMs(time: any): number {
        if (typeof time === 'number') {
            return time;
        } else if (Array.isArray(time)) {
            // Convert [seconds, nanoseconds] to milliseconds
            return time[0] * 1000 + time[1] / 1e6;
        }
        return 0;
    }
}