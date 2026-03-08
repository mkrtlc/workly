class N11Parser extends PriceParser {
    isMatch(hostname) {
        return hostname.includes('n11.com');
    }

    isValidPage(path, href) {
        return path.includes('/urun/');
    }

    parse() {
        console.log('Workly: Detecting price on N11...');
        const selectors = [
            { selector: '.newPrice ins' },
            { selector: '.unf-p-price' },
            { selector: '[data-price]', attribute: 'data-price' }
        ];

        const result = this.detectPriceFromSelectors(selectors);

        if (result && result.element) {
            result.positionNear = this.findPositionTarget() || result.element;
        }

        return result;
    }

    findPositionTarget() {
        const targets = [
            '.newPrice',
            '.unf-p-price',
            '.proDetailBox',
            '.pro-detail-price'
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
