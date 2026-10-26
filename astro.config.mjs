import { defineConfig } from 'astro/config';

function siteBase() {
  const raw = process.env.BASE_PATH?.trim();
  if (!raw) return '/';
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base: siteBase(),
});
