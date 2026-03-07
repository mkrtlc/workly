class PriceParser {
    constructor() { }

    /**
     * Checks if this parser handles the current hostname
     * @param {string} hostname
     * @returns {boolean}
     */
    isMatch(hostname) {
        return false;
    }

    /**
     * Validates if the current page is a product page for this site
     * @param {string} path
     * @param {string} href
     * @returns {boolean}
     */
    isValidPage(path, href) {
        return true;
    }

    /**
     * Attempts to parse price and currency from the page
     * @returns {{price: number, currency: string, positionNear: Element}|null}
     */
    parse() {
        return null;
    }

    /**
     * Helper to parse price from selector list
     * @param {Array<{selector: string, attribute?: string}>} selectors
     * @returns {{price: number, currency: string, element: Element}|null}
     */
    detectPriceFromSelectors(selectors) {
        for (const config of selectors) {
            try {
                const element = document.querySelector(config.selector);
                if (!element) continue;

                const text = config.attribute
                    ? element.getAttribute(config.attribute)
                    : (element.textContent || '');

                const priceData = this.parsePriceText(text);
                if (priceData && priceData.value > 0) {
                    return {
                        price: priceData.value,
                        currency: priceData.currency || 'TRY',
                        element: element
                    };
                }
            } catch (error) {
                // console.warn('Parser error:', error);
                continue;
            }
        }
        return null;
    }

    parsePriceText(text) {
        if (!text) return null;

        // Remove common currency symbols and clean the text for parsing
        const originalText = text;
        const cleanText = text.replace(/[\s,]/g, '');

        // Enhanced regex to match various price formats
        const priceRegex = /[\$£€¥₹₽¢₺]?(\d{1,3}(?:[,.]?\d{3})*(?:[.,]\d{1,2})?)\s*(?:TL|USD|EUR|GBP|TRY|JPY|CAD|AUD|₺|\$|€|£|¥)?/i;
        const match = cleanText.match(priceRegex);

        if (match) {
            let price = match[1].replace(/,/g, '');
            // Handle decimal separator logic
            const lastDotIndex = price.lastIndexOf('.');
            if (lastDotIndex > -1 && price.length - lastDotIndex <= 3) {
                price = parseFloat(price);
            } else {
                price = parseFloat(price.replace(/\./g, ''));
            }

            const currency = this.detectPriceCurrency(originalText);
            return { value: price, currency: currency };
        }
        return null;
    }

    detectPriceCurrency(text) {
        if (text.includes('TL') || text.includes('₺')) return 'TRY';
        if (text.includes('$') && !text.includes('CAD') && !text.includes('AUD')) return 'USD';
        if (text.includes('€') || text.includes('EUR')) return 'EUR';
        if (text.includes('£') || text.includes('GBP')) return 'GBP';
        // Defaults can be handled by the caller or global config
        return null;
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }
}
