import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import alpinejs from '@astrojs/alpinejs';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://unojersey.com',
  integrations: [
    tailwind({
      applyBaseStyles: false, // We'll use our own global.css
    }),
    alpinejs(),
    sitemap({
      filter: (page) => !page.includes('/go-'),
    }),
  ],
  vite: {
    build: {
      // Ensure proper asset handling
      assetsInlineLimit: 0,
    },
    server: {
      // Allow all hosts for dev server
      allowedHosts: true,
    },
    preview: {
      // Allow specific hosts for preview server (production)
      allowedHosts: ['unojersey.com', 'www.unojersey.com', 'localhost'],
    },
  },
});
