import { createLogger } from '../config/logger';
import { toolRegistry } from '../tools/registry';
import { prisma } from '../database/prisma';
import type { ToolCall } from './openrouter.service';

const log = createLogger('tool-executor');

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

/**
 * Tool Executor
 * Takes tool calls from the LLM response, validates them,
 * executes them, and returns the results.
 *
 * This is the core of the "LLM never executes directly" pattern:
 * 1. LLM requests tools via function calling
 * 2. This executor validates the request
 * 3. Executes the tool
 * 4. Logs the execution
 * 5. Returns results for the LLM to formulate its final response
 */
export class ToolExecutor {
  /**
   * Execute a batch of tool calls from the LLM.
   * Returns results mapped by tool_call_id for the next LLM turn.
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    userId: string
  ): Promise<Array<{ toolCallId: string; result: ToolResult }>> {
    const results: Array<{ toolCallId: string; result: ToolResult }> = [];

    for (const toolCall of toolCalls) {
      const { id, function: fn } = toolCall;
      const startTime = Date.now();

      log.info({ toolName: fn.name, userId }, 'Executing tool');

      let result: ToolResult;
      let parsedArgs: unknown;

      try {
        // Parse the arguments from the LLM
        parsedArgs = JSON.parse(fn.arguments);
      } catch {
        result = {
          success: false,
          data: null,
          error: `Invalid JSON arguments for tool ${fn.name}`,
        };
        results.push({ toolCallId: id, result });
        continue;
      }

      try {
        // Look up the tool in the registry
        const tool = toolRegistry.getTool(fn.name);

        if (!tool) {
          result = {
            success: false,
            data: null,
            error: `Unknown tool: ${fn.name}`,
          };
        } else {
          // Validate input with the tool's Zod schema
          const validatedInput = tool.inputSchema.safeParse(parsedArgs);

          if (!validatedInput.success) {
            result = {
              success: false,
              data: null,
              error: `Invalid input for ${fn.name}: ${validatedInput.error.message}`,
            };
          } else {
            // Execute the tool
            result = await tool.execute(validatedInput.data, userId);
          }
        }
      } catch (error) {
        log.error({ error, toolName: fn.name }, 'Tool execution failed');
        result = {
          success: false,
          data: null,
          error: `Tool execution error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      const executionTime = Date.now() - startTime;

      // Log tool execution to database for audit
      try {
        await prisma.toolExecution.create({
          data: {
            userId,
            toolName: fn.name,
            input: parsedArgs as object,
            output: result.data as object,
            status: result.success ? 'success' : 'error',
            executionTime,
          },
        });
      } catch (logError) {
        log.warn({ logError }, 'Failed to log tool execution');
      }

      log.info(
        { toolName: fn.name, success: result.success, executionTime },
        'Tool execution complete'
      );

      results.push({ toolCallId: id, result });
    }

    return results;
  }
}

export const toolExecutor = new ToolExecutor();
