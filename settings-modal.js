// In-page settings modal rendered inside a Shadow DOM
class SettingsModal {
  constructor(langManager, purchaseTracker) {
    this.langManager = langManager;
    this.purchaseTracker = purchaseTracker;
    this.onSave = null;
  }

  getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$', 'EUR': '\u20AC', 'GBP': '\u00A3',
      'TRY': '\u20BA', 'JPY': '\u00A5', 'CAD': '$', 'AUD': '$'
    };
    return symbols[currency] || '$';
  }

  open(currentSettings) {
    const existingHost = document.getElementById('workly-settings-host');
    if (existingHost) existingHost.remove();

    const host = document.createElement('div');
    host.id = 'workly-settings-host';
    host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;width:0;height:0;';

    const shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);

    const container = document.createElement('div');
    container.className = 'modal-overlay';
    container.innerHTML = `
      <style>${this._getCSS()}</style>
      <div class="modal-wrapper">
        <div class="popup-container">${this._getHTML()}</div>
      </div>
    `;

    shadow.appendChild(container);
    this._bindEvents(shadow, currentSettings);
    document.body.style.overflow = 'hidden';
  }

  close() {
    const host = document.getElementById('workly-settings-host');
    if (host) {
      host.remove();
      document.body.style.overflow = '';
    }
  }

  _bindEvents(shadow, currentSettings) {
    const els = {
      enableToggle: shadow.getElementById('enableToggle'),
      hourlyWage: shadow.getElementById('hourlyWage'),
      monthlySalary: shadow.getElementById('monthlySalary'),
      workingHours: shadow.getElementById('workingHours'),
      currency: shadow.getElementById('currency'),
      currencyPrefix: shadow.getElementById('currencyPrefix'),
      currencyPrefixMonthly: shadow.getElementById('currencyPrefixMonthly'),
      saveButton: shadow.getElementById('saveSettings'),
      exportBtn: shadow.getElementById('exportCsv'),
      dailyEarnings: shadow.getElementById('dailyEarnings'),
      weeklyEarnings: shadow.getElementById('weeklyEarnings'),
      calculatedHourly: shadow.getElementById('calculatedHourly'),
      tabButtons: shadow.querySelectorAll('.tab-button'),
      tabContents: shadow.querySelectorAll('.tab-content'),
      modalClose: shadow.querySelector('.modal-close'),
      overlay: shadow.querySelector('.modal-overlay')
    };

    // Populate current values
    if (currentSettings) {
      els.hourlyWage.value = currentSettings.hourlyWage || 15;
      els.monthlySalary.value = currentSettings.monthlySalary || 35000;
      els.workingHours.value = currentSettings.workingHours || 160;
      els.currency.value = currentSettings.currency || 'USD';
      els.enableToggle.checked = currentSettings.isActive !== false;
    }

    const salaryType = currentSettings?.salaryType || 'hourly';
    this._switchTab(shadow, salaryType);

    this._updateCurrencyPrefix(shadow);
    this._updateStats(shadow);
    this._updateCalculatedHourly(shadow);

    // Close events
    els.modalClose.addEventListener('click', () => this.close());
    els.overlay.addEventListener('click', (e) => {
      if (e.target === els.overlay) this.close();
    });

    // Tab switching
    els.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        this._switchTab(shadow, button.getAttribute('data-tab'));
      });
    });

    // Live updates
    const updateAll = () => {
      this._updateStats(shadow);
      this._updateCalculatedHourly(shadow);
    };

    els.hourlyWage.addEventListener('input', updateAll);
    els.monthlySalary.addEventListener('input', updateAll);
    els.workingHours.addEventListener('input', updateAll);
    els.currency.addEventListener('change', () => {
      this._updateCurrencyPrefix(shadow);
      updateAll();
    });

    // Save
    els.saveButton.addEventListener('click', async () => {
      const activeTab = shadow.querySelector('.tab-button.active').getAttribute('data-tab');
      const currency = els.currency.value;
      const isActive = els.enableToggle.checked;

      let hourlyWage;
      if (activeTab === 'monthly') {
        const monthly = parseFloat(els.monthlySalary.value) || 35000;
        const hours = parseFloat(els.workingHours.value) || 160;
        hourlyWage = monthly / hours;
      } else {
        hourlyWage = parseFloat(els.hourlyWage.value) || 15;
      }

      const settings = {
        hourlyWage,
        currency,
        isActive,
        salaryType: activeTab,
        monthlySalary: parseFloat(els.monthlySalary.value) || 35000,
        workingHours: parseFloat(els.workingHours.value) || 160
      };

      await chrome.storage.sync.set(settings);
      if (this.onSave) this.onSave(settings);
      this.close();
    });

    // CSV Export
    els.exportBtn?.addEventListener('click', async () => {
      const csv = await this.purchaseTracker.exportCSV();
      if (csv) {
        this.purchaseTracker.downloadCSV(csv);
      }
    });

    // Render purchase history
    this._renderHistory(shadow);
  }

  async _renderHistory(shadow) {
    const list = shadow.getElementById('purchase-history-list');
    if (!list) return;

    const purchases = await this.purchaseTracker.getPurchases();
    list.innerHTML = this.purchaseTracker.renderHistoryHTML(purchases);

    // Bind delete buttons
    list.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'));
        await this.purchaseTracker.deletePurchase(id);
        this._renderHistory(shadow);
      });
    });
  }

  _switchTab(shadow, tabType) {
    shadow.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabType);
    });
    shadow.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabType}-tab`);
    });
    this._updateStats(shadow);
  }

  _updateCurrencyPrefix(shadow) {
    const currency = shadow.getElementById('currency').value;
    const symbol = this.getCurrencySymbol(currency);
    shadow.getElementById('currencyPrefix').textContent = symbol;
    shadow.getElementById('currencyPrefixMonthly').textContent = symbol;
  }

  _updateCalculatedHourly(shadow) {
    const monthly = parseFloat(shadow.getElementById('monthlySalary').value) || 0;
    const hours = parseFloat(shadow.getElementById('workingHours').value) || 160;
    const currency = shadow.getElementById('currency').value;
    const symbol = this.getCurrencySymbol(currency);
    const rate = (monthly / hours).toFixed(2);
    const perHour = this.langManager.getCurrentLanguage() === 'tr' ? '/saat' : '/hr';
    shadow.getElementById('calculatedHourly').textContent = `${symbol}${rate}${perHour}`;
  }

  _updateStats(shadow) {
    const activeTab = shadow.querySelector('.tab-button.active')?.getAttribute('data-tab');
    let hourlyRate;

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

  _getHTML() {
    const t = (key) => this.langManager.t(key);
    const lang = this.langManager.getCurrentLanguage();
    const perMonth = lang === 'tr' ? '/ay' : '/mo';
    const perHour = lang === 'tr' ? '/saat' : '/hr';
    const hoursUnit = lang === 'tr' ? 'saat' : 'hours';
    const exportLabel = lang === 'tr' ? 'CSV Olarak Aktar' : 'Export CSV';

    return `
      <div class="header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <h1>Workly</h1>
        </div>
        <div class="toggle-container" style="margin-right:auto;margin-left:20px;">
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
        <div class="tabs-container">
          <div class="tabs">
            <button class="tab-button" data-tab="monthly">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${t('monthly')}
            </button>
            <button class="tab-button active" data-tab="hourly">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              ${t('hourly')}
            </button>
            <button class="tab-button" data-tab="history">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              ${t('purchaseHistory')}
            </button>
          </div>
        </div>
        <div class="tab-content" id="monthly-tab">
          <div class="setting-group">
            <label for="monthlySalary" class="setting-label">
              <span>${t('monthlySalary')}</span>
              <span class="setting-description">${t('monthlySalaryDesc')}</span>
            </label>
            <div class="input-group">
              <span class="input-prefix" id="currencyPrefixMonthly"></span>
              <input type="number" id="monthlySalary" class="setting-input" value="35000" min="100" max="1000000" step="100">
              <span class="input-suffix">${perMonth}</span>
            </div>
          </div>
          <div class="setting-group">
            <label for="workingHours" class="setting-label">
              <span>${t('workingHours')}</span>
              <span class="setting-description">${t('workingHoursDesc')}</span>
            </label>
            <div class="input-group">
              <input type="number" id="workingHours" class="setting-input" value="160" min="40" max="300" step="1">
              <span class="input-suffix">${hoursUnit}</span>
            </div>
          </div>
          <div class="calculated-hourly">
            <div class="calculated-label">${t('calculatedHourlyRate')}</div>
            <div class="calculated-value" id="calculatedHourly"></div>
          </div>
        </div>
        <div class="tab-content" id="hourly-tab">
          <div class="setting-group">
            <label for="hourlyWage" class="setting-label">
              <span>${t('hourlyWage')}</span>
              <span class="setting-description">${t('hourlyWageDesc')}</span>
            </label>
            <div class="input-group">
              <span class="input-prefix" id="currencyPrefix"></span>
              <input type="number" id="hourlyWage" class="setting-input" value="150" min="1" max="10000" step="0.01">
              <span class="input-suffix">${perHour}</span>
            </div>
          </div>
        </div>
        <div class="tab-content" id="history-tab">
          <div class="history-list" id="purchase-history-list"></div>
          <button id="exportCsv" class="save-button" style="margin-top:12px;background:#444;border-color:#444;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            ${exportLabel}
          </button>
        </div>
        <div class="setting-group">
          <label for="currency" class="setting-label">
            <span>${t('currency')}</span>
            <span class="setting-description">${t('currencyDesc')}</span>
          </label>
          <select id="currency" class="setting-select">
            <option value="TRY">TRY (\u20BA)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (\u20AC)</option>
            <option value="GBP">GBP (\u00A3)</option>
            <option value="JPY">JPY (\u00A5)</option>
            <option value="CAD">CAD ($)</option>
            <option value="AUD">AUD ($)</option>
          </select>
        </div>
        <div class="stats-section">
          <h3>${t('quickStats')}</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value" id="dailyEarnings"></div>
              <div class="stat-label">${t('daily')}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="weeklyEarnings"></div>
              <div class="stat-label">${t('weekly')}</div>
            </div>
          </div>
        </div>
        <button id="saveSettings" class="save-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          ${t('saveSettings')}
        </button>
      </div>
      <div class="footer">
        <p>${t('footerText')}</p>
      </div>
    `;
  }

  _getCSS() {
    return `
      *:not(svg, svg *) { box-sizing: border-box; margin: 0; padding: 0; }
      .modal-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .modal-wrapper {
        background: transparent; border-radius: 8px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden;
        animation: scaleIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
      }
      @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .popup-container { width: 380px; display: flex; flex-direction: column; background: white; max-height: 90vh; overflow-y: auto; }
      .header { background: white; color: #111; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e0e0e0; }
      .logo { display: flex; align-items: center; gap: 10px; }
      .logo svg { color: #000; width: 24px; height: 24px; }
      .logo h1 { font-size: 20px; font-weight: 600; color: #000; letter-spacing: -0.5px; margin: 0; }
      .content { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
      .tabs-container { margin-bottom: 8px; }
      .tabs { display: flex; background: #f5f5f5; border-radius: 6px; padding: 4px; gap: 4px; }
      .tab-button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border: none; background: transparent; color: #666; font-size: 13px; font-weight: 500; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; }
      .tab-button:hover { color: #000; }
      .tab-button.active { background: white; color: #000; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
      .tab-button svg { width: 14px; height: 14px; }
      .tab-content { display: none; flex-direction: column; gap: 20px; }
      .tab-content.active { display: flex; }
      .calculated-hourly { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
      .calculated-label { font-size: 13px; color: #666; font-weight: 500; }
      .calculated-value { font-size: 15px; font-weight: 600; color: #000; }
      .setting-group { display: flex; flex-direction: column; gap: 10px; }
      .setting-label { display: flex; flex-direction: column; gap: 4px; }
      .setting-label span:first-child { font-weight: 600; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
      .setting-description { font-size: 12px; color: #666; }
      .input-group { display: flex; align-items: center; background: white; border: 1px solid #e0e0e0; border-radius: 4px; padding: 0 12px; transition: all 0.2s ease; }
      .input-group:focus-within { border-color: #000; }
      .input-prefix, .input-suffix { font-size: 14px; color: #666; font-weight: 500; }
      .setting-input { flex: 1; border: none; background: transparent; padding: 14px 8px; font-size: 14px; outline: none; color: #111; min-width: 0; }
      .setting-select { width: 100%; padding: 14px 12px; border: 1px solid #e0e0e0; border-radius: 4px; background: white; font-size: 14px; color: #111; outline: none; transition: all 0.2s ease; }
      .setting-select:focus { border-color: #000; }
      .toggle-container { display: flex; align-items: center; }
      .toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
      .toggle input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #e0e0e0; transition: 0.3s; border-radius: 24px; }
      .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      input:checked + .slider { background: #000; }
      input:checked + .slider:before { transform: translateX(20px); }
      .stats-section { background: #fff; border-top: 1px solid #e0e0e0; padding-top: 24px; margin-top: 8px; }
      .stats-section h3 { font-size: 13px; font-weight: 600; margin-bottom: 16px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
      .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .stat-item { text-align: left; }
      .stat-value { font-size: 24px; font-weight: 300; color: #000; margin-bottom: 4px; }
      .stat-label { font-size: 12px; color: #666; font-weight: 500; }
      .save-button { background: black; color: white; border: 1px solid black; padding: 14px 20px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s ease; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.5px; width: 100%; }
      .save-button:hover { background: #222; transform: translateY(-1px); }
      .save-button svg { width: 16px; height: 16px; }
      .footer { padding: 16px 20px; text-align: center; border-top: 1px solid #e0e0e0; background: white; margin-top: auto; }
      .footer p { font-size: 11px; color: #999; }
      .modal-close { background: transparent; border: none; color: #999; cursor: pointer; padding: 8px; margin-right: -8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
      .modal-close:hover { color: #000; background: #f5f5f5; }
      .modal-close svg { width: 20px; height: 20px; }
      .history-list { display: flex; flex-direction: column; gap: 12px; max-height: 300px; overflow-y: auto; padding-right: 4px; }
      .history-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fafafa; border: 1px solid #eee; border-radius: 6px; transition: all 0.2s; }
      .history-item:hover { border-color: #ddd; background: #f5f5f5; }
      .history-details { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
      .history-title { font-size: 13px; font-weight: 500; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .history-meta { font-size: 11px; color: #666; display: flex; gap: 8px; }
      .history-cost { font-weight: 600; color: #000; font-size: 13px; margin: 0 12px; white-space: nowrap; }
      .history-delete { background: transparent; border: none; color: #999; cursor: pointer; padding: 6px; border-radius: 4px; display: flex; align-items: center; }
      .history-delete:hover { color: #d32f2f; background: rgba(211,47,47,0.1); }
      .no-history { text-align: center; padding: 40px 0; color: #999; font-size: 13px; }
    `;
  }
}

window.SettingsModal = SettingsModal;
