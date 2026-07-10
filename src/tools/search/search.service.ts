import { env } from '../../config/env';
import { createLogger } from '../../config/logger';

const log = createLogger('search-service');

export interface SearchResult {
  title: string;
  description: string;
  url: string;
}

export class SearchService {
  /**
   * Search the web using Tavily API
   */
  async searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
      log.info({ query, maxResults }, 'Searching web with Tavily');
      
      if (!env.TAVILY_API_KEY) {
        log.warn('TAVILY_API_KEY is not set. Web search is disabled.');
        throw new Error('Tavily API Key belum dipasang di .env. Fitur Web Search dinonaktifkan.');
      }

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: env.TAVILY_API_KEY,
          query: query,
          search_depth: 'basic',
          max_results: maxResults,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results.map((result: any) => ({
          title: result.title,
          description: result.content, // Tavily uses 'content' instead of 'description'
          url: result.url,
        }));
      }

      return [];
    } catch (error: any) {
      log.error({ error, query }, 'Web search failed');
      throw new Error(error.message || 'Gagal melakukan pencarian web');
    }
  }
}

export const searchService = new SearchService();
