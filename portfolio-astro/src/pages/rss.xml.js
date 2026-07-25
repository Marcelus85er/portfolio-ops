// src/pages/rss.xml.js
import rss from '@astrojs/rss';

export async function GET(context) {
    let portfolioItems = [];

    try {
        const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
        // Fetch your portfolios (or blog/white-papers) to populate the feed
        const response = await fetch(`${STRAPI_URL}/api/portfolios?populate=*`);
        
        if (response.ok) {
            const json = await response.json();
            const docs = json?.data || [];
            
            // Map Strapi data to RSS format
            portfolioItems = docs.map((doc) => {
                const attrs = doc.attributes || doc;
                return {
                    title: attrs.title,
                    description: attrs.description || 'Infrastructure project overview',
                    // Fallback to ID if you don't have a slug field
                    link: `/portfolio/${attrs.slug || doc.id}`, 
                    pubDate: new Date(attrs.publishedAt || attrs.createdAt),
                };
            });
        }
    } catch (error) {
        console.warn("RSS Feed Generation: Strapi fetch failed", error);
    }

    return rss({
        title: 'Marcel.ops | Cloud Infrastructure & DevOps',
        description: 'Building resilient, cloud-native infrastructure and AI-driven automation.',
        // Context.site pulls directly from your astro.config.mjs
        site: context.site || 'https://marcel-ops.com',
        items: portfolioItems,
        customData: `<language>en-us</language>`,
    });
}