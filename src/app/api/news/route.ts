
/**
 * Route configuration to ensure this API endpoint is always dynamically rendered.
 * This prevents Next.js from caching the RSS feed responses.
 */
export const dynamic = 'force-dynamic'

/**
 * Handles GET requests to fetch recent AI-related news for Kenya.
 * It primarily attempts to fetch data from the Google News RSS feed.
 * If that fails, it falls back to providing static mock news data.
 *
 * @returns {Promise<Response>} A JSON response containing an array of news items.
 */
export async function GET() {
    try {
        // Fetch RSS feed for "AI Kenya public services" from Google News
        // hl=en-KE&gl=KE&ceid=KE:en ensures Kenya-specific news
        const feedUrl = 'https://news.google.com/rss/search?q=AI+Kenya+public+services&hl=en-KE&gl=KE&ceid=KE:en'
        const res = await fetch(feedUrl)

        if (!res.ok) {
            throw new Error(`Failed to fetch RSS: ${res.statusText}`)
        }

        const xmlText = await res.text()

        // Simple XML parsing to extract items (avoiding heavy xml2js dependency for simplicity)
        // We look for <item> blocks and extract title, link, pubDate, source
        const items: any[] = []

        // Regex to extract items - robust enough for RSS 2.0 standard structure
        const itemRegex = /<item>([\s\S]*?)<\/item>/g
        let match

        while ((match = itemRegex.exec(xmlText)) !== null) {
            if (items.length >= 7) break // Limit to 7 items

            const itemContent = match[1]

            const titleMatch = itemContent.match(/<title>(.*?)<\/title>/)
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/)
            const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/)
            const sourceMatch = itemContent.match(/<source url=".*?">(.*?)<\/source>/)
            // Match description, which is often wrapped in CDATA
            const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/)

            if (titleMatch && linkMatch) {
                // Strip HTML and CDATA from description to create a clean snippet
                let snippetRaw = descMatch ? descMatch[1] : ''
                snippetRaw = snippetRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') // remove CDATA
                let snippet = snippetRaw.replace(/<[^>]*>?/gm, '').trim() // strip HTML tags
                // Decode common HTML entities (basic)
                snippet = snippet.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

                // Truncate if too long
                if (snippet.length > 250) {
                    snippet = snippet.substring(0, 247) + '...'
                }

                items.push({
                    title: titleMatch[1].replace('<![CDATA[', '').replace(']]>', '').replace(/&apos;/g, "'").replace(/&quot;/g, '"'),
                    link: linkMatch[1],
                    pubDate: dateMatch ? new Date(dateMatch[1]).toLocaleDateString() : 'Recent',
                    source: sourceMatch ? sourceMatch[1] : 'Google News',
                    snippet: snippet
                })
            }
        }

        return Response.json({ news: items })

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
                    snippet: 'The government has unveiled a comprehensive masterplan to integrate artificial intelligence across all public service delivery platforms by 2030.'
                },
                {
                    title: 'How AI is transforming Nairobi water and traffic management',
                    link: 'https://techcrunch.com',
                    pubDate: 'Yesterday',
                    source: 'TechCrunch',
                    snippet: 'Nairobi City County adopts smart sensors and AI-driven predictive modeling to ease perennial gridlocks and automate water pressure distributions.'
                },
                {
                    title: 'Government announces new AI-powered eCitizen features',
                    link: 'https://www.standardmedia.co.ke',
                    pubDate: '2 days ago',
                    source: 'The Standard',
                    snippet: 'New generative AI chatbots will now guide citizens through the passport application and business registration process on the eCitizen platform.'
                }
            ]
        })
    }
}
