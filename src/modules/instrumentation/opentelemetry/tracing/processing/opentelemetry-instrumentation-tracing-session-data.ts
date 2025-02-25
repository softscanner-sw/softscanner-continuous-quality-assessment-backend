import { ApplicationMetadata } from "../../../../../core/application/application-metadata";
import { Instrumentation, InstrumentationGenerator } from "../../../../../core/instrumentation/instrumentation-core";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy } from "../../opentelemetry-core";

/**
 * A class representing a concrete strategy for generating instrumentation files to trace session data
 */
export class OpenTelemetrySessionDataInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /**
     * Constructor for the session data instrumentation strategy.
     * @param config OpenTelemetry instrumentation configuration
     * @param application Metadata of the application being instrumented
     */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /**
     * Generates the instrumentation files required for session data tracking.
     * @returns Array of instrumentation files
     */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `sessionUtils.ts`
        ));

        return instrumentations;
    }

    /**
     * Generates a tracing instrumentation file with session management utilities.
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
     * Generates import statements for the session management utilities.
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
     * Generates utility functions for session ID generation.
     * @returns Functions as a string
     */
    private generateFunctions(): string {
        return `
        /* Generates session IDs using UUIDV4 */
        function generateSessionId(){
            return uuidv4();
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
     * Generates constants and session gateway functions for session management.
     * @returns Constants and gateway functions as a string
     */
    public generateConstants(): string {
        return `
        /* Key and default session values for local storage */ 
        const sessionKey = "session";
        const defaultSession: ISession = {
            sessionId: generateSessionId()
        };

        /* A Session Gateway Function */
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
        `.trim();
    }

    /**
     * Generates the session processor class that injects session information into spans.
     * @returns Class definition as a string
     */
    public generateClasses(): string {
        return `
        /* Custom Span Processor for Session information */
        export class SessionIdSpanProcessor implements SpanProcessor {
            private _nextProcessor: SpanProcessor;
            private _dataName = "app.session.id";

            constructor(nextProcessor: SpanProcessor){
                this._nextProcessor = nextProcessor;
            }
            
            onStart(span: Span, parentContext: Context): void {
                span.setAttribute(this._dataName, SessionGateway().getSession().sessionId);
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