import { z } from 'zod';
import type { ToolResult } from '../ai/tool-executor';

/**
 * Base Tool Interface
 * Every tool in the system must implement this interface.
 *
 * To add a new tool:
 * 1. Create a new folder in src/tools/<name>/
 * 2. Create <name>.tool.ts implementing ITool
 * 3. Register it in src/tools/registry.ts
 *
 * That's it — the tool will automatically be available to the LLM.
 */
export interface ITool {
  /** Unique tool name (used in function calling) */
  name: string;

  /** Human-readable description for the LLM */
  description: string;

  /** Zod schema for validating input from the LLM */
  inputSchema: z.ZodSchema;

  /**
   * JSON Schema representation of the parameters
   * (sent to OpenRouter for function calling)
   */
  parameters: Record<string, unknown>;

  /**
   * Execute the tool with validated input.
   * @param input - Validated input from the LLM
   * @param userId - The user requesting the tool
   */
  execute(input: unknown, userId: string): Promise<ToolResult>;
}

/**
 * Helper to convert a Zod schema to a basic JSON Schema
 * compatible with OpenRouter function calling.
 */
export function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;
    properties[key] = zodTypeToJsonSchema(zodType, key);

    // Check if the field is required (not optional)
    if (!zodType.isOptional()) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function zodTypeToJsonSchema(zodType: z.ZodTypeAny, _key: string): Record<string, unknown> {
  // Unwrap optionals
  if (zodType instanceof z.ZodOptional) {
    return zodTypeToJsonSchema(zodType.unwrap(), _key);
  }

  // Unwrap defaults
  if (zodType instanceof z.ZodDefault) {
    return zodTypeToJsonSchema(zodType._def.innerType, _key);
  }

  if (zodType instanceof z.ZodString) {
    const result: Record<string, unknown> = { type: 'string' };
    if (zodType.description) result.description = zodType.description;
    return result;
  }

  if (zodType instanceof z.ZodNumber) {
    const result: Record<string, unknown> = { type: 'number' };
    if (zodType.description) result.description = zodType.description;
    return result;
  }

  if (zodType instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (zodType instanceof z.ZodEnum) {
    return { type: 'string', enum: zodType.options };
  }

  if (zodType instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodTypeToJsonSchema(zodType.element, _key),
    };
  }

  // Fallback
  return { type: 'string' };
}
