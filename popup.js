class WorklyPopup {
  constructor() {
    this.langManager = new LanguageManager();

    this.elements = {
      enableToggle: document.getElementById('enableToggle'),
      hourlyWage: document.getElementById('hourlyWage'),
      monthlySalary: document.getElementById('monthlySalary'),
      workingHours: document.getElementById('workingHours'),
      currency: document.getElementById('currency'),
      currencyPrefix: document.getElementById('currencyPrefix'),
      currencyPrefixMonthly: document.getElementById('currencyPrefixMonthly'),
      saveButton: document.getElementById('saveSettings'),
      dailyEarnings: document.getElementById('dailyEarnings'),
      weeklyEarnings: document.getElementById('weeklyEarnings'),
      calculatedHourly: document.getElementById('calculatedHourly'),
      tabButtons: document.querySelectorAll('.tab-button'),
      tabContents: document.querySelectorAll('.tab-content')
    };

    this.currentTab = 'hourly';
    this.salaryType = 'hourly';

    this.init();
  }

  async init() {
    this.localizeInterface();
    await this.loadSettings();
    this.bindEvents();
    this.updateStats();
    this.updateCurrencyPrefix();
    this.updateCalculatedHourly();

    // Reveal content after localization is complete
    document.querySelector('.content')?.classList.add('localized');
    document.querySelector('.footer')?.classList.add('localized');
  }

  localizeInterface() {
    // Populate all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.langManager.t(key);
      if (text && text !== key) {
        el.textContent = text;
      }
    });

    // Handle suffix localization (/ay, /saat, etc.)
    const lang = this.langManager.getCurrentLanguage();
    document.querySelectorAll('[data-i18n-suffix]').forEach(el => {
      const type = el.getAttribute('data-i18n-suffix');
      const suffixes = {
        month: { tr: '/ay', en: '/mo' },
        hour:  { tr: '/saat', en: '/hr' },
        hours: { tr: 'saat', en: 'hours' }
      };
      el.textContent = suffixes[type]?.[lang] || suffixes[type]?.en || '';
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'hourlyWage',
        'monthlySalary',
        'workingHours',
        'currency',
        'isActive',
        'salaryType'
      ]);

      this.elements.hourlyWage.value = result.hourlyWage || 15;
      this.elements.monthlySalary.value = result.monthlySalary || 35000;
      this.elements.workingHours.value = result.workingHours || 160;
      this.elements.currency.value = result.currency || this.langManager.getDefaultCurrency();
      this.elements.enableToggle.checked = result.isActive !== false;
      this.salaryType = result.salaryType || 'hourly';

      this.switchTab(this.salaryType);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  bindEvents() {
    this.elements.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.switchTab(button.getAttribute('data-tab'));
      });
    });

    this.elements.saveButton.addEventListener('click', () => this.saveSettings());

    this.elements.hourlyWage.addEventListener('input', () => {
      this.updateStats();
      this.debounceAutoSave();
    });

    this.elements.monthlySalary.addEventListener('input', () => {
      this.updateCalculatedHourly();
      this.updateStats();
      this.debounceAutoSave();
    });

    this.elements.workingHours.addEventListener('input', () => {
      this.updateCalculatedHourly();
      this.updateStats();
      this.debounceAutoSave();
    });

    this.elements.enableToggle.addEventListener('change', () => {
      this.debounceAutoSave();
    });

    this.elements.currency.addEventListener('change', () => {
      this.updateStats();
      this.updateCurrencyPrefix();
      this.updateCalculatedHourly();
      this.debounceAutoSave();
    });

    // Dashboard link
    document.getElementById('openDashboard')?.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });

    // Validate on blur
    this.elements.hourlyWage.addEventListener('blur', () => {
      if (isNaN(parseFloat(this.elements.hourlyWage.value)) || parseFloat(this.elements.hourlyWage.value) <= 0) {
        this.elements.hourlyWage.value = 15;
        this.updateStats();
      }
    });

    this.elements.monthlySalary.addEventListener('blur', () => {
      if (isNaN(parseFloat(this.elements.monthlySalary.value)) || parseFloat(this.elements.monthlySalary.value) <= 0) {
        this.elements.monthlySalary.value = 35000;
        this.updateCalculatedHourly();
        this.updateStats();
      }
    });

    this.elements.workingHours.addEventListener('blur', () => {
      if (isNaN(parseFloat(this.elements.workingHours.value)) || parseFloat(this.elements.workingHours.value) <= 0) {
        this.elements.workingHours.value = 160;
        this.updateCalculatedHourly();
        this.updateStats();
      }
    });
  }

  switchTab(tabType) {
    this.currentTab = tabType;
    this.salaryType = tabType;

    this.elements.tabButtons.forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-tab') === tabType);
    });

    this.elements.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabType}-tab`);
    });

    this.updateStats();
  }

  updateCurrencyPrefix() {
    const symbol = this.getCurrencySymbol(this.elements.currency.value);
    this.elements.currencyPrefix.textContent = symbol;
    this.elements.currencyPrefixMonthly.textContent = symbol;
  }

  updateCalculatedHourly() {
    const monthlySalary = parseFloat(this.elements.monthlySalary.value) || 35000;
    const workingHours = parseFloat(this.elements.workingHours.value) || 160;
    const symbol = this.getCurrencySymbol(this.elements.currency.value);
    const hourlyRate = (monthlySalary / workingHours).toFixed(2);
    const perHour = this.langManager.getCurrentLanguage() === 'tr' ? '/saat' : '/hr';
    this.elements.calculatedHourly.textContent = `${symbol}${hourlyRate}${perHour}`;
  }

  getEffectiveHourlyWage() {
    if (this.salaryType === 'monthly') {
      const monthlySalary = parseFloat(this.elements.monthlySalary.value) || 35000;
      const workingHours = parseFloat(this.elements.workingHours.value) || 160;
      return monthlySalary / workingHours;
    }
    return parseFloat(this.elements.hourlyWage.value) || 15;
  }

  updateStats() {
    const hourlyWage = this.getEffectiveHourlyWage();
    const symbol = this.getCurrencySymbol(this.elements.currency.value);
    this.elements.dailyEarnings.textContent = `${symbol}${(hourlyWage * 8).toFixed(0)}`;
    this.elements.weeklyEarnings.textContent = `${symbol}${(hourlyWage * 40).toFixed(0)}`;
  }

  getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$', 'EUR': '\u20AC', 'GBP': '\u00A3',
      'TRY': '\u20BA', 'JPY': '\u00A5', 'CAD': '$', 'AUD': '$'
    };
    return symbols[currency] || '$';
  }

  async saveSettings() {
    const settings = {
      hourlyWage: this.getEffectiveHourlyWage(),
      monthlySalary: parseFloat(this.elements.monthlySalary.value) || 35000,
      workingHours: parseFloat(this.elements.workingHours.value) || 160,
      currency: this.elements.currency.value,
      isActive: this.elements.enableToggle.checked,
      salaryType: this.salaryType,
      originalHourlyWage: parseFloat(this.elements.hourlyWage.value) || 15
    };

    try {
      await chrome.storage.sync.set(settings);
      this.showSuccess();

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSettings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError();
    }
  }

  debounceAutoSave() {
    clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = setTimeout(() => this.saveSettings(), 1000);
  }

  showSuccess() {
    const button = this.elements.saveButton;
    const originalHTML = button.innerHTML;
    const savedText = this.langManager.getCurrentLanguage() === 'tr' ? 'Kaydedildi!' : 'Saved!';

    button.classList.add('success');
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
      ${savedText}
    `;

    setTimeout(() => {
      button.classList.remove('success');
      button.innerHTML = originalHTML;
    }, 2000);
  }

  showError() {
    const button = this.elements.saveButton;
    const originalHTML = button.innerHTML;

    button.style.background = '#dc3545';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      Error
    `;

    setTimeout(() => {
      button.style.background = '';
      button.innerHTML = originalHTML;
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WorklyPopup();
});
