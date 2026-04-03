declare module "xlsx" {
  interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }

  interface WorkSheet {
    [cell: string]: CellObject | unknown;
    "!ref"?: string;
    "!margins"?: unknown;
  }

  interface CellObject {
    t: string; // type: b, n, e, s, d, z
    v?: unknown; // raw value
    w?: string; // formatted text
    f?: string; // formula
  }

  interface ParsingOptions {
    type?: "base64" | "binary" | "buffer" | "file" | "array" | "string";
    raw?: boolean;
    dense?: boolean;
    codepage?: number;
  }

  interface Sheet2JSONOpts {
    header?: number | string[];
    range?: number | string;
    raw?: boolean;
    defval?: unknown;
    blankrows?: boolean;
  }

  export function read(data: unknown, opts?: ParsingOptions): WorkBook;
  export const utils: {
    sheet_to_json<T = Record<string, unknown>>(
      worksheet: WorkSheet,
      opts?: Sheet2JSONOpts
    ): T[];
    decode_range(range: string): { s: { c: number; r: number }; e: { c: number; r: number } };
  };
}
