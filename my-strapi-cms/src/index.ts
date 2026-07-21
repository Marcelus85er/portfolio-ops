import type { Core } from '@strapi/strapi';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    
    // A reusable function to ping GitHub
    const triggerGitHubBuild = async () => {
      try {
        await fetch('https://api.github.com/repos/Marcelus85er/portfolio-ops/dispatches', {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${process.env.GITHUB_PAT}`, 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ event_type: 'strapi-publish' }) 
        });
        console.log('🚀 Build signal sent to GitHub!');
      } catch (error) {
        console.error('❌ Failed to send build signal:', error);
      }
    };

    strapi.db.lifecycles.subscribe({
      // Listen to both your White Papers and Portfolio collections
      models: ['api::white-paper.white-paper', 'api::portfolio.portfolio'],

      // Trigger strictly on Publish
      async afterPublish(event) {
        console.log('Publish event detected!');
        await triggerGitHubBuild();
      },

      // Trigger strictly on Unpublish
      async afterUnpublish(event) {
        console.log('Unpublish event detected!');
        await triggerGitHubBuild();
      }
    });
  },
};