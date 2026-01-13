/**
 * UNO JERSEY - Main JavaScript
 * Initializes all components and handles global functionality
 */

(function() {
  'use strict';

  class UNOJersey {
    constructor() {
      this.components = {};
      this.init();
    }

    init() {
      console.log('UNO JERSEY - Initializing...');

      // Setup preloader
      this.setupPreloader();

      // Setup GSAP plugins
      this.setupGSAP();

      // Normal scroll - using CSS scroll-behavior: smooth
      // setupHeavierScroll disabled

      // Handle page transitions
      this.setupPageTransitions();

      // Smooth scroll for all anchor links
      this.setupSmoothScroll();

      console.log('UNO JERSEY - Ready!');
    }

    setupPreloader() {
      const preloader = document.getElementById('preloader');
      const preloaderBar = document.getElementById('preloaderBar');
      const preloaderPercentage = document.getElementById('preloaderPercentage');

      if (!preloader || !preloaderBar || !preloaderPercentage) return;

      let progress = 0;
      const targetProgress = 100;
      const minDuration = 10000; // 10 seconds minimum
      const loadingInterval = 50; // Update every 50ms
      const incrementPerTick = targetProgress / (minDuration / loadingInterval); // Complete in 10 seconds

      // Simulate loading progress
      const progressInterval = setInterval(() => {
        // Add some randomness to make it feel more realistic
        const randomIncrement = incrementPerTick + (Math.random() - 0.5) * 0.3;
        progress = Math.min(progress + randomIncrement, targetProgress);

        // Update UI
        preloaderBar.style.width = progress + '%';
        preloaderPercentage.textContent = Math.floor(progress);

        // Check if complete
        if (progress >= targetProgress) {
          clearInterval(progressInterval);

          // Wait a bit before hiding preloader
          setTimeout(() => {
            preloader.classList.add('preloader-hidden');

            // Remove preloader from DOM after animation
            setTimeout(() => {
              preloader.style.display = 'none';
            }, 600);
          }, 500);
        }
      }, loadingInterval);

      // Listen for actual page load - but don't speed up, let it complete in 10s
      window.addEventListener('load', () => {
        // Page loaded, just continue the progress animation
        console.log('Page loaded, continuing preloader animation...');
      });

      // Fallback: force complete after 12 seconds (in case something goes wrong)
      setTimeout(() => {
        if (!preloader.classList.contains('preloader-hidden')) {
          progress = targetProgress;
          preloaderBar.style.width = '100%';
          preloaderPercentage.textContent = '100';
          setTimeout(() => {
            preloader.classList.add('preloader-hidden');
            setTimeout(() => {
              preloader.style.display = 'none';
            }, 600);
          }, 500);
        }
      }, 12000);
    }

    setupGSAP() {
      // Register ScrollTrigger if available
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
      }
    }

    setupHeavierScroll() {
      // Skip on mobile for better performance
      if (window.innerWidth < 768) return;

      // Snap scroll effect - scrolls in controlled increments
      let targetScroll = 0;
      let currentScroll = window.scrollY;
      let scrollVelocity = 0;
      const SNAP_THRESHOLD = 100; // Minimum scroll to trigger snap

      // Track wheel events
      window.addEventListener('wheel', (e) => {
        // Limit each wheel event to smaller increment
        const delta = Math.max(-100, Math.min(100, e.deltaY)) * 0.15;
        targetScroll += delta;

        // Clamp target scroll
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
      }, { passive: true });

      // Animation loop with smooth easing
      function animate() {
        // Smooth lerp toward target
        const diff = targetScroll - currentScroll;
        scrollVelocity = diff * 0.08; // Higher = faster snap

        currentScroll += scrollVelocity;

        // Stop when very close to target
        if (Math.abs(diff) < 0.5) {
          currentScroll = targetScroll;
        }

        window.scrollTo(0, currentScroll);
        requestAnimationFrame(animate);
      }

      animate();
    }

    setupPageTransitions() {
      // Add page transition animation
      document.body.style.opacity = '0';

      window.addEventListener('load', () => {
        gsap.to(document.body, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out'
        });
      });

      // Handle link clicks with transition
      document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', (e) => {
          const href = link.getAttribute('href');
          const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
          const isAnchor = href.startsWith('#');
          const isDownload = link.hasAttribute('download');

          if (!isExternal && !isAnchor && !isDownload && href.endsWith('.html')) {
            e.preventDefault();

            gsap.to(document.body, {
              opacity: 0,
              duration: 0.3,
              ease: 'power2.in',
              onComplete: () => {
                window.location.href = href;
              }
            });
          }
        });
      });
    }

    setupSmoothScroll() {
      // Handle all anchor links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const href = anchor.getAttribute('href');
          if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
              const navbar = document.querySelector('.navbar');
              const navHeight = navbar ? navbar.offsetHeight : 0;
              const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

              window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
              });
            }
          }
        });
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new UNOJersey());
  } else {
    new UNOJersey();
  }

  // Export to window
  window.UNOJersey = UNOJersey;
})();
