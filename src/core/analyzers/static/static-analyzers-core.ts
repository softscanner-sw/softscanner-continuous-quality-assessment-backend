import { CodeAnalyzer } from "../analyzers-core";

export interface StaticCodeAnalysisResult {
    results: {}
}

/**
 * Abstract base class for all codebase static analyzers.
 * Implementations should define how to statically extract
 * some meaningful information from a given source input
 * (_e.g., file content, AST, etc._).
 */
export abstract class StaticCodeAnalyzer extends CodeAnalyzer {
    
}