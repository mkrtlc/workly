// Widget rendering, positioning, collapse/expand, and event handling
class WorklyWidget {
  constructor(langManager) {
    this.langManager = langManager;
    this.worklyDiv = null;
    this.currentWidgetData = null;
    this.onSettingsClick = null;
    this.onPurchaseClick = null;
  }

  getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$', 'EUR': '\u20AC', 'GBP': '\u00A3',
      'TRY': '\u20BA', 'JPY': '\u00A5', 'CAD': '$', 'AUD': '$'
    };
    return symbols[currency] || '$';
  }

  create(price, workData, savings) {
    this.remove();

    const currencySymbol = this.getCurrencySymbol(workData.currency);
    const numericHours = parseFloat(workData.hours);
    let displayTime, displayUnit;

    if (numericHours < 1) {
      displayTime = Math.max(1, Math.round(numericHours * 60));
      displayUnit = this.langManager.t('minutes');
    } else {
      displayTime = workData.hours;
      displayUnit = this.langManager.t('hours');
    }

    const mainText = `${displayTime} ${displayUnit} ${this.langManager.t('toBuyThis')}`;

    const reflections = this.langManager.t('reflectionMessages');
    const reflection = Array.isArray(reflections)
      ? reflections[Math.floor(Math.random() * reflections.length)]
      : reflections;

    const subText = savings
      ? `${reflection} \u2022 ${this.langManager.t('saveHours')} ${savings.hours}h (${savings.percentage}% off)`
      : reflection;

    this.currentWidgetData = { mainText, subText, workData, savings, price };

    this.worklyDiv = document.createElement('div');
    this.worklyDiv.id = 'workly-fixed-widget';
    this.worklyDiv.className = 'workly-widget';
    this.worklyDiv.innerHTML = this._getHTML();
    this.worklyDiv.style.cssText = this._getPositionStyles();

    document.body.appendChild(this.worklyDiv);
    this._bindEvents();

    setTimeout(() => {
      this.worklyDiv.classList.add('workly-visible');
    }, 500);
  }

  remove() {
    const existing = document.getElementById('workly-embedded-widget');
    if (existing) existing.remove();
    if (this.worklyDiv) {
      this.worklyDiv.remove();
      this.worklyDiv = null;
    }
  }

  collapse() {
    if (this.worklyDiv) {
      this.worklyDiv.classList.add('workly-collapsed');
    }
  }

  expand() {
    if (this.worklyDiv) {
      this.worklyDiv.classList.remove('workly-collapsed');
    }
  }

  hide() {
    if (!this.worklyDiv) return;
    this.worklyDiv.classList.remove('workly-visible');
    setTimeout(() => this.remove(), 400);
  }

  showDetails() {
    if (!this.currentWidgetData) return;
    const { workData, savings, price } = this.currentWidgetData;
    const symbol = this.getCurrencySymbol(workData.currency);

    const lang = this.langManager.getCurrentLanguage();
    const lines = [
      lang === 'tr' ? `Fiyat: ${symbol}${price}` : `Price: ${symbol}${price}`,
      lang === 'tr' ? `Gereken Saat: ${workData.hours}` : `Work Hours Needed: ${workData.hours}`,
      lang === 'tr' ? `Saatlik: ${symbol}${workData.wage.toFixed(2)}` : `Hourly Wage: ${symbol}${workData.wage.toFixed(2)}`
    ];

    if (savings) {
      lines.push(lang === 'tr'
        ? `\nTasarruf: ${symbol}${savings.amount.toFixed(2)} (${savings.hours}h)`
        : `\nSavings: ${symbol}${savings.amount.toFixed(2)} (${savings.hours}h saved)`
      );
    }

    console.log('Workly Details:', lines.join('\n'));
  }

  _getHTML() {
    if (!this.currentWidgetData) return '';
    const { mainText, subText } = this.currentWidgetData;
    const lang = this.langManager.getCurrentLanguage();
    const settingsLabel = lang === 'tr' ? 'Ayarlar' : 'Settings';
    const detailsLabel = lang === 'tr' ? 'Detaylar' : 'Details';

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
        <button class="workly-widget-close">\u00D7</button>
      </div>
      <div class="workly-widget-main">${mainText}</div>
      <div class="workly-widget-sub">${subText}</div>
      <div class="workly-widget-actions">
        <button class="workly-widget-btn settings-btn">\u2699\uFE0F ${settingsLabel}</button>
        <button class="workly-widget-btn details-btn">\uD83D\uDCCA ${detailsLabel}</button>
        <button class="workly-widget-btn purchase-btn">${this.langManager.t('iPurchasedThis')}</button>
      </div>
    </div>
    `;
  }

  _getPositionStyles() {
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

  _bindEvents() {
    if (!this.worklyDiv) return;

    this.worklyDiv.addEventListener('click', () => {
      if (this.worklyDiv.classList.contains('workly-collapsed')) {
        this.expand();
      }
    });

    this.worklyDiv.querySelector('.workly-widget-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.collapse();
    });

    this.worklyDiv.querySelector('.settings-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onSettingsClick) this.onSettingsClick();
    });

    this.worklyDiv.querySelector('.details-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showDetails();
    });

    this.worklyDiv.querySelector('.purchase-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onPurchaseClick) this.onPurchaseClick();
    });
  }

  showPurchaseFeedback(message) {
    const btn = this.worklyDiv?.querySelector('.purchase-btn');
    if (!btn) return;
    const originalText = btn.innerText;

    btn.innerText = '\u2705 ' + this.langManager.t('purchaseSaved');
    btn.style.background = '#4CAF50';
    btn.style.borderColor = '#4CAF50';
    btn.style.color = 'white';

    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 2500);
  }
}

window.WorklyWidget = WorklyWidget;
