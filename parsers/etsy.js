class EtsyParser extends PriceParser {
    isMatch(hostname) {
        return hostname.includes('etsy.com');
    }

    isValidPage(path, href) {
        return path.includes('/listing/');
    }

    parse() {
        console.log('Workly: Detecting price on Etsy...');
        const selectors = [
            { selector: '[data-buy-box-region="price"] p.wt-text-title-03' },
            { selector: '.wt-text-title-03[data-buy-box-region="price"]' },
            { selector: '[data-appearing-region="price"] span' }
        ];

        const result = this.detectPriceFromSelectors(selectors);

        if (result && result.element) {
            result.positionNear = this.findPositionTarget() || result.element;
        }

        return result;
    }

    findPositionTarget() {
        const targets = [
            '[data-buy-box-region="price"]',
            '[data-appearing-region="price"]',
            '[data-buy-box-region="buy-box"]',
            '.listing-page-cart'
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
