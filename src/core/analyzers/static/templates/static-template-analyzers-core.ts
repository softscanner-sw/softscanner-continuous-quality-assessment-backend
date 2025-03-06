import { ComponentInfo } from "../models/component-info";
import { StaticCodeAnalyzer } from "../static-analyzers-core";

/**
 * Abstract base class for template analyzers.
 * Implementations should define how to extract a template
 * from a given input (_e.g., file content, AST, etc._)
 * and analyze it to produce a `ComponentInfo`.
 * 
 * @see {@link ComponentInfo}
 */
export abstract class TemplateAnalyzer extends StaticCodeAnalyzer {
    /**
     * Extracts the template from the provided input.
     * @param input The input that contains the component’s template.
     * @returns The extracted template, or null if not found.
     */
    abstract extractTemplate(input: any): any | null;

    /**
     * Analyzes the given template input (_e.g., source code, AST, etc._)
     * to extract component information.
     * @param input The template input to analyze.
     * @returns A promise that resolves to a `ComponentInfo`.
     */
    abstract analyze(input: any): Promise<ComponentInfo>;
}
