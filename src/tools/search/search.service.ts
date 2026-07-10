import { search } from 'duck-duck-scrape';
import { createLogger } from '../../config/logger';

const log = createLogger('search-service');

export interface SearchResult {
  title: string;
  description: string;
  url: string;
}

export class SearchService {
  /**
   * Search the web using DuckDuckGo
   */
  async searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
      log.info({ query, maxResults }, 'Searching web');
      
      const searchResults = await search(query);
      
      if (!searchResults.noResults) {
        return searchResults.results.slice(0, maxResults).map(result => ({
          title: result.title,
          description: result.description,
          url: result.url,
        }));
      }

      return [];
    } catch (error) {
      log.error({ error, query }, 'Web search failed');
      throw new Error('Gagal melakukan pencarian web');
    }
  }
}

export const searchService = new SearchService();
