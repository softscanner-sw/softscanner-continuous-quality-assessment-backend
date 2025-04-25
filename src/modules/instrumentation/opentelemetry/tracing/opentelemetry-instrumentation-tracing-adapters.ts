import { ApplicationMetadata } from "../../../../core/application/application-metadata";
import { InstrumentationGenerator } from "../../../../core/instrumentation/instrumentation-core";
import { TelemetryExportDestinationType } from "../../../../core/telemetry/telemetry";
import { OpenTelemetryEventRegistry } from "../opentelemetry-core";
import { OpenTelemetryNodeAutomaticTracingOptions, OpenTelemetryTracingInstrumentationConfig, OpenTelemetryWebAutomaticTracingOptions } from "./opentelemetry-instrumentation-tracing-core";

export abstract class OpenTelemetryTracingInstrumentationAdapter {
    constructor(
        public config: OpenTelemetryTracingInstrumentationConfig,
        public appMetadata: ApplicationMetadata
    ) { }
    instrumentationDependencies(): string[] {
        return [
            // common dependencies
            "@opentelemetry/api",
            "@opentelemetry/instrumentation",
            "@opentelemetry/resources",
            "@opentelemetry/semantic-conventions",
            "@opentelemetry/sdk-trace-base",
            "@opentelemetry/exporter-trace-otlp-http",
            "uuid",
            "@types/uuid",

        ];
    }
    abstract generateImportations(): string;
    abstract generateProvider(): string;
    abstract generateProviderContextManagerRegistration(): string;
    abstract generateTracerProviderAutoInstrumentationRegistration(): string;
}

export class OpenTelemetryDefaultTracingInstrumentationAdapter extends OpenTelemetryTracingInstrumentationAdapter {
    generateImportations(): string {
        throw new Error("Method not implemented.");
    }

    generateProvider(): string {
        throw new Error("Method not implemented.");
    }

    generateProviderContextManagerRegistration(): string {
        throw new Error("Method not implemented.");
    }

    generateTracerProviderAutoInstrumentationRegistration(): string {
        throw new Error("Method not implemented.");
    }

}

export class OpenTelemetryWebTracingInstrumentationAdapter extends OpenTelemetryTracingInstrumentationAdapter {
    constructor(
        config: OpenTelemetryTracingInstrumentationConfig,
        appMetadata: ApplicationMetadata
    ) { super(config, appMetadata) }

    instrumentationDependencies(): string[] {
        return [
            // common dependencies
            ...super.instrumentationDependencies(),

            // web (frontend) dependencies
            "@opentelemetry/core",
            "@opentelemetry/sdk-trace-web",
            "@opentelemetry/auto-instrumentations-web",
            "@opentelemetry/context-zone",
            "ws",
            "babel-polyfill",
            "path-browserify",
            "@types/path-browserify",
            "webpack",
            "terser-webpack-plugin"
        ];
    }

    generateImportations(): string {
        const config = this.config;
        const exportDestinations = config.exportDestinations;

        let importations = `
        ${InstrumentationGenerator.generateImportStatement('babel-polyfill')}
        ${InstrumentationGenerator.generateImportFromStatement('getWebAutoInstrumentations', '@opentelemetry/auto-instrumentations-web')}
        ${InstrumentationGenerator.generateImportFromStatement('ZoneContextManager', '@opentelemetry/context-zone')}
        ${InstrumentationGenerator.generateImportFromStatement('registerInstrumentations', '@opentelemetry/instrumentation')}
        ${InstrumentationGenerator.generateImportFromStatement('Resource', '@opentelemetry/resources')}
        ${InstrumentationGenerator.generateImportFromStatement('BatchSpanProcessor, WebTracerProvider', '@opentelemetry/sdk-trace-web')}
        ${InstrumentationGenerator.generateImportFromStatement('SemanticResourceAttributes', '@opentelemetry/semantic-conventions')}
        `.trim();

        /* Add imports for specific export destinations */
        // Importation for console exportation (if provided in the configuration)
        if (exportDestinations.some(exportDestination => exportDestination.type == TelemetryExportDestinationType.CONSOLE)) {
            importations += `
            ${InstrumentationGenerator.generateImportFromStatement('ConsoleSpanExporter', '@opentelemetry/sdk-trace-web')}
            `.trim();
        }

        return importations;
    }

    generateProvider(): string {
        return `
        export const tracerProvider = new WebTracerProvider({
            resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
                [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: serviceInstanceID,
            }),
        });
        `.trim();
    }

