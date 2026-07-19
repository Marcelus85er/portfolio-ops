import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksAdvertise extends Struct.ComponentSchema {
  collectionName: 'components_blocks_advertises';
  info: {
    displayName: 'Advertise';
    icon: 'priceTag';
  };
  attributes: {
    adScrypt: Schema.Attribute.Text;
  };
}

export interface BlocksArchitectureDiagram extends Struct.ComponentSchema {
  collectionName: 'components_blocks_architecture_diagrams';
  info: {
    displayName: 'Architecture Diagram';
  };
  attributes: {
    caption: Schema.Attribute.String;
    diagramImage: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
  };
}

export interface BlocksBody extends Struct.ComponentSchema {
  collectionName: 'components_blocks_bodies';
  info: {
    displayName: 'Body';
    icon: 'write';
  };
  attributes: {
    content: Schema.Attribute.RichText;
  };
}

export interface BlocksButtonCta extends Struct.ComponentSchema {
  collectionName: 'components_blocks_button_ctas';
  info: {
    displayName: 'Button / CTA';
    icon: 'cursor';
  };
  attributes: {
    buttonText: Schema.Attribute.String;
    destinationURL: Schema.Attribute.String;
    style: Schema.Attribute.Enumeration<['primary', 'secondary', 'outline']>;
  };
}

export interface BlocksCalloutNotice extends Struct.ComponentSchema {
  collectionName: 'components_blocks_callout_notices';
  info: {
    displayName: 'Callout / Notice';
    icon: 'grid';
  };
  attributes: {
    message: Schema.Attribute.Text;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<
      ['info', 'warning', 'success', 'danger']
    >;
  };
}

export interface BlocksCodeSnippet extends Struct.ComponentSchema {
  collectionName: 'components_blocks_code_snippets';
  info: {
    displayName: 'Code Snippet';
    icon: 'code';
  };
  attributes: {
    code: Schema.Attribute.Text;
    filename: Schema.Attribute.Text;
    Language: Schema.Attribute.Enumeration<
      ['bash', 'yaml', 'typescript', 'json']
    >;
  };
}

export interface BlocksKeyTakeawayQuote extends Struct.ComponentSchema {
  collectionName: 'components_blocks_key_takeaway_quotes';
  info: {
    displayName: 'Key Takeaway / Quote';
    icon: 'message';
  };
  attributes: {
    author: Schema.Attribute.String;
    quoteText: Schema.Attribute.Text;
    role: Schema.Attribute.String;
  };
}

export interface BlocksLottieBanner extends Struct.ComponentSchema {
  collectionName: 'components_blocks_lottie_banners';
  info: {
    displayName: 'Lottie Banner';
    icon: 'slideshow';
  };
  attributes: {
    animationURL: Schema.Attribute.String;
    bannerText: Schema.Attribute.Text;
    bannerTitle: Schema.Attribute.String;
    CTA: Schema.Attribute.String;
    ctaURL: Schema.Attribute.String;
    loop: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    playOnce: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface BlocksMenu extends Struct.ComponentSchema {
  collectionName: 'components_blocks_menus';
  info: {
    displayName: 'Menu';
  };
  attributes: {
    label: Schema.Attribute.String;
    URL: Schema.Attribute.String;
  };
}

export interface BlocksVideoEmbed extends Struct.ComponentSchema {
  collectionName: 'components_blocks_video_embeds';
  info: {
    displayName: 'Video Embed';
    icon: 'monitor';
  };
  attributes: {
    caption: Schema.Attribute.String;
    videoURL: Schema.Attribute.String;
  };
}

export interface SharedFooterNavigation extends Struct.ComponentSchema {
  collectionName: 'components_shared_footer_navigations';
  info: {
    displayName: 'Footer Navigation';
  };
  attributes: {
    label: Schema.Attribute.String;
    URL: Schema.Attribute.String;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    displayName: 'SEO';
    icon: 'alien';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text;
    metaImage: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    metaTitle: Schema.Attribute.String;
    preventIndexing: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'blocks.advertise': BlocksAdvertise;
      'blocks.architecture-diagram': BlocksArchitectureDiagram;
      'blocks.body': BlocksBody;
      'blocks.button-cta': BlocksButtonCta;
      'blocks.callout-notice': BlocksCalloutNotice;
      'blocks.code-snippet': BlocksCodeSnippet;
      'blocks.key-takeaway-quote': BlocksKeyTakeawayQuote;
      'blocks.lottie-banner': BlocksLottieBanner;
      'blocks.menu': BlocksMenu;
      'blocks.video-embed': BlocksVideoEmbed;
      'shared.footer-navigation': SharedFooterNavigation;
      'shared.seo': SharedSeo;
    }
  }
}
