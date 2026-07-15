import type { Schema, Struct } from '@strapi/strapi';

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
    Body: Schema.Attribute.Blocks;
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
      'blocks.architecture-diagram': BlocksArchitectureDiagram;
      'blocks.body': BlocksBody;
      'shared.seo': SharedSeo;
    }
  }
}
