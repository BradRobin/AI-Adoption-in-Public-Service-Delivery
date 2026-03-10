
import Parser from 'rss-parser'

/**
 * Route configuration to ensure this API endpoint is always dynamically rendered.
 * This prevents Next.js from caching the RSS feed responses.
 */
export const dynamic = 'force-dynamic'

/**
 * Custom RSS parser configured for Google News feed structure.
 * Extracts the <source> element which contains the publisher name.
 */
const parser = new Parser<
    Record<string, unknown>,
    { source?: string; contentSnippet?: string }
>({
    customFields: {
        item: ['source'],
    },
})

/**
 * Strips HTML tags, decodes HTML entities, and removes source attribution patterns.
 * @param html - Raw HTML string to clean
 * @param source - Optional source name to strip
 * @returns Plain text string safe for display
 */
function cleanHtml(html: string, source?: string): string {
    if (!html) return ''

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '')

    // Decode HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')

    // Collapse multiple spaces and trim
    text = text.replace(/\s+/g, ' ').trim()

    // Remove source attribution patterns if provided
    if (source) {
        text = stripSourceFromText(text, source)
    }

    return text.trim()
}

/**
 * Removes source name from text in various patterns.
 * Handles trailing, leading, and inline source mentions.
 * @param text - Text to clean
 * @param source - Source name to remove
 * @returns Text without source attribution
 */
function stripSourceFromText(text: string, source: string): string {
    if (!text || !source) return text

    const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Patterns to remove (order matters - most specific first)
    const patterns = [
        // Trailing patterns: "... - Source", "... | Source", "... — Source"
        new RegExp(`\\s*[-–—|:]\\s*${escapedSource}\\s*$`, 'gi'),
        // Bracketed: "... [Source]", "... (Source)"
        new RegExp(`\\s*[\\[\\(]${escapedSource}[\\]\\)]\\s*$`, 'gi'),
        // Leading patterns: "Source - ...", "Source: ...", "Source | ..."
        new RegExp(`^${escapedSource}\\s*[-–—|:]\\s*`, 'gi'),
        // Inline with clear delimiters: " - Source - " or " | Source | "
        new RegExp(`\\s*[-–—|]\\s*${escapedSource}\\s*[-–—|]\\s*`, 'gi'),
        // Standalone at boundaries with punctuation
        new RegExp(`\\s+[-–—]\\s*${escapedSource}\\s*\\.?\\s*$`, 'gi'),
    ]

    let result = text
    for (const pattern of patterns) {
        result = result.replace(pattern, ' ').trim()
    }

    // Clean up any resulting double spaces or trailing punctuation issues
    result = result.replace(/\s+/g, ' ').replace(/\s*[\-–—|:]\s*$/, '').trim()

    return result
}

/**
 * Formats a date string into a human-readable relative or absolute format.
 * @param dateStr - ISO date string or RSS pubDate
 * @returns Formatted date string (e.g., "Today", "Yesterday", "Mar 5, 2026")
 */
function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'Recent'

    try {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`

        return date.toLocaleDateString('en-KE', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        })
    } catch {
        return 'Recent'
    }
}

/**
 * Handles GET requests to fetch recent AI-related news for Kenya.
 * Uses rss-parser for robust XML parsing of Google News RSS feed.
 * Falls back to static mock data on error.
 *
 * @returns {Promise<Response>} A JSON response containing an array of news items.
 */
export async function GET() {
    try {
        // Fetch RSS feed for "AI Kenya public services" from Google News
        // hl=en-KE&gl=KE&ceid=KE:en ensures Kenya-specific news
        const feedUrl =
            'https://news.google.com/rss/search?q=AI+Kenya+public+services&hl=en-KE&gl=KE&ceid=KE:en'

        const feed = await parser.parseURL(feedUrl)

        // Map feed items to clean news objects, limited to 7 items
        const news = feed.items.slice(0, 7).map((item) => {
            // Extract source name first - rss-parser parses <source> as object or string
            let sourceName = 'Google News'
            if (item.source) {
                if (typeof item.source === 'string') {
                    sourceName = item.source
                } else if (typeof item.source === 'object' && '_' in item.source) {
                    sourceName = (item.source as { _: string })._ || 'Google News'
                }
            }

            // Clean title - strip source attribution from title too
            const title = cleanHtml(item.title || 'Untitled', sourceName)

            // Use contentSnippet (auto-stripped by rss-parser) or clean the description
            // Pass sourceName to strip attribution
            let snippet = item.contentSnippet 
                ? stripSourceFromText(item.contentSnippet, sourceName)
                : cleanHtml(item.content || item.summary || '', sourceName)

            // Truncate snippet to ~180 chars with word boundary
            if (snippet.length > 180) {
                snippet = snippet.substring(0, 177)
                const lastSpace = snippet.lastIndexOf(' ')
                if (lastSpace > 140) {
                    snippet = snippet.substring(0, lastSpace)
                }
                snippet = snippet.replace(/[,;:\-–—]\s*$/, '') + '...'
            }

            return {
                title,
                link: item.link || '#',
                pubDate: formatDate(item.pubDate || item.isoDate),
                source: sourceName,
                snippet: snippet.trim(),
            }
        })

        return Response.json({ news })
    } catch (error) {
        // Log the error for server-side debugging
        console.error('News fetch error:', error)

        // Fallback mock data if fetch fails (e.g. rate limit or network issue)
        return Response.json({
            news: [
                {
                    title: 'Kenya launches national AI strategy for public sector',
                    link: 'https://nation.africa',
                    pubDate: 'Today',
                    source: 'Daily Nation',
                    snippet:
                        'The government has unveiled a comprehensive masterplan to integrate artificial intelligence across all public service delivery platforms by 2030.',
                },
                {
                    title: 'How AI is transforming Nairobi water and traffic management',
                    link: 'https://techcrunch.com',
                    pubDate: 'Yesterday',
                    source: 'TechCrunch',
                    snippet:
                        'Nairobi City County adopts smart sensors and AI-driven predictive modeling to ease perennial gridlocks and automate water pressure distributions.',
                },
                {
                    title: 'Government announces new AI-powered eCitizen features',
                    link: 'https://www.standardmedia.co.ke',
                    pubDate: '2 days ago',
                    source: 'The Standard',
                    snippet:
                        'New generative AI chatbots will now guide citizens through the passport application and business registration process on the eCitizen platform.',
                },
            ],
        })
    }
}
