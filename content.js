// Workly Content Script — Main coordinator
// Delegates to: WorklyWidget, PurchaseTracker, SettingsModal, CurrencyConverter, Parsers

class WorklyCalculator {
  constructor() {
    this.hourlyWage = 15;
    this.currency = 'USD';
    this.isActive = false;
    this.salaryType = 'hourly';
    this.observerActive = false;
    this._updating = false;
    this._debounceTimer = null;

    this.langManager = new LanguageManager();
    this.widget = new WorklyWidget(this.langManager);
    this.purchaseTracker = new PurchaseTracker(this.langManager);
    this.settingsModal = new SettingsModal(this.langManager, this.purchaseTracker);
    this.currencyConverter = typeof CurrencyConverter !== 'undefined' ? new CurrencyConverter() : null;

    this.parsers = [
      new TrendyolParser(),
      new HepsiburadaParser(),
      new AmazonParser(),
      typeof N11Parser !== 'undefined' ? new N11Parser() : null,
      typeof EbayParser !== 'undefined' ? new EbayParser() : null,
      typeof EtsyParser !== 'undefined' ? new EtsyParser() : null,
      new GenericParser()
    ].filter(Boolean);

    // Wire callbacks
    this.widget.onSettingsClick = () => this._openSettings();
    this.widget.onPurchaseClick = () => this._handlePurchase();
    this.settingsModal.onSave = (settings) => this._applySettings(settings);

    this.init();
  }

  async init() {
    const result = await chrome.storage.sync.get([
      'hourlyWage', 'monthlySalary', 'workingHours',
      'currency', 'isActive', 'salaryType'
    ]);

    if (result.salaryType === 'monthly') {
      const monthlySalary = result.monthlySalary || 35000;
      const workingHours = result.workingHours || 160;
      this.hourlyWage = monthlySalary / workingHours;
    } else {
      this.hourlyWage = result.hourlyWage || 15;
    }

    this.currency = result.currency || this.langManager.getDefaultCurrency();
    this.isActive = result.isActive !== false;
    this.salaryType = result.salaryType || 'hourly';

    if (this.isActive) {
      this._startObserving();
      this._detectAndShow();
    }
  }

  _startObserving() {
    if (this.observerActive) return;

    const observer = new MutationObserver(() => {
      // Skip if we're in the middle of creating/removing a widget
      if (this._updating) { return; }

      // Widget still in DOM (even if collapsed) — nothing to do
      if (this.widget.worklyDiv && document.contains(this.widget.worklyDiv)) return;

      // Widget was removed externally (SPA navigation) — reset collapsed state
      this.widget._collapsed = false;
      this.widget.worklyDiv = null;

      // Debounce to avoid rapid-fire on dynamic pages
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this._detectAndShow(), 500);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    this.observerActive = true;
  }

  async _detectAndShow() {
    clearTimeout(this._debounceTimer);
    if (this._updating) return;
    this._updating = true;

    try {
      const priceData = this._extractPrice();
      if (!priceData || priceData.price <= 0) return;

      const workData = await this._calculateWorkHours(priceData.price, priceData.currency);
      const savings = null;
      this.widget.create(priceData.price, workData, savings);

      // Update extension badge
      try {
        chrome.runtime.sendMessage({ action: 'setBadge', hours: workData.hours });
      } catch (e) { /* ignore */ }
    } finally {
      this._updating = false;
    }
  }

  _extractPrice() {
    const hostname = window.location.hostname.toLowerCase();
    const path = window.location.pathname;
    const href = window.location.href;

    for (const parser of this.parsers) {
      if (parser.isMatch(hostname)) {
        if (!parser.isValidPage(path, href)) continue;
        const result = parser.parse();
        if (result) return result;
      }
    }
    return null;
  }

  async _calculateWorkHours(price, priceCurrency) {
    let effectiveWage = this.hourlyWage;
    let effectiveCurrency = this.currency;

    if (priceCurrency && priceCurrency !== this.currency && this.currencyConverter) {
      try {
        const convertedPrice = await this.currencyConverter.convert(price, priceCurrency, this.currency);
        if (convertedPrice !== null) {
          return {
            hours: (convertedPrice / effectiveWage).toFixed(1),
            wage: effectiveWage,
            currency: this.currency,
            priceCurrency: priceCurrency
          };
        }
      } catch (e) {
        // Fall through to direct calculation
      }
    }

    return {
      hours: (price / effectiveWage).toFixed(1),
      wage: effectiveWage,
      currency: priceCurrency || effectiveCurrency
    };
  }

  _openSettings() {
    this.settingsModal.open({
      hourlyWage: this.hourlyWage,
      currency: this.currency,
      isActive: this.isActive,
      salaryType: this.salaryType
    });
  }

  _applySettings(settings) {
    this.hourlyWage = settings.hourlyWage;
    this.currency = settings.currency;
    this.isActive = settings.isActive;
    this.salaryType = settings.salaryType;
    this._detectAndShow();
  }

  async _handlePurchase() {
    if (!this.widget.currentWidgetData) return;
    const { price, workData } = this.widget.currentWidgetData;

    const budget = await this.purchaseTracker.recordPurchase(price, workData);

    const msg = budget.isOverBudget
      ? `${this.langManager.t('budgetExceeded')} ${Math.abs(budget.remainingHours).toFixed(1)} ${this.langManager.t('hours')}`
      : `${this.langManager.t('remainingBudget')} ${budget.remainingHours.toFixed(1)} ${this.langManager.t('hours')}`;

    this.widget.showPurchaseFeedback(msg);
    console.log('Workly:', msg);
  }
}

// Initialize — only in the top frame to prevent duplicates from iframes
if (window.self === window.top) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WorklyCalculator());
  } else {
    new WorklyCalculator();
  }
}

// Listen for settings updates from popup
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'updateSettings') {
    window.location.reload();
  }
});
