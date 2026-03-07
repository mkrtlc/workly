class TrendyolParser extends PriceParser {
    isMatch(hostname) {
        return hostname.includes('trendyol.com');
    }

    isValidPage(path, href) {
        return path.includes('-p-');
    }

    parse() {
        console.log('Workly: Detecting price on Trendyol...');
        const selectors = [
            { selector: '[data-testid="normal-price"]' },
            { selector: '.price.normal-price' },
            { selector: '.price-current' },
            { selector: '.discounted' },
            { selector: '[class*="price"]' }
        ];

        const result = this.detectPriceFromSelectors(selectors);

        if (result && result.element) {
            result.positionNear = this.findPositionTarget() || result.element;
        }

        return result;
    }

    findPositionTarget() {
        const targets = [
            '[data-testid="normal-price"]',
            '.price.normal-price',
            '.price-current',
            '.product-details-product-details-container'
        ];

        for (const selector of targets) {
            const element = document.querySelector(selector);
            if (element && this.isElementVisible(element)) {
                return element;
            }
        }
        return null;
    }
}
