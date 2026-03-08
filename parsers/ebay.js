class EbayParser extends PriceParser {
    isMatch(hostname) {
        return hostname.includes('ebay.');
    }

    isValidPage(path, href) {
        return path.includes('/itm/') || path.includes('/p/');
    }

    parse() {
        console.log('Workly: Detecting price on eBay...');

        // A. Try CSS selectors first
        const selectors = [
            { selector: '.x-price-primary .ux-textspans' },
            { selector: '.x-price-primary span' },
            { selector: '[data-testid="x-price-primary"] span' },
            { selector: '#prcIsum' },
            { selector: '.notranslate' },
            { selector: '[itemprop="price"]', attribute: 'content' }
        ];

        const result = this.detectPriceFromSelectors(selectors);
        if (result && result.element) {
            result.positionNear = this.findPositionTarget() || result.element;
            return result;
        }

        // B. Fallback: JSON-LD structured data
        const jsonLdResult = this.detectJsonLdPrice();
        if (jsonLdResult) return jsonLdResult;

        return null;
    }

    detectJsonLdPrice() {
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                const json = JSON.parse(script.textContent);
                const offer = this.findValidOffer(json);
                if (offer) {
                    const price = parseFloat(offer.price);
                    const currency = offer.priceCurrency || 'USD';
                    const positionTarget = this.findPositionTarget();
                    return {
                        price,
                        currency,
                        positionNear: positionTarget || document.body
                    };
                }
            }
        } catch (e) {
            console.warn('Workly: eBay JSON-LD parsing failed', e);
        }
        return null;
    }

    findValidOffer(json) {
        if (!json) return null;

        // Handle arrays
        if (Array.isArray(json)) {
            for (const item of json) {
                const offer = this.findValidOffer(item);
                if (offer) return offer;
            }
            return null;
        }

        // Handle Product type
        if (json['@type'] === 'Product' && json.offers) {
            const offers = Array.isArray(json.offers) ? json.offers : [json.offers];
            // Find first valid offer (eBay /p/ pages can have null entries)
            return offers.find(o => o && o.price) || null;
        }

        // Handle @graph
        if (json['@graph']) {
            return this.findValidOffer(json['@graph']);
        }

        return null;
    }

    findPositionTarget() {
        const targets = [
            '.x-price-primary',
            '[data-testid="x-price-primary"]',
            '.x-bin-price',
            '#prcIsum',
            '.x-buybox-cta',
            '#mainContent .vi-price',
            '#mainContent',
            '.product-price'
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
