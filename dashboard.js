// Workly Dashboard
(function () {
  const CURRENCY_SYMBOLS = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3',
    TRY: '\u20BA', JPY: '\u00A5', CAD: '$', AUD: '$'
  };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let purchases = [];
  let sortColumn = 'date';
  let sortDirection = 'desc';
  let searchQuery = '';

  // ─── Init ───
  async function init() {
    await loadPurchases();
    render();
    bindEvents();

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.purchases) {
        purchases = (changes.purchases.newValue || []);
        render();
      }
    });
  }

  async function loadPurchases() {
    const data = await chrome.storage.sync.get(['purchases']);
    purchases = data.purchases || [];
  }

  // ─── Render ───
  function render() {
    renderStats();
    renderChart();
    renderTable();
  }

  function renderStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalHours = purchases.reduce((sum, p) => sum + (p.costHours || 0), 0);
    const monthPurchases = purchases.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthHours = monthPurchases.reduce((sum, p) => sum + (p.costHours || 0), 0);
    const avgHours = purchases.length > 0 ? totalHours / purchases.length : 0;

    document.getElementById('totalPurchases').textContent = purchases.length;
    document.getElementById('totalHours').textContent = totalHours.toFixed(1);
    document.getElementById('monthHours').textContent = monthHours.toFixed(1);
    document.getElementById('avgHours').textContent = avgHours.toFixed(1);
  }

  function renderChart() {
    const container = document.getElementById('chartContainer');
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.getMonth(), year: d.getFullYear() });
    }

    const monthlyHours = months.map(m => {
      const hours = purchases
        .filter(p => {
          const d = new Date(p.date);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        })
        .reduce((sum, p) => sum + (p.costHours || 0), 0);
      return { ...m, hours };
    });

    const maxHours = Math.max(...monthlyHours.map(m => m.hours), 1);

    if (purchases.length === 0) {
      container.innerHTML = '<div class="chart-empty">No data yet</div>';
      return;
    }

    container.innerHTML = monthlyHours.map((m, i) => {
      const heightPct = Math.max((m.hours / maxHours) * 100, 1);
      const label = MONTH_NAMES[m.month];
      return `
        <div class="chart-bar-group">
          <div class="chart-bar-wrapper">
            <div class="chart-bar" style="height: ${heightPct}%">
              <span class="chart-bar-value">${m.hours.toFixed(1)}h</span>
            </div>
          </div>
          <span class="chart-bar-label">${label}</span>
        </div>
      `;
    }).join('');
  }

  function renderTable() {
    const tbody = document.getElementById('purchasesBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('purchasesTable');

    let filtered = purchases;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.domain || '').toLowerCase().includes(q)
      );
    }

    filtered = [...filtered].sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case 'date':
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
          break;
        case 'title':
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
          break;
        case 'domain':
          valA = (a.domain || '').toLowerCase();
          valB = (b.domain || '').toLowerCase();
          break;
        case 'price':
          valA = a.price || 0;
          valB = b.price || 0;
          break;
        case 'costHours':
          valA = a.costHours || 0;
          valB = b.costHours || 0;
          break;
        default:
          valA = 0;
          valB = 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      table.style.display = 'none';
      emptyState.classList.add('visible');
      return;
    }

    table.style.display = '';
    emptyState.classList.remove('visible');

    tbody.innerHTML = filtered.map(p => {
      const date = new Date(p.date).toLocaleDateString();
      const symbol = CURRENCY_SYMBOLS[p.currency] || '$';
      const price = typeof p.price === 'number' ? p.price.toLocaleString() : p.price;
      const hours = (p.costHours || 0).toFixed(1);
      const titleEl = p.url
        ? `<a href="${escapeHtml(p.url)}" target="_blank" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</a>`
        : `<span title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</span>`;

      return `
        <tr>
          <td class="td-date">${date}</td>
          <td class="td-item">${titleEl}</td>
          <td class="td-site">${escapeHtml(p.domain || '')}</td>
          <td class="td-price">${symbol}${price}</td>
          <td class="td-hours">${hours}h</td>
          <td class="td-actions">
            <button class="delete-btn" data-id="${p.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ─── Events ───
  function bindEvents() {
    // Sort
    document.querySelectorAll('.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (sortColumn === col) {
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          sortColumn = col;
          sortDirection = col === 'date' ? 'desc' : 'asc';
        }
        updateSortIndicators();
        renderTable();
      });
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderTable();
    });

    // Delete
    document.getElementById('purchasesBody').addEventListener('click', async (e) => {
      const btn = e.target.closest('.delete-btn');
      if (!btn) return;
      const id = parseInt(btn.dataset.id);
      if (!confirm('Delete this purchase?')) return;

      purchases = purchases.filter(p => p.id !== id);
      await chrome.storage.sync.set({ purchases });
      render();
    });

    // Export CSV
    document.getElementById('exportCsv').addEventListener('click', () => {
      if (purchases.length === 0) return;

      const headers = ['Date', 'Site', 'URL', 'Item', 'Price', 'Currency', 'Hours'];
      const rows = purchases.map(p => [
        new Date(p.date).toLocaleDateString(),
        p.domain || '',
        `"${(p.url || '').replace(/"/g, '""')}"`,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        p.price,
        p.currency || '',
        (p.costHours || 0).toFixed(1)
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workly-purchases-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === sortColumn) {
        th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });
  }

  // ─── Helpers ───
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();
