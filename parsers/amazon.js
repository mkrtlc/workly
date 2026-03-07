class AmazonParser extends PriceParser {
    isMatch(hostname) {
        return hostname.includes('amazon.');
    }

    isValidPage(path, href) {
        return path.includes('/dp/') || path.includes('/gp/product/');
    }

    parse() {
        console.log('Workly: Detecting price on Amazon...');
        const selectors = [
            { selector: '#corePrice_feature_div .a-price .a-offscreen' },
            { selector: '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen' },
            { selector: '.a-price .a-offscreen' },
            { selector: '#price_inside_buybox' },
            { selector: '#priceblock_ourprice' },
            { selector: '#priceblock_dealprice' }
        ];

        const result = this.detectPriceFromSelectors(selectors);

        if (result) {
            const buyBox = document.querySelector('#buybox');
            const stickyHeader = document.querySelector('#sticky-header-container');
            if (buyBox) {
                result.positionNear = buyBox;
            } else if (stickyHeader) {
                result.positionNear = stickyHeader;
            }
        }

        return result;
    }
}
