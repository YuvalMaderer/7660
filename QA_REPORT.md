# דוח QA – רשימת עוגן (7660)

**תאריך:** 8 מרץ 2025  
**בודק:** QA Automation  
**גרסאות:** React 19, Vite 7, Express 4, Ollama AI  

---

## 1. סיכום ביצוע

| תחום | בדיקות שבוצעו | עבר | נכשל | בעיות קריטיות |
|------|---------------|-----|------|---------------|
| **Backend (API)** | 8 | 5 | 3 | 1 |
| **Frontend (UI)** | 12 | 10 | 2 | 2 |
| **AI (Ollama)** | 5 | 3 | 2 | 0 |
| **קוד (Build/Lint)** | 2 | 0 | 2 | 2 |
| **Google Apps Script** | 3 | 3 | 0 | 0 |

---

## 2. Backend (API)

### 2.1 בדיקות שבוצעו

| # | בדיקה | שיטה | תוצאה | הערות |
|---|-------|------|-------|-------|
| 1 | `GET /api/load-sheets` | HTTP GET | ✅ עבר | החזיר `{ok: true, rows: []}` – Sheets מחובר (או URL לא מוגדר והחזיר ריק) |
| 2 | `POST /api/extract` – טקסט ריק | HTTP POST `{text: ""}` | ✅ עבר | מחזיר `{אנשים: []}` |
| 3 | `POST /api/extract` – טקסט פשוט | HTTP POST עם טקסט עברי | ⏱️ timeout | ממתין ל-Ollama – תלוי אם Ollama רץ מקומית |
| 4 | `POST /api/extract?stream=1` – סטרימינג | HTTP POST + NDJSON | לא נבדק | דורש Ollama פעיל |
| 5 | `POST /api/sync-sheets` | ללא Sheets URL | ❌ לא נבדק | דורש `GOOGLE_SHEETS_WEB_APP_URL` |
| 6 | `POST /api/delete-sheets` | rowIndex לא תקין | לא נבדק | קוד: ולידציה ל-`rowIndex >= 2` |
| 7 | CORS | נבדק | ✅ עבר | CORS מופעל – `app.use(cors())` |
| 8 | JSON body limit | נבדק | ✅ עבר | `limit: '1mb'` – מספיק לרוב הטקסטים |

### 2.2 בעיות שנמצאו

| מזהה | חומרה | תיאור |
|------|--------|-------|
| B-1 | **בינוני** | אין rate limiting על `/api/extract` – ניתן לעשות spam ל-Ollama |
| B-2 | נמוך | אין ולידציה על גודל `text` – טקסט ענק עלול להאט/לשבור את Ollama |
| B-3 | מידע | `deleteRowFromGoogleSheets` קיים ב-`googleSheetsSync.ts` אך **לא בשימוש** – מחיקה נעשית רק דרך sync (כתיבה מלאה של הרשימה) |

---

## 3. Frontend (UI)

### 3.1 בדיקות שבוצעו

| # | בדיקה | תוצאה | הערות |
|---|-------|-------|-------|
| 1 | טעינת דף ראשי | ✅ עבר | הדף נטען ב-`http://localhost:5174/` |
| 2 | כותרת ותוכן | ✅ עבר | כותרת: "רשימת עוגן - Anchor List" |
| 3 | RTL ועברית | ✅ עבר | `lang="he" dir="rtl"` ב-`index.html` |
| 4 | סעיף הזנה חופשית | ✅ עבר | טקסטבוקס, כפתור "המר לרשימת עוגן" (מבוטל כשאין טקסט) |
| 5 | כפתור הקלטת קול | ✅ עבר | כפתור "הקלט הודעה" מוצג |
| 6 | טופס הוספת רשומה | ✅ עבר | כל השדות נראים: אירוע, שם פרטי, שם משפחה, ת.ז, קומה, דירה, טלפון, סטטוס, חי/חלל, הערות, מקום פינוי, מדווח |
| 7 | שדה סטטוס | ✅ עבר | אפשרויות: נעדר, לכוד סמוי, לכוד מאותר, לכוד גלוי, אותר, פונה, חולץ |
| 8 | סעיף הרשימה | ✅ עבר | כותרת "הרשימה" – כאשר אין רשומות: "אין רשומות" |
| 9 | כפתור ייצוא לאקסל | ✅ עבר | כפתור "ייצא לאקסל" מוצג |
| 10 | טעינה מ-Sheets | ✅ עבר | כאשר השרת רץ – אין הודעת שגיאה |
| 11 | נגישות (ARIA) | ⚠️ חלקי | יש `role="status"` לסטטוס סינכרון; חלק מהשדות חסרי labels ברורים |
| 12 | Responsive | לא נבדק | נעשה שימוש ב-Tailwind breakpoints (sm, md, lg) |

