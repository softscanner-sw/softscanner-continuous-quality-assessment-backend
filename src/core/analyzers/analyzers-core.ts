/**
 * Abstract base class for all codebase analyzers.
 * Implementations should define how to extract some meaningful information
 * from a given source input (_e.g., file content, AST, etc._).
 */
export abstract class CodeAnalyzer {
    /**
     * Analyzes the provided input (_e.g., source code, AST, etc._)
     * to extract some meaningful information.
     * @param input The input to analyze.
     * @returns A promise that resolves to a the required information.
     */
    abstract analyze(input: any): Promise<any>;
}