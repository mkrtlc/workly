class GenericParser extends PriceParser {
    isMatch(hostname) {
        return true; // Match everything as a fallback
    }

    isValidPage(path, href) {
        return true; // Always valid to attempt generic parsing
    }

    parse() {
        // A. Schema.org JSON-LD (Most reliable generic method)
        const schemaPrice = this.detectSchemaOrgPrice();
        if (schemaPrice) return schemaPrice;

        // B. Meta Tags (Open Graph / Twitter Cards)
        const metaPrice = this.detectMetaTagPrice();
        if (metaPrice) return metaPrice;

        // C. Visual Heuristics (Regex search near "Buy" buttons)
        const heuristicPrice = this.detectRegexPrice();
        if (heuristicPrice) return heuristicPrice;

        return null;
    }

    detectSchemaOrgPrice() {
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                const json = JSON.parse(script.textContent);

                // Helper to check object
                const checkProduct = (obj) => {
                    if (obj['@type'] === 'Product' || obj['@type'] === 'SoftwareApplication') {
                        const offer = obj.offers;
                        if (offer) {
                            const price = offer.price || (Array.isArray(offer) ? offer[0].price : null);
                            const currency = offer.priceCurrency || (Array.isArray(offer) ? offer[0].priceCurrency : null);

                            if (price) {
                                const finalPrice = parseFloat(price);
                                const currencyCode = currency || 'TRY'; // Default fallback

                                // Try to find where this price is visually displayed
                                const visualAnchor = this.findVisiblePriceElement(finalPrice, currencyCode);

                                return {
                                    price: finalPrice,
                                    currency: currencyCode,
                                    positionNear: visualAnchor || document.body
                                };
                            }
                        }
                    }
                    return null;
                }

                // Handle array or single object
                if (Array.isArray(json)) {
                    for (const item of json) {
                        const res = checkProduct(item);
                        if (res) return res;
                    }
                } else {
                    const res = checkProduct(json);
                    if (res) return res;
                }
            }
        } catch (e) {
            // console.warn('Workly: Schema parsing failed', e);
        }
        return null;
    }

    detectMetaTagPrice() {
        const getContent = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.getAttribute('content') : null;
        };

        const price = getContent('meta[property="product:price:amount"]') ||
            getContent('meta[property="og:price:amount"]');

        if (price) {
            const currency = getContent('meta[property="product:price:currency"]') ||
                getContent('meta[property="og:price:currency"]') ||
                'TRY';

            const finalPrice = parseFloat(price);
            // Try to find where this price is visually displayed
            const visualAnchor = this.findVisiblePriceElement(finalPrice, currency);

            return {
                price: finalPrice,
                currency: currency,
                positionNear: visualAnchor || document.body
            };
        }
        return null;
    }

    detectRegexPrice() {
        // Note: This requires the language manager availability or passing keywords differently.
        // For now, I'll use a simplified set or rely on the main instance to pass context if needed.
        // Since 'this.langManager' isn't available on the parser instance by default unless passed,
        // we'll assume standard keywords or that we can access a global.
        // However, to keep it clean, we'll skip the regex heuristic or implement a basic one.

        // Simplification: We'll skip complex regex for now to avoid dependency hell, 
        // or we can re-implement the visual search logic if critical.
        return null;
    }

    findVisiblePriceElement(price, currency) {
        if (!price) return null;

        const priceStr = price.toString();
        const dots = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        const commas = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const spaces = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

        const searchTerms = [dots, commas, spaces, priceStr];

        const candidates = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (!text) continue;

            if (searchTerms.some(term => text.includes(term))) {
                const element = node.parentElement;
                if (!element) continue;

                const style = window.getComputedStyle(element);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

                let score = parseFloat(style.fontSize) || 12;
                if (element.className.toLowerCase().includes('price')) score += 20;

                candidates.push({ element, score });
            }
        }

        candidates.sort((a, b) => b.score - a.score);
        return candidates.length > 0 ? candidates[0].element : null;
    }
}
