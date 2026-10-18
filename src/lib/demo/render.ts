import { checksumFiles, sha256Hex } from "@/lib/security/hash";
import type { DemoSpecOutput } from "@/lib/gemini/schemas";
import type { DemoFiles, DemoManifest } from "./types";
import { DEMO_FILE_PATHS } from "./types";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FICTIONAL_CONTACT = {
  email: "hello@example.com",
  phone: "(555) 010-2030",
};

interface TemplateDefinition {
  bodyClass: string;
  heroClass: string;
  sectionOrder: Array<"services" | "features" | "faq">;
}

const TEMPLATES: Record<string, TemplateDefinition> = {
  "local-service": {
    bodyClass: "template-local-service",
    heroClass: "hero--split",
    sectionOrder: ["services", "features", "faq"],
  },
  portfolio: {
    bodyClass: "template-portfolio",
    heroClass: "hero--centered",
    sectionOrder: ["features", "services", "faq"],
  },
  "saas-landing": {
    bodyClass: "template-saas-landing",
    heroClass: "hero--product",
    sectionOrder: ["features", "services", "faq"],
  },
};

function resolveTemplate(name: string): TemplateDefinition {
  return TEMPLATES[name] ?? TEMPLATES["local-service"]!;
}

function navMarkup(spec: DemoSpecOutput): string {
  return `
      <a class="brand" href="#top" aria-label="Home">
        <span class="brand__mark" aria-hidden="true"></span>
        <span class="brand__name">${escapeHtml(spec.businessName)}</span>
      </a>
      <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="primary-navigation">
        <span class="sr-only">Toggle navigation</span>
        <span class="nav__bar" aria-hidden="true"></span>
        <span class="nav__bar" aria-hidden="true"></span>
      </button>
      <nav id="primary-navigation" class="nav__links" aria-label="Primary">
        <a href="#services">Services</a>
        <a href="#about">About</a>
        <a href="#faq">FAQ</a>
        <a class="button button--small" href="#contact">Get in touch</a>
      </nav>`;
}

function servicesMarkup(spec: DemoSpecOutput): string {
  return spec.services
    .map(
      (service, index) => `
        <article class="card service">
          <span class="service__index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
          <h3>${escapeHtml(service.name)}</h3>
          <p>${escapeHtml(service.description)}</p>
        </article>`,
    )
    .join("\n");
}

function featuresMarkup(spec: DemoSpecOutput): string {
  return spec.features
    .map(
      (feature) => `
        <div class="feature">
          <span class="feature__icon" aria-hidden="true"></span>
          <div>
            <h3>${escapeHtml(feature.title)}</h3>
            <p>${escapeHtml(feature.description)}</p>
          </div>
        </div>`,
    )
    .join("\n");
}

function faqMarkup(spec: DemoSpecOutput): string {
  return spec.faqs
    .map(
      (faq) => `
        <details class="faq">
          <summary>${escapeHtml(faq.question)}</summary>
          <p>${escapeHtml(faq.answer)}</p>
        </details>`,
    )
    .join("\n");
}

function sections(spec: DemoSpecOutput, order: TemplateDefinition["sectionOrder"]): string {
  const blocks: Record<string, string> = {
    services: `
    <section id="services" class="section" aria-labelledby="services-title">
      <div class="container">
        <p class="eyebrow">What we do</p>
        <h2 id="services-title">Services built around ${escapeHtml(spec.industry)}</h2>
        <div class="grid grid--services">
          ${servicesMarkup(spec)}
        </div>
      </div>
    </section>`,
    features: `
    <section id="why" class="section section--surface" aria-labelledby="why-title">
      <div class="container">
        <p class="eyebrow">Why ${escapeHtml(spec.businessName)}</p>
        <h2 id="why-title">A ${escapeHtml(spec.industry)} experience that feels simple</h2>
        <div class="grid grid--features">
          ${featuresMarkup(spec)}
        </div>
      </div>
    </section>`,
    faq: `
    <section id="faq" class="section" aria-labelledby="faq-title">
      <div class="container container--narrow">
        <p class="eyebrow">Questions</p>
        <h2 id="faq-title">Good to know</h2>
        <div class="faq-list">
          ${faqMarkup(spec)}
        </div>
      </div>
    </section>`,
  };
  return order.map((key) => blocks[key]).join("\n");
}

