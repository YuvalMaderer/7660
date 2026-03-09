# פריסה לאוויר | Deployment

## דרישות

- **חובה:** `GOOGLE_SHEETS_WEB_APP_URL` – כתובת Web App של Google Apps Script (נבחרת: "כל משתמש")
- **אופציונלי:** Ollama לסגנון AI – אם לא מותקן, חילוץ עובר ל-fallback ידני

---

## אופציה 1: Docker (מומלץ)

```bash
# 1. העתק .env.example ל-.env
cp .env.example .env
# ערוך .env והגדר GOOGLE_SHEETS_WEB_APP_URL

# 2. בנייה והפעלה
docker compose up -d

# האפליקציה תרוץ על http://localhost:3001
```

### Ollama (חילוץ AI) בתוך Docker

בקובץ `docker-compose.yml` הסר את ההערה משירות `ollama` והפעל:

```bash
docker compose --profile ai up -d
docker compose exec ollama ollama pull qwen2.5:1.5b
```

הוסף ל-`.env`:

```
OLLAMA_HOST=http://ollama:11434
```

---

## אופציה 2: הרצה ישירה (VPS / שרת)

```bash
# 1. התקנת Node 22
# 2. clone והתקנה
git clone <repo> && cd 7660
npm ci

# 3. build
npm run build

# 4. הגדרת משתנים
cp .env.example .env
# ערוך .env: GOOGLE_SHEETS_WEB_APP_URL

# 5. הרצה
NODE_ENV=production PORT=3001 node server/syncProxy.js
```

ב-Windows PowerShell:
```powershell
$env:NODE_ENV="production"; $env:PORT="3001"; node server/syncProxy.js
```

מומלץ להשתמש ב-**PM2** או **systemd** להפעלה אוטומטית ו-restart.

---

## פריסה לענן

### Railway / Render / Fly.io

1. חבר את ה-repo
2. Build Command: `npm run build`
3. Start Command: `node server/syncProxy.js`
4. הגדר משתנים: `GOOGLE_SHEETS_WEB_APP_URL`, `NODE_ENV=production`
5. Port: 3001 (או לפי מה שהפלטפורמה דורשת)

### AWS / GCP / Azure

- השתמש ב-Dockerfile – בנה image ופרוס ל-ECS / Cloud Run / App Service
- הגדר health check על `GET /` (מחזיר 200)
- וודא שה-App Script Web App מאפשר "כל משתמש" (לא רק משתמשים בארגון)

---

## בדיקה לפני פריסה

```bash
# Build מקומי
npm run build

# הרצת production
NODE_ENV=production node server/syncProxy.js
# בדוק: http://localhost:3001
```

---

## Google Sheets

ראה `GOOGLE_SHEETS_SETUP.md` להגדרת Google Apps Script ופריסה עם גישה "כל משתמש".
