import rss from '@astrojs/rss';

export async function GET(context) {
    let feedItems = [];

    try {
        const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
        
        // 1. Fetch Portfolios
        const portfolioRes = await fetch(`${STRAPI_URL}/api/portfolios?populate=*`);
        let portfolios = [];
        if (portfolioRes.ok) {
            const json = await portfolioRes.json();
            portfolios = json?.data || [];
        }

        // 2. Fetch White Papers
        const whitePaperRes = await fetch(`${STRAPI_URL}/api/white-papers?populate=*`);
        let whitePapers = [];
        if (whitePaperRes.ok) {
            const json = await whitePaperRes.json();
            whitePapers = json?.data || [];
        }

        // 3. Map Portfolios using the new standard schema
        const portfolioItems = portfolios.map((doc) => {
            const attrs = doc.attributes || doc;
            return {
                title: attrs.title, // Cleaned up fallback
                // Now targets your new 'excerpt' field, falls back to 'metaDescription', then static string
                description: attrs.excerpt || attrs.seo?.metaDescription || 'Infrastructure project overview',
                link: `/portfolio/${attrs.slug || doc.id}`, 
                // Prioritizes your custom publishDate field
                pubDate: new Date(attrs.publishDate || attrs.publishedAt || attrs.createdAt),
            };
        });

        // 4. Map White Papers using the new standard schema
        const whitePaperItems = whitePapers.map((doc) => {
            const attrs = doc.attributes || doc;
            return {
                title: attrs.title, // Cleaned up fallback
                description: attrs.excerpt || attrs.seo?.metaDescription || 'Deep dive into cloud architecture and DevOps.',
                link: `/white-papers/${attrs.slug || doc.id}`, 
                pubDate: new Date(attrs.publishDate || attrs.publishedAt || attrs.createdAt),
            };
        });

        // 5. Combine and sort all items from newest to oldest
        feedItems = [...portfolioItems, ...whitePaperItems].sort(
            (a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()
        );

    } catch (error) {
        console.error("RSS Feed Generation: Strapi fetch failed", error);
    }

    return rss({
        title: 'Marcel.ops | Cloud Infrastructure & DevOps',
        description: 'Building resilient, cloud-native infrastructure and AI-driven automation.',
        site: context.site || 'https://marcel-avila.com',
        items: feedItems,
        customData: `<language>en-us</language>`,
    });
}