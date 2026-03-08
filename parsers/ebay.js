class EbayParser extends PriceParser {
    isMatch(hostname) {
        return hostname.includes('ebay.');
    }

    isValidPage(path, href) {
        return path.includes('/itm/');
    }

    parse() {
        console.log('Workly: Detecting price on eBay...');
        const selectors = [
            { selector: '.x-price-primary span' },
            { selector: '#prcIsum' },
            { selector: '.notranslate' },
            { selector: '[itemprop="price"]', attribute: 'content' }
        ];

        const result = this.detectPriceFromSelectors(selectors);

        if (result && result.element) {
            result.positionNear = this.findPositionTarget() || result.element;
        }

        return result;
    }

    findPositionTarget() {
        const targets = [
            '.x-price-primary',
            '#prcIsum',
            '.x-buybox-cta',
            '#mainContent .vi-price'
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
