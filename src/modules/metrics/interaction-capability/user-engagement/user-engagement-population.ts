import { UserInteractionEvent } from "../../../../core/telemetry/telemetry";
import { Utils } from "../../../../core/util/util-core";

/**
 * Observation population of the User Engagement metrics.
 *
 * User Engagement metrics are computed from user-interaction spans only: spans whose `event_type` is a
 * recognized DOM interaction event (any value of `UserInteractionEvent`, compared in lower case without
 * separators, as emitted by the OpenTelemetry user-interaction instrumentation). Spans of other classes
 * that may be collected for the same application (document load, Fetch/XHR, resource fetches) do not
 * contribute users, visits, sessions, days, durations or interactions to these metrics.
 *
 * Within this population, a metric grouped by user, visit or session only uses spans carrying the
 * corresponding identifier (`app.user.id`, `app.visit.id`, `app.session.id`), for its numerator as well as
 * for its denominator.
 */
const RECOGNIZED_EVENTS: ReadonlySet<string> = new Set(
    UserInteractionEvent.getAllEvents().map(event => Utils.convertEnumValueToLowercaseWithNoSeparator(UserInteractionEvent[event]))
);

/** Contextual identifiers used as grouping keys by User Engagement metrics. */
export type EngagementKey = 'app.user.id' | 'app.visit.id' | 'app.session.id';

/** Whether a span is a recognized user-interaction span. */
export function isInteractionSpan(span: any): boolean {
    const eventType = span?.attributes?.["event_type"];
    return typeof eventType === 'string' && RECOGNIZED_EVENTS.has(eventType);
}

/** The user-interaction spans of a telemetry set (the User Engagement observation population). */
export function interactionSpans(telemetryData: any[]): any[] {
    return telemetryData.filter(isInteractionSpan);
}

/** The user-interaction spans carrying the given identifier(s). */
export function identifiedInteractionSpans(telemetryData: any[], ...keys: EngagementKey[]): any[] {
    return interactionSpans(telemetryData).filter(span => keys.every(key => !!span.attributes[key]));
}
