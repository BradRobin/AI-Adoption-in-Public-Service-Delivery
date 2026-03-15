/**
 * @file api/org-search/route.ts
 * @description API endpoint for searching organization AI/tech mentions in news.
 * Queries Google News RSS for recent articles about a specific organization.
 * Returns top 3 relevant articles for the OrgPulseCheck heuristic analysis.
 */

import { NextResponse } from 'next/server'

/** Force dynamic rendering to bypass caching */
export const dynamic = 'force-dynamic'

/**
 * Handles GET requests to fetch recent AI-related news/mentions for a specific organization.
 * It acts as a proxy for web_search and x_keyword_search by querying Google News RSS.
 *
 * @param {Request} req - Incoming request with 'q' query parameter for org name
 * @returns {Promise<NextResponse>} JSON response with articles array
 *
 * @example
 * // Request: GET /api/org-search?q=Kenya%20Revenue%20Authority
 * // Response: { articles: [{ title: '...', link: '...', source: '...' }] }
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const orgName = searchParams.get('q')

    if (!orgName) {
        return NextResponse.json({ articles: [] })
    }

    try {
        // Construct the strict query based on acceptance criteria
        const query = encodeURIComponent(`"${orgName}" Kenya (AI OR "artificial intelligence" OR chatbot OR GenAI)`)
        const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=en-KE&gl=KE&ceid=KE:en`

        const res = await fetch(feedUrl)

        if (!res.ok) {
            throw new Error(`Failed to fetch RSS: ${res.statusText}`)
        }

        const xmlText = await res.text()
        const items: any[] = []
        const itemRegex = /<item>([\s\S]*?)<\/item>/g
        let match

        while ((match = itemRegex.exec(xmlText)) !== null) {
            if (items.length >= 3) break // Limit to top 3 to keep prompt size manageable

            const itemContent = match[1]
            const titleMatch = itemContent.match(/<title>(.*?)<\/title>/)
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/)
            const sourceMatch = itemContent.match(/<source url=".*?">(.*?)<\/source>/)

            if (titleMatch && linkMatch) {
                items.push({
                    title: titleMatch[1].replace('<![CDATA[', '').replace(']]>', ''),
                    link: linkMatch[1],
                    source: sourceMatch ? sourceMatch[1] : 'Web Search'
                })
            }
        }

        return NextResponse.json({ articles: items })
    } catch (error) {
        console.error('Org search error:', error)
        // Return empty array to trigger graceful "No results" handling in the frontend
        return NextResponse.json({ articles: [] })
    }
}
