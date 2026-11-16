import { MongoClient } from 'mongodb';
import { BenchmarkPersistence, BenchmarkState } from '../../../../../core/metrics/benchmarks';
import { TelemetryStorageEndpoint } from '../../../../../core/telemetry/telemetry';

/**
 * Stores benchmark states in the `benchmarks` collection of the telemetry database, one document per
 * (scope, acronym). `maxObserved` is updated with `$max`, so concurrent writers can only raise it.
 */
export class MongoDBBenchmarkPersistence implements BenchmarkPersistence {
    constructor(private storageEndpoint: TelemetryStorageEndpoint, private collectionName: string = 'benchmarks') { }

    private async withCollection<T>(fn: (c: any) => Promise<T>): Promise<T> {
        const client = new MongoClient(this.storageEndpoint.uri);
        await client.connect();
        try {
            return await fn(client.db(this.storageEndpoint.name).collection(this.collectionName));
        } finally {
            await client.close();
        }
    }

    async load(scope: string): Promise<BenchmarkState[]> {
        return this.withCollection(async c => {
            const docs = await c.find({ scope }).toArray();
            return docs.map((d: any) => ({
                acronym: d.acronym, initial: d.initial, maxObserved: d.maxObserved, updates: d.updates ?? 0, updatedAt: d.updatedAt,
            }));
        });
    }

    async save(scope: string, states: BenchmarkState[]): Promise<void> {
        if (states.length === 0) return;
        await this.withCollection(c => c.bulkWrite(states.map(s => ({
            updateOne: {
                filter: { scope, acronym: s.acronym },
                update: {
                    $max: { maxObserved: s.maxObserved },
                    $set: { initial: s.initial, updates: s.updates, updatedAt: s.updatedAt },
                },
                upsert: true,
            },
        }))));
    }
}