function renderHtml(spec: DemoSpecOutput, template: TemplateDefinition): string {
  const title = `${escapeHtml(spec.businessName)} — ${escapeHtml(spec.tagline)}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(spec.metaDescription)}" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${title}</title>
    <link rel="stylesheet" href="assets/css/styles.css" />
  </head>
  <body class="${template.bodyClass}">
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="demo-banner" role="note">
      Concept demo generated by DemandForge AI · fictional business · not a live client site
    </div>

    <header class="site-header" id="top">
      <div class="container site-header__inner">
        ${navMarkup(spec)}
      </div>
    </header>

    <main id="main">
      <section class="hero ${template.heroClass}" aria-labelledby="hero-title">
        <div class="container hero__inner">
          <div class="hero__copy">
            <p class="eyebrow">${escapeHtml(spec.industry)} · ${escapeHtml(spec.serviceArea)}</p>
            <h1 id="hero-title">${escapeHtml(spec.heroHeadline)}</h1>
            <p class="hero__sub">${escapeHtml(spec.heroSubheadline)}</p>
            <div class="hero__actions">
              <a class="button" href="#contact">${escapeHtml(spec.ctaLabel)}</a>
              <a class="button button--ghost" href="#services">Explore services</a>
            </div>
            <p class="hero__note">Fictional concept. Contact details are examples only.</p>
          </div>
          <aside class="hero__panel" aria-label="Concept highlights">
            <p class="hero__panel-label">Concept highlights</p>
            <ul class="checklist">
              ${spec.features
                .slice(0, 3)
                .map((feature) => `<li>${escapeHtml(feature.title)}</li>`)
                .join("\n              ")}
            </ul>
            <div class="hero__panel-foot">
              <span class="dot" aria-hidden="true"></span>
              Designed for ${escapeHtml(spec.industry)}
            </div>
          </aside>
        </div>
      </section>

${sections(spec, template.sectionOrder)}

      <section id="about" class="section section--surface" aria-labelledby="about-title">
        <div class="container container--narrow about">
          <p class="eyebrow">About the concept</p>
          <h2 id="about-title">${escapeHtml(spec.businessName)}</h2>
          <p class="about__body">${escapeHtml(spec.tagline)}. ${escapeHtml(spec.heroSubheadline)}</p>
          <p class="about__note">This page is a design concept based on a project request. It uses fictional copy and sample imagery only.</p>
        </div>
      </section>

      <section id="contact" class="section contact" aria-labelledby="contact-title">
        <div class="container contact__inner">
          <div>
            <p class="eyebrow">Next step</p>
            <h2 id="contact-title">${escapeHtml(spec.ctaLabel)}</h2>
            <p class="contact__body">${escapeHtml(spec.footerNote)}</p>
          </div>
          <div class="contact__card">
            <p class="contact__label">Sample contact details</p>
            <p class="contact__line">${FICTIONAL_CONTACT.email}</p>
            <p class="contact__line">${FICTIONAL_CONTACT.phone}</p>
            <p class="contact__line contact__line--muted">${escapeHtml(spec.serviceArea)}</p>
            <p class="contact__fictional">Fictional details for demonstration purposes.</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container site-footer__inner">
        <p>© <span data-year>2026</span> ${escapeHtml(spec.businessName)}. Concept demo.</p>
        <p class="site-footer__meta">Static HTML, CSS and JavaScript · no tracking · no external requests</p>
      </div>
    </footer>

    <script src="assets/js/main.js" defer></script>
  </body>
</html>
`;
}

