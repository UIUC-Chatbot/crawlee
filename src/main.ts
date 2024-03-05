// uploadToS3.ts
import express, { Request, Response } from 'express';
import { crawl } from './api/crawlee.js';
import cors from 'cors';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
        const { url, scrapeStrategy, match, exclude, maxPagesToCrawl, courseName, maxTokens, maxConcurrency, maxRequestsPerMinute } = req.body.params;
        console.log('Top of /crawl -- got variables :) url:', url, 'scrapeStrategy:', scrapeStrategy, 'match', match, 'exclude', exclude, 'maxPagesToCrawl:', maxPagesToCrawl, 'maxTokens:', maxTokens, 'courseName:', courseName, 'maxConcurrency:', maxConcurrency, 'maxRequestsPerMinute:', maxRequestsPerMinute)


        const config = {
            url,
            scrapeStrategy,
            match,
            maxPagesToCrawl,
            courseName,
            maxTokens,
            maxConcurrency,
            maxRequestsPerMinute,
            exclude: [...exclude, "https://www.facebook.com/**", "https://youtube.com/**", "https://linkedin.com/**", "https://instagram.com/**"],
        };
        console.log('Crawl after parsing variables: ', config);

        const results = await crawl(config);
        console.log(`Crawl completed successfully. Number of results: ${results}`);
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