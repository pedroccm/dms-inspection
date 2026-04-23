#!/usr/bin/env node
/**
 * Generates a sample XLSX for the "Importar" button in the new O.S. form.
 * Two columns: "Nº 052R" and "Nº 300". Includes a header row (the import
 * parser tolerates both — it skips any row whose first cell has no digit).
 *
 * Usage: node scripts/generate-sample-batch.cjs [output-path]
 */
const path = require("path");
const XLSX = require("xlsx");

const defaultOut = path.resolve(
  process.env.USERPROFILE || process.env.HOME || ".",
  "Downloads",
  "sample-lote-importacao.xlsx"
);
const outPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : defaultOut;

const rows = [
  ["Nº 052R", "Nº 300"],
  ["052R-31716", "300-21962"],
  ["052R-31717", "300-21963"],
  ["052R-31718", "300-21964"],
  ["052R-31719", "300-21965"],
  ["052R-31720", "300-21966"],
  ["052R-31721", "300-21967"],
  ["052R-31722", "300-21968"],
  ["052R-31723", "300-21969"],
  ["052R-31724", "300-21970"],
  ["052R-31725", "300-21971"],
];

const sheet = XLSX.utils.aoa_to_sheet(rows);
sheet["!cols"] = [{ wch: 14 }, { wch: 14 }];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, "Equipamentos");

XLSX.writeFile(workbook, outPath);

console.log(`Planilha gerada: ${outPath}`);
console.log(`Linhas de dados: ${rows.length - 1}`);
