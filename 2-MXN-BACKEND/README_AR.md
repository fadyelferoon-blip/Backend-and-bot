# 🚀 MXN Signals Backend

## ما هذا؟

Backend كامل بـ **Node.js + Puppeteer** لاستخراج إشارات MXN من البوت.

---

## 📁 الملفات (11 ملف):

```
2-MXN-BACKEND/
├── server.js                    Express server
├── package.json                 Dependencies
├── nixpacks.toml                Railway config
├── .env.example                 Environment template
│
├── services/
│   ├── botScraper.js           Puppeteer scraper
│   ├── signalAnalyzer.js       Signal analyzer
│   └── timezoneConverter.js    Timezone conversion
│
├── controllers/
│   └── signalsController.js    API controller
│
└── routes/
    └── signals.js              API routes
```

---

## 🚀 النشر على Railway:

### الخطوات:

**1. افتح Railway:**
- اضغط "New Project"
- مشروع **منفصل** عن البوت!

**2. ارفع الملفات:**
```
حدد كل ملفات هذا المجلد
ارفعهم على Railway
```

**3. اسم المشروع:**
```
MXN-Signals-Backend
```

**4. Environment Variables:**

⚠️ **مهم جداً!** في Railway → Variables:

```env
PORT=5001

BOT_URL=https://fer3oon-bot-mxn-production.up.railway.app
(استبدل بالـ URL من البوت Server!)

CORS_ORIGIN=*

NODE_ENV=production
```

**5. Deploy:**
- Railway يكشف Node.js تلقائياً
- يقرأ nixpacks.toml
- يثبت Chromium
- ينشر التطبيق

**6. احصل على URL:**
```
https://mxn-signals-backend-production.up.railway.app
```

---

## 📡 API Endpoints:

### **1. Health Check:**
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "service": "MXN Signals Backend",
  "timestamp": "2026-03-22T..."
}
```

---

### **2. Get MXN Signal:**
```http
POST /api/signals/mxn
Content-Type: application/json
```

**Body:**
```json
{
  "uid": "123456",
  "deviceId": "device-123",
  "timezone": "2"
}
```

**Response:**
```json
{
  "success": true,
  "signal": {
    "type": "PUT",
    "pair": "USD/MXN OTC",
    "time": "14:15:00",
    "countdown": 3245,
    "percentage": 85.5
  }
}
```

⚠️ **أول request قد يستغرق 60-90 ثانية**

---

### **3. Get Upcoming Signals:**
```http
GET /api/signals/upcoming?timezone=2
```

**Response:**
```json
{
  "success": true,
  "signals": [
    {
      "type": "PUT",
      "time": "14:15:00",
      "countdown": 3245
    },
    ...
  ]
}
```

---

### **4. Clear Cache:**
```http
POST /api/signals/clear-cache
```

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

---

## 🔧 كيف يعمل:

```
1. Flutter يرسل request
   ↓
2. Backend يفتح Bot Server بـ Puppeteer
   ↓
3. Puppeteer يقرأ الإشارات من البوت
   ↓
4. Backend يحلل البيانات
   ↓
5. Backend يحول الـ timezone
   ↓
6. Backend يرجع الإشارة للـ Flutter
```

---

## ⚡ Performance:

- **أول Request:** 60-90 ثانية (تحليل البيانات)
- **Requests بعدها:** 1-2 ثانية (من Cache)
- **Cache Duration:** 6 ساعات

---

## 📦 Dependencies:

```json
{
  "express": "^4.18.0",
  "cors": "^2.8.5",
  "dotenv": "^16.0.0",
  "puppeteer": "^21.0.0",
  "puppeteer-core": "^21.0.0"
}
```

---

## 🧪 Testing:

### Test 1: Health Check
```bash
curl https://YOUR_URL/health
```

### Test 2: Get Signal
```bash
curl -X POST https://YOUR_URL/api/signals/mxn \
  -H "Content-Type: application/json" \
  -d '{"uid":"test","deviceId":"test","timezone":"2"}'
```

---

## 🔗 Environment Variables:

| Variable | Value | ملاحظات |
|----------|-------|---------|
| `PORT` | 5001 | رقم المنفذ |
| `BOT_URL` | URL البوت | من المشروع 1 |
| `CORS_ORIGIN` | * | Allow all |
| `NODE_ENV` | production | Production mode |

---

## ✅ بعد النشر:

1. ✅ احفظ الـ URL
2. ✅ اختبر `/health` endpoint
3. ✅ اختبر `/api/signals/mxn`
4. ✅ استخدمه في Flutter

---

**Done! 🎉**
