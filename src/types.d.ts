// Type declarations for packages without their own types

declare module 'qrcode-terminal' {
  export function generate(text: string, options?: { small?: boolean }): void;
  export function generate(
    text: string,
    options: { small?: boolean },
    callback: (qrcode: string) => void
  ): void;
}

declare module 'pdf-parse' {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }

  function pdfParse(buffer: Buffer, options?: Record<string, unknown>): Promise<PdfData>;
  export = pdfParse;
}
