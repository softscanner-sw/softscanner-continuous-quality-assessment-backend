import { ApplicationMetadata } from "../application/application-metadata";
import {
    InteractionEventRequirement, OBSERVABLE_FIELDS, ObservableField, ResolvedObservationRequirements, SpanClass,
    resolveObservationRequirements,
} from "../metrics/metric-observables";
import { UserInteractionEvent } from "../telemetry/telemetry";

/**
 * Observable-driven selection of instrumentation modules and span processors (Stage B1).
 *
 * The capability registry states which observations each supported OpenTelemetry instrumentation module
 * and each generated span processor can provide. `selectInstrumentation` resolves the observation
 * requirements of the selected metrics (direct and inherited, see `metric-observables.ts`) and enables
 * exactly the modules and processors needed to provide them on the application's platform.
 *
 * Granularity: selection operates on whole instrumentation modules and processors. A module that is
 * enabled emits all of its span attributes; no field-level filtering is performed. An enabled module
 * provides a span class only when the corresponding runtime activity occurs (e.g. a route change for
 * navigation spans); enabling a module does not guarantee that every field is emitted.
 */

/** Runtime platforms supported by the generator. */
export type InstrumentationPlatform = 'browser' | 'node';

/** Span properties carried by every span of an enabled module (no specific module required). */
const INTRINSIC_FIELDS: readonly ObservableField[] = ['span.name', 'span.startTime', 'span.endTime', 'span.duration'];

/** An OpenTelemetry automatic instrumentation module supported by the generator. */
export interface InstrumentationModuleCapability {
    id: string;
    platform: InstrumentationPlatform;
    package: string;
    /** Option of the generated configuration (`OpenTelemetry{Web,Node}AutomaticTracingOptions`). */
    option: string;
    spanClasses: readonly SpanClass[];
    /** Span attributes the module may emit (those read by metrics are `ObservableField`s). */
    attributes: readonly string[];
    /** Modules covering the same span class for different libraries (e.g. Fetch vs XHR). */
    alternativeGroup?: string;
}

/**
 * Supported modules, in selection order. Other modules of the OpenTelemetry auto-instrumentation
 * meta-packages remain disabled in generated agents.
 */
export const INSTRUMENTATION_MODULES: readonly InstrumentationModuleCapability[] = [
    {
        id: 'user-interaction', platform: 'browser', package: '@opentelemetry/instrumentation-user-interaction', option: 'userInteractions',
        spanClasses: ['ui.interaction', 'ui.navigation-click'], attributes: ['event_type', 'target_element', 'target_xpath', 'http.url'],
    },
    {
        id: 'document-load', platform: 'browser', package: '@opentelemetry/instrumentation-document-load', option: 'documentLoad',
        spanClasses: ['browser.document-load'], attributes: ['http.url', 'http.user_agent', 'http.response_content_length'],
    },
    {
        id: 'fetch', platform: 'browser', package: '@opentelemetry/instrumentation-fetch', option: 'fetchApi',
        spanClasses: ['browser.http-client'], attributes: ['http.method', 'http.url', 'http.status_code', 'http.host', 'http.scheme', 'http.user_agent'],
        alternativeGroup: 'browser-http-client',
    },
    {
        id: 'xml-http-request', platform: 'browser', package: '@opentelemetry/instrumentation-xml-http-request', option: 'ajaxRequests',
        spanClasses: ['browser.http-client'], attributes: ['http.method', 'http.url', 'http.status_code', 'http.host', 'http.scheme', 'http.user_agent'],
        alternativeGroup: 'browser-http-client',
    },
    {
        id: 'http', platform: 'node', package: '@opentelemetry/instrumentation-http', option: 'http',
        spanClasses: ['server.http'],
        attributes: ['http.method', 'http.url', 'http.target', 'http.status_code', 'http.host', 'http.flavor', 'net.host.ip', 'net.peer.ip'],
    },
    {
        id: 'express', platform: 'node', package: '@opentelemetry/instrumentation-express', option: 'express',
        spanClasses: [], attributes: ['express.name', 'express.type', 'http.route'],
    },
    {
        id: 'mysql', platform: 'node', package: '@opentelemetry/instrumentation-mysql', option: 'mysql',
        spanClasses: ['db.query'], attributes: ['db.statement', 'db.system', 'db.name', 'net.peer.name'], alternativeGroup: 'sql-client',
    },
    {
        id: 'mysql2', platform: 'node', package: '@opentelemetry/instrumentation-mysql2', option: 'mysql2',
        spanClasses: ['db.query'], attributes: ['db.statement', 'db.system', 'db.name', 'net.peer.name'], alternativeGroup: 'sql-client',
    },
];

/** Module used to carry processor attributes when a metric reads them from 'any' span. */
const DEFAULT_CARRIER: Readonly<Record<InstrumentationPlatform, string>> = { browser: 'user-interaction', node: 'http' };