function renderCss(spec: DemoSpecOutput): string {
  const { primary, accent, surface, text } = spec.palette;
  const isSerif = spec.fontStyle === "serif";
  const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const display = isSerif ? `Georgia, "Times New Roman", serif` : sans;

  return `:root {
  --color-primary: ${primary};
  --color-accent: ${accent};
  --color-surface: ${surface};
  --color-text: ${text};
  --color-muted: #5b5568;
  --color-line: rgba(20, 16, 28, 0.12);
  --radius-lg: 22px;
  --radius-md: 14px;
  --shadow-soft: 0 18px 45px -28px rgba(23, 15, 45, 0.45);
  --font-body: ${sans};
  --font-display: ${display};
  --max-width: 1120px;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: #ffffff;
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 17px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: var(--font-display);
  line-height: 1.12;
  letter-spacing: -0.02em;
  margin: 0 0 0.5em;
}

h1 { font-size: clamp(2.4rem, 5vw, 4rem); }
h2 { font-size: clamp(1.8rem, 3.2vw, 2.6rem); }
h3 { font-size: 1.15rem; }
p { margin: 0 0 1rem; }
a { color: inherit; }

.container {
  width: min(100% - 2.5rem, var(--max-width));
  margin-inline: auto;
}

.container--narrow { width: min(100% - 2.5rem, 760px); }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

.skip-link {
  position: absolute; left: 1rem; top: -4rem; z-index: 100;
  background: var(--color-text); color: #fff; padding: 0.6rem 1rem; border-radius: 8px;
}
.skip-link:focus { top: 1rem; }

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 3px;
}

.demo-banner {
  background: var(--color-text);
  color: #fff;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-align: center;
  padding: 0.45rem 1rem;
  text-transform: uppercase;
}

.site-header {
  position: sticky; top: 0; z-index: 40;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-line);
}

.site-header__inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; min-height: 72px;
}

.brand { display: inline-flex; align-items: center; gap: 0.6rem; text-decoration: none; font-weight: 700; }
.brand__mark {
  width: 26px; height: 26px; border-radius: 9px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  display: inline-block;
}
.brand__name { font-family: var(--font-display); font-size: 1.1rem; }

.nav__links { display: flex; align-items: center; gap: 1.6rem; font-size: 0.95rem; }
.nav__links a { text-decoration: none; color: var(--color-muted); }
.nav__links a:hover { color: var(--color-text); }
.nav__toggle { display: none; background: none; border: 0; padding: 0.5rem; cursor: pointer; }
.nav__bar { display: block; width: 22px; height: 2px; background: var(--color-text); margin: 5px 0; }

.button {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 0.5rem; padding: 0.9rem 1.5rem; border-radius: 999px;
  background: var(--color-primary); color: #fff; font-weight: 600;
  text-decoration: none; border: 1px solid transparent;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.button:hover { transform: translateY(-1px); box-shadow: var(--shadow-soft); }
.button--small { padding: 0.6rem 1.1rem; font-size: 0.9rem; }
.button--ghost { background: transparent; color: var(--color-text); border-color: var(--color-line); }

.hero { padding: clamp(3rem, 7vw, 6.5rem) 0 clamp(3rem, 6vw, 5rem); }
.hero__inner { display: grid; gap: 3rem; grid-template-columns: 1.2fr 0.8fr; align-items: center; }
.hero--centered .hero__inner { grid-template-columns: 1fr; text-align: center; justify-items: center; }
.hero--centered .hero__copy { max-width: 760px; }
.hero--product .hero__inner { grid-template-columns: 1fr 1fr; }
.hero__sub { font-size: 1.15rem; color: var(--color-muted); max-width: 56ch; }
.hero--centered .hero__sub { margin-inline: auto; }
.hero__actions { display: flex; flex-wrap: wrap; gap: 0.8rem; margin-top: 1.6rem; }
.hero--centered .hero__actions { justify-content: center; }
.hero__note { font-size: 0.8rem; color: var(--color-muted); margin-top: 1.2rem; }

.hero__panel {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: 1.8rem;
  box-shadow: var(--shadow-soft);
}
.hero__panel-label {
  font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--color-muted); margin-bottom: 1rem;
}
.checklist { list-style: none; padding: 0; margin: 0 0 1.6rem; display: grid; gap: 0.85rem; }
.checklist li { position: relative; padding-left: 1.7rem; font-weight: 600; }
.checklist li::before {
  content: ""; position: absolute; left: 0; top: 0.45rem;
  width: 0.7rem; height: 0.7rem; border-radius: 50%;
  background: var(--color-accent);
}
.hero__panel-foot {
  display: flex; align-items: center; gap: 0.5rem;
  border-top: 1px solid var(--color-line); padding-top: 1rem;
  font-size: 0.85rem; color: var(--color-muted);
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary); }

.section { padding: clamp(3rem, 6vw, 5.5rem) 0; }
.section--surface { background: var(--color-surface); }

.eyebrow {
  text-transform: uppercase; letter-spacing: 0.14em;
  font-size: 0.72rem; font-weight: 700; color: var(--color-primary);
  margin-bottom: 0.8rem;
}

.grid { display: grid; gap: 1.2rem; }
.grid--services { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-top: 2rem; }
.grid--features { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-top: 2rem; gap: 1.6rem 2rem; }

.card {
  background: #fff; border: 1px solid var(--color-line);
  border-radius: var(--radius-md); padding: 1.6rem;
}
.service__index {
  font-family: var(--font-display); font-size: 0.8rem; letter-spacing: 0.1em;
  color: var(--color-accent); display: block; margin-bottom: 0.8rem;
}
.service p, .feature p { color: var(--color-muted); margin-bottom: 0; }

.feature { display: flex; gap: 1rem; }
.feature__icon {
  flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px;
  background: var(--color-primary); opacity: 0.9;
  mask: radial-gradient(circle at 30% 30%, transparent 38%, #000 40%);
}

.about__body { font-size: 1.15rem; color: var(--color-muted); }
.about__note { font-size: 0.85rem; color: var(--color-muted); border-top: 1px solid var(--color-line); padding-top: 1rem; }

.faq-list { margin-top: 2rem; display: grid; gap: 0.8rem; }
.faq {
  border: 1px solid var(--color-line); border-radius: var(--radius-md);
  padding: 1.1rem 1.3rem; background: #fff;
}
.faq summary { cursor: pointer; font-weight: 600; }
.faq p { color: var(--color-muted); margin: 0.8rem 0 0; }

.contact { background: var(--color-text); color: #fff; }
.contact .eyebrow { color: var(--color-accent); }
.contact__inner { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 2.5rem; align-items: center; }
.contact__body { color: rgba(255, 255, 255, 0.75); }
.contact__card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--radius-md); padding: 1.6rem;
}
.contact__label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.6); }
.contact__line { margin: 0.4rem 0; font-weight: 600; }
.contact__line--muted { font-weight: 400; color: rgba(255,255,255,0.7); }
.contact__fictional { font-size: 0.75rem; color: rgba(255,255,255,0.55); margin: 0.8rem 0 0; }

.site-footer { background: #0f0c15; color: rgba(255, 255, 255, 0.7); padding: 2rem 0; font-size: 0.85rem; }
.site-footer__inner { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; }
.site-footer p { margin: 0; }
.site-footer__meta { color: rgba(255, 255, 255, 0.45); }

.reveal { opacity: 0; transform: translateY(14px); transition: opacity 600ms ease, transform 600ms ease; }
.reveal.is-visible { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .reveal { opacity: 1; transform: none; transition: none; }
  .button { transition: none; }
}

@media (max-width: 900px) {
  .hero__inner, .hero--product .hero__inner, .contact__inner { grid-template-columns: 1fr; }
  .nav__toggle { display: block; }
  .nav__links {
    position: absolute; top: 100%; left: 0; right: 0;
    flex-direction: column; align-items: flex-start; gap: 1rem;
    background: #fff; border-bottom: 1px solid var(--color-line);
    padding: 1.2rem 1.5rem 1.6rem; display: none;
  }
  .nav__links.is-open { display: flex; }
  .site-header__inner { position: relative; }
}

/* Template accents */
.template-portfolio .button { background: var(--color-text); }
.template-portfolio .eyebrow { color: var(--color-accent); }
.template-saas-landing .hero { background: linear-gradient(180deg, var(--color-surface), #fff); }
.template-saas-landing .hero__panel { background: #fff; }
.template-local-service .hero { background: radial-gradient(1200px 500px at 80% -10%, var(--color-surface), #fff); }
`;
}

