/**
 * CurrencyConverter - Fetches and caches real exchange rates for Workly.
 *
 * Uses the free exchangerate-api.com endpoint (no key required).
 * Rates are cached in chrome.storage.local with a 6-hour TTL.
 */
class CurrencyConverter {
  constructor() {
    this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
    this.cacheTTL = 6 * 60 * 60 * 1000; // 6 hours in ms
    this.cacheKey = 'workly_exchange_rates';
    this.rates = null; // in-memory cache: { USD: 1, TRY: 32.1, EUR: 0.92, ... }
    this.baseCurrency = 'USD';
    this._fetchPromise = null; // dedup concurrent fetches
  }

  // ---- Public API ----

  /**
   * Convert an amount between two currencies.
   * Returns the converted value, or null if rates are unavailable.
   */
  async convert(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;

    const rate = await this.getRate(fromCurrency, toCurrency);
    if (rate === null) return null;

    return amount * rate;
  }

  /**
   * Get the exchange rate from one currency to another.
   * Returns a number, or null if rates are unavailable.
   */
  async getRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;

    const rates = await this._getRates();
    if (!rates) return null;

    const from = rates[fromCurrency.toUpperCase()];
    const to = rates[toCurrency.toUpperCase()];

    if (!from || !to) return null;

    return to / from;
  }

  // ---- Internal ----

  /**
   * Returns the rates object, loading from cache or fetching as needed.
   */
  async _getRates() {
    // Return in-memory rates if available
    if (this.rates) return this.rates;

    // Try loading from chrome.storage.local cache
    const cached = await this._loadCache();
    if (cached) {
      this.rates = cached;
      return this.rates;
    }

    // Fetch fresh rates
    return this._fetchRates();
  }

  /**
   * Load cached rates from chrome.storage.local.
   * Returns the rates object if cache is valid, or null.
   */
  async _loadCache() {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const entry = result[this.cacheKey];

      if (!entry || !entry.rates || !entry.timestamp) return null;

      const age = Date.now() - entry.timestamp;
      if (age > this.cacheTTL) return null;

      return entry.rates;
    } catch {
      return null;
    }
  }

  /**
   * Save rates to chrome.storage.local with a timestamp.
   */
  async _saveCache(rates) {
    try {
      await chrome.storage.local.set({
        [this.cacheKey]: {
          rates,
          timestamp: Date.now()
        }
      });
    } catch {
      // Storage write failed — non-critical, just continue.
    }
  }

  /**
   * Fetch fresh rates from the API.
   * Deduplicates concurrent calls. Falls back to expired cache on failure.
   */
  async _fetchRates() {
    // Deduplicate: if a fetch is already in flight, wait for it
    if (this._fetchPromise) return this._fetchPromise;

    this._fetchPromise = this._doFetch();

    try {
      const rates = await this._fetchPromise;
      return rates;
    } finally {
      this._fetchPromise = null;
    }
  }

  async _doFetch() {
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (!data.rates || typeof data.rates !== 'object') {
        throw new Error('Invalid API response');
      }

      this.rates = data.rates;
      await this._saveCache(this.rates);
      return this.rates;
    } catch {
      // Offline or API error — fall back to expired cache if available
      return this._loadExpiredCache();
    }
  }

  /**
   * Load cached rates regardless of TTL (last-resort fallback).
   */
  async _loadExpiredCache() {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const entry = result[this.cacheKey];

      if (entry && entry.rates) {
        this.rates = entry.rates;
        return this.rates;
      }
    } catch {
      // Nothing we can do.
    }
    return null;
  }
}

// Expose globally for other content scripts
window.CurrencyConverter = CurrencyConverter;
