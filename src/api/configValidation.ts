import { z } from "zod";
import type { Page } from "playwright";
import { configDotenv } from "dotenv";

configDotenv();

const Page: z.ZodType<Page> = z.any();

export const configSchema = z.object({
    /**
     * URL to start the crawl, if url is a sitemap, it will crawl all pages in the sitemap
     * @example "https://www.builder.io/c/docs/developers"
     * @example "https://www.builder.io/sitemap.xml"
     * @default ""
     */
    url: z.string(),
    /**
     * Pattern to match against for links on a page to subsequently crawl
     * match is ONLY required when scrapeStrategy == "equal-and-below"
     * @example "https://www.builder.io/c/docs/**"
     * @default ""
     */
    match: z.string().or(z.array(z.string())).optional(),
    /**
     * Strategy to use when enqueueing URLs. Only allows 'all', 'same-domain', or 'equal-and-below'.
     * @example "same-domain"
     * @default "same-domain"
     */
    scrapeStrategy: z.enum(["all", "same-domain", "same-hostname", "equal-and-below"]),
    /**
     * If true use enqueueLinks strategy: 'same-domain', otherwise use strategy: 'all' which wanders the internet
     * @example "true"
     * @default true
     */
    // stayOnBaseUrl: z.boolean(),
    /**
     * Pattern to match against for links on a page to exclude from crawling
     * @example "https://linkedin.com/**"
     * @default ["https://www.facebook.com/**", "https://youtube.com/**", "https://linkedin.com/**", "https://instagram.com/**"]
     */
    exclude: z.string().or(z.array(z.string())).default(["https://www.facebook.com/**", "https://youtube.com/**", "https://linkedin.com/**", "https://instagram.com/**"]),
    /**
     * Selector to grab the inner text from
     * @example ".docs-builder-container"
     * @default ""
     */
    selector: z.string().optional(),
    /**
     * Don't crawl more than this many pages
     * @default 50
     */
    maxPagesToCrawl: z.number().int().positive(),
    /**
     * Let the crawler know it can run up to X requests concurrently at any time
     * @default 20
     */
    maxConcurrency: z.number().int().positive().default(20),
    /**
     * but also ensure the crawler never exceeds 250 requests per minute
     * @default 120
     */
    maxRequestsPerMinute: z.number().int().positive().default(120),
    /**
     * The name of the course to which these will be added.
     * @default ""
     */
    courseName: z.string(),
    /** Optional cookie to be set. E.g. for Cookie Consent */
    cookie: z
        .union([
            z.object({
                name: z.string(),
                value: z.string(),
            }),
            z.array(
                z.object({
                    name: z.string(),
                    value: z.string(),
                }),
            ),
        ])
        .optional(),
    /** Optional function to run for each page found */
    onVisitPage: z
        .function()
        .args(
            z.object({
                page: Page,
                pushData: z.function().args(z.any()).returns(z.promise(z.void())),
            }),
        )
        .returns(z.promise(z.void()))
        .optional(),
    /** Optional timeout for waiting for a selector to appear */
    waitForSelectorTimeout: z.number().int().nonnegative().optional(),
    /** Optional resources to exclude
     *
     * @example
     * ['png','jpg','jpeg','gif','svg','css','js','ico','woff','woff2','ttf','eot','otf','mp4','mp3','webm','ogg','wav','flac','aac','zip','tar','gz','rar','7z','exe','dmg','apk','csv','xls','xlsx','doc','docx','pdf','epub','iso','dmg','bin','ppt','pptx','odt','avi','mkv','xml','json','yml','yaml','rss','atom','swf','txt','dart','webp','bmp','tif','psd','ai','indd','eps','ps','zipx','srt','wasm','m4v','m4a','webp','weba','m4b','opus','ogv','ogm','oga','spx','ogx','flv','3gp','3g2','jxr','wdp','jng','hief','avif','apng','avifs','heif','heic','cur','ico','ani','jp2','jpm','jpx','mj2','wmv','wma','aac','tif','tiff','mpg','mpeg','mov','avi','wmv','flv','swf','mkv','m4v','m4p','m4b','m4r','m4a','mp3','wav','wma','ogg','oga','webm','3gp','3g2','flac','spx','amr','mid','midi','mka','dts','ac3','eac3','weba','m3u','m3u8','ts','wpl','pls','vob','ifo','bup','svcd','drc','dsm','dsv','dsa','dss','vivo','ivf','dvd','fli','flc','flic','flic','mng','asf','m2v','asx','ram','ra','rm','rpm','roq','smi','smil','wmf','wmz','wmd','wvx','wmx','movie','wri','ins','isp','acsm','djvu','fb2','xps','oxps','ps','eps','ai','prn','svg','dwg','dxf','ttf','fnt','fon','otf','cab']
     */
    resourceExclusions: z.array(z.string()).optional(),

    /** Optional maximum file size in megabytes to include in the output file
     * @example 1
     */
    maxFileSize: z.number().int().positive().optional(),
    /** Optional maximum number tokens to include in the output file
     * @example 5000
     */
    maxTokens: z.number().int().positive().optional(),
    /**
     * Groups of documents to be processed
     * @example ["group1", "group2"]
     * @default []
     */
    documentGroups: z.array(z.string()).optional().default([]),
});

export type Config = z.infer<typeof configSchema>;
