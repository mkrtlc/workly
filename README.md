# Workly

A Chrome extension that shows how many hours you need to work to afford the product you're looking at. Set your salary, browse any e-commerce site, and Workly will display the real cost of every item — in your time.

## Features

- **Automatic price detection** on product pages — works inline, right next to the price
- **Hourly & monthly salary** input with auto-calculated hourly rate
- **Multi-site support** with dedicated parsers for Trendyol, Hepsiburada, and Amazon (TR & global), plus a generic parser for other e-commerce sites
- **Bilingual UI** — automatic language detection (Turkish & English) based on page content, domain, and browser settings
- **Purchase tracking** — mark items as purchased and track spending history with remaining budget
- **Motivational nudges** — random reflection messages when hovering over buy buttons to encourage mindful spending
- **Collapsible widget** — expand/collapse the sidebar widget; minimized state shows a small floating icon
- **Dark, minimal design** — black widget with clean typography, smooth animations, and dark mode support
- **Privacy-first** — all data stored locally via `chrome.storage.sync`, no external API calls or tracking

## Supported Sites

| Site | Parser |
|------|--------|
| Trendyol | `parsers/trendyol.js` |
| Hepsiburada | `parsers/hepsiburada.js` |
| Amazon (.com.tr & .com) | `parsers/amazon.js` |
| Any other e-commerce site | `parsers/generic.js` |

## Installation

1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder
5. Click the Workly icon in the toolbar to configure your salary

## Project Structure

```
├── manifest.json        # Chrome Extension manifest (v3)
├── background.js        # Service worker — install defaults, message routing, tab updates
├── content.js           # Main content script — WorklyCalculator class, widget rendering
├── content.css          # Widget styles (inline, fixed, expanded, collapsed states)
├── language.js          # LanguageManager — detection, translations (EN/TR), currency mapping
├── popup.html           # Settings popup UI
├── popup.js             # Popup logic — salary tabs, stats, auto-save
├── popup.css            # Popup styles
├── parsers/
│   ├── base.js          # BaseParser — shared price extraction utilities
│   ├── trendyol.js      # Trendyol-specific selectors
│   ├── hepsiburada.js   # Hepsiburada-specific selectors
│   ├── amazon.js        # Amazon-specific selectors
│   └── generic.js       # Fallback parser for generic e-commerce sites
├── icons/               # Extension icons (16, 32, 48, 128px)
└── create-icons.html    # Helper page for generating icon PNGs
```

## How It Works

1. **Content scripts** are injected on every page. The `WorklyCalculator` uses a `MutationObserver` to detect price elements as they load.
2. **Parsers** (Trendyol, Hepsiburada, Amazon, Generic) each define site-specific CSS selectors to locate and extract prices.
3. Once a price is found, a **widget** is rendered inline (next to the price) or as a fixed overlay, showing work hours/minutes required.
4. The **popup** lets users set hourly wage or monthly salary, choose currency, and view quick earning stats.
5. **Language detection** checks the page's `lang` attribute, Turkish content indicators, and domain to auto-switch between TR and EN.

## Tech Stack

- Vanilla JavaScript (ES6+ classes)
- Chrome Extensions API (Manifest V3)
- CSS3 with transitions and animations
- `chrome.storage.sync` for settings persistence

## License

MIT
