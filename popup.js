// popup.js
// Popup UI for Staples Receipt Downloader

console.log('Popup loaded');

// DOM elements
const statusBadge = document.getElementById('statusBadge');
const currentPage = document.getElementById('currentPage');
const transactionsFound = document.getElementById('transactionsFound');
const downloadsScheduled = document.getElementById('downloadsScheduled');
const downloadsComplete = document.getElementById('downloadsComplete');
const downloadsFailed = document.getElementById('downloadsFailed');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const fetchOrdersBtn = document.getElementById('fetchOrdersBtn');
const retryBtn = document.getElementById('retryBtn');
const retrySection = document.getElementById('retrySection');
const retryCount = document.getElementById('retryCount');
const autonomousMode = document.getElementById('autonomousMode');
const printWithImages = document.getElementById('printWithImages');
const onlineOrderPrint = document.getElementById('onlineOrderPrint');
const autoExportJson = document.getElementById('autoExportJson');
const activityLog = document.getElementById('activityLog');
const clearLog = document.getElementById('clearLog');

// State
let isProcessing = false;
let activityItems = [];

// Initialize popup
async function init() {
  console.log('Initializing popup...');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    console.error('No active tab found');
    return;
  }

  console.log('Active tab:', tab.url);

  // Check if on Staples order page
  if (!tab.url || (!tab.url.includes('/ptd/myorders') && !tab.url.includes('/ptd/orderdetails'))) {
    showNotOnOrderPage();
    return;
  }

  // Load saved state from storage
  loadState();

  // Load settings
  const autonomousSetting = localStorage.getItem('staplesAutonomousMode') === 'true';
  autonomousMode.checked = autonomousSetting;

  const printWithImagesSetting = localStorage.getItem('staplesPrintWithImages') !== 'false';
  printWithImages.checked = printWithImagesSetting;

  const onlineOrderPrintSetting = localStorage.getItem('staplesOnlineOrderPrint') === 'true';
  onlineOrderPrint.checked = onlineOrderPrintSetting;

  const autoExportJsonSetting = localStorage.getItem('staplesAutoExportJson') !== 'false'; // Default true
  autoExportJson.checked = autoExportJsonSetting;

  // Get current status from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { message: 'getStatus' });
    if (response) {
      updateStatus(response);
    }
  } catch (err) {
    console.log('Could not get status from content script:', err);
  }

  // Setup event listeners
  setupEventListeners(tab.id);

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'statusUpdate') {
      updateStatus(message.data);
    } else if (message.type === 'activityUpdate') {
      addActivity(message.activity);
    }
  });
}

function showNotOnOrderPage() {
  statusBadge.textContent = 'Not Available';
  statusBadge.className = 'status-badge';
  currentPage.textContent = 'Not on orders page';
  startBtn.disabled = true;
  startBtn.style.opacity = '0.5';
  startBtn.style.cursor = 'not-allowed';

  addActivity({
    type: 'info',
    message: 'Navigate to Staples orders page to use this extension',
    time: new Date().toLocaleTimeString()
  });
}

