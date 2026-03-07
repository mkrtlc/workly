class HepsiburadaParser extends PriceParser {
    isMatch(hostname) {
        return hostname.includes('hepsiburada.com');
    }

    isValidPage(path, href) {
        return path.includes('-p-');
    }

    parse() {
        console.log('Workly: Detecting price on Hepsiburada...');
        const selectors = [
            { selector: '[data-test-id="price-current-price"]' },
            { selector: '.product-price' },
            { selector: '.price-container .price' },
            { selector: '#offering-price' },
            { selector: '.price' }
        ];

        return this.detectPriceFromSelectors(selectors);
    }
}
