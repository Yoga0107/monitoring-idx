import type { IndexCode, IndexDefinition } from "@/types/market";

/**
 * Index registry. To show another index (e.g. KOMPAS100, ISSI), add it here,
 * to the `IndexCode` union, and give each provider a symbol for it.
 */
export const INDICES: IndexDefinition[] = [
  { code: "IHSG", name: "IHSG", description: "IHSG Composite Benchmark", tag: "COMPOSITE" },
  { code: "LQ45", name: "LQ45", description: "45 Most Liquid Equities", tag: "TOP 45" },
  { code: "IDX30", name: "IDX30", description: "Top 30 Tier Leaders", tag: "BLUE CHIP" },
  { code: "IDX80", name: "IDX80", description: "Broad 80 Liquid Stocks", tag: "MID-LARGE" },
];

export const INDEX_CODES = INDICES.map((i) => i.code);

export function getIndexDefinition(code: string): IndexDefinition | undefined {
  return INDICES.find((i) => i.code === code.toUpperCase());
}

export function isIndexCode(code: string): code is IndexCode {
  return INDEX_CODES.includes(code as IndexCode);
}
