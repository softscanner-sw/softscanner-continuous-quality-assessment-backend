import express, { Request, Response } from 'express';
import cors from 'cors';
import { SSQMM } from '../core/model/model-mapping';
import { ApplicationMetadata } from '../core/application-core';

// Initialize the app
const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Create an instance of SSQMM
const ssqmm = new SSQMM();

/**
 * Endpoint to retrieve the quality model and goals
 */
app.get('/api/quality-model', (req: Request, res: Response) => {
    res.json(ssqmm.qualityModel.toJSON());
});

/**
 * Endpoint to receive selected goals and application metadata
 */
app.post('/api/quality-assessment', async (req: Request, res: Response) => {
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
        await triggerInstrumentation(appMetadata, selectedGoals);
        res.status(200).send({ message: 'Quality assessment started successfully!' });
    } catch (error) {
        console.error('Error during assessment:', error);
        res.status(500).send({ error: 'Failed to start quality assessment' });
    }
});

/**
 * Function to trigger instrumentation and bundle injection
 */
async function triggerInstrumentation(metadata: ApplicationMetadata, goals: string[]) {
    // Placeholder for your existing instrumentation logic
    console.log('Triggering instrumentation process...');
    console.log('Application Name:', metadata.name);
    console.log('Selected Goals:', goals);

    // Add your bundle injection logic here
}

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
