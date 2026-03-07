class WorklyPopup {
  constructor() {
    // Initialize language manager
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
    
    this.currentTab = 'hourly'; // Default tab
    this.salaryType = 'hourly'; // 'hourly' or 'monthly'
    
    this.init();
  }

  async init() {
    this.localizeInterface();
    await this.loadSettings();
    this.bindEvents();
    this.updateStats();
    this.updateCurrencyPrefix();
    this.updateCalculatedHourly();
  }

  localizeInterface() {
    // Update all text content with translations
    document.title = this.langManager.t('title');
    
    // Update tab buttons
    const hourlyTab = document.querySelector('[data-tab="hourly"]');
    const monthlyTab = document.querySelector('[data-tab="monthly"]');
    if (hourlyTab) hourlyTab.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
      ${this.langManager.t('hourly')}
    `;
    if (monthlyTab) monthlyTab.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      ${this.langManager.t('monthly')}
    `;

    // Update labels and descriptions
    this.updateLabel('hourly-tab', 'hourlyWage', this.langManager.t('hourlyWage'), this.langManager.t('hourlyWageDesc'));
    this.updateLabel('monthly-tab', 'monthlySalary', this.langManager.t('monthlySalary'), this.langManager.t('monthlySalaryDesc'));
    this.updateLabel('monthly-tab', 'workingHours', this.langManager.t('workingHours'), this.langManager.t('workingHoursDesc'));
    
    // Update currency label
    const currencyGroup = document.querySelector('label[for="currency"]');
    if (currencyGroup) {
      currencyGroup.innerHTML = `
        <span>${this.langManager.t('currency')}</span>
        <span class="setting-description">${this.langManager.t('currencyDesc')}</span>
      `;
    }

    // Update calculated hourly rate label
    const calculatedLabel = document.querySelector('.calculated-label');
    if (calculatedLabel) {
      calculatedLabel.textContent = this.langManager.t('calculatedHourlyRate');
    }

    // Update stats section
    const statsHeader = document.querySelector('.stats-section h3');
    if (statsHeader) {
      statsHeader.textContent = this.langManager.t('quickStats');
    }

    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels.length >= 2) {
      statLabels[0].textContent = this.langManager.t('daily');
      statLabels[1].textContent = this.langManager.t('weekly');
    }

    // Update save button
    const saveButton = document.getElementById('saveSettings');
    if (saveButton) {
      saveButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"/>
        </svg>
        ${this.langManager.t('saveSettings')}
      `;
    }

    // Update footer text
    const footerText = document.querySelector('.footer p');
    if (footerText) {
      footerText.textContent = this.langManager.t('footerText');
    }
  }

  updateLabel(tabId, inputId, labelText, descText) {
    const tab = document.getElementById(tabId);
    if (tab) {
      const label = tab.querySelector(`label[for="${inputId}"]`);
      if (label) {
        label.innerHTML = `
          <span>${labelText}</span>
          <span class="setting-description">${descText}</span>
        `;
      }
    }
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
      
      // Use language-based default currency if not set
      this.elements.currency.value = result.currency || this.langManager.getDefaultCurrency();
      this.elements.enableToggle.checked = result.isActive !== false;
      this.salaryType = result.salaryType || 'hourly';
      
      // Set the active tab based on saved salary type
      this.switchTab(this.salaryType);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Failed to load settings');
    }
  }

  bindEvents() {
    // Tab switching
    this.elements.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabType = button.getAttribute('data-tab');
        this.switchTab(tabType);
      });
    });

    // Save settings
    this.elements.saveButton.addEventListener('click', () => this.saveSettings());
    
    // Update stats when values change
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
    
    // Auto-save on toggle change
    this.elements.enableToggle.addEventListener('change', () => {
      this.debounceAutoSave();
    });
    
    // Auto-save on currency change
    this.elements.currency.addEventListener('change', () => {
      this.updateStats();
      this.updateCurrencyPrefix();
      this.updateCalculatedHourly();
      this.debounceAutoSave();
    });

    // Validate inputs
    this.elements.hourlyWage.addEventListener('blur', () => {
      const value = parseFloat(this.elements.hourlyWage.value);
      if (isNaN(value) || value <= 0) {
        this.elements.hourlyWage.value = 15;
        this.updateStats();
      }
    });

    this.elements.monthlySalary.addEventListener('blur', () => {
      const value = parseFloat(this.elements.monthlySalary.value);
      if (isNaN(value) || value <= 0) {
        this.elements.monthlySalary.value = 35000;
        this.updateCalculatedHourly();
        this.updateStats();
      }
    });

    this.elements.workingHours.addEventListener('blur', () => {
      const value = parseFloat(this.elements.workingHours.value);
      if (isNaN(value) || value <= 0) {
        this.elements.workingHours.value = 160;
        this.updateCalculatedHourly();
        this.updateStats();
      }
    });
  }

  switchTab(tabType) {
    this.currentTab = tabType;
    this.salaryType = tabType;

    // Update tab buttons
    this.elements.tabButtons.forEach(button => {
      button.classList.remove('active');
      if (button.getAttribute('data-tab') === tabType) {
        button.classList.add('active');
      }
    });

    // Update tab contents
    this.elements.tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${tabType}-tab`) {
        content.classList.add('active');
      }
    });

    // Update stats based on current tab
    this.updateStats();
  }

  updateCurrencyPrefix() {
    const currency = this.elements.currency.value;
    const currencySymbol = this.getCurrencySymbol(currency);
    this.elements.currencyPrefix.textContent = currencySymbol;
    this.elements.currencyPrefixMonthly.textContent = currencySymbol;
  }

  updateCalculatedHourly() {
    const monthlySalary = parseFloat(this.elements.monthlySalary.value) || 35000;
    const workingHours = parseFloat(this.elements.workingHours.value) || 160;
    const currency = this.elements.currency.value;
    
    const hourlyRate = (monthlySalary / workingHours).toFixed(2);
    const currencySymbol = this.getCurrencySymbol(currency);
    
    const hourText = this.langManager.getCurrentLanguage() === 'tr' 
      ? `${currencySymbol}${hourlyRate}/saat`
      : `${currencySymbol}${hourlyRate}/hour`;
    
    this.elements.calculatedHourly.textContent = hourText;
  }

  getEffectiveHourlyWage() {
    if (this.salaryType === 'monthly') {
      const monthlySalary = parseFloat(this.elements.monthlySalary.value) || 35000;
      const workingHours = parseFloat(this.elements.workingHours.value) || 160;
      return monthlySalary / workingHours;
    } else {
      return parseFloat(this.elements.hourlyWage.value) || 15;
    }
  }

  updateStats() {
    const hourlyWage = this.getEffectiveHourlyWage();
    const currency = this.elements.currency.value;
    
    const dailyEarnings = (hourlyWage * 8).toFixed(0);
    const weeklyEarnings = (hourlyWage * 40).toFixed(0);
    
    const currencySymbol = this.getCurrencySymbol(currency);
    
    this.elements.dailyEarnings.textContent = `${currencySymbol}${dailyEarnings}`;
    this.elements.weeklyEarnings.textContent = `${currencySymbol}${weeklyEarnings}`;
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

  async saveSettings() {
    const effectiveHourlyWage = this.getEffectiveHourlyWage();
    
    const settings = {
      hourlyWage: effectiveHourlyWage, // Always save the effective hourly wage
      monthlySalary: parseFloat(this.elements.monthlySalary.value) || 35000,
      workingHours: parseFloat(this.elements.workingHours.value) || 160,
      currency: this.elements.currency.value,
      isActive: this.elements.enableToggle.checked,
      salaryType: this.salaryType,
      // Store original values for UI restoration
      originalHourlyWage: parseFloat(this.elements.hourlyWage.value) || 15
    };

    try {
      await chrome.storage.sync.set(settings);
      this.showSuccess();
      
      // Notify content scripts of the change
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSettings' });
      }
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Failed to save settings');
    }
  }

  debounceAutoSave() {
    clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = setTimeout(() => {
      this.saveSettings();
    }, 1000);
  }

  showSuccess() {
    const button = this.elements.saveButton;
    const originalText = button.innerHTML;
    
    button.classList.add('success');
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
      Saved!
    `;
    
    setTimeout(() => {
      button.classList.remove('success');
      button.innerHTML = originalText;
    }, 2000);
  }

  showError(message) {
    const button = this.elements.saveButton;
    const originalText = button.innerHTML;
    
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
      button.innerHTML = originalText;
    }, 2000);
  }
}

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WorklyPopup();
});