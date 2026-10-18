import type { DemoFiles } from "./types";

export const PREVIEW_CSP = [
  // `sandbox` gives the document an opaque origin: it cannot read dashboard
  // cookies, storage, or same-origin APIs even though it is served by the app.
  "sandbox allow-scripts",
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join("; ");

/**
 * Inlines the validated CSS and JS into one document for preview. Asset
 * requests would otherwise need a same-origin route, which the opaque sandbox
 * origin intentionally cannot use reliably.
 */
export function buildPreviewDocument(files: DemoFiles): string {
  const css = files["assets/css/styles.css"].replace(/<\/style/gi, "<\\/style");
  const js = files["assets/js/main.js"].replace(/<\/script/gi, "<\\/script");

  return files["index.html"]
    .replace(/<link\b[^>]*href=["']assets\/css\/styles\.css["'][^>]*>/i, `<style>\n${css}\n</style>`)
    .replace(
      /<script\b[^>]*src=["']assets\/js\/main\.js["'][^>]*>\s*<\/script>/i,
      `<script>\n${js}\n</script>`,
    );
}