const MAIN_JS = `(function () {
  "use strict";

  var toggle = document.querySelector(".nav__toggle");
  var links = document.querySelector(".nav__links");

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    links.addEventListener("click", function (event) {
      if (event.target instanceof HTMLAnchorElement) {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  var year = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach(function (node) {
    node.textContent = String(year);
  });

  var reveals = document.querySelectorAll(".section h2, .card, .feature");
  if ("IntersectionObserver" in window && reveals.length > 0) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal", "is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach(function (node) {
      observer.observe(node);
    });
  }
})();
`;

function renderReadme(spec: DemoSpecOutput, templateName: string): string {
  return `# ${spec.businessName} — concept demo

Generated by DemandForge AI from a project request analysis. This is a **concept
demo**: the business, copy, and contact details are fictional.

- Template: \`${templateName}\`
- Industry: ${spec.industry}
- Service area: ${spec.serviceArea}

## Files

- \`index.html\` — semantic single page
- \`assets/css/styles.css\` — design tokens and responsive layout
- \`assets/js/main.js\` — navigation toggle, current year, reveal animation

## Notes

- No external fonts, scripts, images, or analytics. The page makes no network
  requests after loading.
- Contact details are placeholders (\`hello@example.com\`, \`(555) 010-2030\`).
- Do not present this demo as a live client website without replacing the copy.
`;
}

export function renderDemo(
  spec: DemoSpecOutput,
  options: { templateName: string },
): { files: DemoFiles; manifest: DemoManifest; warnings: string[] } {
  const template = resolveTemplate(options.templateName);
  const files: DemoFiles = {
    "index.html": renderHtml(spec, template).trimStart(),
    "assets/css/styles.css": renderCss(spec),
    "assets/js/main.js": MAIN_JS,
    "README.md": renderReadme(spec, options.templateName),
  };

  const warnings: string[] = [];
  const filesSummary = DEMO_FILE_PATHS.map((path) => ({
    path,
    bytes: Buffer.byteLength(files[path], "utf8"),
    checksum: sha256Hex(files[path]),
  }));

  return {
    files,
    warnings,
    manifest: {
      template: options.templateName,
      files: filesSummary,
      totalBytes: filesSummary.reduce((sum, file) => sum + file.bytes, 0),
      checksum: checksumFiles(files),
      generatedAt: new Date().toISOString(),
      warnings,
    },
  };
}
