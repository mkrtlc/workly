# Contributing to Workly

Thanks for your interest in contributing to Workly! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/workly.git
   cd workly
   ```
3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the project folder
4. Make your changes
5. Test by reloading the extension (click the refresh icon on `chrome://extensions/`)
6. Submit a pull request

## Project Overview

Workly is a vanilla JavaScript Chrome extension (Manifest V3) with zero dependencies. The codebase is intentionally simple — no build step, no framework, no npm packages.

### Key Files

| File | Purpose |
|------|---------|
| `content.js` | Main entry point for content scripts. Initializes parsers, detects prices, shows widget. |
| `parsers/base.js` | Base class for all parsers. Contains shared price extraction and currency detection. |
| `parsers/generic.js` | Fallback parser using JSON-LD, meta tags, and heuristics. |
| `widget.js` | The floating widget that shows work hours on product pages. |
| `purchase.js` | Purchase history tracking, budget calculation, CSV export. |
| `language.js` | Translation system with auto-detection (currently EN and TR). |
| `currency.js` | Exchange rate fetching and caching. |
| `popup.js` | Extension popup logic (settings, stats). |
| `dashboard.js` | Full-page dashboard with charts and history table. |
| `settings-modal.js` | In-page settings rendered inside Shadow DOM. |

## Common Contributions

### Adding a New Site Parser

This is the easiest way to contribute. Create a new file in `parsers/`:

```javascript
// parsers/walmart.js
class WalmartParser extends PriceParser {
    isMatch(hostname) {
        return hostname.includes('walmart.com');
    }

    isValidPage(path, href) {
        return path.includes('/ip/');
    }

    parse() {
        const selectors = [
            { selector: '[itemprop="price"]', attribute: 'content' },
            { selector: '[data-automation="buybox-price"] span' }
        ];

        const result = this.detectPriceFromSelectors(selectors);
        if (result && result.element) {
            result.positionNear = result.element;
        }
        return result;
    }
}
```

Then register it in `manifest.json` under `content_scripts.js` (before `generic.js` — the generic parser should always be last).

**How to find the right selectors:**

1. Open a product page on the site
2. Right-click the price and select "Inspect"
3. Look for CSS selectors that reliably target the price element
4. Check if the site has `<script type="application/ld+json">` with structured data (more reliable than CSS selectors)
5. Test on multiple products to make sure your selectors work consistently

### Adding a New Language

Edit `language.js` and add a new translation block in the `translations` object:

```javascript
de: {
    needToWork: "Sie mussen arbeiten",
    hours: "Stunden",
    // ... all other keys from the 'en' block
}
```

Make sure to translate every key that exists in the `en` block.

### Fixing a Broken Parser

E-commerce sites change their HTML frequently. If a parser stops working:

1. Visit a product page on the site
2. Open DevTools and inspect the price element
3. Check if the CSS selectors in the parser still match
4. Look for JSON-LD structured data as a more stable alternative
5. Update the selectors and test on multiple products

## Code Style

- **No build step** — files are loaded directly by the browser
- **ES6+ classes** — each module is a class attached to `window`
- **No external dependencies** — keep it vanilla
- **Consistent formatting** — 2-space indentation, single quotes in JS
- **Minimal comments** — code should be self-explanatory; add comments only for non-obvious logic

## Testing Your Changes

1. Reload the extension on `chrome://extensions/`
2. Visit a product page on the relevant site
3. Check that the widget appears with the correct price and work hours
4. Open the popup and verify settings work
5. Test the dashboard if you changed purchase-related code
6. Test in both English and Turkish if you changed language-related code

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Describe what you changed and why
- Include the site URL you tested on (for parser changes)
- Make sure existing functionality still works

## Reporting Bugs

Open an issue with:
- The URL of the page where the bug occurs
- What you expected to happen
- What actually happened
- Browser and OS version

## Questions?

Open an issue with the "question" label and we'll help you out.
