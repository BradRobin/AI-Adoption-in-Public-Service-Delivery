
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
 * Strips HTML tags and decodes common HTML entities from a string.
 * @param html - Raw HTML string to clean
 * @returns Plain text string safe for display
 */
function cleanHtml(html: string): string {
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
    return text.replace(/\s+/g, ' ').trim()
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
            // Use contentSnippet (auto-stripped by rss-parser) or clean the description
            let snippet = item.contentSnippet || cleanHtml(item.content || item.summary || '')

            // Truncate long snippets
            if (snippet.length > 250) {
                snippet = snippet.substring(0, 247) + '...'
            }

            // Extract source name - rss-parser parses <source> as object or string
            let sourceName = 'Google News'
            if (item.source) {
                if (typeof item.source === 'string') {
                    sourceName = item.source
                } else if (typeof item.source === 'object' && '_' in item.source) {
                    sourceName = (item.source as { _: string })._ || 'Google News'
                }
            }

            return {
                title: cleanHtml(item.title || 'Untitled'),
                link: item.link || '#',
                pubDate: formatDate(item.pubDate || item.isoDate),
                source: sourceName,
                snippet,
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