    generateProviderContextManagerRegistration(): string {
        return `
        tracerProvider.register({
            contextManager: new ZoneContextManager(),
        });
        `.trim();
    }

    generateTracerProviderAutoInstrumentationRegistration(): string {
        const automaticTracingOptions = (this.config.automaticTracingOptions as OpenTelemetryWebAutomaticTracingOptions);

        let register = `
        registerInstrumentations({
            instrumentations: [
                getWebAutoInstrumentations({        
        `.trim();

        // Check document and resource loading and fetching
        register += automaticTracingOptions.generateAutoInstrumentationEntry("documentLoad", automaticTracingOptions.documentLoad);

        // Check fetching API
        register += automaticTracingOptions.generateAutoInstrumentationEntry("fetchApi", automaticTracingOptions.fetchApi);

        // Check AJAX
        register += automaticTracingOptions.generateAutoInstrumentationEntry("ajaxRequests", automaticTracingOptions.ajaxRequests);

        // Check User Interactions
        if (automaticTracingOptions.userInteractions.enabled) {
            register += `
                '${automaticTracingOptions.getAutoInstrumentationModule("userInteractions")}': {
                    eventNames: [
            `.trim();

            // Register each selected event
            OpenTelemetryEventRegistry.getStringRepresentations(
                automaticTracingOptions.userInteractions.events
            ).forEach(eventStr => register += `\n\t\t\t\t\t'${eventStr}',`);

            register += `
                    ]
                },
            `.trim();
        }
        else {
            register += automaticTracingOptions.generateAutoInstrumentationEntry("userInteractions",
                automaticTracingOptions.userInteractions.enabled);
        }

        register += `
                }),
            ],
            tracerProvider: tracerProvider
        });
        `.trim();

        return register;
    }
}

export class OpenTelemetryNodeTracingInstrumentationAdapter extends OpenTelemetryTracingInstrumentationAdapter {

    instrumentationDependencies(): string[] {
        return [
            // common dependencies
            ...super.instrumentationDependencies(),

            // node dependencies
            "@opentelemetry/sdk-trace-node",
            "@opentelemetry/auto-instrumentations-node",
        ];
    }

    generateImportations(): string {
        const config = this.config;
        const exportDestinations = config.exportDestinations;

        let importations = `
        ${InstrumentationGenerator.generateImportFromStatement('getNodeAutoInstrumentations', '@opentelemetry/auto-instrumentations-node')}
        ${InstrumentationGenerator.generateImportFromStatement('registerInstrumentations', '@opentelemetry/instrumentation')}
        ${InstrumentationGenerator.generateImportFromStatement('Resource', '@opentelemetry/resources')}
        ${InstrumentationGenerator.generateImportFromStatement('BatchSpanProcessor', '@opentelemetry/sdk-trace-base')}
        ${InstrumentationGenerator.generateImportFromStatement('NodeTracerProvider', '@opentelemetry/sdk-trace-node')}
        ${InstrumentationGenerator.generateImportFromStatement('SemanticResourceAttributes', '@opentelemetry/semantic-conventions')}
        `.trim();

        /* Add imports for specific export destinations */
        // Importation for console exportation (if provided in the configuration)
        if (exportDestinations.some(exportDestination => exportDestination.type == TelemetryExportDestinationType.CONSOLE)) {
            importations += `
            ${InstrumentationGenerator.generateImportFromStatement('ConsoleSpanExporter', '@opentelemetry/sdk-trace-base')}
            `.trim();
        }

        return importations;
    }

    generateProvider(): string {
        return `
        export const tracerProvider = new NodeTracerProvider({
            resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
                [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: serviceInstanceID,
            }),
        });
        `.trim();
    }

    generateProviderContextManagerRegistration(): string {
        return `
        tracerProvider.register();
        `.trim();
    }

