import { RouteMap } from "../models/route-info";
import { WidgetEventMap, WidgetInfo } from "../models/widget-info";
import { StaticCodeAnalyzer } from "../static-analyzers-core";

/**
 * Abstract base class for business logic analyzers.
 * Implementations should extract widget event mappings from the input.
 * 
 * @see {@link WidgetEventMap}
 */
export abstract class BusinessLogicAnalyzer extends StaticCodeAnalyzer {
    constructor(
        /**
         * The list of widgets extracted from the template.
         */
        public widgets: WidgetInfo[],
        /**
         * The route map used to resolve navigation targets
         */
        public routeMap: RouteMap
    ) {
        super();
    }

    /**
   * Analyzes the business logic in the provided input to extract event handler information for widgets.
   * @param input The input to analyze.
   * @returns A promise that resolves to an array of `WidgetEventMap`.
   */
    abstract analyze(input: any): Promise<WidgetEventMap[]>;
}
