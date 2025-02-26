import { TelemetryExportDestination, TelemetryType, UserInteractionEvent } from "../../../../core/telemetry/telemetry";
import { OpenTelemetryInstrumentationConfig } from "../opentelemetry-core";

/**
 * Configuration class for user interaction events in OpenTelemetry.
 * Defines whether event tracing is enabled and which specific events are tracked.
 */
export class OpenTelemetryUserInteractionEventsConfig {
    constructor(
        public enabled: boolean,  // Indicates if event tracing is enabled
        public events: UserInteractionEvent[]  // List of events to trace
    ) { }
}

export abstract class OpenTelemetryAutomaticTracingOptions {
    public appMetadata: boolean;
    public pageData: boolean;

    constructor({
        /**
         * Whether to include application metadata during tracing (e.g., app name, version).
         * Default: false
         */
        appMetadata = true,

        /**
         * Whether to capture page data (e.g., session, visit IDs).
         * Default: false
         */
        pageData = true,
    }) {
        this.appMetadata = appMetadata;
        this.pageData = pageData;
    }

    abstract mapOptionsToAutoInstrumentationModules(): Map<string, string>;

    getAutoInstrumentationModule(option: string) {
        const map = this.mapOptionsToAutoInstrumentationModules();
        const module = map.get(option);
        return module;
    }

    generateAutoInstrumentationEntry(option: string, enabled: boolean): string {
        const module = this.getAutoInstrumentationModule(option);

        return `
            '${module}': {
                enabled: ${enabled}  
            },
        `.trim();
    }
}

/**
 * Class representing options for automatic tracing in OpenTelemetry.
 * These options specify what types of events and data should be captured.
 */
export class OpenTelemetryWebAutomaticTracingOptions extends OpenTelemetryAutomaticTracingOptions {
    public documentLoad: boolean;
    public fetchApi: boolean;
    public ajaxRequests: boolean;
    public userInteractions: OpenTelemetryUserInteractionEventsConfig;

    constructor({
        /**
         * Whether to include application metadata during tracing (e.g., app name, version).
         * Default: false
         */
        appMetadata = true,

        /**
         * Whether to capture page data (e.g., session, visit IDs).
         * Default: false
         */
        pageData = true,

        /**
         * Configuration for user interaction events to be traced (e.g., clicks, form submissions).
         */
        userInteractions = {
            enabled: false,
            events: [] as any[]
        },

        /**
         * Whether to trace document loading and resource fetching.
         * Default: true
         */
        documentLoad = false,

        /**
         * Whether to trace requests made using the Fetch API.
         * Default: true
         */
        fetchApi = false,

        /**
         * Whether to trace AJAX requests (XMLHttpRequest).
         * Default: true
         */
        ajaxRequests = false,
    }) {
        super({ appMetadata, pageData });
        this.userInteractions = userInteractions;
        this.documentLoad = documentLoad;
        this.fetchApi = fetchApi;
        this.ajaxRequests = ajaxRequests;
    }

    mapOptionsToAutoInstrumentationModules(): Map<string, string> {
        const map = new Map<string, string>();

        map.set("documentLoad", "@opentelemetry/instrumentation-document-load");
        map.set("fetchApi", "@opentelemetry/instrumentation-fetch");
        map.set("ajaxRequests", "@opentelemetry/instrumentation-xml-http-request");
        map.set("userInteractions", "@opentelemetry/instrumentation-user-interaction");

        return map;
    }
}

/**
 * Class representing options for automatic tracing of Node backends in OpenTelemetry.
 * These options specify what types of events and data should be captured.
 */
export class OpenTelemetryNodeAutomaticTracingOptions extends OpenTelemetryAutomaticTracingOptions {
    public amqplib: boolean;
    public awsLambda: boolean;
    public awsSdk: boolean;
    public bunyan: boolean;
    public cassandra: boolean;
    public connect: boolean;
    public cucumber: boolean;
    public dataloader: boolean;
    public dns: boolean;
    public express: boolean;
    public fs: boolean;
    public genericPool: boolean;
    public graphql: boolean;
    public grpc: boolean;
    public hapi: boolean;
    public http: boolean;
    public ioredis: boolean;
    public kafkajs: boolean;
    public knex: boolean;
    public koa: boolean;
    public lruMemoizer: boolean;
    public memcached: boolean;
    public mongodb: boolean;
    public mongoose: boolean;
    public mysql: boolean;
    public mysql2: boolean;
    public nestjs: boolean;
    public net: boolean;
    public pg: boolean;
    public pino: boolean;
    public redis: boolean;
    public restify: boolean;
    public socket: boolean;
    public undici: boolean;
    public winston: boolean;
    constructor({
        /**
         * Whether to include application metadata during tracing (e.g., app name, version).
         * Default: false
         */
        appMetadata = true,

        /**
         * Whether to capture page data (e.g., session, visit IDs).
         * Default: false
         */
        pageData = true,
        amqplib = false,
        awsLambda = false,
        awsSdk = false,
        bunyan = false,
        cassandra = false,
        connect = false,
        cucumber = false,
        dataloader = false,
        dns = false,
        express = false,
        fs = false,
        genericPool = false,
        graphql = false,
        grpc = false,
        hapi = false,
        http = false,
        ioredis = false,
        kafkajs = false,
        knex = false,
        koa = false,
        lruMemoizer = false,
        memcached = false,
        mongodb = false,
        mongoose = false,
        mysql = false,
        mysql2 = false,
        nestjs = false,
        net = false,
        pg = false,
        pino = false,
        redis = false,
        restify = false,
        socket = false,
        undici = false,
        winston = false,
    }) {
        super({ appMetadata, pageData });
        this.amqplib = amqplib;
        this.awsLambda = awsLambda;
        this.awsSdk = awsSdk;
        this.bunyan = bunyan;
        this.cassandra = cassandra;
        this.connect = connect;
        this.cucumber = cucumber;
        this.dataloader = dataloader;
        this.dns = dns;
        this.express = express;
        this.fs = fs;
        this.genericPool = genericPool;
        this.graphql = graphql;
        this.grpc = grpc;
        this.hapi = hapi;
        this.http = http;
        this.ioredis = ioredis;
        this.kafkajs = kafkajs;
        this.knex = knex;
        this.koa = koa;
        this.lruMemoizer = lruMemoizer;
        this.memcached = memcached;
        this.mongodb = mongodb;
        this.mongoose = mongoose;
        this.mysql = mysql;
        this.mysql2 = mysql2;
        this.nestjs = nestjs;
        this.net = net;
        this.pg = pg;
        this.pino = pino;
        this.redis = redis;
        this.restify = restify;
        this.socket = socket;
        this.undici = undici;
        this.winston = winston;
    }

