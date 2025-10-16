// popup.js
// Popup UI for Staples Receipt Downloader

console.log('Popup loaded');

// DOM elements
const statusBadge = document.getElementById('statusBadge');
const currentPage = document.getElementById('currentPage');
const transactionsFound = document.getElementById('transactionsFound');
const downloadsScheduled = document.getElementById('downloadsScheduled');
const downloadsComplete = document.getElementById('downloadsComplete');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const autonomousMode = document.getElementById('autonomousMode');
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

  // Load autonomous mode setting
  const autonomousSetting = localStorage.getItem('staplesAutonomousMode') === 'true';
  autonomousMode.checked = autonomousSetting;

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
