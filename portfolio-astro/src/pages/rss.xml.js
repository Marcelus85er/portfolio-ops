// src/pages/rss.xml.js
import rss from '@astrojs/rss';

export async function GET(context) {
    let feedItems = [];

    try {
        // Pulls the URL from the build environment we just fixed
        const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
        
        // 1. Fetch Portfolios
        const portfolioRes = await fetch(`${STRAPI_URL}/api/portfolios?populate=*`);
        let portfolios = [];
        if (portfolioRes.ok) {
            const json = await portfolioRes.json();
            portfolios = json?.data || [];
        } else {
            console.warn(`Portfolio fetch failed: ${portfolioRes.status}`);
        }

        // 2. Fetch White Papers
        const whitePaperRes = await fetch(`${STRAPI_URL}/api/white-papers?populate=*`);
        let whitePapers = [];
        if (whitePaperRes.ok) {
            const json = await whitePaperRes.json();
            whitePapers = json?.data || [];
        } else {
            console.warn(`White Paper fetch failed: ${whitePaperRes.status}`);
        }

        // 3. Map Portfolios to RSS format
        const portfolioItems = portfolios.map((doc) => {
            const attrs = doc.attributes || doc;
            return {
                title: attrs.title,
                description: attrs.description || 'Infrastructure project overview',
                link: `/portfolio/${attrs.slug || doc.id}`, 
                // Checks for Strapi default dates
                pubDate: new Date(attrs.publishedAt || attrs.createdAt),
            };
        });

        // 4. Map White Papers to RSS format
        const whitePaperItems = whitePapers.map((doc) => {
            const attrs = doc.attributes || doc;
            return {
                title: attrs.title || attrs.Title, // Accounts for capitalization variations
                description: attrs.description || 'Deep dive into cloud architecture and DevOps.',
                link: `/white-papers/${attrs.slug || attrs.Slug || doc.id}`, 
                // Checks for your custom publishDate field first, then defaults
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
        // Fixed the fallback domain to match your live site
        site: context.site || 'https://marcel-avila.com',
        items: feedItems,
        customData: `<language>en-us</language>`,
    });
}