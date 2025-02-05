import axios, { AxiosRequestConfig } from 'axios';

interface MediumApiConfig {
  authCookies?: string;
  proxyList?: string[];
  timeout?: number;
}

class MediumApi {
  private config: MediumApiConfig;

  constructor(config: MediumApiConfig = {}) {
    this.config = { timeout: 3000, ...config };
  }

  async queryPostById(postId: string): Promise<any> {
    return this.queryPostGraphQL(postId);
  }

  private async queryPostGraphQL(postId: string): Promise<any> {
    const proxy = this.config.proxyList
      ? this.config.proxyList[Math.floor(Math.random() * this.config.proxyList.length)]
      : undefined;

    const headers = {
      'X-APOLLO-OPERATION-ID': this.generateRandomSha256Hash(),
      'X-APOLLO-OPERATION-NAME': 'FullPostQuery',
      'Accept': 'multipart/mixed; deferSpec=20220824, application/json, application/json',
      'Accept-Language': 'en-US',
      'X-Obvious-CID': 'android',
      'X-Xsrf-Token': '1',
      'X-Client-Date': Date.now().toString(),
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1 (compatible; YandexMobileBot/3.0;',
      'Cache-Control': 'public, max-age=-1',
      'Content-Type': 'application/json',
      'Connection': 'Keep-Alive',
      ...(this.config.authCookies && { 'Cookie': this.config.authCookies }),
    };

    const graphqlData = {
      operationName: 'FullPostQuery',
      variables: {
        postId: postId,
        postMeteringOptions: {},
      },
      query: 'query FullPostQuery($postId: ID!, $postMeteringOptions: PostMeteringOptions) { post(id: $postId) { __typename id ...FullPostData } meterPost(postId: $postId, postMeteringOptions: $postMeteringOptions) { __typename ...MeteringInfoData } }  fragment UserFollowData on User { id socialStats { followingCount followerCount } viewerEdge { isFollowing } }  fragment NewsletterData on NewsletterV3 { id viewerEdge { id isSubscribed } }  fragment UserNewsletterData on User { id newsletterV3 { __typename ...NewsletterData } }  fragment ImageMetadataData on ImageMetadata { id originalWidth originalHeight focusPercentX focusPercentY alt }  fragment CollectionFollowData on Collection { id subscriberCount viewerEdge { isFollowing } }  fragment CollectionNewsletterData on Collection { id newsletterV3 { __typename ...NewsletterData } }  fragment BylineData on Post { id readingTime creator { __typename id imageId username name bio tippingLink viewerEdge { isUser } ...UserFollowData ...UserNewsletterData } collection { __typename id name avatar { __typename id ...ImageMetadataData } ...CollectionFollowData ...CollectionNewsletterData } isLocked firstPublishedAt latestPublishedVersion }  fragment ResponseCountData on Post { postResponses { count } }  fragment InResponseToPost on Post { id title creator { name } clapCount responsesCount isLocked }  fragment PostVisibilityData on Post { id collection { viewerEdge { isEditor canEditPosts canEditOwnPosts } } creator { id } isLocked visibility }  fragment PostMenuData on Post { id title creator { __typename ...UserFollowData } collection { __typename ...CollectionFollowData } }  fragment PostMetaData on Post { __typename id title visibility ...ResponseCountData clapCount viewerEdge { clapCount } detectedLanguage mediumUrl readingTime updatedAt isLocked allowResponses isProxyPost latestPublishedVersion isSeries firstPublishedAt previewImage { id } inResponseToPostResult { __typename ...InResponseToPost } inResponseToMediaResource { mediumQuote { startOffset endOffset paragraphs { text type markups { type start end anchorType } } } } inResponseToEntityType canonicalUrl collection { id slug name shortDescription avatar { __typename id ...ImageMetadataData } viewerEdge { isFollowing isEditor canEditPosts canEditOwnPosts isMuting } } creator { id isFollowing name bio imageId mediumMemberAt twitterScreenName viewerEdge { isBlocking isMuting isUser } } previewContent { subtitle } pinnedByCreatorAt ...PostVisibilityData ...PostMenuData }  fragment LinkMetadataList on Post { linkMetadataList { url alts { type url } } }  fragment MediaResourceData on MediaResource { id iframeSrc thumbnailUrl }  fragment IframeData on Iframe { iframeHeight iframeWidth mediaResource { __typename ...MediaResourceData } }  fragment MarkupData on Markup { name type start end href title rel type anchorType userId creatorIds }  fragment CatalogSummaryData on Catalog { id name description type visibility predefined responsesLocked creator { id name username imageId bio viewerEdge { isUser } } createdAt version itemsLastInsertedAt postItemsCount }  fragment CatalogPreviewData on Catalog { __typename ...CatalogSummaryData id itemsConnection(pagingOptions: { limit: 10 } ) { items { entity { __typename ... on Post { id previewImage { id } } } } paging { count } } }  fragment MixtapeMetadataData on MixtapeMetadata { mediaResourceId href thumbnailImageId mediaResource { mediumCatalog { __typename ...CatalogPreviewData } } }  fragment ParagraphData on Paragraph { id name href text iframe { __typename ...IframeData } layout markups { __typename ...MarkupData } metadata { __typename ...ImageMetadataData } mixtapeMetadata { __typename ...MixtapeMetadataData } type hasDropCap dropCapImage { __typename ...ImageMetadataData } codeBlockMetadata { lang mode } }  fragment QuoteData on Quote { id postId userId startOffset endOffset paragraphs { __typename id ...ParagraphData } quoteType }  fragment HighlightsData on Post { id highlights { __typename ...QuoteData } }  fragment PostFooterCountData on Post { __typename id clapCount viewerEdge { clapCount } ...ResponseCountData responsesLocked mediumUrl title collection { id viewerEdge { isMuting isFollowing } } creator { id viewerEdge { isMuting isFollowing } } }  fragment TagNoViewerEdgeData on Tag { id normalizedTagSlug displayTitle followerCount postCount }  fragment VideoMetadataData on VideoMetadata { videoId previewImageId originalWidth originalHeight }  fragment SectionData on Section { name startIndex textLayout imageLayout videoLayout backgroundImage { __typename ...ImageMetadataData } backgroundVideo { __typename ...VideoMetadataData } }  fragment PostBodyData on RichText { sections { __typename ...SectionData } paragraphs { __typename id ...ParagraphData } }  fragment FullPostData on Post { __typename ...BylineData ...PostMetaData ...LinkMetadataList ...HighlightsData ...PostFooterCountData tags { __typename id ...TagNoViewerEdgeData } content(postMeteringOptions: $postMeteringOptions) { bodyModel { __typename ...PostBodyData } validatedShareKey } }  fragment MeteringInfoData on MeteringInfo { maxUnlockCount unlocksRemaining postIds }',
    };

    try {
      const response = await axios.post('https://medium.com/_/graphql', graphqlData, {
        headers,
        proxy: proxy ? { host: proxy } : undefined,
        timeout: this.config.timeout,
      } as AxiosRequestConfig);

      if (response.status !== 200) {
        console.error(`Failed to fetch post by ID ${postId} with status code: ${response.status}, response: ${response.data}`);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error(`Exception occurred while fetching post ${postId}:`, error);
      throw error;
    }
  }

  private generateRandomSha256Hash(): string {
    const randomInput = new Uint8Array(32);
    crypto.getRandomValues(randomInput);
    const hashBuffer = crypto.subtle.digest('SHA-256', randomInput);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export { MediumApi, MediumApiConfig };
