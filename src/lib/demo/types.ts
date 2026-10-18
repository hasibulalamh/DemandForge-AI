export const DEMO_FILE_PATHS = [
  "index.html",
  "assets/css/styles.css",
  "assets/js/main.js",
  "README.md",
] as const;

export type DemoFilePath = (typeof DEMO_FILE_PATHS)[number];
export type DemoFiles = Record<DemoFilePath, string>;

export interface DemoFileEntry {
  path: DemoFilePath;
  bytes: number;
  checksum: string;
}

export interface DemoManifest {
  template: string;
  files: DemoFileEntry[];
  totalBytes: number;
  checksum: string;
  generatedAt: string;
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const MAX_FILE_BYTES = 300 * 1024;
export const MAX_TOTAL_BYTES = 700 * 1024;