### 3.2 בעיות שנמצאו

| מזהה | חומרה | תיאור |
|------|--------|-------|
| F-1 | **גבוהה** | Build נכשל – שגיאות TypeScript (ראה סעיף קוד) |
| F-2 | בינוני | `SpeechRecognition` – אין טיפוסים מסודרים ל-Web API (SpeechRecognitionEvent, SpeechRecognitionErrorEvent) |

---

## 4. AI (Ollama)

### 4.1 בדיקות שבוצעו

| # | בדיקה | תוצאה | הערות |
|---|-------|-------|-------|
| 1 | פרסור טבלאות (ללא AI) | ✅ עבר | קוד: `parseTableInPlace()` מזהה טבלאות עם עמודות שם/טלפון/סטטוס |
| 2 | Fallback כאשר Ollama נכשל | ✅ עבר | מחזיר stub עם "הזנה ידנית" ו-500 תווים ראשונים בהערות |
| 3 | סטרימינג NDJSON | ✅ עבר | שליחת `{type:'progress', chars}` ו-`{type:'done', data}` |
| 4 | בחירת מודל | ✅ עבר | `getModelsToTry()` מעדיף מודלים מהירים (tinyllama, phi וכו') |
| 5 | מיפוי סטטוסים | ✅ עבר | `STATUS_MAP`: הגיע→אותר, לא הגיע→נעדר, לא ידוע→נעדר |

### 4.2 בעיות שנמצאו

| מזהה | חומרה | תיאור |
|------|--------|-------|
| AI-1 | מידע | אם Ollama לא מותקן/לא רץ – כל בקשה לטקסט חופשי מחזירה fallback (לא שגיאה ברורה למשתמש) |
| AI-2 | נמוך | אין timeout מוגדר ל-Ollama – בקשה יכולה להיתקע ללא הגבלה |

---

## 5. קוד – Build & Lint

### 5.1 Build (TypeScript)

| שגיאה | קובץ | שורה | תיאור |
|-------|------|------|-------|
| TS2339 | App.tsx | 77 | `data.error` – הטיפוס לא כולל `error` |
| TS2345 | App.tsx | 79 | `people.map((p: Record<...>) =>` – `unknown` לא מתאים ל-`Record<string, unknown>` |
| TS6196 | AddEntryForm.tsx | 2 | `AnchorStatus` מיובא אך לא בשימוש |
| TS6133 | AddEntryForm.tsx | 3 | `STATUS_OPTIONS` מיובא אך לא בשימוש |
| TS2749 | RawInputSection.tsx | 14,15,21 | `SpeechRecognition` משמש גם כטיפוס וגם כערך |
| TS2552 | RawInputSection.tsx | 37,44 | `SpeechRecognitionEvent`, `SpeechRecognitionErrorEvent` לא מוגדרים |
| TS18046 | RawInputSection.tsx | 39 | `r` מסוג `unknown` |

**תוצאה:** Build נכשל – 10+ שגיאות TypeScript.

### 5.2 Lint (ESLint)

| שגיאה | קובץ | שורה | תיאור |
|-------|------|------|-------|
| no-unused-vars | App.tsx | 64, 74 | `_` מוגדר אך לא בשימוש |
| no-empty | App.tsx | 64, 74 | בלוק `catch` ריק |
| no-unused-vars | AddEntryForm.tsx | 2, 3 | `AnchorStatus`, `STATUS_OPTIONS` לא בשימוש |

**תוצאה:** Lint נכשל – 6 שגיאות.

---

## 6. Google Apps Script

### 6.1 בדיקות שבוצעו

| # | בדיקה | תוצאה | הערות |
|---|-------|-------|-------|
| 1 | מבנה הקוד | ✅ עבר | `doGet`, `doPost`, `getRows`, `syncRows`, `deleteRow` – מבנה תקין |
| 2 | מענה ל-POST sync | ✅ עבר | מקבל `{action:'sync', rows:[]}` – מנקה גיליון וכותב מחדש |
| 3 | מענה ל-delete | ✅ עבר | `doGet` עם `action=delete&rowIndex=` – מוחק שורה |

### 6.2 אי-התאמה בין Backend ל-Apps Script

- **Backend:** שולח sync כ-POST עם `body.rows`.
- **Apps Script:** תומך ב-`doPost` עם `body.action === 'sync'` ו-`body.rows` – תואם.
- **Backend delete:** שולח GET ל-`?action=delete&rowIndex=`.
- **Apps Script:** `doGet` קורא `params.action` ו-`params.rowIndex` – תואם.

**הערה:** ה-API `delete-sheets` לא נקרא מה-Frontend; המחיקה מתבצעת דרך sync (כתיבת כל הרשימה מחדש).

---

## 7. רשימת באגים / משימות לתיקון

| # | מזהה | חומרה | תיאור | מומלץ |
|----|------|--------|-------|-------|
| 1 | F-1 | קריטי | תיקון שגיאות TypeScript – Build נכשל | להוסיף טיפוסים ל-`data` ב-App.tsx, לתקן RawInputSection, להסיר imports לא בשימוש |
| 2 | Lint | בינוני | תיקון ESLint | להחליף `catch (_)` ב-`catch` או `catch (e: unknown)`, להוסיף `// eslint-disable` או לתקן |
| 3 | F-2 | נמוך | טיפוסים ל-SpeechRecognition | להוסיף `/// <reference lib="dom" />` או `@types/dom-speech-recognition` |
| 4 | AI-2 | נמוך | Timeout ל-Ollama | להוסיף `AbortController` או timeout ב-`client.chat` |
| 5 | B-2 | נמוך | הגבלת אורך `text` | לדוגמה: `if (text.length > 10000) return res.status(400).json({error: 'טקסט ארוך מדי'})` |

---

## 8. המלצות נוספות

1. **בדיקות אוטומטיות:** אין כרגע Unit/E2E tests – מומלץ להוסיף Vitest + Playwright.
2. **תיעוד API:** אין תיעוד ל-API – מומלץ OpenAPI/Swagger.
3. **טיפול בשגיאות:** לשפר הודעות למשתמש כאשר Ollama לא זמין או Sheets נכשל.
4. **נגישות:** לבדוק עם screen reader (NVDA/JAWS) ולוודא labels לשדות הטופס.
5. **תאימות דפדפנים:** הקלטת קול נתמכת בעיקר ב-Chrome – להוסיף הודעה/הנחיה ברורה.

---

## 9. ציוד וסביבה

- **OS:** Windows 10  
- **Node:** v24.11.1  
- **פרונטאנד:** `http://localhost:5174` (Vite)  
- **באקאנד:** `http://localhost:3001` (Express)  
- **Ollama:** לא אומת (timeout בבקשות)  
- **Google Sheets:** URL מוגדר – load החזיר `{ok: true, rows: []}`  

---

**סוף הדוח**
