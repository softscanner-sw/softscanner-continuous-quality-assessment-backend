import cors from 'cors';
import { spawn } from 'child_process';
import express, { Request, Response } from 'express';
import { QualityAssessmentService } from '../assessment/quality-assessment-service';
import { ApplicationMetadata } from '../core/application-core';

// Initialize the app
const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Create an instance of the QualityAssessmentService
const qualityAssessmentService = new QualityAssessmentService();

// Function to start the WebSocket telemetry collector
function startTelemetryCollector() {
    console.log('Starting WebSocket telemetry collector...');

    // Launch the collector as a separate process
    const collectorProcess = spawn('node', ['dist/api/websockets-server.js'], {
        stdio: 'inherit', // This pipes the output to the main console
    });

    // Handle collector process events
    collectorProcess.on('error', (error) => {
        console.error('Error starting telemetry collector:', error);
    });

    collectorProcess.on('close', (code) => {
        console.log(`Collector: WebSocketTelemetryCollector process exited with code ${code}`);
    });

    console.log('Collector: WebSocket telemetry collector running on ws://localhost:8081');
}

/**
 * Endpoint to retrieve the quality model and goals
 */
app.get('/api/quality-model', (req: Request, res: Response) => {
    res.json(qualityAssessmentService.ssqmm.qualityModel.toJSON());
});

/**
 * Endpoint to receive selected goals and application metadata
 */
app.post('/api/instrumentation', async (req: Request, res: Response) => {
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
    console.log('Received Application Metadata:', appMetadata);
    console.log('Received Selected Goals:', selectedGoals);

    // Perform quality assessment with the received data
    try {
        await qualityAssessmentService.performQualityAssessment(appMetadata, selectedGoals);

         // Start the telemetry collector after instrumentation is complete
         startTelemetryCollector();

        res.status(200).send({ message: 'Instrumentation completed successfully!' });
    } catch (error) {
        console.error('Error during instrumentation:', error);
        res.status(500).send({ error: 'Failed to start instrumentation' });
    }
});

/**
 * New endpoint to stream progress updates via Server-Sent Events (SSE)
 */
app.get('/api/progress', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    qualityAssessmentService.onProgress((message) => {
        res.write(`data: ${JSON.stringify({ message })}\n\n`);
    });

    req.on('close', () => {
        console.log('Client disconnected from progress stream');
        res.end();
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
