// Language Detection and Translation System
class LanguageManager {
  constructor() {
    this.currentLanguage = this.detectLanguage();
    this.fallbackLanguage = 'en';
  }

  // Detect language: browser language first, then page content for content scripts
  detectLanguage() {
    // For extension pages (popup, options), use browser language only
    const isExtensionPage = window.location.protocol === 'chrome-extension:';

    // First priority: Browser language preference
    const browserLang = (navigator.language || navigator.userLanguage || '').split('-')[0].toLowerCase();
    if (browserLang && this.translations[browserLang]) {
      return browserLang;
    }

    // Second priority (content scripts only): Detect from page content
    if (!isExtensionPage) {
      const pageLanguage = this.detectPageLanguage();
      if (pageLanguage && this.translations[pageLanguage]) {
        return pageLanguage;
      }
    }

    return this.fallbackLanguage;
  }

  // Detect language from the current web page
  detectPageLanguage() {
    // Check HTML lang attribute
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
      const langCode = htmlLang.split('-')[0].toLowerCase();
      if (this.translations[langCode]) {
        return langCode;
      }
    }

    // Check for Turkish-specific indicators
    const pageText = (document.body?.textContent || '').toLowerCase();
    const turkishIndicators = ['tl', '₺', 'türk', 'sepet', 'ücretsiz', 'kargo', 'indirim', 'satın'];
    const turkishCount = turkishIndicators.filter(indicator => pageText.includes(indicator)).length;

    if (turkishCount >= 2) {
      return 'tr';
    }

    // Check domain for country-specific sites
    const domain = window.location.hostname.toLowerCase();
    if (domain.includes('.tr') || domain.includes('trendyol') || domain.includes('hepsiburada')) {
      return 'tr';
    }

