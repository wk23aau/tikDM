(function() {
    'use strict';
  
    // Prevent multiple injections
    if (window.TTD_INJECTED) return;
    window.TTD_INJECTED = true;
  
    // Download icon SVG
    const DOWNLOAD_ICON = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 16l-6-6h4V4h4v6h4l-6 6z"/>
        <path d="M20 18H4v2h16v-2z"/>
      </svg>
    `;
  
    // Loading icon SVG
    const LOADING_ICON = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="32" stroke-linecap="round"/>
      </svg>
    `;
  
    // Checkmark icon SVG
    const SUCCESS_ICON = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
      </svg>
    `;
  
    // Error icon SVG
    const ERROR_ICON = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
      </svg>
    `;
  
    // Create download button element
    function createDownloadButton(videoUrl, isLarge = false) {
      const container = document.createElement('div');
      container.className = `ttd-download-btn ${isLarge ? 'ttd-large' : ''}`;
      container.dataset.videoUrl = videoUrl;
  
      container.innerHTML = `
        <span class="ttd-tooltip">Download HD (No Watermark)</span>
        <button type="button" aria-label="Download video without watermark">
          ${DOWNLOAD_ICON}
        </button>
      `;
  
      const button = container.querySelector('button');
      
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (container.classList.contains('ttd-loading')) return;
  
        await handleDownload(container, videoUrl);
      });
  
      return container;
    }
  
    // Handle download process
    async function handleDownload(container, videoUrl) {
      const button = container.querySelector('button');
      const tooltip = container.querySelector('.ttd-tooltip');
  
      // Set loading state
      container.classList.add('ttd-loading');
      container.classList.remove('ttd-success', 'ttd-error');
      button.innerHTML = LOADING_ICON;
      tooltip.textContent = 'Fetching video...';
  
      try {
        // Send message to background script
        const response = await chrome.runtime.sendMessage({
          action: 'DOWNLOAD_VIDEO',
          url: videoUrl
        });
  
        if (response.success) {
          // Success state
          container.classList.remove('ttd-loading');
          container.classList.add('ttd-success');
          button.innerHTML = SUCCESS_ICON;
          tooltip.textContent = 'Downloaded!';
  
          // Reset after 3 seconds
          setTimeout(() => {
            container.classList.remove('ttd-success');
            button.innerHTML = DOWNLOAD_ICON;
            tooltip.textContent = 'Download HD (No Watermark)';
          }, 3000);
        } else {
          throw new Error(response.error || 'Download failed');
        }
      } catch (error) {
        // Error state
        container.classList.remove('ttd-loading');
        container.classList.add('ttd-error');
        button.innerHTML = ERROR_ICON;
        tooltip.textContent = error.message || 'Failed';
  
        // Reset after 3 seconds
        setTimeout(() => {
          container.classList.remove('ttd-error');
          button.innerHTML = DOWNLOAD_ICON;
          tooltip.textContent = 'Download HD (No Watermark)';
        }, 3000);
      }
    }
  
    // Extract video URL from element context
    function getVideoUrl(element) {
      // Check if we're on a video page
      const currentUrl = window.location.href;
      if (currentUrl.includes('/video/')) {
        return currentUrl;
      }
  
      // Try to find the video link from the container
      const container = element.closest('[data-e2e="user-post-item"]') 
                     || element.closest('[data-e2e="recommend-list-item-container"]')
                     || element.closest('div[class*="DivItemContainer"]')
                     || element.closest('div[class*="DivVideoWrapper"]');
  
      if (container) {
        const link = container.querySelector('a[href*="/video/"]');
        if (link) return link.href;
      }
  
      // Try to get from the video element's closest link
      const videoElement = element.closest('div')?.querySelector('video');
      if (videoElement) {
        const parentLink = videoElement.closest('a[href*="/video/"]');
        if (parentLink) return parentLink.href;
      }
  
      return null;
    }
  
    // Add download button to video containers
    function addDownloadButtons() {
      // For profile page / feed - video thumbnails
      const videoItems = document.querySelectorAll(`
        [data-e2e="user-post-item"],
        [data-e2e="recommend-list-item-container"],
        div[class*="DivItemContainer"]:not([data-ttd-processed])
      `);
  
      videoItems.forEach(item => {
        if (item.dataset.ttdProcessed) return;
        item.dataset.ttdProcessed = 'true';
  
        const videoUrl = getVideoUrl(item);
        if (!videoUrl) return;
  
        // Ensure relative positioning for the container
        const computedStyle = window.getComputedStyle(item);
        if (computedStyle.position === 'static') {
          item.style.position = 'relative';
        }
  
        const downloadBtn = createDownloadButton(videoUrl, false);
        item.appendChild(downloadBtn);
      });
  
      // For video detail page - main video player
      if (window.location.href.includes('/video/')) {
        const videoPlayer = document.querySelector(`
          div[class*="DivVideoPlayerContainer"],
          div[class*="DivVideoContainer"],
          div[data-e2e="browse-video"]
        `);
  
        if (videoPlayer && !videoPlayer.dataset.ttdProcessed) {
          videoPlayer.dataset.ttdProcessed = 'true';
          
          const computedStyle = window.getComputedStyle(videoPlayer);
          if (computedStyle.position === 'static') {
            videoPlayer.style.position = 'relative';
          }
  
          const downloadBtn = createDownloadButton(window.location.href, true);
          downloadBtn.classList.add('ttd-visible'); // Always visible on video page
          videoPlayer.appendChild(downloadBtn);
        }
      }
    }
  
    // Debounce function
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  
    // Initialize
    function init() {
      // Initial scan
      addDownloadButtons();
  
      // Watch for new videos loaded (infinite scroll)
      const observer = new MutationObserver(debounce(() => {
        addDownloadButtons();
      }, 500));
  
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
  
      // Re-scan on navigation (SPA)
      let lastUrl = location.href;
      new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          setTimeout(addDownloadButtons, 1000);
        }
      }).observe(document, { subtree: true, childList: true });
    }
  
    // Start when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
  })();