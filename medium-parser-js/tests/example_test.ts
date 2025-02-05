import { MediumApi } from '../src/api';
import { MediumParser } from '../src/core';
import { HtmlResult } from '../src/models/htmlResult';

describe('MediumParser', () => {
  let mediumApi: MediumApi;
  let mediumParser: MediumParser;

  beforeEach(() => {
    mediumApi = new MediumApi({ timeout: 5000 });
    mediumParser = new MediumParser({
      cache: {
        pull: jest.fn(),
        push: jest.fn(),
        delete: jest.fn(),
      },
      mediumApi: mediumApi,
      hostAddress: 'http://localhost',
      templatePath: './templates/post.hbs',
    });
  });

  it('should query and render post as HTML', async () => {
    const postId = 'a079819bb465';
    const postData = {
      data: {
        post: {
          title: 'Test Post',
          previewContent: { subtitle: 'Test Subtitle' },
          previewImage: { id: 'test-image-id' },
          creator: { name: 'Test Creator', username: 'testcreator', imageId: 'test-image-id', bio: 'Test Bio' },
          collection: { name: 'Test Collection', slug: 'test-collection', shortDescription: 'Test Description', avatar: { id: 'test-avatar-id' } },
          mediumUrl: 'https://medium.com/test-post',
          readingTime: 5,
          isLocked: false,
          updatedAt: Date.now(),
          firstPublishedAt: Date.now(),
          tags: [{ displayTitle: 'Test Tag', normalizedTagSlug: 'test-tag' }],
          content: { bodyModel: { paragraphs: [] } },
          highlights: [],
        },
      },
    };

    jest.spyOn(mediumApi, 'queryPostById').mockResolvedValue(postData);

    const result: HtmlResult = await mediumParser.renderAsHtml(postId);

    expect(result).toBeInstanceOf(HtmlResult);
    expect(result.title).toBe('Test Post');
    expect(result.description).toBe('Test Subtitle');
    expect(result.url).toBe('https://medium.com/test-post');
    expect(result.data).toContain('<h1 class="pt-6 pb-2 font-sans text-3xl font-bold text-gray-900 break-normal md:text-4xl">Test Post</h1>');
  });
});
