import { ApplicationMetadata } from "../../../../../core/application/application-metadata";
import { Instrumentation, InstrumentationGenerator } from "../../../../../core/instrumentation/instrumentation-core";
import { OpenTelemetryInstrumentationConfig, OpenTelemetryInstrumentationStrategy } from "../../opentelemetry-core";

/**
 * A concrete instrumentation strategy for generating a custom span processor
 * that injects user identity data (user ID, session ID, visit ID) into each span.
 */
export class OpenTelemetryRessourceNodeInstrumentationStrategy extends OpenTelemetryInstrumentationStrategy {
    /**
     * Constructor for the user identity data instrumentation strategy.
     * @param config OpenTelemetry instrumentation configuration
     * @param application Metadata of the application being instrumented
     */
    constructor(config: OpenTelemetryInstrumentationConfig, application: ApplicationMetadata) {
        super(config, application);
    }

    /**
     * Generates the instrumentation files required for user identity data tracking.
     * @returns Array of instrumentation files
     */
    public generateInstrumentationFiles(): Instrumentation[] {
        let instrumentations: Instrumentation[] = [];
        instrumentations.push(this.generateTracingInstrumentationFile(
            `ressourceUtils.ts`
        ));

        return instrumentations;
    }

    /**
     * Generates a tracing instrumentation file for the custom span processor RessourceNodeSpanProcessor
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

        // Classes
        ${this.generateClasses()}
        `.trim();

        // path and parentPath will be set later
        return { fileName, content, srcPath, projectRootPath };
    }

    /**
     * Generates import statements for the custom span processor UserIdSpanProcessor.
     * @returns Import statements as a string
     */
    public generateImportations(): string {
        return `
        ${InstrumentationGenerator.generateImportFromStatement('Context', '@opentelemetry/api')}
        ${InstrumentationGenerator.generateImportFromStatement('Span, SpanProcessor', this.application.type.toLowerCase().includes('frontend') ? '@opentelemetry/sdk-trace-web' : '@opentelemetry/sdk-trace-base')}
        ${InstrumentationGenerator.generateImportFromStatement('v4 as uuidv4', 'uuid')}
        ${InstrumentationGenerator.generateImportFromStatement('networkInterfaces, loadavg', 'os')}

        `.trim();
    }

    /**
     * No constants are required
     * @returns an empty string
     */
    public generateConstants(): string {
        return '';
    }