    mapOptionsToAutoInstrumentationModules(): Map<string, string> {
        const map = new Map<string, string>();

        map.set("amqplib", "@opentelemetry/instrumentation-amqplib");
        map.set("awsLambda", "@opentelemetry/instrumentation-aws-lambda");
        map.set("awsSdk", "@opentelemetry/instrumentation-aws-sdk");
        map.set("bunyan", "@opentelemetry/instrumentation-bunyan");
        map.set("cassandra", "@opentelemetry/instrumentation-cassandra-driver");
        map.set("connect", "@opentelemetry/instrumentation-connect");
        map.set("cucumber", "@opentelemetry/instrumentation-cucumber");
        map.set("dataloader", "@opentelemetry/instrumentation-dataloader");
        map.set("dns", "@opentelemetry/instrumentation-dns");
        map.set("express", "@opentelemetry/instrumentation-express");
        map.set("fs", "@opentelemetry/instrumentation-fs");
        map.set("genericPool", "@opentelemetry/instrumentation-generic-pool");
        map.set("graphql", "@opentelemetry/instrumentation-graphql");
        map.set("grpc", "@opentelemetry/instrumentation-grpc");
        map.set("hapi", "@opentelemetry/instrumentation-hapi");
        map.set("http", "@opentelemetry/instrumentation-http");
        map.set("ioredis", "@opentelemetry/instrumentation-ioredis");
        map.set("kafkajs", "@opentelemetry/instrumentation-kafkajs");
        map.set("knex", "@opentelemetry/instrumentation-knex");
        map.set("koa", "@opentelemetry/instrumentation-koa");
        map.set("lruMemoizer", "@opentelemetry/instrumentation-lru-memoizer");
        map.set("memcached", "@opentelemetry/instrumentation-memcached");
        map.set("mongodb", "@opentelemetry/instrumentation-mongodb");
        map.set("mongoose", "@opentelemetry/instrumentation-mongoose");
        map.set("mysql", "@opentelemetry/instrumentation-mysql");
        map.set("mysql2", "@opentelemetry/instrumentation-mysql2");
        map.set("nestjs", "@opentelemetry/instrumentation-nestjs-core");
        map.set("net", "@opentelemetry/instrumentation-net");
        map.set("pg", "@opentelemetry/instrumentation-pg");
        map.set("pino", "@opentelemetry/instrumentation-pino");
        map.set("redis", "@opentelemetry/instrumentation-redis");
        map.set("restify", "@opentelemetry/instrumentation-restify");
        map.set("socket", "@opentelemetry/instrumentation-socket.io");
        map.set("undici", "@opentelemetry/instrumentation-undici");
        map.set("winston", "@opentelemetry/instrumentation-winston");

        return map;
    }
}

/**
 * Configuration class for OpenTelemetry tracing instrumentation.
 * Extends the base configuration and adds specific options for tracing.
 */
export class OpenTelemetryTracingInstrumentationConfig extends OpenTelemetryInstrumentationConfig {
    constructor(
        /**
         * One or multiple types of telemetry to be collected.
         * Example: Tracing, Metrics, Logs.
         */
        telemetryTypes: TelemetryType[],

        /**
         * One or multiple destinations where telemetry data will be exported.
         * Example: OpenTelemetry collector, external monitoring service.
         */
        exportDestinations: TelemetryExportDestination[],

        /**
         * Options for automatic tracing, specifying what to trace and how.
         */
        public automaticTracingOptions: OpenTelemetryAutomaticTracingOptions,
    ) {
        // Call the parent class constructor to initialize telemetry types and export destinations
        super(telemetryTypes, exportDestinations);
    }
}