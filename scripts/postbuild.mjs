// Post-build: prerender the React app into dist/index.html, fill in the site URL,
// and write sitemap.xml, robots.txt and _headers for Cloudflare Pages.
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SITE_URL = (process.env.SITE_URL || 'https://quote-calculator-demo.pages.dev').replace(/\/$/, '');
const dist = new URL('../dist/', import.meta.url);
const ssrDir = new URL('../.ssr/', import.meta.url);

const { render } = await import(pathToFileURL(new URL('entry-server.js', ssrDir).pathname).href);
let html = readFileSync(new URL('index.html', dist), 'utf8');
html = html.replace('<!--app-->', render()).replaceAll('%SITE_URL%', SITE_URL);

// Inline the (small) stylesheet to avoid a render-blocking request, and preload the Latin font.
html = html.replace(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/, (_m, href) => {
  const css = readFileSync(new URL('.' + href, dist), 'utf8');
  const font = css.match(/\/assets\/plus-jakarta-sans-latin-wght-normal-[\w-]+\.woff2/);
  const preload = font ? `<link rel="preload" href="${font[0]}" as="font" type="font/woff2" crossorigin>` : '';
  rmSync(new URL('.' + href, dist));
  return `${preload}<style>${css}</style>`;
});
writeFileSync(new URL('index.html', dist), html);

writeFileSync(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
</urlset>
`);
writeFileSync(new URL('robots.txt', dist), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
writeFileSync(new URL('_headers', dist), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'self'; frame-ancestors 'self'

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);
if (existsSync(ssrDir)) rmSync(ssrDir, { recursive: true });
console.log('postbuild: prerendered index.html, sitemap.xml, robots.txt, _headers for', SITE_URL);
