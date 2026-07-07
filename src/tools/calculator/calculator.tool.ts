import { z } from 'zod';
import { evaluate } from 'mathjs';
import type { ITool } from '../base-tool';
import { zodToJsonSchema } from '../base-tool';
import type { ToolResult } from '../../ai/tool-executor';

const calculatorSchema = z.object({
  expression: z.string().describe('Ekspresi matematika yang akan dihitung (contoh: "123 * 928", "sqrt(144)", "2^10")'),
});

type CalculatorInput = z.infer<typeof calculatorSchema>;

/**
 * Calculator Tool
 * Uses mathjs for safe math expression evaluation.
 * Supports: arithmetic, algebra, trigonometry, statistics, unit conversions.
 */
export const calculatorTool: ITool = {
  name: 'calculator',
  description: 'Hitung ekspresi matematika. Gunakan untuk perhitungan, konversi satuan, dan operasi matematika lainnya.',
  inputSchema: calculatorSchema,
  parameters: zodToJsonSchema(calculatorSchema),

  async execute(input: unknown): Promise<ToolResult> {
    const data = input as CalculatorInput;

    try {
      const result = evaluate(data.expression);

      return {
        success: true,
        data: {
          expression: data.expression,
          result: String(result),
          message: `${data.expression} = ${result}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Gagal menghitung: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
