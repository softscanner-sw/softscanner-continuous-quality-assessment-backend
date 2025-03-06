import { RouteMap } from "../models/route-info";
import { StaticCodeAnalyzer } from "../static-analyzers-core";

/**
 * Abstract base class for route analyzers.
 * Implementations should define how to extract a `RouteMap`
 * from a given source input (_e.g., file content, AST, etc._).
 */
export abstract class RouteAnalyzer extends StaticCodeAnalyzer {
    /**
     * Analyzes the provided input (_e.g., source code, AST, etc._)
     * to extract a route map.
     * @param input The input to analyze.
     * @returns A promise that resolves to a `RouteMap`.
     */
    abstract analyze(input: any): Promise<RouteMap>;
}
