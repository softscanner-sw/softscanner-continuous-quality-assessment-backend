import { WidgetEventMap, WidgetInfo } from "./widget-info";

/**
 * Represents information about a component.
 */
export interface ComponentInfo {
    /** The component’s selector (e.g., "app-header"). */
    selector: string;
    /** A list of widgets contained in the component. */
    widgets: WidgetInfo[];
    /** Selectors of nested components used within this component. */
    nestedComponents: string[];
}

/**
 * A map containing all components in the project.
 */
export interface ComponentMap {
    /**
     * An array of all components discovered in the project.
     */
    components: [
        {
            info: ComponentInfo,
            widgetEventMap: WidgetEventMap
        }
    ]
}