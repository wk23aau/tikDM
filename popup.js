document.addEventListener('DOMContentLoaded', async () => {
  // Load Download Count
  try {
    const data = await chrome.storage.local.get(['downloadCount']);
    const count = data.downloadCount || 0;
    
    const countEl = document.getElementById('download-count');
    if (countEl) {
      countEl.textContent = count.toLocaleString();
    }
  } catch (e) {
    console.error('Error loading stats:', e);
  }
});