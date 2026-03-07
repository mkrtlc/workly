// Background script for Workly Chrome Extension
class WorklyBackground {
  constructor() {
    this.init();
  }

  init() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.handleInstall();
      } else if (details.reason === 'update') {
        this.handleUpdate();
      }
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Handle tab updates to refresh content scripts when needed
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });
  }

  async handleInstall() {
    // Set default settings with both hourly and monthly options
    const defaultSettings = {
      hourlyWage: 15,
      monthlySalary: 35000,
      workingHours: 160,
      currency: 'USD',
      isActive: true,
      salaryType: 'hourly' // 'hourly' or 'monthly'
    };

    try {
      await chrome.storage.sync.set(defaultSettings);
      console.log('Workly installed with default settings');

      // Optionally open the popup or a welcome page
      this.showWelcomeNotification();
    } catch (error) {
      console.error('Error setting default settings:', error);
    }
  }

  handleUpdate() {
    console.log('Workly extension updated');
    // Handle any migration logic here if needed
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getSettings':
          const settings = await chrome.storage.sync.get([
            'hourlyWage',
            'monthlySalary',
            'workingHours',
            'currency',
            'isActive',
            'salaryType'
          ]);
          sendResponse({ success: true, data: settings });
          break;

        case 'updateSettings':
          await chrome.storage.sync.set(request.settings);
          sendResponse({ success: true });
          break;

        case 'logPrice':
          // Log price detection for analytics (optional)
          console.log('Price detected:', request.price, 'on', sender.tab.url);
          sendResponse({ success: true });
          break;

        case 'openPopup':
          chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleTabUpdate(tabId, tab) {
    // Check if the tab URL matches ecommerce patterns
    if (this.isEcommerceUrl(tab.url)) {
      // Optionally inject content script or send a message
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' });
      } catch (error) {
        // Content script might not be ready yet, which is fine
      }
    }
  }

  isEcommerceUrl(url) {
    if (!url) return false;

    const ecommercePatterns = [
      /amazon\./,
      /ebay\./,
      /etsy\./,
      /shopify\./,
      /shop\./,
      /store\./,
      /buy\./,
      /cart\./,
      /checkout\./,
      /product\//,
      /item\//,
      /p\//,
      /trendyol\./,
      /hepsiburada\./
    ];

    return ecommercePatterns.some(pattern => pattern.test(url));
  }

  showWelcomeNotification() {
    // Create a simple notification for new users
    if (chrome.notifications) {
      chrome.notifications.create('workly-welcome', {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Welcome to Workly!',
        message: 'Workly will help you calculate work hours needed for purchases. Click the extension icon to customize your hourly wage or monthly salary.'
      });
    }
  }
}

// Initialize the background script
new WorklyBackground();