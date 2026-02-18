import Papa from "papaparse";
import type { ArtCsvRow, CardCsvRow, CsvValidationIssue, CsvValidationResult, EffectsCsvRow } from "./types";
import {
  OPTIONAL_ART_COLUMNS,
  OPTIONAL_CARD_COLUMNS,
  OPTIONAL_EFFECT_COLUMNS,
  REQUIRED_ART_COLUMNS,
  REQUIRED_CARD_COLUMNS,
  REQUIRED_EFFECT_COLUMNS
} from "./constants";

function hashContent(csv: string): string {
  let hash = 2166136261;
  for (let i = 0; i < csv.length; i += 1) {
    hash ^= csv.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function parseTable(csv: string): {
  rows: Array<Record<string, string>>;
  issues: CsvValidationIssue[];
  fileHash: string;
} {
  const fileHash = hashContent(csv);
  const parsed = Papa.parse<Record<string, string | undefined>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim()
  });

  const rows = parsed.data.map((row: Record<string, string | undefined>) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = typeof value === "string" ? value.trim() : "";
    }
    return normalized;
  });

  const issues: CsvValidationIssue[] = [];
  for (const error of parsed.errors) {
    issues.push({
      row: (error.row ?? 0) + 1,
      severity: "error",
      message: error.message
    });
  }

  return { rows, issues, fileHash };
}

export function parseCardsCsv(csv: string): CsvValidationResult<CardCsvRow> {
  const parsed = parseTable(csv);
  const rows = parsed.rows as unknown as CardCsvRow[];
  const issues: CsvValidationIssue[] = [...parsed.issues];

  const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];

  for (const col of REQUIRED_CARD_COLUMNS) {
    if (!headers.includes(col)) {
      issues.push({ row: 0, column: col, severity: "error", message: `Missing required column: ${col}` });
    }
  }

  for (const col of headers) {
    if (![...REQUIRED_CARD_COLUMNS, ...OPTIONAL_CARD_COLUMNS].includes(col as never)) {
      issues.push({ row: 0, column: col, severity: "warning", message: `Unknown column ignored: ${col}` });
    }
  }

  rows.forEach((row: CardCsvRow, index: number) => {
    const rowIndex = index + 2;
    for (const col of REQUIRED_CARD_COLUMNS) {
      const value = row[col];
      if (!value || !String(value).trim()) {
        issues.push({ row: rowIndex, column: col, severity: "error", message: `Required value missing` });
      }
    }

    if (row.type && !["unit", "spell", "artifact"].includes(row.type)) {
      issues.push({ row: rowIndex, column: "type", severity: "error", message: "Invalid card type" });
    }

    if (row.rarity && !["common", "uncommon", "rare", "epic", "legendary"].includes(row.rarity)) {
      issues.push({ row: rowIndex, column: "rarity", severity: "error", message: "Invalid rarity" });
    }

    if (row.variant && !["base", "foil", "alt_art", "promo"].includes(row.variant)) {
      issues.push({ row: rowIndex, column: "variant", severity: "error", message: "Invalid variant" });
    }

    for (const statCol of ["cost", "attack", "health"] as const) {
      const value = row[statCol];
      if (value && Number.isNaN(Number(value))) {
        issues.push({ row: rowIndex, column: statCol, severity: "error", message: "Stat must be numeric" });
      }
    }
  });

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    rows,
    issues,
    fileHash: parsed.fileHash
  };
}

export function parseEffectsCsv(csv: string): CsvValidationResult<EffectsCsvRow> {
  const parsed = parseTable(csv);
  const rows = parsed.rows as unknown as EffectsCsvRow[];
  const issues: CsvValidationIssue[] = [...parsed.issues];

  const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];

  for (const col of REQUIRED_EFFECT_COLUMNS) {
    if (!headers.includes(col)) {
      issues.push({ row: 0, column: col, severity: "error", message: `Missing required column: ${col}` });
    }
  }

  for (const col of headers) {
    if (![...REQUIRED_EFFECT_COLUMNS, ...OPTIONAL_EFFECT_COLUMNS].includes(col as never)) {
      issues.push({ row: 0, column: col, severity: "warning", message: `Unknown column ignored: ${col}` });
    }
  }

  rows.forEach((row: EffectsCsvRow, index: number) => {
    const rowIndex = index + 2;
    for (const col of REQUIRED_EFFECT_COLUMNS) {
      const value = row[col];
      if (!value || !String(value).trim()) {
        issues.push({ row: rowIndex, column: col, severity: "error", message: `Required value missing` });
      }
    }

    const json = row.effect_json;
    if (json && json.trim().length > 0) {
      try {
        JSON.parse(json);
      } catch {
        issues.push({ row: rowIndex, column: "effect_json", severity: "error", message: "effect_json must be valid JSON" });
      }
    }
  });

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    rows,
    issues,
    fileHash: parsed.fileHash
  };
}

export function parseArtCsv(csv: string): CsvValidationResult<ArtCsvRow> {
  const parsed = parseTable(csv);
  const rows = parsed.rows as unknown as ArtCsvRow[];
  const issues: CsvValidationIssue[] = [...parsed.issues];

  const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];

  for (const col of REQUIRED_ART_COLUMNS) {
    if (!headers.includes(col)) {
      issues.push({ row: 0, column: col, severity: "error", message: `Missing required column: ${col}` });
    }
  }

  for (const col of headers) {
    if (![...REQUIRED_ART_COLUMNS, ...OPTIONAL_ART_COLUMNS].includes(col as never)) {
      issues.push({ row: 0, column: col, severity: "warning", message: `Unknown column ignored: ${col}` });
    }
  }

  rows.forEach((row: ArtCsvRow, index: number) => {
    const rowIndex = index + 2;
    for (const col of REQUIRED_ART_COLUMNS) {
      const value = row[col];
      if (!value || !String(value).trim()) {
        issues.push({ row: rowIndex, column: col, severity: "error", message: `Required value missing` });
      }
    }

    const mode = row.source_mode;
    if (mode && !["upload", "external", "ai_fal"].includes(mode)) {
      issues.push({ row: rowIndex, column: "source_mode", severity: "error", message: "Invalid source_mode" });
    }
  });

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    rows,
    issues,
    fileHash: parsed.fileHash
  };
}
