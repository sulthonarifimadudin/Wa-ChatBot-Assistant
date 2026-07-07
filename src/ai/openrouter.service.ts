import { env } from '../config/env';
import { createLogger } from '../config/logger';

const log = createLogger('openrouter');

/**
 * Message types for the OpenRouter Chat Completions API.
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter Service
 * Handles all communication with the OpenRouter API.
 * Supports regular chat and tool-calling (function calling).
 */
export class OpenRouterService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.baseUrl = env.OPENROUTER_BASE_URL;
    this.apiKey = env.OPENROUTER_API_KEY;
    this.model = env.OPENROUTER_MODEL;
  }

  /**
   * Send a chat completion request to OpenRouter.
   * Supports optional tool definitions for function calling.
   */
  async chat(params: {
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<ChatCompletionResponse> {
    const { messages, tools, temperature = 0.7, maxTokens = 2048 } = params;

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    // Only include tools if we have them
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    log.debug(
      { model: this.model, messageCount: messages.length, toolCount: tools?.length ?? 0 },
      'Sending chat request to OpenRouter'
    );

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://wa-ai-assistant.local',
          'X-Title': 'WA AI Assistant',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        log.error(
          { status: response.status, body: errorBody },
          'OpenRouter API error'
        );
        throw new Error(`OpenRouter API error: ${response.status} — ${errorBody}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;

      log.debug(
        {
          finishReason: data.choices[0]?.finish_reason,
          hasToolCalls: !!data.choices[0]?.message.tool_calls,
          usage: data.usage,
        },
        'OpenRouter response received'
      );

      return data;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('OpenRouter API error')) {
        throw error;
      }
      log.error({ error }, 'Failed to reach OpenRouter');
      throw new Error(`Failed to reach OpenRouter: ${error}`);
    }
  }

  /**
   * Simple text completion — no tools, just a question → answer.
   * Useful for memory extraction and summarization.
   */
  async simpleChat(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
    });

    return response.choices[0]?.message.content || '';
  }
}

export const openRouterService = new OpenRouterService();
