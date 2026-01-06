// Listen for download requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOWNLOAD_VIDEO') {
    handleVideoDownload(request.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['downloadCount'], (result) => {
      if (typeof result.downloadCount === 'undefined') {
          chrome.storage.local.set({ downloadCount: 0 });
      }
  });
});

// Sanitize filename for filesystem
function sanitizeFilename(name) {
  // Remove characters invalid in filenames (Windows/Unix reserved)
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
             .replace(/^\.+/, '') // Remove leading dots
             .replace(/[\s\uFEFF\xA0]+$/g, '') // Remove trailing whitespace
             .trim(); 
}

// Main download handler
async function handleVideoDownload(videoUrl) {
  let tikwmTabId = null;
  
  try {
    // Store currently active tab to restore focus later
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 1. Get Metadata for Filename
    let username = extractUsername(videoUrl);
    if (!username) username = 'tiktok_user';
    let safeUsername = sanitizeFilename(username);
    if(safeUsername.length === 0) safeUsername = "user";
    
    const timestamp = Date.now();
    const filename = `tikDM_${safeUsername}_${timestamp}.mp4`;

    // 2. Create hidden tab for API call
    const tikwmTab = await chrome.tabs.create({
      url: 'https://www.tikwm.com/',
      active: false,
      index: 0
    });
    tikwmTabId = tikwmTab.id;

    // Immediately switch back to original tab
    if (activeTab?.id) {
      try { await chrome.tabs.update(activeTab.id, { active: true }); } catch (e) {}
    }

    // Wait for page load
    await waitForTabLoad(tikwmTabId);

    // 3. Execute script to fetch video
    const result = await chrome.scripting.executeScript({
      target: { tabId: tikwmTabId },
      func: fetchWatermarkFreeVideo,
      args: [videoUrl]
    });

    // Clean up tab
    try { await chrome.tabs.remove(tikwmTabId); } catch (e) {}
    tikwmTabId = null;

    const response = result?.[0]?.result;

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to fetch video');
    }

    // 4. Download (Force saveAs to false to prevent bugs)
    await chrome.downloads.download({
      url: response.videoBase64,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false 
    });

    // 5. Update Stats
    const data = await chrome.storage.local.get(['downloadCount']);
    const newCount = (data.downloadCount || 0) + 1;
    await chrome.storage.local.set({ downloadCount: newCount });
    
    return { success: true };

  } catch (error) {
    console.error('Download error:', error);
    
    // Cleanup if failed mid-process
    if (tikwmTabId) {
      try { await chrome.tabs.remove(tikwmTabId); } catch (e) {}
    }
    
    return { success: false, error: error.message };
  }
}

// Wait for tab to fully load
function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, 20000);

    const listener = (tid, changeInfo) => {
      if (tid === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeout);
        setTimeout(resolve, 1500);
      }
    };
    
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function extractUsername(url) {
  const match = url.match(/@([^/?]+)/);
  return match ? match[1] : 'tiktok';
}

// Function runs in TikWM tab context
async function fetchWatermarkFreeVideo(tiktokUrl) {
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  try {
    const apiResponse = await fetch('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(tiktokUrl)}&hd=1`
    });

    const apiData = await apiResponse.json();

    if (apiData.code !== 0 || !apiData.data) {
      return { success: false, error: apiData.msg || 'API error' };
    }

    const downloadUrl = apiData.data.hdplay || apiData.data.play;
    if (!downloadUrl) return { success: false, error: 'No URL found' };

    const videoResponse = await fetch(downloadUrl);
    if (!videoResponse.ok) return { success: false, error: 'Video fetch failed' };

    const blob = await videoResponse.blob();
    if (blob.size < 50000) return { success: false, error: 'Invalid video file' };

    const base64 = await blobToBase64(blob);
    return { success: true, videoBase64: base64 };

  } catch (error) {
    return { success: false, error: error.message };
  }
}