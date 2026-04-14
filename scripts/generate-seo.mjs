import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const FALLBACK_SITE_URL = 'https://example.com'
const routes = [
  {
    path: '/',
    changefreq: 'weekly',
    priority: '1.0',
  },
]

const normalizeSiteUrl = (value) => {
  try {
    const normalized = new URL(value).toString()
    return normalized.replace(/\/+$/u, '')
  } catch {
    return FALLBACK_SITE_URL
  }
}

const rawSiteUrl = process.env.SEO_SITE_URL || process.env.URL || FALLBACK_SITE_URL
const siteUrl = normalizeSiteUrl(rawSiteUrl)
const usingFallbackUrl = siteUrl === FALLBACK_SITE_URL
const publicDir = path.join(process.cwd(), 'public')
const lastModified = new Date().toISOString()

const sitemapEntries = routes
  .map((route) => {
    const loc = new URL(route.path, `${siteUrl}/`).toString()

    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastModified}</lastmod>`,
      `    <changefreq>${route.changefreq}</changefreq>`,
      `    <priority>${route.priority}</priority>`,
      '  </url>',
    ].join('\n')
  })
  .join('\n')

const sitemapXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  sitemapEntries,
  '</urlset>',
].join('\n')

const robotsLines = ['User-agent: *', 'Allow: /']

if (!usingFallbackUrl) {
  robotsLines.push('', `Sitemap: ${siteUrl}/sitemap.xml`)
}

await mkdir(publicDir, { recursive: true })
await Promise.all([
  writeFile(path.join(publicDir, 'robots.txt'), `${robotsLines.join('\n')}\n`, 'utf8'),
  writeFile(path.join(publicDir, 'sitemap.xml'), `${sitemapXml}\n`, 'utf8'),
])

if (usingFallbackUrl) {
  console.warn(
    '[seo] SEO_SITE_URL or Netlify URL was not found. Generated a fallback sitemap.xml with https://example.com. Set SEO_SITE_URL in production to use your real domain.',
  )
} else {
  console.log(`[seo] Generated robots.txt and sitemap.xml for ${siteUrl}`)
}