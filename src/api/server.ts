import cors from 'cors';
import express, { Request, Response } from 'express';
import { ApplicationMetadata } from '../core/application/application-metadata';
import { AssessmentContext } from '../core/assessment/assessment-core';
import { Goal } from '../core/goals/goals';
import { InstrumentationService } from '../services/instrumentation.service';
import { ProgressTracker } from '../services/progress-tracker.service';
import { QualityAssessmentService } from '../services/quality-assessment.service';
import { QualityModelService } from '../services/quality-model.service';
import { TelemetryService } from '../services/telemetry.service';

// Initialize the Express application
const app = express();
const port = 3000;

// Enable CORS (Cross-Origin Resource Sharing) to allow requests from different origins
app.use(cors());

// Middleware to parse incoming JSON requests
app.use(express.json());

// Create a shared instance of the ProgressTracker, used to track progress across services
const progressTracker = new ProgressTracker();

// Instantiate required services
const modelService = new QualityModelService();            // Handles the quality model and goals
const instrumentationService = new InstrumentationService(); // Handles code instrumentation
const telemetryService = new TelemetryService();             // Handles telemetry collection
const qualityAssessmentService = new QualityAssessmentService(); // Manages quality assessment processes

// Pass the shared progress tracker to all services for consistent progress updates
instrumentationService.setProgressTracker(progressTracker);
telemetryService.setProgressTracker(progressTracker);
qualityAssessmentService.setProgressTracker(progressTracker);

// Store assessment contexts in memory, indexed by a unique assessment ID
const assessmentContextStore: Record<string, AssessmentContext> = {};


/**
 * GET /api/quality-model
 * Endpoint to retrieve the current quality model and its goals.
 */
app.get('/api/quality-model', (req: Request, res: Response) => {
    res.json(modelService.ssqmm.qualityModel.toJSON());
});

/**
 * POST /api/assessment
 * Endpoint to start a new quality assessment process.
 * It receives application metadata and selected goals, then performs instrumentation and telemetry setup.
 */
app.post('/api/assessment', async (req: Request, res: Response) => {
    const { metadata, selectedGoals } = req.body;

    // console.log('Received Raw Metadata:', JSON.stringify(metadata, null, 2));

    // Validate the request payload
    if (!metadata || !selectedGoals) {
        res.status(400).send({ error: 'Invalid request payload' });
        return;
    }

    // Create an ApplicationMetadata instance from the received data
    const appMetadata = new ApplicationMetadata(
        metadata.name,
        metadata.type,
        metadata.technology,
        metadata.path,
        metadata.url
    );

    // Retrieve corresponding Goal instances based on the selected goal names
    const goals = selectedGoals.map((goalName: string) =>
        modelService.ssqmm.qualityModel.getGoalByName(goalName)
    ).filter(Boolean) as Goal[];

    // Log received data
    console.log('Server: Received Application Metadata:', appMetadata);
    console.log('Server: Received Selected Goals:', goals);

    // Generate a unique assessment ID based on the current timestamp
    const assessmentId = new Date().getTime().toString();

    // Store the assessment context (metadata and goals) for future use
    assessmentContextStore[assessmentId] = { metadata: appMetadata, selectedGoals: goals };

    // Send an immediate response with the assessment ID and progress endpoints
    res.status(202).send({
        message: 'Assessment started successfully!',
        assessmentId,
        progressEndpoint: `/api/progress?assessmentId=${assessmentId}`,
        assessmentEndpoint: `/api/assessments?assessmentId=${assessmentId}`
    });

    // Perform the assessment asynchronously
    (async () => {
        try {
            // Step 1: Perform instrumentation on the application
            const bundleName = await instrumentationService.instrument(appMetadata, selectedGoals);

            // Step 2: Set up telemetry collection
            const collector = await telemetryService.setupTelemetryCollector({ appMetadata, bundleName });

            // Step 3: Configure the quality assessment service with the current context
            qualityAssessmentService.setContext({ appMetadata, bundleName }, goals, collector);

            // Step 4: Start the quality assessment process
            await qualityAssessmentService.assessQualityGoals();

            // Notify progress completion
            progressTracker.notifyProgress('Server: Assessment process completed successfully.');
        } catch (error: any) {
            console.error('Server: Error during assessment:', error);
            progressTracker.notifyProgress(`Server: Assessment process failed: ${error.message}`);
            res.status(500).send({ error: `Server: Assessment process failed: ${error.message}` });
        }
    })();
});

/**
 * GET /api/progress
 * Endpoint to stream assessment progress updates via Server-Sent Events (SSE).
 * The client receives real-time progress updates as events.
 */
app.get('/api/progress', (req: Request, res: Response) => {

    const { assessmentId } = req.query;

    // Validate the assessment ID
    if (!assessmentId || !assessmentContextStore[assessmentId as string]) {
        res.status(400).send({ error: 'Invalid or expired assessment ID' });
        return;
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Subscribe to progress updates
    progressTracker.onProgress((message) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', message })}\n\n`);
    });

    // Handle client disconnection
    req.on('close', () => {
        console.log('Server: Client disconnected from progress stream');
        res.end();
    });
});

/**
 * GET /api/assessments
 * Endpoint to stream new assessment values via Server-Sent Events (SSE).
 * The client receives real-time updates on computed metrics and assessments.
 */
app.get('/api/assessments', (req: Request, res: Response) => {
    const { assessmentId } = req.query;

    // Validate the assessment ID
    if (!assessmentId || !assessmentContextStore[assessmentId as string]) {
        res.status(400).send({ error: 'Invalid or expired assessment ID' });
        return;
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const context = assessmentContextStore[assessmentId as string];

    // Subscribe to assessment updates
    qualityAssessmentService.onAssessmentUpdated((updatedGoals) => {
        const responseData = {
            metadata: context.metadata,
            selectedGoals: updatedGoals.map(goal => ({
                name: goal.name,
                description: goal.description,
                weight: goal.weight,
                metrics: goal.metrics.map(metric => ({
                    name: metric.name,
                    acronym: metric.acronym,
                    description: metric.description,
                    value: metric.value,
                    unit: metric.unit,
                    history: metric.history
                })),
                assessments: goal.assessments.map(assessment => ({
                    timestamp: assessment.timestamp,
                    globalScore: assessment.globalScore,
                    details: assessment.assessments
                }))
            }))
        };

        res.write(`data: ${JSON.stringify(responseData)}\n\n`);
    });

    // Handle client disconnection
    req.on('close', () => {
        console.log('Server: Client disconnected from metrics stream');
        res.end();
    });
});

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server: Server is running on http://localhost:${port}`);
});
