#!/usr/bin/env node
/**
 * Script untuk scraping artikel dari unojersey.com dan convert ke Markdown
 * Version 2: Mengambil konten lengkap dengan Cheerio
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const cheerio = require('cheerio');

const BASE_URL = 'https://unojersey.com';
const OUTPUT_DIR = 'src/content/blog';
const IMAGES_DIR = 'public/images/blog';

// Create directories
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Indonesian cities list
const CITIES = [
  'sidoarjo', 'bandung', 'yogyakarta', 'malang', 'bogor', 'semarang',
  'depok', 'tangerang', 'bekasi', 'jakarta', 'surabaya', 'mamuju',
  'palopo', 'tomohon', 'bau-bau', 'pare-pare', 'bitung', 'gorontalo',
  'kendari', 'palu', 'manado', 'makassar', 'ketapang', 'tenggarong',
  'singkawang', 'banjarbaru', 'bontang', 'tarakan', 'palangkaraya',
  'pontianak', 'balikpapan', 'samarinda', 'banjarmasin', 'dumai',
  'aceh', 'pangkal-pinang', 'bengkulu', 'jambi', 'padang', 'batam',
  'pekanbaru', 'bandar-lampung', 'palembang', 'medan'
];

const CATEGORIES = {
  'jersey-printing': 'Jersey Printing',
  'jersey-futsal': 'Jersey Futsal',
  'konveksi-jersey': 'Konveksi Jersey',
  'jersey-custom': 'Jersey Custom',
  'bikin-jersey': 'Panduan',
  'pesan-jersey': 'Panduan',
  'keunggulan': 'Tips',
  'panduan': 'Tips',
  'inspirasi': 'Tips',
  'tips': 'Tips',
  'kenapa': 'Tips',
  'cara': 'Tips',
  'konveksi-surabaya': 'Konveksi',
};

function extractCategory(url) {
  const path = new URL(url).pathname;
  for (const [key, value] of Object.entries(CATEGORIES)) {
    if (path.includes(key)) {
      return value;
    }
  }
  return 'Umum';
}

function extractLocation(url) {
  const path = new URL(url).pathname.toLowerCase();
  for (const city of CITIES) {
    if (path.includes(city)) {
      return city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  return null;
}

function downloadImage(url, filename) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) {
      resolve(null);
      return;
    }

    const protocol = url.startsWith('https') ? https : http;
    const parsedUrl = new URL(url);
    const ext = path.extname(parsedUrl.pathname) || '.jpg';
    const cleanFilename = filename.replace(/[^a-zA-Z0-9\-_]/g, '_').replace(ext, '');
    const outputFilename = `${cleanFilename}${ext}`;
    const outputPath = path.join(IMAGES_DIR, outputFilename);

    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      resolve(`/images/blog/${outputFilename}`);
      return;
    }

    const file = fs.createWriteStream(outputPath);

    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`  ✓ Downloaded image: ${outputFilename}`);
          resolve(`/images/blog/${outputFilename}`);
        });
      } else {
        file.close();
        fs.unlink(outputPath, () => {});
        resolve(url);
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlink(outputPath, () => {});
      }
      resolve(url);
    });
  });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function htmlToMarkdown($, element) {
  let markdown = '';

  $(element).children().each((i, elem) => {
    const $elem = $(elem);
    const tagName = elem.tagName.toLowerCase();

    if (tagName === 'h2') {
      const text = $elem.text().trim();
      if (text) markdown += `\n\n## ${text}\n\n`;
    } else if (tagName === 'h3') {
      const text = $elem.text().trim();
      if (text) markdown += `\n\n### ${text}\n\n`;
    } else if (tagName === 'p') {
      const text = $elem.text().trim();
      if (text && text.length > 10) {
        markdown += `\n\n${text}\n\n`;
      }
    } else if (tagName === 'ul') {
      markdown += '\n\n';
      $elem.find('li').each((i, li) => {
        const text = $(li).text().trim();
        if (text) markdown += `- ${text}\n`;
      });
      markdown += '\n';
    } else if (tagName === 'ol') {
      markdown += '\n\n';
      $elem.find('li').each((i, li) => {
        const text = $(li).text().trim();
        if (text) markdown += `${i + 1}. ${text}\n`;
      });
      markdown += '\n';
    } else if (tagName === 'img') {
      const src = $elem.attr('src');
      const alt = $elem.attr('alt') || '';
      if (src) {
        markdown += `\n\n![${alt}](${src})\n\n`;
      }
    } else if (tagName === 'a') {
      const href = $elem.attr('href');
      const text = $elem.text().trim();
      if (href && text) {
        markdown += `[${text}](${href})`;
      }
    } else if (tagName === 'strong' || tagName === 'b') {
      const text = $elem.text().trim();
      if (text) markdown += `**${text}**`;
    } else if (tagName === 'em' || tagName === 'i') {
      const text = $elem.text().trim();
      if (text) markdown += `*${text}*`;
    } else if (tagName === 'div' || tagName === 'section') {
      markdown += htmlToMarkdown($, $elem);
    }
  });

  return markdown;
}

async function scrapeArticle(url) {
  console.log(`\nScraping: ${url}`);

  try {
    const html = await fetchUrl(url);
    const $ = cheerio.load(html);

    // Extract title
    const title = $('h1').first().text().trim() || $('title').text().trim() || 'Untitled';

    // Extract description
    const description = $('meta[name="description"]').attr('content') || '';

    // Extract publish date
    let pubDate = new Date();
    const dateText = $('time').attr('datetime') ||
                     $('meta[property="article:published_time"]').attr('content');
    if (dateText) {
      pubDate = new Date(dateText);
    }

    // Extract and download featured image
    let featuredImage = null;
    const ogImageUrl = $('meta[property="og:image"]').attr('content');
    if (ogImageUrl) {
      const slug = path.basename(new URL(url).pathname);
      featuredImage = await downloadImage(ogImageUrl, `${slug}-featured`);
    }

    // Extract article content - try multiple selectors
    let contentElement = $('div.styler-post-content-wrapper, div.entry-content, div.post-content, div.article-content, article, main').first();

    if (contentElement.length) {
      // Remove unwanted elements
      contentElement.find('script, style, iframe, nav, footer, aside, .sidebar, .share-buttons, .related-posts').remove();

      // Convert to markdown
      const content = htmlToMarkdown($, contentElement);

      const slug = path.basename(new URL(url).pathname);
      const category = extractCategory(url);
      const location = extractLocation(url);
      const tags = [category.toLowerCase()];
      if (location) tags.push(location.toLowerCase());

      return {
        title: title.replace(/"/g, '\\"'),
        slug,
        description: description.replace(/"/g, '\\"'),
        pubDate: pubDate.toISOString().split('T')[0],
        category,
        location,
        featuredImage,
        tags,
        content: content.trim(),
        url
      };
    }

    console.log(`✗ No content found for ${url}`);
    return null;

  } catch (error) {
    console.log(`✗ Error scraping ${url}: ${error.message}`);
    return null;
  }
}

function saveMarkdown(article) {
  if (!article) return false;

  const filename = `${article.slug}.md`;
  const filepath = path.join(OUTPUT_DIR, filename);

  let frontmatter = `---
title: "${article.title}"
description: "${article.description}"
pubDate: ${article.pubDate}
category: "${article.category}"
`;

  if (article.location) {
    frontmatter += `location: "${article.location}"\n`;
  }

  if (article.featuredImage) {
    frontmatter += `featuredImage: "${article.featuredImage}"\n`;
  }

  frontmatter += `tags: ${JSON.stringify(article.tags)}\n---\n\n`;

  const markdown = frontmatter + article.content;

  fs.writeFileSync(filepath, markdown, 'utf8');
  console.log(`✅ Saved: ${filename}`);
  return true;
}

async function scrapeFromSitemap(sitemapUrl, limit) {
  console.log(`Fetching sitemap: ${sitemapUrl}`);

  try {
    const sitemapXml = await fetchUrl(sitemapUrl);

    // Extract all URLs from sitemap
    const urlMatches = sitemapXml.match(/<loc>(.*?)<\/loc>/g) || [];

    // Filter out image URLs
    const articleUrls = urlMatches
      .map(match => match.replace(/<\/?loc>/g, ''))
      .filter(url => !url.includes('/wp-content/uploads/'));

    console.log(`\nFound ${articleUrls.length} articles`);

    const urlsToProcess = limit ? articleUrls.slice(0, limit) : articleUrls;
    if (limit) {
      console.log(`Processing first ${limit} articles...`);
    }

    const results = [];
    for (let i = 0; i < urlsToProcess.length; i++) {
      console.log(`\n[${i + 1}/${urlsToProcess.length}] Processing: ${urlsToProcess[i]}`);
      const article = await scrapeArticle(urlsToProcess[i]);
      if (article) {
        saveMarkdown(article);
        results.push(article);
      }

      // Small delay to avoid overwhelming the server
      if (i < urlsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Successfully scraped ${results.length} articles`);
    console.log(`${'='.repeat(60)}`);

    return results;

  } catch (error) {
    console.log(`Error processing sitemap: ${error.message}`);
    return [];
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.findIndex(arg => arg.startsWith('--limit'));
const limit = limitArg >= 0 ? parseInt(args[limitArg + 1]) : null;

// Run scraper
scrapeFromSitemap(`${BASE_URL}/post-sitemap.xml`, limit);
