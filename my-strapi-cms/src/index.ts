import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register({ strapi }: { strapi: Core.Strapi }) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    strapi.db.lifecycles.subscribe({
      // Listen to both your White Papers and Portfolio collections
      models: ['api::white-paper.white-paper', 'api::portfolio.portfolio'],

      async afterUpdate(event) {
        // Only trigger the build if the publish state changed
        if (event.params.data.publishedAt !== undefined) {
          try {
            await fetch('https://api.github.com/repos/Marcelus85er/portfolio-ops/dispatches', {
              method: 'POST',
              headers: {
                'Accept': 'application/vnd.github.v3+json',
                // 👇 Insert your NEW secure GitHub PAT here
                'Authorization': `Bearer ${process.env.GITHUB_PAT}`, 
                'Content-Type': 'application/json'
              },
              // This is the exact JSON payload GitHub expects
              body: JSON.stringify({ event_type: 'strapi-publish' }) 
            });
            console.log('Build signal sent to GitHub!');
          } catch (error) {
            console.error('Failed to send build signal:', error);
          }
        }
      },
    });
  },
};
