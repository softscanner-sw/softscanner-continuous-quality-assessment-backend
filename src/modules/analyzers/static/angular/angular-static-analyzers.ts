import * as path from "path";
import * as ts from 'ts-morph';
import { ComponentInfo, ComponentMap } from "../../../../core/analyzers/static/models/component-info";
import { RouteMap } from "../../../../core/analyzers/static/models/route-info";
import { StaticCodeAnalysisResult, StaticCodeAnalyzer } from "../../../../core/analyzers/static/static-analyzers-core";
import { AngularBusinessLogicAnalyzer} from "./business-logic/angular-static-business-logic-analyzers";
import { AngularRouteAnalyzer } from "./routes/angular-static-routes-analyzers";
import { AngularTemplateAnalyzer } from "./templates/angular-static-templates-analyzers";

/**
 * The overall result of analyzing an Angular project.
 */
export interface AngularProjectAnalysisResult extends StaticCodeAnalysisResult {
    results: {
        /** The full route map extracted from the project. */
        routeMap: RouteMap,
        /** Map of analyzed component information. */
        componentMap: ComponentMap,
    }
}

/**
 * Orchestrator analyzer for the static analysis of Angular projects.
 * Extends the core static analyzer and uses concrete Angular analyzers to extract routing,
 * template, business logic, and user-related information from the codebase of the provided project.
 */
export class AngularProjectAnalyzer extends StaticCodeAnalyzer {
    private project: ts.Project;
    private projectPath: string;
    private routeAnalyzer: AngularRouteAnalyzer;
    private templateAnalyzer: AngularTemplateAnalyzer;

    /**
     * Initializes the `StaticAnalyzer` with the specified TypeScript configuration file.
     * @param tsConfigPath Path to the `tsconfig.json` file of the Angular project.
     */
    constructor(tsConfigPath: string) {
        super();

        // Initialize the Angular project and its path
        this.project = new ts.Project({
            tsConfigFilePath: tsConfigPath,
        });
        this.projectPath = tsConfigPath.substring(0, tsConfigPath.lastIndexOf(path.sep));

        // Initialize the static code analyzers for routes and templates
        this.routeAnalyzer = new AngularRouteAnalyzer();
        this.templateAnalyzer = new AngularTemplateAnalyzer();
    }

    /**
   * Analyzes an Angular project.
   * @returns A promise resolving to the aggregated `AngularProjectAnalysisResult`.
   * @see {@link AngularProjectAnalysisResult}
   */
    async analyze(): Promise<AngularProjectAnalysisResult> {

        // Step 1: Build route map using the route analyzer
        const routeMap = await this.extractRouteMap();

        // Initialize component map
        let componentMap: any;

        // Step 2: Process each component file in the project
        for (const file of this.project.getSourceFiles()) {
            for (const cls of file.getClasses()) {
                const decorator = cls.getDecorator('Component');
                if (decorator) {
                    // Use the template analyzer to extract component info
                    const componentInfo: ComponentInfo = await this.templateAnalyzer.analyze(decorator);

                    // Create and use the business logic analyzer to extract widget event mappings
                    const logicAnalyzer = new AngularBusinessLogicAnalyzer(componentInfo.widgets, routeMap);
                    const widgetEventMaps = await logicAnalyzer.analyze(file);

                    // Add component info and its widget mappings to the component map
                    componentMap.components.push({ info: componentInfo, widgetEventMaps });
                }
            }
        }

        return { results: { routeMap, componentMap } };
    }

    /**
     * Extracts the routing information from the Angular project.
     * @returns A promise resolving to a `RouteMap` containing component routes and redirections.
     */
    private async extractRouteMap(): Promise<RouteMap> {
        // Step 1: Extract component and redirection routes
        const appModulePath = path.join(this.projectPath, 'src', 'app', 'app.module.ts');
        const routeFile = this.project.getSourceFileOrThrow(appModulePath);
        return await this.routeAnalyzer.analyze(routeFile);
    }

}