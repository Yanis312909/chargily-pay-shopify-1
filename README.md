# Chargily Pay — Shopify Payment App

Plugin de paiement Shopify pour **Chargily Pay** (Edahabia / CIB) — la passerelle de paiement algérienne.  
Shopify payment app for **Chargily Pay** (Edahabia / CIB) — the Algerian payment gateway.  
إضافة دفع Shopify لـ **Chargily Pay** (إدهبية / CIB) — بوابة الدفع الجزائرية.

---

> **Développé par [Yanis Garoui](https://www.linkedin.com/in/yanis-garoui-29887a275) pour la communauté algérienne.**  
> Ce plugin est une contribution open source — il reste à tester avant utilisation en production.  
> Pour toute question ou collaboration : [yanisgaroui1@gmail.com](mailto:yanisgaroui1@gmail.com) · [LinkedIn](https://www.linkedin.com/in/yanis-garoui-29887a275) · [GitHub](https://github.com/yanis312909)  
>
> **Built by [Yanis Garoui](https://www.linkedin.com/in/yanis-garoui-29887a275) for the Algerian developer community.**  
> This plugin is an open source contribution — testing required before production use.  
> Reach out: [yanisgaroui1@gmail.com](mailto:yanisgaroui1@gmail.com) · [LinkedIn](https://www.linkedin.com/in/yanis-garoui-29887a275) · [GitHub](https://github.com/yanis312909)

---

## Français

### Description

Ce plugin permet aux marchands Shopify d'accepter des paiements via Chargily Pay (cartes Edahabia CCP et CIB). Il s'intègre directement dans le checkout Shopify comme passerelle de paiement externe (offsite).

### Prérequis

- [Node.js](https://nodejs.org/) v18.20.0 ou supérieur
- Un compte [Shopify Partners](https://partners.shopify.com/) avec une boutique de développement
- Un compte [Chargily Pay](https://pay.chargily.dz/) avec accès aux clés API (Developers Corner)
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) v3.x

### Installation

```bash
# 1. Cloner le repo
git clone https://github.com/Chargily/chargily-pay-shopify.git
cd chargily-pay-shopify

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditez .env avec vos clés Shopify Partner

# 4. Initialiser la base de données
npm run setup

# 5. Lancer en mode développement
npm run dev
```

### Configuration du Webhook

1. Ouvrez votre [Dashboard Chargily Pay](https://pay.chargily.dz/dashboard/developers)
2. Dans **Developers Corner**, ajoutez un webhook avec l'URL :
   ```
   https://VOTRE-APP-URL/app/webhook?shop=VOTRE-BOUTIQUE.myshopify.com
   ```
3. Dans l'app Shopify, collez votre clé API secrète Chargily → cliquez **Vérifier & Sauvegarder**
   > ℹ️ Chargily Pay utilise votre clé API pour signer les webhooks — pas besoin de clé séparée.

### Soumettre l'app pour review Shopify

Consultez la documentation officielle :  
→ [Shopify Payments App Review](https://shopify.dev/docs/apps/build/payments/offsite/create-payment-app)

---

## English

### Description

This plugin enables Shopify merchants to accept payments via Chargily Pay (Edahabia CCP and CIB cards). It integrates directly into the Shopify checkout as an offsite payment gateway.

### Prerequisites

- [Node.js](https://nodejs.org/) v18.20.0 or higher
- A [Shopify Partners](https://partners.shopify.com/) account with a development store
- A [Chargily Pay](https://pay.chargily.dz/) account with API key access (Developers Corner)
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) v3.x

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Chargily/chargily-pay-shopify.git
cd chargily-pay-shopify

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Shopify Partner credentials

# 4. Initialize the database
npm run setup

# 5. Start development server
npm run dev
```

### Webhook Configuration

1. Open your [Chargily Pay Dashboard](https://pay.chargily.dz/dashboard/developers)
2. In **Developers Corner**, add a webhook with the URL:
   ```
   https://YOUR-APP-URL/app/webhook?shop=YOUR-STORE.myshopify.com
   ```
3. In the Shopify app, enter your Chargily API secret key → click **Verify & Save**
   > ℹ️ Chargily Pay uses your API key to sign webhooks — no separate webhook secret needed.

### Submitting for Shopify Review

See the official documentation:  
→ [Shopify Payments App Review](https://shopify.dev/docs/apps/build/payments/offsite/create-payment-app)

---

## العربية

### الوصف

يتيح هذا الإضافة لتجار Shopify قبول المدفوعات عبر Chargily Pay (بطاقات إدهبية CCP و CIB). يتكامل مباشرة في صفحة الدفع Shopify كبوابة دفع خارجية.

### المتطلبات الأساسية

- [Node.js](https://nodejs.org/) الإصدار 18.20.0 أو أعلى
- حساب [Shopify Partners](https://partners.shopify.com/) مع متجر تطوير
- حساب [Chargily Pay](https://pay.chargily.dz/) مع الوصول إلى مفاتيح API (Developers Corner)
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) الإصدار 3.x

### التثبيت

```bash
# 1. استنساخ المستودع
git clone https://github.com/Chargily/chargily-pay-shopify.git
cd chargily-pay-shopify

# 2. تثبيت التبعيات
npm install

# 3. إعداد متغيرات البيئة
cp .env.example .env
# عدّل ملف .env بمعلومات حساب Shopify Partner الخاص بك

# 4. تهيئة قاعدة البيانات
npm run setup

# 5. تشغيل خادم التطوير
npm run dev
```

### إعداد Webhook

1. افتح [لوحة تحكم Chargily Pay](https://pay.chargily.dz/dashboard/developers)
2. في **Developers Corner**، أضف webhook بالرابط:
   ```
   https://YOUR-APP-URL/app/webhook?shop=YOUR-STORE.myshopify.com
   ```
3. في تطبيق Shopify، أدخل مفتاح API السري الخاص بك ← انقر **التحقق والحفظ**
   > ℹ️ يستخدم Chargily Pay مفتاح API لتوقيع الـ webhooks — لا حاجة لمفتاح منفصل.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please open an issue first for major changes.

---

## License

MIT — see [LICENSE](LICENSE)
