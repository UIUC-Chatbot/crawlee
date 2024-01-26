const progressStore: Record<string, number> = {};

export function setProgressForScrape(scrapeId: string, progress: number) {
    progressStore[scrapeId] = progress;
}

export function getProgressForScrape(scrapeId: string): number {
    return progressStore[scrapeId] || 0;
}

export function clearProgressForScrape(scrapeId: string) {
    delete progressStore[scrapeId];
}