/** A span processor generated into the agent. */
export interface SpanProcessorCapability {
    id: 'application-metadata' | 'user-identity' | 'resource';
    /** Generator flag (`OpenTelemetryAutomaticTracingOptions`). */
    option: 'appMetadata' | 'userIdData' | 'resourceData';
    /** Always generated: required by the collector to associate spans with the application and bundle. */
    mandatory: boolean;
    attributes: Readonly<Record<InstrumentationPlatform, readonly string[]>>;
}

export const SPAN_PROCESSORS: readonly SpanProcessorCapability[] = [
    {
        id: 'application-metadata', option: 'appMetadata', mandatory: true,
        attributes: {
            browser: ['app.metadata.name', 'app.metadata.normalizedName', 'app.metadata.technology', 'app.metadata.instrumentationBundleName'],
            node: ['app.metadata.name', 'app.metadata.normalizedName', 'app.metadata.technology', 'app.metadata.instrumentationBundleName'],
        },
    },
    {
        id: 'user-identity', option: 'userIdData', mandatory: false,
        attributes: { browser: ['app.user.id', 'app.session.id', 'app.visit.id'], node: ['app.user.id', 'app.session.id', 'app.visit.id'] },
    },
    {
        id: 'resource', option: 'resourceData', mandatory: false,
        attributes: {
            browser: ['app.system.domelement'],
            node: ['app.system.memory', 'app.system.cpuusage', 'app.system.cputime', 'app.system.uptime', 'app.system.loadavg',
                'app.system.core', 'app.system.networkinterfaces'],
        },
    },
];

export interface ModuleDecision { id: string; package: string; option: string; enabled: boolean; reasons: string[]; }
export interface ProcessorDecision { id: SpanProcessorCapability['id']; option: SpanProcessorCapability['option']; enabled: boolean; mandatory: boolean; reasons: string[]; }
export interface UnsatisfiedRequirement { requirement: string; metrics: string[]; reason: string; }

/** Result of the observable-driven selection. */
export interface InstrumentationSelection {
    platform: InstrumentationPlatform;
    technology: string;
    metrics: string[];
    requirements: ResolvedObservationRequirements;
    modules: ModuleDecision[];               // every supported module of the platform, enabled or not
    processors: ProcessorDecision[];
    interactionEvents: UserInteractionEvent[]; // events configured for the user-interaction module ([] if disabled)
    unsatisfied: UnsatisfiedRequirement[];
}

export class InstrumentationSelectionError extends Error {
    constructor(message: string, public readonly code: 'UNSUPPORTED_PLATFORM' | 'UNRESOLVED_METRICS' | 'UNSATISFIED_REQUIREMENTS',
        public readonly details: unknown = undefined) {
        super(message);
        this.name = 'InstrumentationSelectionError';
    }
}

/** Platform of an application, or an explicit error for unsupported type/technology combinations. */
export function platformOf(appMetadata: ApplicationMetadata): InstrumentationPlatform {
    const type = appMetadata.type.toLowerCase();
    const technology = appMetadata.technology.toLowerCase();
    if (type.includes('frontend') && (technology.includes('angular') || technology.includes('react'))) return 'browser';
    if (type.includes('backend') && technology.includes('node')) return 'node';
    throw new InstrumentationSelectionError(
        `Instrumentation selection: unsupported application type/technology "${appMetadata.type}/${appMetadata.technology}"`, 'UNSUPPORTED_PLATFORM');
}

const EVENT_BY_NAME: Readonly<Record<Exclude<InteractionEventRequirement, '*'>, UserInteractionEvent>> = {
    click: UserInteractionEvent.CLICK, change: UserInteractionEvent.CHANGE, select: UserInteractionEvent.SELECT, submit: UserInteractionEvent.SUBMIT,
};

/**
 * Selects the instrumentation modules, span processors and interaction events required by the given
 * metrics (acronyms) on the application's platform. Deterministic. Unsatisfiable requirements are listed
 * in `unsatisfied` (and make `assertSatisfied` throw); unknown metrics and unsupported platforms throw.
 *
 * Policy:
 * 1. every required span class enables all compatible modules providing it (alternatives such as Fetch and
 *    XHR, or mysql and mysql2, cover different libraries whose use cannot be determined statically);
 * 2. a span class 'any' (attributes read from any span) is satisfied by any enabled module, otherwise by the
 *    platform's default carrier module;
 * 3. every required field must be intrinsic to spans, or emitted by an enabled module, or by a compatible
 *    span processor (which is then enabled); otherwise the first compatible module emitting it is enabled;
 * 4. the application-metadata processor is always enabled; the others only when a required field needs them;
 * 5. interaction events: the main events (change, click, select, submit) when any recognized interaction
 *    is required ('*'), plus every explicitly required event type.
 */
