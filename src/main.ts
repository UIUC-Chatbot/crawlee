// uploadToS3.ts
import express, { Request, Response } from 'express';
import { crawl } from './api/crawlee.js';
import cors from 'cors';

const app = express();

// const corsOptions = {
//     origin: 'https://uiuc.chat',
// };

app.use(cors()); // Enable CORS for all routes and origins
// app.use(cors(corsOptions)); // only certain routes
app.use(express.json());

app.post('/crawl', async (req: Request, res: Response) => {
    console.log('in /crawl. req.body:', req.body)
    try {
        const { url, match, maxPagesToCrawl, maxTokens, courseName } = req.body.params;
        console.log('in /crawl -- got variables :) url:', url, 'match:', match, 'maxPagesToCrawl:', maxPagesToCrawl, 'maxTokens:', maxTokens, 'courseName:', courseName)

        const config = {
            url,
            match,
            maxPagesToCrawl,
            courseName,
            maxTokens,
        };

        const results = await crawl(config);
        console.log('in /crawl -- results:', results)
        res.status(200).json(results);
    } catch (error) {
        const e = error as Error;
        res.status(500).json({ error: 'An error occurred during the upload', errorTitle: e.name, errorMessage: e.message });
    } finally {
        if (global.gc) {
            global.gc();
        }
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});