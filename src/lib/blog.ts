/**
 * Blog Data Layer - Uno Jersey
 *
 * Fetches blog posts from marketing.vidogarment API at build time.
 * No fallback - jika API error, throw error.
 */

const API_BASE_URL = import.meta.env.BLOG_API_URL || 'https://marketing.vidogarment.test/api/blog';
const SITE = 'unojersey.com';

// Disable TLS verification for self-signed local certificates
if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export class BlogApiError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'BlogApiError';
    this.status = status;
  }
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  image: string;
  author: string;
  site: string;
  featured: boolean;
  readTime: string;
  location: string | null;
  pubDate: string;
  pubDateFormatted: string;
  relatedPosts?: BlogPost[];
}

interface ApiPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  category: string | null;
  tags: string[] | null;
  image: string | null;
  author: string;
  site: string;
  featured: boolean;
  read_time: string | null;
  location: string | null;
  pub_date: string;
  pub_date_formatted: string;
  related_posts?: ApiPost[];
}

function mapApiPost(raw: ApiPost): BlogPost {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt || '',
    body: raw.body,
    category: raw.category || 'Uncategorized',
    tags: raw.tags || [],
    image: raw.image || '',
    author: raw.author,
    site: raw.site,
    featured: raw.featured,
    readTime: raw.read_time || '',
    location: raw.location,
    pubDate: raw.pub_date,
    pubDateFormatted: raw.pub_date_formatted,
    relatedPosts: raw.related_posts?.map(mapApiPost),
  };
}

// Simple in-memory cache to avoid repeated API calls during build
let _allPostsCache: BlogPost[] | null = null;

export function clearBlogCache(): void {
  _allPostsCache = null;
}

async function fetchWithRetry(url: string, retries: number = 3, delayMs: number = 2000): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (res.status === 429 && attempt < retries) {
      const waitMs = delayMs * attempt;
      console.warn(`[blog] Rate limited (429) on attempt ${attempt}/${retries}, retrying in ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }
    return res;
  }
  return fetch(url);
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  if (_allPostsCache) return _allPostsCache;

  const res = await fetchWithRetry(`${API_BASE_URL}/posts/all?site=${SITE}`);
  if (!res.ok) {
    throw new BlogApiError(`Gagal memuat artikel (${res.status})`, res.status);
  }
  const json = await res.json();
  if (!json.success) {
    throw new BlogApiError(json.message || 'API response tidak valid', 500);
  }
  _allPostsCache = (json.data as ApiPost[]).map(mapApiPost);
  return _allPostsCache;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const res = await fetch(`${API_BASE_URL}/posts/${slug}?site=${SITE}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new BlogApiError(`Gagal memuat artikel "${slug}" (${res.status})`, res.status);
  }
  const json = await res.json();
  if (!json.success) {
    throw new BlogApiError(json.message || 'Artikel tidak ditemukan', 404);
  }
  return mapApiPost(json.data as ApiPost);
}
