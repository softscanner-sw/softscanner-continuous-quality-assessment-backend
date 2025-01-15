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
app.post('/api/quality-assessment', (req: Request, res: Response) => {
    const { metadata, selectedGoals } = req.body;

    // Deserialize application metadata
    const appMetadata = new ApplicationMetadata(
        metadata.name,
        metadata.type,
        metadata.technology,
        metadata.path,
        metadata.url
    );

    // Perform quality assessment with the received data
    console.log('Received Application Metadata:', appMetadata);
    console.log('Received Selected Goals:', selectedGoals);

    // Here you can trigger your instrumentation and bundle injection processes
    res.status(200).send({ message: 'Quality assessment started successfully!' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