    /**
     * Generates the page data processor class that injects page information (session and visit IDs) into spans.
     * @returns Class definition as a string
     */
    public generateClasses(): string {
        return `
        /**
         * Custom Span Processor that attaches user identity information
         * (e.g., user ID, session ID, visit ID, etc.)
         * to every span and forwards the control to the next span processor
         */
        export class RessourceNodeSpanProcessor implements SpanProcessor {
           
            private static readonly MEMORY_USE = "app.system.memory";
            private static readonly CPU_USAGE_METRIC = "app.system.cpuusage"; // Utilisation du CPU
            private static readonly NETWORK_INTERFACES_METRIC = "app.system.networkinterfaces"; // Interfaces réseau
            private static readonly SYSTEM_UPTIME_METRIC = "app.system.uptime"; // Temps d'activité du système
            private static readonly LOAD_AVERAGE_METRIC = "app.system.loadavg"; // Moyenne de charge du système
            private static readonly CORE_METRIC = "app.system.core"; // Moyenne de charge du système
            private static readonly DOMElement = "app.system.domelement"; // Nombre d'element du dom
            private static readonly CPU_TIME_USAGE = "app.system.cputime"; // Nombre d'element du dom


            private _nextProcessor: SpanProcessor;
            constructor(nextProcessor: SpanProcessor) {
                this._nextProcessor = nextProcessor;
            }

            /**
             * Attaches the user identity data to the span's attributes upon its start
             * Then forwards the control to the next span processor
             * @param span the target span where user identity data will be attached to
             * @param parentContext the parent context of the target span
             */
            onStart(span: Span, parentContext: Context): void {
                span.setAttribute(RessourceNodeSpanProcessor.MEMORY_USE, this.getUsedMemoryInMB());
                span.setAttribute(RessourceNodeSpanProcessor.CPU_USAGE_METRIC, this.getCpuUsagePercent());
                span.setAttribute(RessourceNodeSpanProcessor.DOMElement, this.countDomElements());
                span.setAttribute(RessourceNodeSpanProcessor.NETWORK_INTERFACES_METRIC, this.getNetworkInterfaces());
                span.setAttribute(RessourceNodeSpanProcessor.SYSTEM_UPTIME_METRIC, this.getSystemUptime());
                span.setAttribute(RessourceNodeSpanProcessor.LOAD_AVERAGE_METRIC, this.getLoadAverage());
                span.setAttribute(RessourceNodeSpanProcessor.CORE_METRIC, this.getCore());
                span.setAttribute(RessourceNodeSpanProcessor.CPU_TIME_USAGE, this.getCpuTimeUsage());


                if (document.readyState === 'complete') {
                    // La page est déjà chargée
                    span.setAttribute(RessourceNodeSpanProcessor.DOMElement, this.countDomElements());
                } else {
                    // Attendre que la page soit complètement chargée
                    window.addEventListener('load', () => {
                        span.setAttribute(RessourceNodeSpanProcessor.DOMElement, this.countDomElements());
                    });
                }

                this._nextProcessor.onStart(span, parentContext);
            }

            forceFlush(): Promise<void> {
                return this._nextProcessor.forceFlush();
            }

            onEnd(span: Span): void {
                this._nextProcessor.onEnd(span);
            }

            shutdown(): Promise<void> {
                return this._nextProcessor.shutdown();
            }

            private getNetworkInterfaces(): string | undefined {
                if (typeof process !== 'undefined') {
                    const interfaces = networkInterfaces();
                    return JSON.stringify(interfaces); 
                }
                return undefined; 
            }

            private getSystemUptime(): number | undefined {
                if (typeof process !== 'undefined') {
                    return parseFloat(process.uptime().toFixed(2)); 
                }
                return undefined; 
            }

            private getLoadAverage(): number[] | undefined {
                if (typeof process !== 'undefined') {
                    return loadavg(); 
                }
                return undefined; 
            }

            private getCore(): number | undefined {
                if (typeof process !== 'undefined') {
                    return cpus().length; 
                }
                return undefined;
            }

            private getUsedMemoryInMB(): number | undefined {
                if (typeof process !== 'undefined' && process.memoryUsage) {
                    const usedMemory = process.memoryUsage().rss / 1024 / 1024; // Convertir en MB
                    return parseFloat(usedMemory.toFixed(2));
                }
                return undefined;
            }

                private getCpuUsagePercent(): void {
                    const startUsage = process.cpuUsage();  // Récupère l'usage initial du CPU pour le processus
                    const startTime = process.hrtime();  // Récupère l'heure de départ
                    
                    // Attends un moment pour mesurer l'utilisation du CPU
                    setTimeout(() => {
                        const endUsage = process.cpuUsage(startUsage);  // Récupère l'usage du CPU après un certain temps
                        const endTime = process.hrtime(startTime);  // Temps écoulé

                        // Calcul de l'utilisation du CPU du processus en fonction du temps écoulé
                        const cpuUsed = (endUsage.user + endUsage.system);  // Temps total d'utilisation (en microsecondes)
                        const timePassed = (endTime[0] * 1e9 + endTime[1]);  // Temps écoulé en nanosecondes
                        
                        // Conversion du temps écoulé en microsecondes
                        const timePassedInMicroseconds = timePassed / 1000;

                        // Calcul du pourcentage d'utilisation
                        const cpuUsagePercent = (cpuUsed / timePassedInMicroseconds) * 100;

                    }, 1000);  // Mesure après 1 seconde
                }


               public getCpuTimeUsage(): number | undefined {
                    if (typeof process !== 'undefined' && process.cpuUsage) {
                        const cpuUsage = process.cpuUsage();

                        // Accumuler les temps d'utilisation utilisateur et système
                        this.totalCpuUsage.user += cpuUsage.user;
                        this.totalCpuUsage.system += cpuUsage.system;

                        // Retourner le temps total d'utilisation en microsecondes
                        return this.totalCpuUsage.user + this.totalCpuUsage.system;
                    }
                    return undefined; // Si l'API n'est pas disponible, retourner undefined
                }

            
                
            private countDomElements(): number {
                const allElements = document.querySelectorAll('*');
                let count = 0;
            
                allElements.forEach((el) => {
                    if (!el.closest('svg')) {
                        count++;
                    }
                });
            
                return count;
            }

            
        `.trim();
    }
}