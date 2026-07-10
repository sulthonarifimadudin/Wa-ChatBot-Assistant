import type { ITool } from '../base-tool';
import { zodToJsonSchema } from '../base-tool';
import type { ToolResult } from '../../ai/tool-executor';
import { webSearchSchema, type WebSearchInput } from './search.schema';
import { searchService } from './search.service';

export const webSearchTool: ITool = {
  name: 'web_search',
  description: 'Mencari informasi, berita, cuaca, atau fakta terbaru dari internet menggunakan DuckDuckGo.',
  inputSchema: webSearchSchema,
  parameters: zodToJsonSchema(webSearchSchema),

  async execute(input: unknown, userId: string): Promise<ToolResult> {
    const data = input as WebSearchInput;

    try {
      const results = await searchService.searchWeb(data.query, data.maxResults);

      if (results.length === 0) {
        return {
          success: true,
          data: 'Tidak ditemukan hasil pencarian untuk kata kunci tersebut.',
        };
      }

      const formattedResults = results
        .map((r, i) => `${i + 1}. ${r.title}\n${r.description}\nURL: ${r.url}`)
        .join('\n\n');

      return {
        success: true,
        data: `Hasil pencarian:\n\n${formattedResults}`,
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || 'Gagal melakukan pencarian',
      };
    }
  },
};
