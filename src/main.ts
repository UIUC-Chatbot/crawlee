// uploadToS3.ts
import express, { Request, Response } from 'express';
import { crawl } from './api/crawlee.js';

const app = express();
app.use(express.json());

app.post('/crawl', async (req: Request, res: Response) => {
    try {
        const { url, match, maxPagesToCrawl, maxTokens, courseName } = req.body;

        const config = {
            url,
            match,
            maxPagesToCrawl,
            courseName,
            maxTokens,
        };

        const results = await crawl(config);
        res.status(200).json(results);
    } catch (error) {
        const e = error as Error;
        res.status(500).json({ error: 'An error occurred during the upload', errorTitle: e.name, errorMessage: e.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});