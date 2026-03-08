// Purchase tracking, history, budget calculation, and CSV export
class PurchaseTracker {
  constructor(langManager) {
    this.langManager = langManager;
  }

  getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$', 'EUR': '\u20AC', 'GBP': '\u00A3',
      'TRY': '\u20BA', 'JPY': '\u00A5', 'CAD': '$', 'AUD': '$'
    };
    return symbols[currency] || '$';
  }

  async recordPurchase(price, workData) {
    const purchase = {
      id: Date.now(),
      date: new Date().toISOString(),
      price: price,
      currency: workData.currency,
      costHours: parseFloat(workData.hours),
      domain: window.location.hostname,
      title: document.title
    };

    const data = await chrome.storage.sync.get(['purchases', 'workingHours']);
    const purchases = data.purchases || [];
    purchases.push(purchase);
    await chrome.storage.sync.set({ purchases });

    return this._getBudgetInfo(purchases, data.workingHours || 160);
  }

  async deletePurchase(id) {
    const data = await chrome.storage.sync.get(['purchases']);
    let purchases = data.purchases || [];
    purchases = purchases.filter(p => p.id !== id);
    await chrome.storage.sync.set({ purchases });
    return purchases;
  }

  async getPurchases() {
    const data = await chrome.storage.sync.get(['purchases']);
    return (data.purchases || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async getBudgetSummary() {
    const data = await chrome.storage.sync.get(['purchases', 'workingHours']);
    const purchases = data.purchases || [];
    return this._getBudgetInfo(purchases, data.workingHours || 160);
  }

  async exportCSV() {
    const purchases = await this.getPurchases();
    if (purchases.length === 0) return null;

    const lang = this.langManager.getCurrentLanguage();
    const headers = lang === 'tr'
      ? ['Tarih', 'Site', 'Urun', 'Fiyat', 'Para Birimi', 'Saat']
      : ['Date', 'Site', 'Item', 'Price', 'Currency', 'Hours'];

    const rows = purchases.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.domain,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      p.price,
      p.currency,
      p.costHours.toFixed(1)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csv;
  }

  downloadCSV(csv) {
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workly-purchases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _getBudgetInfo(purchases, monthlyHours) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthPurchases = purchases.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalSpentHours = monthPurchases.reduce((sum, p) => sum + p.costHours, 0);
    const remainingHours = monthlyHours - totalSpentHours;

    return {
      totalSpentHours,
      remainingHours,
      monthPurchaseCount: monthPurchases.length,
      isOverBudget: remainingHours < 0
    };
  }

  renderHistoryHTML(purchases) {
    if (purchases.length === 0) {
      return `<div class="no-history">${this.langManager.t('noPurchases')}</div>`;
    }

    return purchases.map(p => {
      const date = new Date(p.date).toLocaleDateString();
      const symbol = this.getCurrencySymbol(p.currency);
      return `
        <div class="history-item">
          <div class="history-details">
            <div class="history-title" title="${p.title}">${p.title}</div>
            <div class="history-meta">
              <span>${date}</span>
              <span>\u2022</span>
              <span>${p.costHours.toFixed(1)} ${this.langManager.t('hours')}</span>
            </div>
          </div>
          <div class="history-cost">${symbol}${p.price}</div>
          <button class="history-delete" data-id="${p.id}" title="${this.langManager.t('delete')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      `;
    }).join('');
  }
}

window.PurchaseTracker = PurchaseTracker;
