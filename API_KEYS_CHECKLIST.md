# 🔑 API Keys Collection Checklist

## 📋 **BEFORE RUNNING SETUP SCRIPT**

Have these accounts ready and collect the following information:

### **🔵 STRIPE ACCOUNT**
**Setup:** [stripe.com](https://stripe.com) → Create Business Account

**Required Information:**
- [ ] **Live Secret Key:** `sk_live_...` (from Dashboard → Developers → API keys)
- [ ] **Live Publishable Key:** `pk_live_...` (from Dashboard → Developers → API keys)
- [ ] **Webhook Secret:** `whsec_...` (from Dashboard → Developers → Webhooks)

**Webhook Configuration:**
- **URL:** `https://yourdomain.com/api/webhooks/stripe`
- **Events:** `payment_intent.succeeded`, `payment_intent.payment_failed`

### **🟡 PAYPAL ACCOUNT**
**Setup:** [developer.paypal.com](https://developer.paypal.com) → Create App

**Required Information:**
- [ ] **Live Client ID:** `AXX...` (from My Apps & Credentials → Live)
- [ ] **Live Client Secret:** `EXX...` (from My Apps & Credentials → Live)

**App Configuration:**
- **App Name:** Dollar Drop Payments
- **Features:** ✓ Accept Payments
- **Environment:** Live (not Sandbox)

### **🌐 DOMAIN INFORMATION**
- [ ] **Your Domain:** `yourdomain.com` (without https://)
- [ ] **GoDaddy Hosting Active:** Verify hosting is working
- [ ] **SSL Certificate:** Enabled in GoDaddy cPanel

### **📧 EMAIL (OPTIONAL)**
- [ ] **Email Address:** `noreply@yourdomain.com`
- [ ] **Email Password:** (if setting up notifications)

---

## 🚀 **READY TO START?**

Once you have all the above information:

```bash
./setup-production.sh
```

The script will:
1. ✅ Collect your API keys securely
2. ✅ Generate security keys automatically  
3. ✅ Test all connections
4. ✅ Create production configuration
5. ✅ Verify everything works

**Total setup time: ~10 minutes**

---

## 💡 **TIPS**

### **Stripe Tips:**
- Complete business verification first (may take 1-2 days)
- Add your bank account for payouts
- Start with small test transactions

### **PayPal Tips:**
- Use your business PayPal account
- Make sure "Accept Payments" is enabled
- Test in sandbox first if unsure

### **Security Tips:**
- Never share your secret keys
- Keep API keys secure
- Use strong passwords

**Ready to launch your platform? Let's go! 🚀**