export function selectInstrumentation(appMetadata: ApplicationMetadata, acronyms: Iterable<string>): InstrumentationSelection {
    const platform = platformOf(appMetadata);
    const requirements = resolveObservationRequirements(acronyms);
    if (requirements.unresolved.length > 0) {
        throw new InstrumentationSelectionError(
            `Instrumentation selection: no observation requirements declared for metric(s) ${requirements.unresolved.join(', ')}`,
            'UNRESOLVED_METRICS', requirements.unresolved);
    }
    const metricsNeeding = (predicate: (m: ResolvedObservationRequirements['metrics'][number]) => boolean) =>
        requirements.metrics.filter(predicate).map((m) => m.acronym);

    const available = INSTRUMENTATION_MODULES.filter((m) => m.platform === platform);
    const enabled = new Map<string, string[]>();  // module id -> reasons
    const enable = (id: string, reason: string) => enabled.set(id, [...(enabled.get(id) ?? []), reason]);
    const unsatisfied: UnsatisfiedRequirement[] = [];

    // 1. span classes
    for (const spanClass of requirements.spanClasses.filter((c) => c !== 'any')) {
        const users = metricsNeeding((m) => m.spanClasses.includes(spanClass));
        const providers = available.filter((m) => m.spanClasses.includes(spanClass));
        if (providers.length === 0) {
            unsatisfied.push({ requirement: `span class ${spanClass}`, metrics: users, reason: `no ${platform} instrumentation module provides it` });
        }
        providers.forEach((p) => enable(p.id, `span class ${spanClass} (${users.join(', ')})`));
    }
    // 2. attributes read from any span
    if (requirements.spanClasses.includes('any') && enabled.size === 0) {
        enable(DEFAULT_CARRIER[platform], `carrier spans for processor attributes (${metricsNeeding((m) => m.spanClasses.includes('any')).join(', ')})`);
    }
    // 3./4. fields
    const processorReasons = new Map<string, string[]>();
    for (const p of SPAN_PROCESSORS) processorReasons.set(p.id, p.mandatory ? ['mandatory: application and bundle association'] : []);
    for (const field of requirements.fields) {
        const users = metricsNeeding((m) => m.fields.includes(field));
        if (INTRINSIC_FIELDS.includes(field)) {
            if (enabled.size === 0) unsatisfied.push({ requirement: `field ${field}`, metrics: users, reason: 'no span-producing module selected' });
            continue;
        }
        if (available.some((m) => enabled.has(m.id) && m.attributes.includes(field))) continue;
        const processor = SPAN_PROCESSORS.find((p) => p.attributes[platform].includes(field));
        if (processor) {
            processorReasons.get(processor.id)!.push(`field ${field} (${users.join(', ')})`);
            continue;
        }
        const producer = available.find((m) => m.attributes.includes(field));
        if (producer) { enable(producer.id, `field ${field} (${users.join(', ')})`); continue; }
        unsatisfied.push({ requirement: `field ${field}`, metrics: users, reason: `no ${platform} module or span processor emits it` });
    }

    // 5. interaction events
    let interactionEvents: UserInteractionEvent[] = [];
    if (enabled.has('user-interaction')) {
        const required = new Set<UserInteractionEvent>();
        if (requirements.events.includes('*')) UserInteractionEvent.getMainEvents().forEach((e) => required.add(e));
        requirements.events.filter((e) => e !== '*').forEach((e) => required.add(EVENT_BY_NAME[e as Exclude<InteractionEventRequirement, '*'>]));
        const order = UserInteractionEvent.getMainEvents();
        interactionEvents = Array.from(required).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }

    return {
        platform, technology: appMetadata.technology,
        metrics: requirements.metrics.map((m) => m.acronym),
        requirements,
        modules: available.map((m) => ({ id: m.id, package: m.package, option: m.option, enabled: enabled.has(m.id), reasons: enabled.get(m.id) ?? [] })),
        processors: SPAN_PROCESSORS.map((p) => ({
            id: p.id, option: p.option, mandatory: p.mandatory,
            enabled: p.mandatory || processorReasons.get(p.id)!.length > 0, reasons: processorReasons.get(p.id)!,
        })),
        interactionEvents,
        unsatisfied,
    };
}

/** Throws an explicit error when some requirement of the selection cannot be satisfied. */
export function assertSatisfied(selection: InstrumentationSelection): InstrumentationSelection {
    if (selection.unsatisfied.length > 0) {
        throw new InstrumentationSelectionError(
            'Instrumentation selection: unsatisfied observation requirements: ' +
            selection.unsatisfied.map((u) => `${u.requirement} for ${u.metrics.join(', ')} (${u.reason})`).join('; '),
            'UNSATISFIED_REQUIREMENTS', selection.unsatisfied);
    }
    return selection;
}

/** Whether a field is known to the observable registry. */
export function isObservableField(field: string): field is ObservableField {
    return Object.prototype.hasOwnProperty.call(OBSERVABLE_FIELDS, field);
}