    generateTracerProviderAutoInstrumentationRegistration(): string {
        const automaticTracingOptions = (this.config.automaticTracingOptions as OpenTelemetryNodeAutomaticTracingOptions);

        let register = `
        registerInstrumentations({
            instrumentations: [
                getNodeAutoInstrumentations({        
        `.trim();

        // Check RabbitMQ
        register += automaticTracingOptions.generateAutoInstrumentationEntry("amqplib", automaticTracingOptions.amqplib);

        // Check AWS Lambda
        register += automaticTracingOptions.generateAutoInstrumentationEntry("awsLambda", automaticTracingOptions.awsLambda);

        // Check AWS SDK
        register += automaticTracingOptions.generateAutoInstrumentationEntry("awsSdk", automaticTracingOptions.awsSdk);

        // Check bunyan
        register += automaticTracingOptions.generateAutoInstrumentationEntry("bunyan", automaticTracingOptions.bunyan);

        // Check Cassandra
        register += automaticTracingOptions.generateAutoInstrumentationEntry("cassandra", automaticTracingOptions.cassandra);

        // Check Connect
        register += automaticTracingOptions.generateAutoInstrumentationEntry("connect", automaticTracingOptions.connect);

        // Check Cucumber
        register += automaticTracingOptions.generateAutoInstrumentationEntry("cucumber", automaticTracingOptions.cucumber);

        // Check Dataloader
        register += automaticTracingOptions.generateAutoInstrumentationEntry("dataloader", automaticTracingOptions.dataloader);

        // Check DNS
        register += automaticTracingOptions.generateAutoInstrumentationEntry("dns", automaticTracingOptions.dns);

        // Check Express
        register += automaticTracingOptions.generateAutoInstrumentationEntry("express", automaticTracingOptions.express);

        // Check FS
        register += automaticTracingOptions.generateAutoInstrumentationEntry("fs", automaticTracingOptions.fs);

        // Check Generic Pool
        register += automaticTracingOptions.generateAutoInstrumentationEntry("genericPool", automaticTracingOptions.genericPool);

        // Check GraphQL
        register += automaticTracingOptions.generateAutoInstrumentationEntry("graphql", automaticTracingOptions.graphql);

        // Check gRPC
        register += automaticTracingOptions.generateAutoInstrumentationEntry("grpc", automaticTracingOptions.grpc);

        // Check Hapi
        register += automaticTracingOptions.generateAutoInstrumentationEntry("hapi", automaticTracingOptions.hapi);

        // Check HTTP
        register += automaticTracingOptions.generateAutoInstrumentationEntry("http", automaticTracingOptions.http);

        // Check ioredis
        register += automaticTracingOptions.generateAutoInstrumentationEntry("ioredis", automaticTracingOptions.ioredis);

        // Check Kafka
        register += automaticTracingOptions.generateAutoInstrumentationEntry("kafkajs", automaticTracingOptions.kafkajs);

        // Check knex
        register += automaticTracingOptions.generateAutoInstrumentationEntry("knex", automaticTracingOptions.knex);

        // Check Koa
        register += automaticTracingOptions.generateAutoInstrumentationEntry("koa", automaticTracingOptions.koa);

        // Check lru-memoizer
        register += automaticTracingOptions.generateAutoInstrumentationEntry("lruMemoizer", automaticTracingOptions.lruMemoizer);

        // Check Memcached
        register += automaticTracingOptions.generateAutoInstrumentationEntry("memcached", automaticTracingOptions.memcached);

        // Check MongoDB
        register += automaticTracingOptions.generateAutoInstrumentationEntry("mongodb", automaticTracingOptions.mongodb);

        // Check Mongoose
        register += automaticTracingOptions.generateAutoInstrumentationEntry("mongoose", automaticTracingOptions.mongoose);

        // Check MySQL
        register += automaticTracingOptions.generateAutoInstrumentationEntry("mysql", automaticTracingOptions.mysql);

        // Check MySQL 2
        register += automaticTracingOptions.generateAutoInstrumentationEntry("mysql2", automaticTracingOptions.mysql2);

        // Check NestJS
        register += automaticTracingOptions.generateAutoInstrumentationEntry("nestjs", automaticTracingOptions.nestjs);

        // Check net
        register += automaticTracingOptions.generateAutoInstrumentationEntry("net", automaticTracingOptions.net);

        // Check PostgreSQL
        register += automaticTracingOptions.generateAutoInstrumentationEntry("pg", automaticTracingOptions.pg);

        // Check pino
        register += automaticTracingOptions.generateAutoInstrumentationEntry("pino", automaticTracingOptions.pino);

        // Check Redis
        register += automaticTracingOptions.generateAutoInstrumentationEntry("redis", automaticTracingOptions.redis);

        // Check Restify
        register += automaticTracingOptions.generateAutoInstrumentationEntry("restify", automaticTracingOptions.restify);

        // Check socket.io
        register += automaticTracingOptions.generateAutoInstrumentationEntry("socket", automaticTracingOptions.socket);

        // Check Undici/fetch API
        register += automaticTracingOptions.generateAutoInstrumentationEntry("undici", automaticTracingOptions.undici);

        // Check Winston
        register += automaticTracingOptions.generateAutoInstrumentationEntry("winston", automaticTracingOptions.winston);

        register += `
                }),
            ],
            tracerProvider: tracerProvider
        });
        `.trim();

        return register;
    }

}