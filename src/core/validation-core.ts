/**
 * Interface for user input validation strategy.
 */
export interface IUserInputValidation<T> {
    validate(input: T): boolean;
}

/**
 * Simple text input validation example.
 */
export class SimpleTextValidation implements IUserInputValidation<string> {
    public validate(input: string): boolean {
        // Example validation: non-empty strings only
        return input.trim().length > 0;
    }
}