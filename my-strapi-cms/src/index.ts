import type { Core } from '@strapi/strapi';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    
    // A reusable function to ping GitHub
    const triggerGitHubBuild = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/Marcelus85er/portfolio-ops/dispatches', {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${process.env.GITHUB_PAT}`, 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ event_type: 'strapi-publish' }) 
        });

        // 👇 This intercepts GitHub's silent rejections
        if (!response.ok) {
          const errText = await response.text();
          console.error(`❌ GitHub API Rejected! Status: ${response.status}. Reason: ${errText}`);
          return;
        }

        console.log('🚀 Build signal sent to GitHub!');
      } catch (error) {
        console.error('❌ Failed to send build signal:', error);
      }
    };

    strapi.db.lifecycles.subscribe({
      models: ['api::white-paper.white-paper', 'api::portfolio.portfolio'],

      async afterCreate(event: any) {
        const { data } = event.params;
        if (data && data.publishedAt) {
          console.log('Publish event detected on create!');
          await triggerGitHubBuild();
        }
      },

      async afterUpdate(event: any) {
        const { data } = event.params;
        if (data && Object.keys(data).includes('publishedAt')) {
          console.log('Publish/Unpublish event detected on update!');
          await triggerGitHubBuild();
        }
      }
    });
  },
};