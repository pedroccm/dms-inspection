declare module "jspdf-autotable" {
  import type { jsPDF } from "jspdf";

  interface CellStyle {
    fillColor?: number[];
    textColor?: number[];
    fontSize?: number;
    fontStyle?: string;
    cellWidth?: number | "auto" | "wrap";
    halign?: "left" | "center" | "right";
    valign?: "top" | "middle" | "bottom";
  }

  interface AutoTableOptions {
    startY?: number;
    head?: (string | number)[][];
    body?: (string | number)[][];
    theme?: "striped" | "grid" | "plain";
    headStyles?: CellStyle;
    bodyStyles?: CellStyle;
    columnStyles?: Record<number | string, CellStyle>;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    styles?: CellStyle;
    didDrawPage?: (data: unknown) => void;
  }

  export default function autoTable(
    doc: jsPDF,
    options: AutoTableOptions
  ): void;
}
