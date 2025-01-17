import cors from 'cors';
import express, { Request, Response } from 'express';
import { ApplicationMetadata } from '../core/application/application-metadata';
import { InstrumentationService } from '../services/instrumentation.service';
import { MetricsService } from '../services/metrics.service';
import { ProgressTracker } from '../services/progress-tracker.service';
import { QualityModelService } from '../services/quality-model.service';
import { TelemetryService } from '../services/telemetry.service';

// Initialize the app
const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Shared ProgressTracker instance
const progressTracker = new ProgressTracker();

// The services necessary to interact with backend components
const modelService = new QualityModelService();
const instrumentationService = new InstrumentationService();
const telemetryService = new TelemetryService();
const metricsService = new MetricsService();

// Passing the shared tracker instance to all services
instrumentationService.setProgressTracker(progressTracker);
telemetryService.setProgressTracker(progressTracker);
metricsService.setProgressTracker(progressTracker);

/**
 * Endpoint to retrieve the quality model and goals
 */
app.get('/api/quality-model', (req: Request, res: Response) => {
    res.json(modelService.ssqmm.qualityModel.toJSON());
});

/**
 * Endpoint to receive selected goals and application metadata and perform quality assessment
 */
app.post('/api/assessment', async (req: Request, res: Response) => {
    const { metadata, selectedGoals } = req.body;

    // console.log('Received Raw Metadata:', JSON.stringify(metadata, null, 2));

    // Ensure the metadata object is properly structured
    if (!metadata || !selectedGoals) {
        res.status(400).send({ error: 'Invalid request payload' });
        return;
    }

    // Deserialize application metadata
    const appMetadata = new ApplicationMetadata(
        metadata.name,
        metadata.type,
        metadata.technology,
        metadata.path,
        metadata.url
    );

    // Log received data
    console.log('Server: Received Application Metadata:', appMetadata);
    console.log('Server: Received Selected Goals:', selectedGoals);

    try {
        // Trigger instrumentation
        const bundleName = await instrumentationService.instrument(appMetadata, selectedGoals);

        // setup telemetry collector
        const collector = await telemetryService.setupTelemetryCollector(appMetadata, bundleName);

        // Start metrics computation
        await metricsService.computeMetrics(collector, selectedGoals);

        res.status(202).send({
            message: 'Assessment started successfully!',
            progressEndpoint: '/api/progress'
        });
    } catch (error) {
        console.error('Error during assessment:', error);
        res.status(500).send({ error: 'Assessment process failed' });
    }
});

/**
 * New endpoint to stream progress updates via Server-Sent Events (SSE)
 */
app.get('/api/progress', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Subscribe to progress updates
    progressTracker.onProgress((message) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', message })}\n\n`);
    });

    // Send metrics updates
    metricsService.onMetricsUpdated((metrics) => {
        res.write(`data: ${JSON.stringify({ type: 'metrics', metrics })}\n\n`);
    });

    req.on('close', () => {
        console.log('Server: Client disconnected from progress stream');
        res.end();
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server: Server is running on http://localhost:${port}`);
});
