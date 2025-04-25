/**
 * Represents information about an interactive widget in a component.
 */
export interface WidgetInfo {
    /** Unique identifier for the widget. */
    id: string;
    /** The type of widget (e.g., "button", "input"). */
    type: string;
    /** Map of event names to handler names (e.g., "click" -> "onSavePost"). */
    events: Map<string, string>;
    /** Optional attributes (e.g., placeholder, value). */
    attributes?: Record<string, any>;
    /** Validation rules (if any) associated with the widget. */
    validationRules?: string[];
    /** Indicates whether this widget triggers form submission. */
    triggersFormSubmission?: boolean;
}

/**
 * Describes a call made within an event handler.
 */
export interface EventHandlerCallContext {
    /** The caller (e.g., a service or router). */
    caller: string;
    /** The target (e.g., a URL or route). */
    called: string;
    /** Additional data (e.g., dynamic parameters). */
    data: string[];
}

/**
 * Represents an event context for a widget.
 */
export interface EventContext {
    /** Name of the event (e.g., "click", "ngSubmit"). */
    event: string;
    /** The handler function for the event. */
    handler: string;
    /** List of function calls performed within the handler. */
    calls: EventHandlerCallContext[];
}

/**
 * Maps a widget to its event contexts.
 */
export interface WidgetEventMap {
    /** The ID of the widget to map */
    widgetID: string;
    /** All event contexts associated with the widget. */
    events: EventContext[];
}