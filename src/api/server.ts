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
const qualityAssessmentService = new QualityAssessmentService();

// Passing the shared tracker instance to all services
instrumentationService.setProgressTracker(progressTracker);
telemetryService.setProgressTracker(progressTracker);
qualityAssessmentService.setProgressTracker(progressTracker);

// Assessment Context Store
const assessmentContextStore: Record<string, AssessmentContext> = {};


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

    // Retrieve Goal API instances based on selected goal names
    const goals = selectedGoals.map((goalName: string) =>
        modelService.ssqmm.qualityModel.getGoalByName(goalName)
    ).filter(Boolean) as Goal[];

    // Log received data
    console.log('Server: Received Application Metadata:', appMetadata);
    console.log('Server: Received Selected Goals:', goals);

    // Generate a unique assessment ID
    const assessmentId = new Date().getTime().toString();

    // Initialize assessment context with selected goals
    assessmentContextStore[assessmentId] = { metadata: appMetadata, selectedGoals: goals };

    // Respond immediately with the assessment ID
    res.status(202).send({
        message: 'Assessment started successfully!',
        assessmentId,
        progressEndpoint: `/api/progress?assessmentId=${assessmentId}`,
        assessmentEndpoint: `/api/assessments?assessmentId=${assessmentId}`
    });

    // Asynchronously execute the instrumentation process
    (async () => {
        try {
            // Trigger instrumentation
            const bundleName = await instrumentationService.instrument(appMetadata, selectedGoals);

            // Setup telemetry collector
            const collector = await telemetryService.setupTelemetryCollector({ appMetadata, bundleName });

            // Set context dynamically before assessment starts
            qualityAssessmentService.setContext({ appMetadata, bundleName }, goals, collector);

            // Start quality assessment
            await qualityAssessmentService.assessQualityGoals();

            progressTracker.notifyProgress('Server: Assessment process completed successfully.');
        } catch (error: any) {
            console.error('Server: Error during assessment:', error);
            progressTracker.notifyProgress(`Server: Assessment process failed: ${error.message}`);
            res.status(500).send({ error: `Server: Assessment process failed: ${error.message}` });
        }
    })();
});

/**
 * Endpoint to stream assessment progress updates via Server-Sent Events (SSE)
 */
app.get('/api/progress', (req: Request, res: Response) => {

    const { assessmentId } = req.query;

    if (!assessmentId || !assessmentContextStore[assessmentId as string]) {
        res.status(400).send({ error: 'Invalid or expired assessment ID' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Subscribe to progress updates
    progressTracker.onProgress((message) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', message })}\n\n`);
    });

    req.on('close', () => {
        console.log('Server: Client disconnected from progress stream');
        res.end();
    });
});

/**
 * Endpoint to stream new assessment values via Server-Sent Events (SSE)
 */
app.get('/api/assessments', (req: Request, res: Response) => {
    const { assessmentId } = req.query;

    if (!assessmentId || !assessmentContextStore[assessmentId as string]) {
        res.status(400).send({ error: 'Invalid or expired assessment ID' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const context = assessmentContextStore[assessmentId as string];

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

    req.on('close', () => {
        console.log('Server: Client disconnected from metrics stream');
        res.end();
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server: Server is running on http://localhost:${port}`);
});
