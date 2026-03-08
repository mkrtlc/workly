# Workly

A Chrome extension that shows how many hours you need to work to afford the product you're looking at. Set your salary, browse any e-commerce site, and Workly will display the real cost of every item — in your time.

## Features

- **Automatic price detection** on product pages with inline widget display
- **Hourly & monthly salary** input with auto-calculated hourly rate
- **Real currency conversion** via exchange rate API with 6-hour caching
- **Multi-site support** with dedicated parsers for Trendyol, Hepsiburada, Amazon, N11, eBay, Etsy, plus a generic parser for other sites
- **Bilingual UI** — automatic language detection (Turkish & English) based on page content, domain, and browser settings
- **Purchase tracking** — mark items as purchased, track spending history, and monitor remaining monthly budget
- **CSV export** — download your purchase history as a spreadsheet
- **Badge icon** — extension badge shows work hours for the current product page
- **Motivational nudges** — random reflection messages encouraging mindful spending
- **Collapsible widget** — expand/collapse the sidebar widget; minimized state shows a floating icon
- **In-page settings modal** — change salary and view history without leaving the page
- **Dark, minimal design** — black widget with clean typography and smooth animations
- **Privacy-first** — all data stored locally via `chrome.storage.sync`, no external tracking

## Supported Sites

| Site | Parser |
|------|--------|
| Trendyol | `parsers/trendyol.js` |
| Hepsiburada | `parsers/hepsiburada.js` |
| Amazon (.com.tr & .com) | `parsers/amazon.js` |
| N11 | `parsers/n11.js` |
| eBay | `parsers/ebay.js` |
| Etsy | `parsers/etsy.js` |
| Any other e-commerce site | `parsers/generic.js` |

## Installation

1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder
5. Click the Workly icon in the toolbar to configure your salary

## Project Structure

```
├── manifest.json          # Chrome Extension manifest (v3)
├── background.js          # Service worker — install defaults, messaging, badge updates
├── content.js             # Main coordinator — initializes parsers, widget, and modules
├── widget.js              # Widget rendering, positioning, collapse/expand, events
├── purchase.js            # Purchase tracking, budget calculation, CSV export
├── settings-modal.js      # In-page settings modal (Shadow DOM)
├── currency.js            # CurrencyConverter — real exchange rates with caching
├── language.js            # LanguageManager — detection, translations (EN/TR)
├── content.css            # Widget styles (inline, fixed, expanded, collapsed)
├── popup.html             # Settings popup UI (data-i18n localization)
├── popup.js               # Popup logic — salary tabs, stats, auto-save
├── popup.css              # Popup styles
├── parsers/
│   ├── base.js            # PriceParser — shared price extraction utilities
│   ├── trendyol.js        # Trendyol-specific selectors
│   ├── hepsiburada.js     # Hepsiburada-specific selectors
│   ├── amazon.js          # Amazon-specific selectors
│   ├── n11.js             # N11-specific selectors
│   ├── ebay.js            # eBay-specific selectors
│   ├── etsy.js            # Etsy-specific selectors
│   └── generic.js         # Fallback — Schema.org, meta tags, visual heuristics
├── icons/                 # Extension icons (16, 32, 48, 128px)
└── create-icons.html      # Helper page for generating icon PNGs
```

## How It Works

1. **Content scripts** are injected on every page. The `WorklyCalculator` uses a `MutationObserver` to detect price elements as they load.
2. **Parsers** (Trendyol, Hepsiburada, Amazon, N11, eBay, Etsy, Generic) each define site-specific CSS selectors to locate and extract prices.
3. **CurrencyConverter** fetches real exchange rates if the product currency differs from your wage currency.
4. Once a price is found, the **WorklyWidget** renders a fixed sidebar showing work hours/minutes required.
5. **PurchaseTracker** lets you mark purchases and tracks monthly spending against your work hours budget.
6. The **popup** and **in-page settings modal** let you set hourly wage or monthly salary, choose currency, and view stats.
7. **LanguageManager** checks the page's `lang` attribute, Turkish content indicators, and domain to auto-switch between TR and EN.

## Tech Stack

- Vanilla JavaScript (ES6+ classes)
- Chrome Extensions API (Manifest V3)
- CSS3 with transitions and animations
- Shadow DOM for isolated in-page settings
- `chrome.storage.sync` for settings persistence

## License

MIT — see [LICENSE](LICENSE) for details.
