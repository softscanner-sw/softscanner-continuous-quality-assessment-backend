import { ComponentInfo } from "./component-info";

/**
 * Represents a mapping from a route path to a component.
 */
export interface ComponentRoute {
    /** The route path (e.g., "/dashboard"). */
    route: string;
    /** The name of the component associated with the route. */
    component: string;
}

/**
 * Represents a route redirection.
 */
export interface RedirectRoute {
    /** The original route. */
    route: string;
    /** The target route to redirect to. */
    redirectTo: string;
}

/**
 * Represents the full route map of the application.
 */
export interface RouteMap {
    /** Array of component-to-route mappings. */
    components: ComponentRoute[];
    /** Array of route redirections. */
    redirections: RedirectRoute[];
    /** Optionally, components that are shared across multiple routes. */
    sharedComponents?: Set<ComponentInfo>;
}
