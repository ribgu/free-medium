import { MediumParser, ParserConfig } from './core';
import { MediumApi, MediumApiConfig } from './api';

async function main(url: string) {
  const mediumApiConfig: MediumApiConfig = {
    // Add any necessary configuration for MediumApi
  };

  const parserConfig: ParserConfig = {
    cache: new CacheBackend(), // Implement CacheBackend as needed
    mediumApi: new MediumApi(mediumApiConfig),
    hostAddress: 'https://your-host-address.com', // Replace with your host address
    templatePath: './templates/post.hbs', // Replace with your template path
  };

  const mediumParser = new MediumParser(parserConfig);

  try {
    const postId = await mediumParser.resolve(url);
    const htmlResult = await mediumParser.renderAsHtml(postId);
    console.log(htmlResult.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Replace with the URL you want to parse
const url = 'https://medium.com/some-post-url';
main(url);
