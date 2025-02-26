import { ApplicationMetadata } from "../../../../../core/application/application-metadata";
import { Instrumentation, InstrumentationGenerator } from "../../../../../core/instrumentation/instrumentation-core";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy } from "../../opentelemetry-core";

/**
 * A class representing a concrete strategy for generating instrumentation files to trace page data
 */
export class OpenTelemetryPageDataInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /**
     * Constructor for the page data instrumentation strategy.
     * @param config OpenTelemetry instrumentation configuration
     * @param application Metadata of the application being instrumented
     */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /**
     * Generates the instrumentation files required for page data tracking.
     * @returns Array of instrumentation files
     */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `pageUtils.ts`
        ));

        return instrumentations;
    }

    /**
     * Generates a tracing instrumentation file with page management utilities.
     * @param fileName Name of the generated file
     * @returns An instrumentation object containing file details and content
     */
    private generateTracingInstrumentationFile(fileName: string): Instrumentation {
        // project root path
        const projectRootPath = this._projectRootPath;

        // src path
        const srcPath = this._srcPath;

        // content
        let content = `
        // Importations
        ${this.generateImportations()}

        // Functions
        ${this.generateFunctions()}

        // Interfaces
        ${this.generateInterfaces()}

        // Constants
        ${this.generateConstants()}

        // Classes
        ${this.generateClasses()}
        `.trim();

        // path and parentPath will be set later
        return { fileName, content, srcPath, projectRootPath };
    }

    /**
     * Generates import statements for the page management utilities.
     * @returns Import statements as a string
     */
    public generateImportations(): string {
        return `
        ${InstrumentationGenerator.generateImportFromStatement('Context', '@opentelemetry/api')}
        ${InstrumentationGenerator.generateImportFromStatement('Span, SpanProcessor', this.application.type.toLowerCase().includes('frontend') ? '@opentelemetry/sdk-trace-web' : '@opentelemetry/sdk-trace-base')}
        ${InstrumentationGenerator.generateImportFromStatement('v4 as uuidv4', 'uuid')}
        `.trim();
    }

    /**
     * Generates utility functions for session and visit ID generation.
     * @returns Functions as a string
     */
    private generateFunctions(): string {
        return `
        /* Generates session IDs using UUIDV4 */
        function generateSessionId(){
            return uuidv4();
        }

        /* Generates visit IDs using localStorage if available, otherwise uses a fallback global store */
        function getVisitId(): string {
            // Check if we're in a browser (i.e., window and localStorage are available)
            if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
                const thisGlobal = (globalThis as any)
                // Fallback for backend: use a global variable to persist the visit id across calls
                if (!thisGlobal._visitId || (Date.now() - thisGlobal._visitTimestamp) > VISIT_TIMEOUT_MS) {
                    thisGlobal._visitId = uuidv4();
                    thisGlobal._visitTimestamp = Date.now();
                }
                return thisGlobal._visitId;
            }

            // Browser environment: use localStorage as usual
            const storedVisitId = localStorage.getItem(VISIT_KEY);
            const storedTimestamp = localStorage.getItem(VISIT_TIMESTAMP_KEY);
            const now = Date.now();

            if (storedVisitId && storedTimestamp) {
                const timestamp = parseInt(storedTimestamp, 10);
                // If the visit is still valid (within timeout), return it.
                if (now - timestamp < VISIT_TIMEOUT_MS) {
                    return storedVisitId;
                }
            }

            // Otherwise, generate a new visit id and update the timestamp.
            const newVisitId = uuidv4();
            localStorage.setItem(VISIT_KEY, newVisitId);
            localStorage.setItem(VISIT_TIMESTAMP_KEY, now.toString());
            return newVisitId;
        }
        `.trim();
    }

    /**
     * Generates an interface for session representation.
     * @returns Interface definition as a string
     */
    private generateInterfaces(): string {
        return `
        /* Custom Session Interface */
        interface ISession {
            sessionId: string;
        }
        `.trim();
    }

    /**
     * Generates constants and session gateway functions for page management.
     * @returns Constants and gateway functions as a string
     */
    public generateConstants(): string {
        return `
        /* Key and default session values for local storage */ 
        const sessionKey = "session";
        const defaultSession: ISession = {
            sessionId: generateSessionId()
        };

        /* A session gateway function */
        const SessionGateway = () => ({
            getSession(): ISession {
                if (typeof window === 'undefined')
                    return defaultSession;
                
                const sessionString = sessionStorage.getItem(sessionKey);

                if (!sessionString)
                    sessionStorage.setItem(sessionKey, JSON.stringify(defaultSession));
                
                return JSON.parse(sessionString || JSON.stringify(defaultSession)) as ISession;
            },
            setSessionValue<K extends keyof ISession>(key: K, value: ISession[K]){
                const session = this.getSession();

                sessionStorage.setItem(sessionKey, JSON.stringify({...session, [key]: value}));
            }
        });

        /* Page visit constants */
        const VISIT_KEY = "app.visit.id";
        const VISIT_TIMESTAMP_KEY = "app.visit.timestamp";
        const VISIT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
        `.trim();
    }

    /**
     * Generates the page data processor class that injects page information (session and visit IDs) into spans.
     * @returns Class definition as a string
     */
    public generateClasses(): string {
        return `
        /* Custom Span Processor for Page Data information (e.g., sessions, visits, etc.) */
        export class PageDataSpanProcessor implements SpanProcessor {
            private _nextProcessor: SpanProcessor;
            private sessionData = "app.session.id";
            private visitData = "app.visit.id";

            constructor(nextProcessor: SpanProcessor){
                this._nextProcessor = nextProcessor;
            }
            
            onStart(span: Span, parentContext: Context): void {
                span.setAttribute(this.sessionData, SessionGateway().getSession().sessionId);
                span.setAttribute(this.visitData, getVisitId());
                this._nextProcessor.onStart(span, parentContext);
            }

            forceFlush(): Promise<void>{
                return this._nextProcessor.forceFlush();
            }

            onEnd(span: Span): void {
                this._nextProcessor.onEnd(span);
            }

            shutdown(): Promise<void> {
                return this._nextProcessor.shutdown();
            }
        }
        `.trim();
    }
}