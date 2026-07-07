import { createLogger } from '../config/logger';
import type { ITool } from './base-tool';
import type { ToolDefinition } from '../ai/openrouter.service';

const log = createLogger('tool-registry');

/**
 * Tool Registry
 * Central registry for all available tools.
 * Tools register themselves here, and the registry provides
 * tool definitions to OpenRouter and tool lookup for execution.
 */
class ToolRegistry {
  private tools: Map<string, ITool> = new Map();

  /**
   * Register a tool. Called during app initialization.
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      log.warn({ toolName: tool.name }, 'Tool already registered, overwriting');
    }

    this.tools.set(tool.name, tool);
    log.info({ toolName: tool.name }, 'Tool registered');
  }

  /**
   * Get a tool by name.
   */
  getTool(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool definitions formatted for OpenRouter function calling.
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Get all registered tool names.
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get the number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }
}

export const toolRegistry = new ToolRegistry();

// ─────────────────────────────────────────────
// Import and register all tools here.
// To add a new tool, just import it and call register().
// ─────────────────────────────────────────────
import { createReminderTool } from './reminder/reminder.tool';
import { listRemindersTool } from './reminder/reminder.tool';
import { updateReminderTool } from './reminder/reminder.tool';
import { deleteReminderTool } from './reminder/reminder.tool';
import { createNoteTool } from './notes/notes.tool';
import { listNotesTool } from './notes/notes.tool';
import { deleteNoteTool } from './notes/notes.tool';
import { calculatorTool } from './calculator/calculator.tool';
import { saveMemoryTool } from './memory/memory.tool';

export function registerAllTools(): void {
  // Memory
  toolRegistry.register(saveMemoryTool);

  // Reminders
  toolRegistry.register(createReminderTool);
  toolRegistry.register(listRemindersTool);
  toolRegistry.register(updateReminderTool);
  toolRegistry.register(deleteReminderTool);

  // Notes
  toolRegistry.register(createNoteTool);
  toolRegistry.register(listNotesTool);
  toolRegistry.register(deleteNoteTool);

  // Calculator
  toolRegistry.register(calculatorTool);

  log.info({ totalTools: toolRegistry.size }, '✅ All tools registered');
}