    return null;
  }

  // Get appropriate currency based on language
  getDefaultCurrency() {
    const currencyMap = {
      'tr': 'TRY',
      'en': 'USD',
      'de': 'EUR',
      'fr': 'EUR',
      'es': 'EUR',
      'it': 'EUR',
      'ru': 'RUB',
      'ja': 'JPY',
      'zh': 'CNY'
    };

    return currencyMap[this.currentLanguage] || 'USD';
  }

  // Translation data
  translations = {
    en: {
      // Widget text
      needToWork: "You need to work",
      hours: "hours",
      minutes: "minutes",
      toBuyThis: "to buy this",
      basedOnWage: "Based on",
      hourWage: "/hour wage",
      saveHours: "Save",
      percentOff: "% off",
      hide: "Hide Workly",
      iPurchasedThis: "🛍️ Purchased",
      purchaseSaved: "Purchase saved!",
      remainingBudget: "Remaining budget:",
      budgetExceeded: "Budget exceeded by",
      purchaseHistory: "Purchase History",
      noPurchases: "No purchases yet",
      date: "Date",
      item: "Item",
      cost: "Cost",
      delete: "Delete",

      // Popup interface
      title: "Workly",
      hourly: "Hourly",
      monthly: "Monthly",
      hourlyWage: "Hourly Wage",
      hourlyWageDesc: "Your hourly rate to calculate work hours",
      monthlySalary: "Monthly Salary",
      monthlySalaryDesc: "Your monthly salary before taxes",
      workingHours: "Working Hours per Month",
      workingHoursDesc: "Total hours you work in a month",
      currency: "Currency",
      currencyDesc: "Display currency for calculations",
      calculatedHourlyRate: "Calculated Hourly Rate:",
      quickStats: "Quick Stats",
      daily: "Daily (8 hours)",
      weekly: "Weekly (40 hours)",
      saveSettings: "Save Settings",
      footerText: "Workly helps you make informed purchasing decisions",
      viewDashboard: "View Dashboard",
      reflectionMessages: [
        "Is it worth the time? The choice is yours.",
        "Is this purchase worth the freedom you traded for it?",
        "Do you really need this, or do you just want it?",
        "Was your hard work meant for this?",
        "You're borrowing from your future, are you aware?",
        "How many early mornings did it take to earn this?",
        "Time is more valuable than money; will you spend it on this?",
        "Is this an obstacle on the path to your goals?",
        "Is financial freedom more important than this expense?",
        "Is this a fleeting desire or a genuine need?",
        "Is this the reward your sweat deserves?",
        "Does buying this bring you closer to your goals?",
        "The hole in your wallet is growing; it's in your hands to stop it.",
        "Would you trade an hour of your life for this?",
        "Saving is paying your future self.",
        "What else could you have done with this money?",
        "Happiness cannot be bought, but freedom can.",
        "Think once more before spending: Is it worth it?",
        "Will your credit card statement thank you at the end of the year?",
        "Are you sure you won't regret this tomorrow?",
        "Small expenses sink great fortunes.",
        "Why consume when you could invest?",
        "Wealth is not what you earn, but what you keep.",
        "Will this product bring you peace or become a burden?",
        "Simplify your life, free your mind.",
        "Consume less, live more.",
        "Manage your money, or it will manage you.",
        "Is it worth the financial stress?",
        "Think about the hours you'll have to work to buy this.",
        "The road to freedom passes through savings.",
        "This is just an item; your worth is more than this.",
        "True wealth is having time.",
        "Don't get caught in the consumption craze; be conscious.",
        "Do you respect your own labor?",
        "Will this expense set you back a step?",
        "Your dreams are more expensive than this product.",
        "Be patient, and you will be the winner.",
        "Don't let your wants overshadow your needs.",
        "Save today, relax tomorrow.",
        "Knowing the value of every penny is power.",
        "Financial independence is the greatest luxury.",
        "Don't burn your long-term goals for short-term pleasure.",
        "Remember how hard it was to earn this money?",
        "Unnecessary expenses steal from your future.",
        "Live simply, grow rich.",
        "Savings are the key to freedom.",
        "The only question you need to ask yourself: Is it worth it?",
        "Life is more than accumulating things.",
        "Material things are temporary; experiences are permanent.",
        "Stick to your budget, do yourself a favor."
      ],
      buyButtonKeywords: ['add to cart', 'buy now', 'checkout', 'add to basket', 'order now']
    },

    tr: {
      // Widget text
      needToWork: "Bu ürünü satın almak için",
      hours: "saat",
      minutes: "dakika",
      toBuyThis: "çalışmanız gerekiyor",
      basedOnWage: "Saatlik",
      hourWage: " maaş baz alınarak",
      saveHours: "Tasarruf",
      percentOff: "% indirim",
      hide: "Workly'yi Gizle",
      iPurchasedThis: "🛍️ Satın Aldım",
      purchaseSaved: "Hayırlı olsun!",
      remainingBudget: "Kalan bütçen:",
      budgetExceeded: "Bütçeyi şu kadar aştın:",
      purchaseHistory: "Harcama Geçmişi",
      noPurchases: "Henüz harcama yok",
      date: "Tarih",
      item: "Ürün",
      cost: "Maliyet",
      delete: "Sil",

      // Popup interface  
      title: "Workly",
      hourly: "Saatlik",
      monthly: "Aylık",
      hourlyWage: "Saatlik Maaş",
      hourlyWageDesc: "Çalışma saatlerini hesaplamak için saatlik ücretiniz",
      monthlySalary: "Aylık Maaş",
      monthlySalaryDesc: "Vergi öncesi aylık maaşınız",
      workingHours: "Ayda Çalışma Saatleri",
      workingHoursDesc: "Bir ayda toplam çalıştığınız saat",
      currency: "Para Birimi",
      currencyDesc: "Hesaplamalar için görüntüleme para birimi",
      calculatedHourlyRate: "Hesaplanan Saatlik Ücret:",
      quickStats: "Hızlı İstatistikler",
      daily: "Günlük (8 saat)",
      weekly: "Haftalık (40 saat)",
      saveSettings: "Ayarları Kaydet",
      footerText: "Workly bilinçli satın alma kararları vermenize yardımcı olur",
      viewDashboard: "Kontrol Paneli",
      reflectionMessages: [
        "Hayatından giden zamana değer mi? Karar senin.",
        "Bu harcama özgürlüğünden çaldığın zamana değer mi?",
        "Gerçekten buna ihtiyacın var mı, yoksa sadece istiyor musun?",
        "Emeklerin bu ürün için miydi?",
        "Geleceğinden ödünç alıyorsun, farkında mısın?",
        "Bu parayı kazanmak için kaç sabah erken kalktın?",
        "Zamanın paradan daha değerli, onu buna mı harcayacaksın?",
        "Hedeflerine giden yolda bu bir engel mi?",
        "Finansal özgürlüğün bu harcamadan daha önemli değil mi?",
        "Bu anlık bir heves mi, yoksa gerçek bir ihtiyaç mı?",
        "Alın terinin karşılığı bu mu olmalı?",
        "Bunu almak seni hedeflerine yaklaştırıyor mu?",
        "Cüzdanındaki delik büyüyor, durdurmak senin elinde.",
        "Bir saatlik hayatını buna değişir misin?",
        "Tasarruf etmek, gelecekteki kendine ödeme yapmaktır.",
        "Bu parayla başka neler yapabilirdin?",
        "Mutluluk satın alınamaz, ama özgürlük alınabilir.",
        "Harcamadan önce bir kez daha düşün: Değer mi?",
        "Kredi kartı ekstrem sene sonunda sana teşekkür edecek mi?",
        "Yarın pişman olmayacağından emin misin?",
        "Küçük harcamalar büyük servetleri batırır.",
        "Yatırım yapmak varken, neden tüketiyorsun?",
        "Zenginlik, ne kadar kazandığın değil, ne kadar tuttuğundur.",
        "Bu ürün sana huzur mu verecek, yoksa yük mü olacak?",
        "Hayatını sadeleştir, zihnini özgürleştir.",
        "Daha az tüket, daha çok yaşa.",
        "Paranı yönet, yoksa o seni yönetir.",
        "Finansal stres yaşamaya değer mi?",
        "Bunu almak için çalışmak zorunda kalacağın saatleri düşün.",
        "Özgürlüğe giden yol tasarruftan geçer.",
        "Bu sadece bir eşya, senin değerin bundan fazla.",
        "Gerçek zenginlik, zamana sahip olmaktır.",
        "Tüketim çılgınlığına kapılma, bilinçli ol.",
        "Kendi emeğine saygı duyuyor musun?",
        "Bu harcama seni bir adım geri götürür mü?",
        "Hayallerin bu üründen daha pahalı.",
        "Sabırlı ol, kazanan sen olacaksın.",
        "İsteklerin ihtiyaçlarının önüne geçmesin.",
        "Bugün tasarruf et, yarın rahat et.",
        "Her kuruşun hesabını bilmek güçtür.",
        "Finansal bağımsızlık, en büyük lükstür.",
        "Kısa vadeli haz için uzun vadeli hedeflerini yakma.",
        "Bu parayı kazanmak ne kadar zor oldu, hatırlıyor musun?",
        "Gereksiz harcamalar, geleceğinden çalar.",
        "Sade yaşa, zenginleş.",
        "Birikim, özgürlüğün anahtarıdır.",
        "Kendine sorman gereken tek soru: Buna değer mi?",
        "Hayat, eşya biriktirmekten daha fazlasıdır.",
        "Maddi şeyler geçicidir, tecrübeler kalıcıdır.",
        "Bütçene sadık kal, kendine iyilik yap."
      ],
      buyButtonKeywords: ['sepete ekle', 'hemen al', 'satın al', 'sipariş ver', 'ekle']
    }
  };

  // Get translated text
  t(key, params = {}) {
    const translation = this.translations[this.currentLanguage]?.[key] ||
      this.translations[this.fallbackLanguage]?.[key] ||
      key;

    // Simple parameter replacement
    let result = translation;
    Object.keys(params).forEach(param => {
      result = result.replace(`{${param}}`, params[param]);
    });

    return result;
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Set language manually
  setLanguage(langCode) {
    if (this.translations[langCode]) {
      this.currentLanguage = langCode;
    }
  }
}

// Export for use in other scripts
window.LanguageManager = LanguageManager; 