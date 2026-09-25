import Papa from "papaparse";
import * as XLSX from "xlsx";
import { FormSchemaJson, ResponseRow, allAnswerKeys } from "./schema";

/** Excel/Sheets treat a leading =, +, -, or @ as a formula. Prefix with a tab-safe apostrophe-free guard. */
function escapeFormulaInjection(value: unknown): string {
  const s = value === undefined || value === null ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@]/.test(s)) return `'${s}`;
  return s;
}

function buildRows(schema: FormSchemaJson, responses: ResponseRow[]) {
  const keys = allAnswerKeys(schema);
  const header = ["submitted_at", "source", "duration_sec", "form_version", ...keys.map((k) => k.id)];
  const rows = responses.map((r) => {
    const row: Record<string, string> = {
      submitted_at: r.submitted_at,
      source: r.source,
      duration_sec: String(r.duration_sec ?? ""),
      form_version: String(r.form_version),
    };
    for (const k of keys) row[k.id] = escapeFormulaInjection(r.answers[k.id]);
    return row;
  });
  const labelMap = keys.map((k) => ({ id: k.id, label: k.label }));
  return { header, rows, labelMap };
}

export function exportCsv(schema: FormSchemaJson, responses: ResponseRow[], filename: string) {
  const { header, rows } = buildRows(schema, responses);
  const csv = Papa.unparse({ fields: header, data: rows.map((r) => header.map((h) => r[h])) });
  downloadBlob(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export function exportJson(schema: FormSchemaJson, responses: ResponseRow[], filename: string) {
  const { labelMap } = buildRows(schema, responses);
  const payload = { columnLabels: labelMap, responses };
  downloadBlob(JSON.stringify(payload, null, 2), `${filename}.json`, "application/json");
}

export function exportXlsx(schema: FormSchemaJson, responses: ResponseRow[], filename: string) {
  const { header, rows, labelMap } = buildRows(schema, responses);
  const wb = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.json_to_sheet(rows, { header });
  XLSX.utils.book_append_sheet(wb, dataSheet, "Responses");
  const labelSheet = XLSX.utils.json_to_sheet(labelMap);
  XLSX.utils.book_append_sheet(wb, labelSheet, "Column labels");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
