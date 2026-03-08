# Workly - Improvement Plan

## Quick Wins
- [x] Add `LICENSE` file (MIT)
- [x] Remove unused `index.html`
- [x] Fix `.gitignore` (icons/.DS_Store pattern)
- [x] Fix popup HTML flash of untranslated content (data-i18n attributes + visibility toggle)
- [x] Update README with full project structure

## Bugs / Issues
- [x] Split `content.js` (~1000 lines) into smaller modules (widget.js, purchase.js, settings-modal.js)
- [x] No currency conversion — added CurrencyConverter with real exchange rates (currency.js)
- [ ] Generic parser false positives on non-e-commerce pages (needs testing/refinement)

## Architecture
- [x] Create module structure: WorklyWidget, PurchaseTracker, SettingsModal, CurrencyConverter
- [ ] Add simple build step (esbuild) for bundling and minification

## Features
- [x] Currency conversion via free API (exchangerate-api.com, 6h cache)
- [x] More site parsers: N11, eBay, Etsy
- [x] Export purchase history as CSV
- [x] Badge icon showing work hours on extension icon
- [ ] Options page for detailed settings
- [ ] Daily/weekly spending summary view

## Polish
- [ ] Add demo GIF / screenshots to repo
