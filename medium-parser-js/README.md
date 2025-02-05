# Medium Parser Refactoring Plan

## 📌 Objective
Refactor existing Python codebase into TypeScript while maintaining full functionality. Create new package in `medium-parser-js` folder.

## 🛠 Technical Requirements
1. **Full TypeScript implementation**
2. **Functional equivalence** with Python version
3. **Modern Node.js patterns** (ESM, async/await)
4. **Proper error handling**
5. **Unit tests** for critical paths
6. **Dependency management** with equivalent TS libraries

## 📂 Folder Structure
```
medium-parser-js/
├── src/
│   ├── api/              # API client implementation
│   ├── core/             # Main parsing logic
│   ├── markups/          # HTML markup processors
│   ├── utils/            # Helper functions
│   └── types/           # Type definitions
├── test/                # Test files
├── templates/           # HTML templates
└── package.json
```

## 🔄 Key Translation Map
| Python Component       | TypeScript Equivalent          | Notes |
|------------------------|---------------------------------|-------|
| `AsyncSession`         | `axios`/`node-fetch`           | Use async/await |
| `loguru`               | `winston`/`bunyan`            | Configure proper transports |
| `jinja2`               | `handlebars`/`ejs`            | Template engine replacement |
| `aiohttp_retry`        | `async-retry`                 | Retry logic implementation |
| `asyncer`              | Native async/await            | No direct equivalent needed |
| `tld`                  | `tldjs`                       | Install @types/tldjs |

## 🧩 Core Components Breakdown

### 1. API Client (`api.ts`)
```typescript
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
    // Implement request logic with:
    // - Proxy rotation
    // - Headers generation
    // - Error handling
    // - Response validation
  }
}
```

### 2. Parser Core (`parser-core.ts`)
```typescript
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
    // Implement:
    // 1. Cache checking
    // 2. API fallback
    // 3. Content parsing
    // 4. Template rendering
  }

  private parseContent(content: PostContent): ParsedContent {
    // Convert Medium's content model to HTML elements
  }
}
```

## 🚦 Implementation Strategy

1. **Setup Foundation**
   ```bash
   mkdir medium-parser-js
   npm init -y
   npm install typescript @types/node --save-dev
   tsc --init
   ```

2. **Port Utility Functions First**
   ```typescript
   // utils/url-helpers.ts
   export function isMediumUrl(url: string): boolean {
     // Implement domain check logic
   }

   export function extractPostId(url: string): string | null {
     // Regex-based extraction
   }
   ```

3. **Implement API Layer**
   ```typescript
   // api/client.ts
   const DEFAULT_HEADERS = {
     'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1...',
     'X-Client-Date': Date.now().toString()
   };

   async function makeRequest(config: RequestConfig) {
     // Handle proxy rotation
     // Implement retry logic
     // Add cookie management
   }
   ```

4. **Template System Migration**
   ```handlebars
   <!-- templates/post.hbs -->
   <article class="medium-post">
     <h1>{{title}}</h1>
     {{#each paragraphs}}
       {{{this}}}
     {{/each}}
   </article>
   ```

## 🧪 Testing Approach
1. **Unit Tests** for critical paths:
   ```typescript
   describe('MediumApi', () => {
     it('should handle proxy rotation', async () => {
       const api = new MediumApi({ proxyList: ['p1', 'p2'] });
       // Verify proxy usage in requests
     });
   });
   ```

2. **Snapshot Testing** for HTML output
3. **Integration Tests** for full parsing flow

## ⚠️ Common Pitfalls
1. **Async Context Loss**
   ```typescript
   // Wrong ❌
   paragraphs.map(p => this.parseParagraph(p));

   // Correct ✅
   await Promise.all(paragraphs.map(p => this.parseParagraph(p)));
   ```

2. **Type Safety**
   ```typescript
   interface PostContent {
     bodyModel: {
       paragraphs: Array<{
         type: 'H2'|'H3'|'IMG';
         text?: string;
         markups: Markup[];
       }>;
     };
   }
   ```

3. **Error Propagation**
   ```typescript
   try {
     return await mediumApi.queryPost(id);
   } catch (error) {
     throw new MediumParserError('API request failed', { cause: error });
   }
   ```

## 🚀 Recommended Workflow
1. Start with `utils.ts` → `api.ts` → `core.ts`
2. Validate each module with tests
3. Implement logging at key points
4. Use type guards for API responses
5. Verify HTML output against Python version

## 📚 Learning Resources
1. [Node.js HTTP Client Comparison](https://blog.logrocket.com/axios-vs-fetch-best-http-requests/)
2. [Advanced TypeScript Patterns](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
3. [Jest Mocking Techniques](https://jestjs.io/docs/mock-functions)
```
