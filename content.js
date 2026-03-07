class WorklyCalculator {
  constructor() {
    this.hourlyWage = 15; // Default hourly wage
    this.currency = 'USD';
    this.isActive = false;
    this.worklyDiv = null;
    this.observerActive = false;
    this.lastPriceElement = null;

    // Initialize language manager
    this.langManager = new LanguageManager();

    // Initialize Parsers
    this.parsers = [
      new TrendyolParser(),
      new HepsiburadaParser(),
      new AmazonParser(),
      new GenericParser()
    ];

    this.init();
  }

  async init() {
    // Get user settings from storage
    const result = await chrome.storage.sync.get([
      'hourlyWage',
      'monthlySalary',
      'workingHours',
      'currency',
      'isActive',
      'salaryType'
    ]);

    // Calculate effective hourly wage based on salary type
    if (result.salaryType === 'monthly') {
      const monthlySalary = result.monthlySalary || 35000;
      const workingHours = result.workingHours || 160;
      this.hourlyWage = monthlySalary / workingHours;
    } else {
      this.hourlyWage = result.hourlyWage || 15;
    }

    // Use language-based default currency if not set
    this.currency = result.currency || this.langManager.getDefaultCurrency();
    this.isActive = result.isActive !== false; // Default to true

    if (this.isActive) {
      this.startObserving();
      this.detectAndCreateWidget();
    }
  }

  startObserving() {
    if (this.observerActive) return;

    // Observe DOM changes to detect when new content loads
    const observer = new MutationObserver(() => {
      if (!this.worklyDiv || !document.contains(this.worklyDiv)) {
        this.detectAndCreateWidget();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observerActive = true;
  }

  detectAndCreateWidget() {
    const priceData = this.extractPriceAndElement();

    if (priceData && priceData.price > 0 && priceData.element) {
      console.log('Workly: Creating floating dongle for detected price:', priceData.price, priceData.currency);
      this.createFloatingDongle(
        priceData.price,
        null, // originalPrice handled by parsers if implemented
        priceData.currency,
        priceData.positionNear
      );
    }
  }

  extractPriceAndElement() {
    const hostname = window.location.hostname.toLowerCase();
    const path = window.location.pathname;
    const href = window.location.href;

    for (const parser of this.parsers) {
      if (parser.isMatch(hostname)) {
        // Check if page is valid (e.g. not category page)
        if (!parser.isValidPage(path, href)) {
          console.log(`Workly: Parser ${parser.constructor.name} matched host but invalid page.`);
          return null;
        }

        const result = parser.parse();
        if (result) return result;
      }
    }
    return null;
  }

  // Old detection methods removed in favor of parsers


  detectYemeksepetiPrice() {
    // To be implemented with provided CSS selectors
    console.log('Workly: Yemeksepeti detection - awaiting CSS selectors');
    return null;
  }

  detectLCWaikikiPrice() {
    // To be implemented with provided CSS selectors
    console.log('Workly: LC Waikiki detection - awaiting CSS selectors');
    return null;
  }

  detectCiceksepetiPrice() {
    // To be implemented with provided CSS selectors
    console.log('Workly: Ciceksepeti detection - awaiting CSS selectors');
    return null;
  }

  // ==================== HELPER METHODS ====================

  detectPriceFromSelectors(selectors) {
    // Generic helper method for website-specific detection
    for (const config of selectors) {
      try {
        const element = document.querySelector(config.selector);
        if (!element || !this.isElementVisible(element)) continue;

        let text = '';
        if (config.attribute) {
          text = element.getAttribute(config.attribute) || '';
        } else {
          text = element.textContent || '';
        }

        const priceData = this.parsePrice(text);
        if (priceData && priceData.value > 0) {
          console.log(`Workly: Found price using selector "${config.selector}":`, priceData.value);
          return {
            price: priceData.value,
            currency: priceData.currency || 'TRY',
            element: element,
            originalPrice: config.originalPriceSelector ? this.getOriginalPrice(config.originalPriceSelector) : null
          };
        }
      } catch (error) {
        console.log(`Workly: Error with selector "${config.selector}":`, error);
        continue;
      }
    }
    return null;
  }

  getOriginalPrice(selector) {
    try {
      const element = document.querySelector(selector);
      if (!element) return null;

      const text = element.textContent || '';
      const priceData = this.parsePrice(text);
      return priceData ? priceData.value : null;
    } catch (error) {
      return null;
    }
  }



  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0';
  }

  parsePrice(text) {
    // Remove common currency symbols and clean the text for parsing
    const originalText = text;
    const cleanText = text.replace(/[\s,]/g, '');

    // Enhanced regex to match various price formats including Turkish Lira
    const priceRegex = /[\$£€¥₹₽¢₺]?(\d{1,3}(?:[,.]?\d{3})*(?:[.,]\d{1,2})?)\s*(?:TL|USD|EUR|GBP|TRY|JPY|CAD|AUD|₺|\$|€|£|¥)?/i;
    const match = cleanText.match(priceRegex);

    if (match) {
      let price = match[1].replace(/,/g, '');
      // Handle decimal separator
      const lastDotIndex = price.lastIndexOf('.');
      if (lastDotIndex > -1 && price.length - lastDotIndex <= 3) {
        // Likely a decimal separator
        price = parseFloat(price);
      } else {
        // Likely a thousands separator
        price = parseFloat(price.replace(/\./g, ''));
      }

      // Detect currency from the original text
      const currency = this.detectPriceCurrency(originalText);

      return { value: price, currency: currency };
    }

    return null;
  }

  detectPriceCurrency(text) {
    // Check for currency symbols and text indicators
    if (text.includes('TL') || text.includes('₺')) return 'TRY';
    if (text.includes('$') && !text.includes('CAD') && !text.includes('AUD')) return 'USD';
    if (text.includes('€') || text.includes('EUR')) return 'EUR';
    if (text.includes('£') || text.includes('GBP')) return 'GBP';
    if (text.includes('¥') || text.includes('JPY')) return 'JPY';
    if (text.includes('₹') || text.includes('INR')) return 'INR';
    if (text.includes('₽') || text.includes('RUB')) return 'RUB';
    if (text.includes('CAD')) return 'CAD';
    if (text.includes('AUD')) return 'AUD';

    // Fallback: detect from page context or domain
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('.tr') || hostname.includes('trendyol') || hostname.includes('hepsiburada')) {
      return 'TRY';
    }

    // Default to USD if no clear indicator
    return 'USD';
  }

  calculateWorkHours(price, priceCurrency = null) {
    // Smart currency matching: if price is in different currency than wage, adjust context
    let effectiveWage = this.hourlyWage;
    let effectiveCurrency = this.currency;

    // If price currency is detected and different from wage currency, adapt
    if (priceCurrency && priceCurrency !== this.currency) {
      // Smart currency context switching
      if (priceCurrency === 'TRY' && this.currency === 'USD') {
        // Turkish price with USD wage - use Turkish context
        effectiveWage = this.convertWageToTurkishContext();
        effectiveCurrency = 'TRY';
      } else if (priceCurrency === 'EUR' && this.currency === 'USD') {
        // European price with USD wage - use European context  
        effectiveWage = this.convertWageToEuropeanContext();
        effectiveCurrency = 'EUR';
      }
      // Add more currency conversions as needed
    }

    return {
      hours: (price / effectiveWage).toFixed(1),
      wage: effectiveWage,
      currency: effectiveCurrency
    };
  }

  convertWageToTurkishContext() {
    // Convert USD wage to approximate TRY wage based on purchasing power
    // This is a rough approximation - considers both exchange rate and local wages
    const usdToTryPurchasingPower = 30; // Approximate multiplier for cost of living
    return this.hourlyWage * usdToTryPurchasingPower;
  }

  convertWageToEuropeanContext() {
    // Convert USD wage to approximate EUR wage
    const usdToEurPurchasingPower = 0.85; // Approximate multiplier
    return this.hourlyWage * usdToEurPurchasingPower;
  }

  calculateSavings(originalPrice, currentPrice, effectiveWage = null) {
    if (!originalPrice || originalPrice <= currentPrice) return null;

    const savings = originalPrice - currentPrice;
    const wage = effectiveWage || this.hourlyWage;
    const savingsHours = (savings / wage).toFixed(1);
    const savingsPercentage = Math.round(((savings / originalPrice) * 100));

    return {
      amount: savings,
      hours: savingsHours,
      percentage: savingsPercentage
    };
  }

  getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'TRY': '₺',
      'JPY': '¥',
      'CAD': '$',
      'AUD': '$'
    };
    return symbols[currency] || '$';
  }



  createFloatingDongle(price, originalPrice = null, priceCurrency = null, positionNear = null) {
    // Remove existing widget if present
    this.removeExistingWidget();

    const workData = this.calculateWorkHours(price, priceCurrency);
    const currencySymbol = this.getCurrencySymbol(workData.currency);

    // Calculate savings if there's an original price
    const savings = originalPrice ? this.calculateSavings(originalPrice, price, workData.wage) : null;

    // Create the embedded widget container
    this.worklyDiv = document.createElement('div');
    this.worklyDiv.id = 'workly-fixed-widget'; // Matches content.css
    this.worklyDiv.className = 'workly-widget';

    // Build localized text
    const numericHours = parseFloat(workData.hours);
    let displayTime, displayUnit;

    if (numericHours < 1) {
      const minutes = Math.round(numericHours * 60);
      displayTime = Math.max(1, minutes); // Ensure at least 1 minute
      displayUnit = this.langManager.t('minutes');
    } else {
      displayTime = workData.hours;
      displayUnit = this.langManager.t('hours');
    }

    const mainText = `${displayTime} ${displayUnit} ${this.langManager.t('toBuyThis')}`;

    // Get reflection messages
    const reflections = this.langManager.t('reflectionMessages');
    const reflection = Array.isArray(reflections)
      ? reflections[Math.floor(Math.random() * reflections.length)]
      : reflections;

    const subText = savings
      ? `${reflection} • ${this.langManager.t('saveHours')} ${savings.hours}h (${savings.percentage}% off)`
      : reflection;

    // Store widget data
    this.currentWidgetData = { mainText, subText, workData, savings, price };

    // Set the HTML content for embedded widget
    this.worklyDiv.innerHTML = this.getEmbeddedWidgetHTML();

    // Apply fixed styles immediately
    this.worklyDiv.style.cssText = this.getPositionStyles();

    // Inject into the page structure
    this.injectWidgetIntoDOM(positionNear);

    // Add event listeners
    this.addEmbeddedWidgetEvents();

    // Show widget with animation
    setTimeout(() => {
      this.worklyDiv.classList.add('workly-visible');
    }, 500);

    console.log('Workly: Embedded widget created and injected into DOM');
  }

  removeExistingWidget() {
    // Remove any existing widget
    const existingWidget = document.getElementById('workly-embedded-widget');
    if (existingWidget) {
      existingWidget.remove();
    }
    if (this.worklyDiv) {
      this.worklyDiv.remove();
      this.worklyDiv = null;
    }
  }

  injectWidgetIntoDOM(positionNear) {
    // ALWAYS append to body now, for fixed positioning.
    // We ignore positionNear as we are moving to a fixed overlay strategy.
    document.body.appendChild(this.worklyDiv);
  }

  getPositionStyles() {
    // Return fixed positioning styles for right-middle placement
    return `
      position: fixed !important;
      right: 0 !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      z-index: 2147483647 !important;
      margin-right: 0 !important;
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
      box-shadow: -5px 0 15px rgba(0,0,0,0.1) !important;
    `;
  }

  getEmbeddedWidgetHTML() {
    if (!this.currentWidgetData) return '';

    const { mainText, subText } = this.currentWidgetData;

    return `
    <div class="workly-widget-expanded">
      <div class="workly-widget-header">
        <div class="workly-widget-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </div>
        <h3 class="workly-widget-brand">Workly</h3>
        <button class="workly-widget-close">×</button>
      </div>

      <div class="workly-widget-main">${mainText}</div>
      <div class="workly-widget-sub">${subText}</div>

      <div class="workly-widget-actions">
        <button class="workly-widget-btn settings-btn">⚙️ Ayarlar</button>
        <button class="workly-widget-btn details-btn">📊 Detaylar</button>
        <button class="workly-widget-btn purchase-btn">${this.langManager.t('iPurchasedThis')}</button>
      </div>
    </div>
    `;
  }

  addEmbeddedWidgetEvents() {
    if (!this.worklyDiv) return;

    // Expand on click (delegation)
    this.worklyDiv.addEventListener('click', (e) => {
      if (this.worklyDiv.classList.contains('workly-collapsed')) {
        this.expandEmbeddedWidget();
      }
    });

    // Close button
    const closeBtn = this.worklyDiv.querySelector('.workly-widget-close');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      // On Trendyol (and generally), we now collapse instead of remove
      this.collapseEmbeddedWidget();
    });

    // Settings button
    const settingsBtn = this.worklyDiv.querySelector('.settings-btn');
    settingsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openSettingsModal();
    });

    // Details button
    const detailsBtn = this.worklyDiv.querySelector('.details-btn');
    detailsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showDetailedInfo();
    });

    // Purchase button
    const purchaseBtn = this.worklyDiv.querySelector('.purchase-btn');
    purchaseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handlePurchase();
    });
  }

  collapseEmbeddedWidget() {
    if (!this.worklyDiv) return;

    this.worklyDiv.classList.add('workly-collapsed');
    console.log('Workly: Embedded widget collapsed to icon');
  }

  expandEmbeddedWidget() {
    if (!this.worklyDiv) return;

    this.worklyDiv.classList.remove('workly-collapsed');
    console.log('Workly: Embedded widget expanded');
  }

  hideEmbeddedWidget() {
    if (!this.worklyDiv) return;

    this.worklyDiv.classList.remove('workly-visible');
    setTimeout(() => {
      this.removeExistingWidget();
    }, 400);
    console.log('Workly: Embedded widget hidden');
  }

  showFloatingDongle() {
    if (!this.worklyDiv) return;

    this.worklyDiv.classList.add('workly-visible');
    console.log('Workly: Floating dongle appeared');
  }

  hideFloatingDongle() {
    if (!this.worklyDiv) return;

    this.worklyDiv.classList.remove('workly-visible');
    setTimeout(() => {
      this.removeExistingWidget();
    }, 300);
    console.log('Workly: Floating dongle hidden');
  }

  expandFloatingDongle() {
    if (!this.worklyDiv) return;

    this.worklyDiv.classList.remove('workly-collapsed');
  }

  collapseFloatingDongle() {
    if (!this.worklyDiv) return;

    this.worklyDiv.classList.add('workly-collapsed');
  }

  showDetailedInfo() {
    if (!this.currentWidgetData) return;

    const { workData, savings, price } = this.currentWidgetData;
    const currencySymbol = this.getCurrencySymbol(workData.currency);

    alert(`Workly Calculation Details:

    Price: ${currencySymbol}${price}
Work Hours Needed: ${workData.hours}
Hourly Wage: ${currencySymbol}${workData.wage.toFixed(2)}
${savings ? `\nSavings: ${currencySymbol}${savings.amount.toFixed(2)} (${savings.hours}h saved)` : ''}

💡 Tip: You can customize your wage in the extension settings!`);
  }


  async handlePurchase() {
    if (!this.currentWidgetData) return;

    const { price, workData } = this.currentWidgetData;
    const costHours = parseFloat(workData.hours);

    // Create purchase record
    const purchase = {
      id: Date.now(),
      date: new Date().toISOString(),
      price: price,
      currency: workData.currency,
      costHours: costHours,
      domain: window.location.hostname,
      title: document.title
    };

    // Save to storage
    const data = await chrome.storage.sync.get(['purchases', 'workingHours']);
    const purchases = data.purchases || [];
    purchases.push(purchase);

    await chrome.storage.sync.set({ purchases });

    // Calculate remaining budget
    const monthlyHours = data.workingHours || 160;
    const currentMonth = new Date().getMonth();

    // Filter purchases for current month
    const monthPurchases = purchases.filter(p => new Date(p.date).getMonth() === currentMonth);
    const totalSpentHours = monthPurchases.reduce((sum, p) => sum + p.costHours, 0);
    const remainingHours = monthlyHours - totalSpentHours;

    // Show feedback
    const btn = this.worklyDiv.querySelector('.purchase-btn');
    const originalText = btn.innerText;

    btn.innerText = "✅ " + this.langManager.t('purchaseSaved');
    btn.style.background = '#4CAF50';
    btn.style.borderColor = '#4CAF50';
    btn.style.color = 'white';

    // Show toast/alert with budget info
    setTimeout(() => {
      const msg = remainingHours >= 0
        ? `${this.langManager.t('remainingBudget')} ${remainingHours.toFixed(1)} ${this.langManager.t('hours')} `
        : `${this.langManager.t('budgetExceeded')} ${Math.abs(remainingHours).toFixed(1)} ${this.langManager.t('hours')} `;

      alert(msg);

      // Reset button
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 1000);
    }, 500);
  }
  openSettingsModal() {
    // Remove existing host if any
    const existingHost = document.getElementById('workly-settings-host');
    if (existingHost) existingHost.remove();

    // Create host and shadow root
    const host = document.createElement('div');
    host.id = 'workly-settings-host';
    host.style.position = 'fixed';
    host.style.zIndex = '2147483647'; // Max z-index
    host.style.top = '0';
    host.style.left = '0';
    host.style.width = '0';
    host.style.height = '0';

    const shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);

    // Inject styles and HTML
    const container = document.createElement('div');
    container.className = 'modal-overlay';

    // Get CSS and HTML
    const css = this.getSettingsModalCSS();
    const html = this.getSettingsModalHTML();

    container.innerHTML = `
      <style>${css}</style>
        <div class="modal-wrapper">
          <div class="popup-container">
            ${html}
          </div>
        </div>
    `;

    shadow.appendChild(container);

    // Add event listeners (pass shadow root as scope)
    this.addSettingsModalEvents(shadow);

    // Prevent scrolling on body
    document.body.style.overflow = 'hidden';
  }

  closeSettingsModal() {
    const host = document.getElementById('workly-settings-host');
    if (host) {
      host.remove();
      document.body.style.overflow = '';
    }
  }

  getSettingsModalCSS() {
    return `
      *:not(svg, svg *) { box-sizing: border-box; margin: 0; padding: 0; }
      
      .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

      .modal-wrapper {
      background: transparent;
      border-radius: 8px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      animation: scaleIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
    }

    @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }

      /* Ported from popup.css */
      .popup-container {
      width: 380px;
      display: flex;
      flex-direction: column;
      background: white;
      max-height: 90vh;
      overflow-y: auto;
    }

      .header {
      background: white;
      color: #111;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e0e0e0;
    }

      .logo { display: flex; align-items: center; gap: 10px; }
      .logo svg { color: #000; width: 24px; height: 24px; }
      .logo h1 { font-size: 20px; font-weight: 600; color: #000; letter-spacing: -0.5px; margin: 0; }

      .content {
      flex: 1;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

      .tabs-container { margin-bottom: 8px; }
      .tabs { display: flex; background: #f5f5f5; border-radius: 6px; padding: 4px; gap: 4px; }
      
      .tab-button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      background: transparent;
      color: #666;
      font-size: 13px;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
      
      .tab-button:hover { color: #000; }
      .tab-button.active { background: white; color: #000; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
      .tab-button svg { width: 14px; height: 14px; }

      .tab-content { display: none; flex-direction: column; gap: 20px; }
      .tab-content.active { display: flex; }

      .calculated-hourly {
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

      .calculated-label { font-size: 13px; color: #666; font-weight: 500; }
      .calculated-value { font-size: 15px; font-weight: 600; color: #000; }

      .setting-group { display: flex; flex-direction: column; gap: 10px; }
      .setting-label { display: flex; flex-direction: column; gap: 4px; }
      .setting-label span:first-child { font-weight: 600; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
      .setting-description { font-size: 12px; color: #666; }

      .input-group {
      display: flex;
      align-items: center;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 0 12px;
      transition: all 0.2s ease;
    }
      .input-group:focus-within { border-color: #000; }

      .input-prefix, .input-suffix { font-size: 14px; color: #666; font-weight: 500; }
      
      .setting-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 14px 8px;
      font-size: 14px;
      outline: none;
      color: #111;
      min-width: 0;
    }

      .setting-select {
      width: 100%;
      padding: 14px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: white;
      font-size: 14px;
      color: #111;
      outline: none;
      transition: all 0.2s ease;
    }
      .setting-select:focus { border-color: #000; }

      .toggle-container { display: flex; align-items: center; }
      .toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
      .toggle input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #e0e0e0; transition: 0.3s; border-radius: 24px; }
      .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
    input:checked + .slider { background: #000; }
    input:checked + .slider:before { transform: translateX(20px); }

      .stats-section { background: #fff; border-top: 1px solid #e0e0e0; padding-top: 24px; margin-top: 8px; }
      .stats-section h3 { font-size: 13px; font-weight: 600; margin-bottom: 16px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
      
      .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .stat-item { text-align: left; }
      .stat-value { font-size: 24px; font-weight: 300; color: #000; margin-bottom: 4px; }
      .stat-label { font-size: 12px; color: #666; font-weight: 500; }

      .save-button {
      background: black;
      color: white;
      border: 1px solid black;
      padding: 14px 20px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s ease;
      margin-top: 24px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: 100%;
    }
      .save-button:hover { background: #222; transform: translateY(-1px); }
      .save-button svg { width: 16px; height: 16px; }

      .footer { padding: 16px 20px; text-align: center; border-top: 1px solid #e0e0e0; background: white; margin-top: auto; }
      .footer p { font-size: 11px; color: #999; }

      /* Close button specific to modal */
      .modal-close {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 8px;
      margin-right: -8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
      .modal-close:hover { color: #000; background: #f5f5f5; }
      .modal-close svg { width: 20px; height: 20px; }

      /* History List Styles */
      .history-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 300px;
      overflow-y: auto;
      padding-right: 4px;
    }
      .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 6px;
      transition: all 0.2s;
    }
      .history-item:hover { border-color: #ddd; background: #f5f5f5; }
      .history-details { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
      .history-title { font-size: 13px; font-weight: 500; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .history-meta { font-size: 11px; color: #666; display: flex; gap: 8px; }
      .history-cost { font-weight: 600; color: #000; font-size: 13px; margin: 0 12px; white-space: nowrap; }
      .history-delete {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
    display: flex;
    align-items: center;
  }
      .history-delete:hover { color: #d32f2f; background: rgba(211, 47, 47, 0.1); }
      .no-history { text-align: center; padding: 40px 0; color: #999; font-size: 13px; }
`;
  }

  getSettingsModalHTML() {
    return `
  <div class="header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <h1>Workly</h1>
        </div>
        <div class="toggle-container" style="margin-right: auto; margin-left: 20px;">
          <label class="toggle">
            <input type="checkbox" id="enableToggle" checked>
            <span class="slider"></span>
          </label>
        </div>
        <button class="modal-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="content">
        <!-- Salary Type Tabs -->
        <div class="tabs-container">
          <div class="tabs">
            <button class="tab-button" data-tab="monthly">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${this.langManager.t('monthly')}
            </button>
            <button class="tab-button active" data-tab="hourly">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              ${this.langManager.t('hourly')}
            </button>
            <button class="tab-button" data-tab="history">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              ${this.langManager.t('purchaseHistory')}
            </button>
          </div>
        </div>

        <!-- Monthly Tab Content -->
        <div class="tab-content" id="monthly-tab">
          <div class="setting-group">
            <label for="monthlySalary" class="setting-label">
              <span>${this.langManager.t('monthlySalary')}</span>
              <span class="setting-description">${this.langManager.t('monthlySalaryDesc')}</span>
            </label>
            <div class="input-group">
              <span class="input-prefix" id="currencyPrefixMonthly">₺</span>
              <input type="number" id="monthlySalary" class="setting-input" value="35000" min="100" max="1000000" step="100">
              <span class="input-suffix">/ay</span>
            </div>
          </div>

          <div class="setting-group">
            <label for="workingHours" class="setting-label">
              <span>${this.langManager.t('workingHours')}</span>
              <span class="setting-description">${this.langManager.t('workingHoursDesc')}</span>
            </label>
            <div class="input-group">
              <input type="number" id="workingHours" class="setting-input" value="160" min="40" max="300" step="1">
              <span class="input-suffix">saat</span>
            </div>
          </div>

          <div class="calculated-hourly">
            <div class="calculated-label">${this.langManager.t('calculatedHourlyRate')}</div>
            <div class="calculated-value" id="calculatedHourly">₺218.75/saat</div>
          </div>
        </div>

        <!-- Hourly Tab Content -->
        <div class="tab-content" id="hourly-tab">
          <div class="setting-group">
            <label for="hourlyWage" class="setting-label">
              <span>${this.langManager.t('hourlyWage')}</span>
              <span class="setting-description">${this.langManager.t('hourlyWageDesc')}</span>
            </label>
            <div class="input-group">
              <span class="input-prefix" id="currencyPrefix">₺</span>
              <input type="number" id="hourlyWage" class="setting-input" value="150" min="1" max="10000" step="0.01">
              <span class="input-suffix">/saat</span>
            </div>
          </div>
        </div>

        <!-- History Tab Content -->
        <div class="tab-content" id="history-tab">
          <div class="history-list" id="purchase-history-list">
            <!-- Items injected by JS -->
          </div>
        </div>

        <!-- Currency Selection -->
        <div class="setting-group">
          <label for="currency" class="setting-label">
            <span>${this.langManager.t('currency')}</span>
            <span class="setting-description">${this.langManager.t('currencyDesc')}</span>
          </label>
          <select id="currency" class="setting-select">
            <option value="TRY">TRY (₺)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CAD">CAD ($)</option>
            <option value="AUD">AUD ($)</option>
          </select>
        </div>

        <!-- Stats Section -->
        <div class="stats-section">
          <h3>${this.langManager.t('quickStats')}</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value" id="dailyEarnings">₺1.200</div>
              <div class="stat-label">${this.langManager.t('daily')}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="weeklyEarnings">₺6.000</div>
              <div class="stat-label">${this.langManager.t('weekly')}</div>
            </div>
          </div>
        </div>

        <button id="saveSettings" class="save-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          ${this.langManager.t('saveSettings')}
        </button>
      </div>

      <div class="footer">
        <p>${this.langManager.t('footerText')}</p>
      </div>
`;
  }

  addSettingsModalEvents(shadow) {
    const els = {
      enableToggle: shadow.getElementById('enableToggle'),
      hourlyWage: shadow.getElementById('hourlyWage'),
      monthlySalary: shadow.getElementById('monthlySalary'),
      workingHours: shadow.getElementById('workingHours'),
      currency: shadow.getElementById('currency'),
      currencyPrefix: shadow.getElementById('currencyPrefix'),
      currencyPrefixMonthly: shadow.getElementById('currencyPrefixMonthly'),
      saveButton: shadow.getElementById('saveSettings'),
      dailyEarnings: shadow.getElementById('dailyEarnings'),
      weeklyEarnings: shadow.getElementById('weeklyEarnings'),
      calculatedHourly: shadow.getElementById('calculatedHourly'),
      tabButtons: shadow.querySelectorAll('.tab-button'),
      tabContents: shadow.querySelectorAll('.tab-content'),
      modalClose: shadow.querySelector('.modal-close'),
      overlay: shadow.querySelector('.modal-overlay')
    };

    // Initialize values
    this.updateModalValues(els);

    // Close events
    els.modalClose.addEventListener('click', () => this.closeSettingsModal());
    els.overlay.addEventListener('click', (e) => {
      if (e.target === els.overlay) this.closeSettingsModal();
    });

    // Tab switching
    els.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabType = button.getAttribute('data-tab');
        this.switchTab(shadow, tabType);
        this.modalSalaryType = tabType; // Track locally
      });
    });

    // Inputs update stats
    const updateAll = () => {
      this.updateStats(shadow);
      this.updateCalculatedHourly(shadow);
    };

    els.hourlyWage.addEventListener('input', updateAll);
    els.monthlySalary.addEventListener('input', updateAll);
    els.workingHours.addEventListener('input', updateAll);
    els.currency.addEventListener('change', () => {
      this.updateCurrencyPrefix(shadow);
      updateAll();
    });

    // Save
    els.saveButton.addEventListener('click', async () => {
      await this.saveModalSettings(shadow);
      this.closeSettingsModal();
    });

    // Initial render of history if tab is active (or pre-load)
    this.renderPurchaseHistory(shadow);
  }

  async renderPurchaseHistory(shadow) {
    const list = shadow.getElementById('purchase-history-list');
    if (!list) return;

    const data = await chrome.storage.sync.get(['purchases']);
    const purchases = data.purchases || [];

    if (purchases.length === 0) {
      list.innerHTML = `<div class="no-history"> ${this.langManager.t('noPurchases')}</div> `;
      return;
    }

    list.innerHTML = purchases.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => {
      const date = new Date(p.date).toLocaleDateString();
      const symbol = this.getCurrencySymbol(p.currency);
      return `
  <div class="history-item">
          <div class="history-details">
            <div class="history-title" title="${p.title}">${p.title}</div>
            <div class="history-meta">
              <span>${date}</span>
              <span>•</span>
              <span>${p.costHours.toFixed(1)} ${this.langManager.t('hours')}</span>
            </div>
          </div>
          <div class="history-cost">${symbol}${p.price}</div>
          <button class="history-delete" data-id="${p.id}" title="${this.langManager.t('delete')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
  `;
    }).join('');

    // Add delete listeners
    list.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling
        const id = parseInt(btn.getAttribute('data-id'));
        this.deletePurchase(id, shadow);
      });
    });
  }

  async deletePurchase(id, shadow) {
    if (!confirm(this.langManager.t('delete') + '?')) return;

    const data = await chrome.storage.sync.get(['purchases']);
    let purchases = data.purchases || [];
    purchases = purchases.filter(p => p.id !== id);

    await chrome.storage.sync.set({ purchases });
    this.renderPurchaseHistory(shadow);
  }

  updateModalValues(els) {
    els.hourlyWage.value = this.hourlyWage || 15;
    els.currency.value = this.currency || 'USD';

    // Set active tab based on saved or default
    const salaryType = this.salaryType || 'hourly';
    this.switchTab(els.hourlyWage.getRootNode(), salaryType);
    this.modalSalaryType = salaryType;

    // Trigger updates
    this.updateCurrencyPrefix(els.hourlyWage.getRootNode());
    this.updateStats(els.hourlyWage.getRootNode());
    this.updateCalculatedHourly(els.hourlyWage.getRootNode());
  }

  switchTab(shadow, tabType) {
    const tabButtons = shadow.querySelectorAll('.tab-button');
    const tabContents = shadow.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabType);
    });

    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabType}-tab`);
    });

    this.updateStats(shadow);
  }

  getCurrencySymbol(currency) {
    const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'TRY': '₺', 'JPY': '¥', 'CAD': '$', 'AUD': '$' };
    return symbols[currency] || currency;
  }

  updateCurrencyPrefix(shadow) {
    const currency = shadow.getElementById('currency').value;
    const symbol = this.getCurrencySymbol(currency);
    shadow.getElementById('currencyPrefix').textContent = symbol;
    shadow.getElementById('currencyPrefixMonthly').textContent = symbol;
  }

  updateCalculatedHourly(shadow) {
    const monthly = parseFloat(shadow.getElementById('monthlySalary').value) || 0;
    const hours = parseFloat(shadow.getElementById('workingHours').value) || 160;
    const currency = shadow.getElementById('currency').value;
    const symbol = this.getCurrencySymbol(currency);

    const rate = (monthly / hours).toFixed(2);
    shadow.getElementById('calculatedHourly').textContent = `${symbol}${rate}/saat`;
  }

  updateStats(shadow) {
    let hourlyRate;
    // Determine effective rate based on visible tab or selected type
    const activeTab = shadow.querySelector('.tab-button.active').getAttribute('data-tab');

    if (activeTab === 'monthly') {
      const monthly = parseFloat(shadow.getElementById('monthlySalary').value) || 0;
      const hours = parseFloat(shadow.getElementById('workingHours').value) || 160;
      hourlyRate = monthly / hours;
    } else {
      hourlyRate = parseFloat(shadow.getElementById('hourlyWage').value) || 15;
    }

    const currency = shadow.getElementById('currency').value;
    const symbol = this.getCurrencySymbol(currency);

    shadow.getElementById('dailyEarnings').textContent = `${symbol}${(hourlyRate * 8).toFixed(0)}`;
    shadow.getElementById('weeklyEarnings').textContent = `${symbol}${(hourlyRate * 40).toFixed(0)}`;
  }

  async saveModalSettings(shadow) {
    const activeTab = shadow.querySelector('.tab-button.active').getAttribute('data-tab');
    const currency = shadow.getElementById('currency').value;
    const isActive = shadow.getElementById('enableToggle').checked;

    let hourlyWage;
    if (activeTab === 'monthly') {
      const monthly = parseFloat(shadow.getElementById('monthlySalary').value) || 0;
      const hours = parseFloat(shadow.getElementById('workingHours').value) || 160;
      hourlyWage = monthly / hours;
    } else {
      hourlyWage = parseFloat(shadow.getElementById('hourlyWage').value) || 15;
    }

    const settings = {
      hourlyWage,
      currency,
      isActive,
      salaryType: activeTab,
      monthlySalary: parseFloat(shadow.getElementById('monthlySalary').value),
      workingHours: parseFloat(shadow.getElementById('workingHours').value)
    };

    await chrome.storage.sync.set(settings);

    // Update local state
    this.hourlyWage = settings.hourlyWage;
    this.currency = settings.currency;
    this.isActive = settings.isActive;
    this.salaryType = settings.salaryType;

    this.detectAndCreateWidget();
  }
}

// Initialize the calculator when the page loads
// Initialize the calculator when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WorklyCalculator();
  });
} else {
  new WorklyCalculator();
}

// Listen for settings changes from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateSettings') {
    // Reload the page to apply new settings
    window.location.reload();
  }
});