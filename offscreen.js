// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FETCH_VIDEO') {
      fetchVideo(request.url)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });
  
  async function fetchVideo(tiktokUrl) {
    const blobToBase64 = (blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };
  
    try {
      // Call TikWM API
      const apiResponse = await fetch('https://www.tikwm.com/api/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `url=${encodeURIComponent(tiktokUrl)}&hd=1`
      });
  
      const apiData = await apiResponse.json();
  
      if (apiData.code !== 0 || !apiData.data) {
        return { success: false, error: apiData.msg || 'API request failed' };
      }
  
      const downloadUrl = apiData.data.hdplay || apiData.data.play;
  
      if (!downloadUrl) {
        return { success: false, error: 'No download URL available' };
      }
  
      const videoResponse = await fetch(downloadUrl);
  
      if (!videoResponse.ok) {
        return { success: false, error: `HTTP ${videoResponse.status}` };
      }
  
      const blob = await videoResponse.blob();
  
      if (blob.size < 50000 || blob.type.includes('text/html')) {
        return { success: false, error: 'Invalid video response' };
      }
  
      const base64 = await blobToBase64(blob);
  
      return {
        success: true,
        videoBase64: base64,
        size: blob.size
      };
  
    } catch (error) {
      return { success: false, error: error.message };
    }
  }