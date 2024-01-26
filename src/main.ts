// uploadToS3.ts
import express, { Request, Response } from 'express';
import { crawl } from './api/crawlee.js';
import cors from 'cors';
// import { v4 as uuidv4 } from 'uuid';
import { clearProgressForScrape, getProgressForScrape } from './api/progressStore.js';


const app = express();

// const corsOptions = {
//     origin: 'https://uiuc.chat',
// };

app.use(cors()); // Enable CORS for all routes and origins
// app.use(cors(corsOptions)); // only certain routes
app.use(express.json());

app.post('/crawl', async (req: Request, res: Response) => {
    console.log('in /crawl. req.body:', req.body)
    // TODO: Frontend should send the UUID to make fetching results easier.
    // const scrapeId = uuidv4(); // Generate a unique ID for this scrape session
    try {
        const { url, scrapeStrategy, match, maxPagesToCrawl, courseName, maxTokens, scrapeId } = req.body.params;
        console.log('in /crawl -- got variables :) url:', url, 'scrapeStrategy:', scrapeStrategy, 'match', match, 'maxPagesToCrawl:', maxPagesToCrawl, 'maxTokens:', maxTokens, 'courseName:', courseName)

        const config = {
            url,
            scrapeStrategy,
            match,
            maxPagesToCrawl,
            courseName,
            maxTokens,
            exclude: ["https://www.facebook.com/**", "https://youtube.com/**", "https://linkedin.com/**", "https://instagram.com/**"],
        };

        // const results = await crawl(config);
        const results = await crawl({ ...config, scrapeId });

        console.log(`Crawl completed successfully. Number of results: ${results}`);
        // res.status(200).json(results);
        res.status(200).json({ results, scrapeId });
        if (scrapeId) {
            clearProgressForScrape(scrapeId);
        }
    } catch (error) {
        const e = error as Error;
        res.status(500).json({ error: 'An error occurred during the upload', errorTitle: e.name, errorMessage: e.message });
    } finally {
        if (global.gc) {
            global.gc();
        }
    }
});

app.get('/progress/:scrapeId', (req: Request, res: Response) => {
    const scrapeId = req.params.scrapeId;
    const progress = getProgressForScrape(scrapeId);
    res.status(200).json({ progress });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// TODO finish frontend polling

// Example using JavaScript setInterval
// const scrapeId = 'receivedScrapeIdFromServer'; // Replace with actual scrapeId from server response
// const progressCheckInterval = setInterval(() => {
//     fetch(`/progress/${scrapeId}`)
//         .then(response => response.json())
//         .then(data => {
//             updateProgressBar(data.progress); // Implement this function to update the UI
//             if (data.progress >= 100) {
//                 clearInterval(progressCheckInterval); // Stop polling when complete
//             }
//         })
//         .catch(error => console.error('Error fetching progress:', error));
// }, 2000); // Poll every 2 seconds