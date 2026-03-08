// Background script for Workly Chrome Extension
class WorklyBackground {
  constructor() {
    this.init();
  }

  init() {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.handleInstall();
      } else if (details.reason === 'update') {
        this.handleUpdate();
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });
  }

  async handleInstall() {
    const defaultSettings = {
      hourlyWage: 15,
      monthlySalary: 35000,
      workingHours: 160,
      currency: 'USD',
      isActive: true,
      salaryType: 'hourly'
    };

    try {
      await chrome.storage.sync.set(defaultSettings);
      console.log('Workly installed with default settings');
      this.showWelcomeNotification();
    } catch (error) {
      console.error('Error setting default settings:', error);
    }
  }

  handleUpdate() {
    console.log('Workly extension updated to v1.2.0');
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getSettings': {
          const settings = await chrome.storage.sync.get([
            'hourlyWage', 'monthlySalary', 'workingHours',
            'currency', 'isActive', 'salaryType'
          ]);
          sendResponse({ success: true, data: settings });
          break;
        }

        case 'updateSettings':
          await chrome.storage.sync.set(request.settings);
          sendResponse({ success: true });
          break;

        case 'setBadge':
          // Update extension badge with work hours for current tab
          if (sender.tab?.id) {
            this.updateBadge(sender.tab.id, request.hours);
          }
          sendResponse({ success: true });
          break;

        case 'logPrice':
          console.log('Price detected:', request.price, 'on', sender.tab?.url);
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

  updateBadge(tabId, hours) {
    if (!hours || hours <= 0) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }

    const numHours = parseFloat(hours);
    let badgeText;

    if (numHours < 1) {
      badgeText = `${Math.round(numHours * 60)}m`;
    } else if (numHours >= 100) {
      badgeText = `${Math.round(numHours)}h`;
    } else {
      badgeText = `${numHours.toFixed(1)}h`;
    }

    chrome.action.setBadgeText({ text: badgeText, tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#000000', tabId });
    chrome.action.setBadgeTextColor({ color: '#FFFFFF', tabId });
  }

  async handleTabUpdate(tabId, tab) {
    // Clear badge when navigating
    chrome.action.setBadgeText({ text: '', tabId });

    if (this.isEcommerceUrl(tab.url)) {
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'pageUpdated' });
      } catch (error) {
        // Content script might not be ready yet
      }
    }
  }

  isEcommerceUrl(url) {
    if (!url) return false;

    const ecommercePatterns = [
      /amazon\./, /ebay\./, /etsy\./, /shopify\./,
      /trendyol\./, /hepsiburada\./, /n11\./,
      /shop\./, /store\./, /buy\./, /cart\./,
      /product\//, /item\//, /\/p\//, /\/dp\//,
      /listing\//, /urun\//
    ];

    return ecommercePatterns.some(pattern => pattern.test(url));
  }

  showWelcomeNotification() {
    if (chrome.notifications) {
      chrome.notifications.create('workly-welcome', {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Welcome to Workly!',
        message: 'Click the extension icon to set your salary and start seeing how many work hours products cost.'
      });
    }
  }
}

new WorklyBackground();
