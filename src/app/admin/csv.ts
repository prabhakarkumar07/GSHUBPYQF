export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]).filter((k) => k !== "total_rows");
  const cell = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\n");
}
export function downloadCsv(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  a.download = name; a.click();
}
