import { MediumApi } from './api';
import { HtmlResult } from './models/htmlResult';
import { InvalidMediumPostURL, InvalidURL, MediumPostQueryError } from './exceptions';
import { parseMarkups } from './markups';
import { correctUrl, extractHexString, gettingPercentageOfMatch, isHasValidMediumPostId, isValidMediumUrl, isValidUrl, resolveMediumUrl } from './utils';
import { convertDatetimeToHumanReadable } from './time';
import Handlebars from 'handlebars';

interface ParserConfig {
  cache: CacheBackend;
  mediumApi: MediumApi;
  hostAddress: string;
  templatePath?: string;
}

class MediumParser {
  private readonly template: HandlebarsTemplate;

  constructor(private config: ParserConfig) {
    this.template = this.loadTemplates();
  }

  async renderAsHtml(postId: string): Promise<HtmlResult> {
    const postData = await this.query(postId);
    try {
      const result = await this._renderAsHtml(postData, postId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  private async resolve(unknown: string): Promise<string> {
    let postId: string | null = null;

    try {
      postId = await this.resolveUrl(unknown);
    } catch (error) {
      if (isHasValidMediumPostId(unknown)) {
        return extractHexString(unknown) as string;
      }
      throw error;
    }

    return postId;
  }

  private async resolveUrl(url: string): Promise<string> {
    const sanitizedUrl = correctUrl(url);
    if (!isValidUrl(url) || !(await isValidMediumUrl(sanitizedUrl))) {
      throw new InvalidURL(`Invalid Medium URL: ${sanitizedUrl}`);
    }

    const postId = await resolveMediumUrl(sanitizedUrl);
    if (!postId) {
      throw new InvalidMediumPostURL(`Could not find Medium post ID for URL: ${sanitizedUrl}`);
    }

    return postId;
  }

  private async deleteFromCache(postId: string): Promise<boolean> {
    this.config.cache.delete(postId);
    return true;
  }

  private async getPostDataFromCache(postId: string): Promise<any> {
    try {
      const postData = this.config.cache.pull(postId);
      if (postData) {
        const parsedData = JSON.parse(postData);
        if (parsedData) {
          return parsedData;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async getPostDataFromApi(postId: string): Promise<any> {
    try {
      return await this.config.mediumApi.queryPostById(postId);
    } catch (error) {
      return null;
    }
  }

  private async queryGet(postId: string, useCache: boolean, forceCache: boolean = false): Promise<[any, boolean]> {
    let cacheUsed = true;
    let postData = useCache ? await this.getPostDataFromCache(postId) : null;

    if (!postData && !forceCache) {
      cacheUsed = false;
      postData = await this.getPostDataFromApi(postId);
    }

    return [postData, cacheUsed];
  }

  private async query(postId: string, useCache: boolean = true, retry: number = 2, forceCache: boolean = false): Promise<any> {
    let postData: any = null;
    let isCacheUsed = false;
    let attempt = 0;
    let reason: string | null = null;

    while (!postData && attempt < retry) {
      try {
        [postData, isCacheUsed] = await this.queryGet(postId, useCache, forceCache);

        if (!postData) {
          reason = 'No post data returned';
        } else if (typeof postData !== 'object') {
          reason = `Post data is not an object: ${postData}`;
        } else if (postData.error) {
          reason = `Post data contains an error: ${postData}`;
        } else if (!postData.data) {
          reason = `Post data missing 'data' key: ${postData}`;
        } else if (!postData.data.post) {
          reason = `Post data missing 'data.post' key: ${postData}`;
        }

        if (!reason) {
          break;
        }
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
      } finally {
        attempt++;
      }
    }

    if (reason) {
      throw new MediumPostQueryError(`Could not query post by ID from API: ${postId}. Reason: ${reason}`);
    }

    if (!isCacheUsed) {
      this.config.cache.push(postId, JSON.stringify(postData));
    }

    return postData;
  }

  private parseContent(content: any): any {
    const paragraphs = content.bodyModel.paragraphs;
    const outParagraphs: string[] = [];
    let currentPos = 0;

    const parseParagraphText = (text: string, markups: any[], isCode: boolean = false): string => {
      const textFormatter = new RLStringHelper(text, isCode ? ['minimal'] : ['full']);
      const parsedMarkups = parseMarkups(markups);
      const fixedMarkups = splitOverlappingRanges(parsedMarkups);

      for (const markup of fixedMarkups) {
        textFormatter.setTemplate(markup.start, markup.end, markup.template);
      }

      return textFormatter.getText();
    };

    while (paragraphs.length > currentPos) {
      const paragraph = paragraphs[currentPos];

      if (currentPos < 4) {
        if (['H3', 'H4', 'H2'].includes(paragraph.type) && gettingPercentageOfMatch(paragraph.text, content.title) > 80) {
          if (content.title.endsWith('…')) {
            content.title = paragraph.text;
          }
          currentPos++;
          continue;
        }

        if (paragraph.type === 'H4' && content.tags.includes(paragraph.text)) {
          currentPos++;
          continue;
        }

        if (['H4', 'P'].includes(paragraph.type) && gettingPercentageOfMatch(paragraph.text, content.subtitle) > 80) {
          if (!content.subtitle.endsWith('…')) {
            content.subtitle = paragraph.text;
          }
          currentPos++;
          continue;
        }

        if (paragraph.type === 'IMG' && paragraph.metadata.id === content.previewImageId) {
          currentPos++;
          continue;
        }
      }

      const textFormatter = parseParagraphText(paragraph.text || '', paragraph.markups);

      switch (paragraph.type) {
        case 'H2':
          outParagraphs.push(`<h2 id="${paragraph.name}" class="font-bold font-sans break-normal text-gray-900 dark:text-gray-100 text-1xl md:text-2xl">${textFormatter}</h2>`);
          break;
        case 'H3':
          outParagraphs.push(`<h3 id="${paragraph.name}" class="font-bold font-sans break-normal text-gray-900 dark:text-gray-100 text-1xl md:text-2xl">${textFormatter}</h3>`);
          break;
        case 'H4':
          outParagraphs.push(`<h4 id="${paragraph.name}" class="font-bold font-sans break-normal text-gray-900 dark:text-gray-100 text-l md:text-xl">${textFormatter}</h4>`);
          break;
        case 'IMG':
          outParagraphs.push(`<div class="mt-7"><img loading="eager" alt="${paragraph.metadata.alt}" class="pt-5 m-auto" role="presentation" referrerpolicy="no-referrer" src="https://miro.medium.com/v2/resize:fit:700/${paragraph.metadata.id}"></div>`);
          if (paragraph.text) {
            outParagraphs.push(`<figcaption class='mt-3 text-sm text-center text-gray-500 dark:text-gray-200'>${textFormatter}</figcaption>`);
          }
          break;
        case 'P':
          outParagraphs.push(`<p class="leading-8 mt-7">${textFormatter}</p>`);
          break;
        case 'ULI':
          const uliItems = [];
          while (paragraphs[currentPos] && paragraphs[currentPos].type === 'ULI') {
            uliItems.push(`<li class='mt-3'>${parseParagraphText(paragraphs[currentPos].text, paragraphs[currentPos].markups)}</li>`);
            currentPos++;
          }
          outParagraphs.push(`<ul class="pl-8 mt-2 list-disc">${uliItems.join('')}</ul>`);
          currentPos--;
          break;
        case 'OLI':
          const oliItems = [];
          while (paragraphs[currentPos] && paragraphs[currentPos].type === 'OLI') {
            oliItems.push(`<li class='mt-3'>${parseParagraphText(paragraphs[currentPos].text, paragraphs[currentPos].markups)}</li>`);
            currentPos++;
          }
          outParagraphs.push(`<ol class="pl-8 mt-2 list-decimal">${oliItems.join('')}</ol>`);
          currentPos--;
          break;
        case 'PRE':
          const codeItems = [];
          while (paragraphs[currentPos] && paragraphs[currentPos].type === 'PRE') {
            codeItems.push(parseParagraphText(paragraphs[currentPos].text, paragraphs[currentPos].markups, true));
            currentPos++;
          }
          outParagraphs.push(`<pre class="flex flex-col justify-center border mt-7 dark:border-gray-700"><code class="p-2 bg-gray-100 dark:bg-gray-900 overflow-x-auto">${codeItems.join('\n')}</code></pre>`);
          currentPos--;
          break;
        case 'BQ':
          outParagraphs.push(`<blockquote style="box-shadow: inset 3px 0 0 0 rgb(209 207 239 / var(--tw-bg-opacity));" class="px-5 pt-3 pb-3 mt-5"><p class="font-italic">${textFormatter}</p></blockquote>`);
          break;
        case 'PQ':
          outParagraphs.push(`<blockquote class="ml-5 text-2xl text-gray-600 mt-7 dark:text-gray-300"><p>${textFormatter}</p></blockquote>`);
          break;
        case 'MIXTAPE_EMBED':
          const embedTitle = paragraph.text.slice(paragraph.markups[1].start, paragraph.markups[1].end);
          const embedDescription = paragraph.text.slice(paragraph.markups[2].start, paragraph.markups[2].end);
          const embedSite = new URL(paragraph.mixtapeMetadata.href).hostname;
          outParagraphs.push(`
            <div class="items-center p-2 overflow-hidden border border-gray-300 mt-7">
              <a rel="noopener follow" href="${paragraph.mixtapeMetadata.href}" target="_blank">
                <div class="flex flex-row justify-between p-2 overflow-hidden">
                  <div class="flex flex-col justify-center p-2">
                    <h2 class="text-base font-bold text-black dark:text-gray-100">${embedTitle}</h2>
                    <div class="block mt-2">
                      <h3 class="text-sm text-grey-darker">${embedDescription}</h3>
                    </div>
                    <div class="mt-5">
                      <p class="text-xs text-grey-darker">${embedSite}</p>
                    </div>
                  </div>
                  <div class="relative flex h-40 flew-row w-60">
                    <div class="absolute inset-0 bg-center bg-cover" style="background-image: url('https://miro.medium.com/v2/resize:fit:320/${paragraph.mixtapeMetadata.thumbnailImageId}'); background-repeat: no-repeat;" referrerpolicy="no-referrer"></div>
                  </div>
                </div>
              </a>
            </div>
          `);
          break;
        case 'IFRAME':
          outParagraphs.push(`<div class="mt-7"><iframe class="w-full" src="${this.config.hostAddress}/render_iframe/${paragraph.iframe.mediaResource.id}" referrerpolicy="no-referrer" allowfullscreen="" frameborder="0" scrolling="no"></iframe></div>`);
          break;
        default:
          break;
      }

      currentPos++;
    }

    return outParagraphs;
  }

  private async _renderAsHtml(postData: any, postId: string): Promise<HtmlResult> {
    const metadataTask = this.generateMetadata(postData, postId);
    const content = this.parseContent(postData.data.post.content);

    const metadata = await metadataTask;

    const postContext = {
      subtitle: metadata.subtitle,
      title: metadata.title,
      url: metadata.url,
      creator: metadata.creator,
      collection: metadata.collection,
      readingTime: metadata.readingTime,
      freeAccess: metadata.freeAccess,
      updatedAt: metadata.updatedAt,
      firstPublishedAt: metadata.firstPublishedAt,
      previewImageId: metadata.previewImageId,
      content: content,
      tags: metadata.tags,
    };

    const postTemplate = Handlebars.compile(this.template);
    const postTemplateRendered = postTemplate(postContext);

    return new HtmlResult(metadata.title, metadata.description, metadata.url, postTemplateRendered);
  }

  private async generateMetadata(postData: any, postId: string): Promise<any> {
    const title = new RLStringHelper(postData.data.post.title, ['minimal']).getText();
    const subtitle = new RLStringHelper(postData.data.post.previewContent.subtitle).getText();
    const description = new RLStringHelper(subtitle).getText();
    const previewImageId = postData.data.post.previewImage.id;
    const creator = postData.data.post.creator;
    const collection = postData.data.post.collection;
    const url = postData.data.post.mediumUrl;
    const readingTime = Math.ceil(postData.data.post.readingTime);
    const freeAccess = postData.data.post.isLocked ? 'No' : 'Yes';
    const updatedAt = convertDatetimeToHumanReadable(postData.data.post.updatedAt);
    const firstPublishedAt = convertDatetimeToHumanReadable(postData.data.post.firstPublishedAt);
    const tags = postData.data.post.tags;

    return {
      postId,
      title,
      subtitle,
      description,
      url,
      creator,
      collection,
      readingTime,
      freeAccess,
      updatedAt,
      firstPublishedAt,
      previewImageId,
      tags,
    };
  }

  private loadTemplates(): HandlebarsTemplate {
    const templatePath = this.config.templatePath || './templates/post.hbs';
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    return Handlebars.compile(templateContent);
  }
}

export { MediumParser, ParserConfig };