function setupEventListeners(tabId) {
  // Start button
  startBtn.addEventListener('click', async () => {
    console.log('Start button clicked');
    try {
      const response = await chrome.tabs.sendMessage(tabId, { message: 'iconClicked' });
      console.log('Start response:', response);

      if (response.action === 'started') {
        isProcessing = true;
        updateUI();
        addActivity({
          type: 'success',
          message: 'Download started',
          time: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      console.error('Error starting download:', err);
      addActivity({
        type: 'error',
        message: 'Failed to start download',
        time: new Date().toLocaleTimeString()
      });
    }
  });

  // Stop button
  stopBtn.addEventListener('click', async () => {
    console.log('Stop button clicked');
    try {
      const response = await chrome.tabs.sendMessage(tabId, { message: 'iconClicked' });
      console.log('Stop response:', response);

      if (response.action === 'stopped') {
        isProcessing = false;
        updateUI();
        addActivity({
          type: 'info',
          message: 'Download stopped',
          time: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      console.error('Error stopping download:', err);
    }
  });

  // Retry failed button
  retryBtn.addEventListener('click', async () => {
    console.log('Retry button clicked');
    try {
      await chrome.tabs.sendMessage(tabId, { message: 'retryFailed' });
      addActivity({
        type: 'info',
        message: 'Retrying failed downloads',
        time: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error('Error retrying failed downloads:', err);
    }
  });

  // Fetch order details button
  fetchOrdersBtn.addEventListener('click', async () => {
    console.log('Fetch order details button clicked');
    try {
      fetchOrdersBtn.disabled = true;
      fetchOrdersBtn.innerHTML = '<span class="btn-icon">⏳</span> Fetching...';

      await chrome.tabs.sendMessage(tabId, { message: 'fetchOrderDetails' });

      addActivity({
        type: 'info',
        message: 'Fetching order details from API...',
        time: new Date().toLocaleTimeString()
      });

      // Re-enable button after a delay
      setTimeout(() => {
        fetchOrdersBtn.disabled = false;
        fetchOrdersBtn.innerHTML = '<span class="btn-icon">📊</span> Export All Orders (JSON)';
      }, 5000);
    } catch (err) {
      console.error('Error fetching order details:', err);
      fetchOrdersBtn.disabled = false;
      fetchOrdersBtn.innerHTML = '<span class="btn-icon">📊</span> Export All Orders (JSON)';
      addActivity({
        type: 'error',
        message: 'Failed to fetch order details',
        time: new Date().toLocaleTimeString()
      });
    }
  });

  // Autonomous mode toggle
  autonomousMode.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('staplesAutonomousMode', enabled.toString());

    try {
      await chrome.tabs.sendMessage(tabId, {
        message: 'toggleAutonomous',
        enabled
      });

      addActivity({
        type: 'info',
        message: `Autonomous mode ${enabled ? 'enabled' : 'disabled'}`,
        time: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error('Error toggling autonomous mode:', err);
    }
  });

  // Print with images toggle
  printWithImages.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('staplesPrintWithImages', enabled.toString());

    try {
      await chrome.tabs.sendMessage(tabId, {
        message: 'togglePrintWithImages',
        enabled
      });

      addActivity({
        type: 'info',
        message: `Print with images ${enabled ? 'enabled' : 'disabled'}`,
        time: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error('Error toggling print with images:', err);
    }
  });

  // Online order print toggle
  onlineOrderPrint.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('staplesOnlineOrderPrint', enabled.toString());

    try {
      await chrome.tabs.sendMessage(tabId, {
        message: 'toggleOnlineOrderPrint',
        enabled
      });

      addActivity({
        type: 'info',
        message: `Online order print ${enabled ? 'enabled' : 'disabled'}`,
        time: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error('Error toggling online order print:', err);
    }
  });

  // Auto-export JSON toggle
  autoExportJson.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('staplesAutoExportJson', enabled.toString());

    try {
      await chrome.tabs.sendMessage(tabId, {
        message: 'toggleAutoExportJson',
        enabled
      });

      addActivity({
        type: 'info',
        message: `Auto-export JSON ${enabled ? 'enabled' : 'disabled'}`,
        time: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error('Error toggling auto-export JSON:', err);
    }
  });

  // Clear log
  clearLog.addEventListener('click', () => {
    activityItems = [];
    saveState();
    renderActivityLog();
  });
}

function updateStatus(data) {
  console.log('Updating status:', data);

  if (data.isProcessing !== undefined) {
    isProcessing = data.isProcessing;
  }

  if (data.currentPage) {
    currentPage.textContent = data.currentPage;
  }

  if (data.transactionsFound !== undefined) {
    transactionsFound.textContent = data.transactionsFound;
  }

  if (data.scheduled !== undefined) {
    downloadsScheduled.textContent = data.scheduled;
  }

  if (data.completed !== undefined) {
    downloadsComplete.textContent = data.completed;
  }

  if (data.failed !== undefined) {
    downloadsFailed.textContent = data.failed;

    // Show/hide retry section based on failed count
    if (data.failed > 0) {
      retrySection.style.display = 'block';
      retryCount.textContent = data.failed;
    } else {
      retrySection.style.display = 'none';
    }
  }

  if (data.total && data.completed) {
    const percent = Math.round((data.completed / data.total) * 100);
    progressFill.style.width = percent + '%';
    progressText.textContent = percent + '%';
    progressContainer.style.display = 'block';
  }

  updateUI();
}

function updateUI() {
  if (isProcessing) {
    statusBadge.textContent = 'Processing';
    statusBadge.className = 'status-badge processing';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
  } else {
    statusBadge.textContent = 'Ready';
    statusBadge.className = 'status-badge active';
    startBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
  }
}

function addActivity(activity) {
  activityItems.unshift(activity); // Add to beginning

  // Keep only last 10 items
  if (activityItems.length > 10) {
    activityItems = activityItems.slice(0, 10);
  }

  saveState();
  renderActivityLog();
}

function renderActivityLog() {
  if (activityItems.length === 0) {
    activityLog.innerHTML = '<div class="activity-item empty">No recent activity</div>';
    return;
  }

  activityLog.innerHTML = activityItems.map(item => `
    <div class="activity-item ${item.type}">
      <span>${item.message}</span>
      <span class="activity-time">${item.time}</span>
    </div>
  `).join('');
}

function saveState() {
  chrome.storage.local.set({
    activityItems,
    lastUpdate: new Date().toISOString()
  });
}

function loadState() {
  chrome.storage.local.get(['activityItems', 'lastUpdate'], (result) => {
    if (result.activityItems) {
      activityItems = result.activityItems;
      renderActivityLog();
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
