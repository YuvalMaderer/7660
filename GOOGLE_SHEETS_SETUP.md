# חיבור Google Sheets לרשימת עוגן

האפליקציה מעדכנת אוטומטית גיליון Google Sheets בכל שינוי ברשימה (הוספה, עריכה, מחיקה, חילוץ).

## שלב 1: יצירת גיליון וחיבור דרך Gmail

1. פתח [Google Sheets](https://sheets.google.com) והתחבר עם חשבון ה-Gmail שלך
2. צור גיליון חדש (או השתמש בקיים)
3. **Extensions** → **Apps Script**
4. מחק את הקוד הקיים והעתק את תוכן הקובץ `google-apps-script/Code.gs`
5. שמור (Ctrl+S)

## שלב 2: פריסת האפליקציה (Deploy)

1. לחץ **Deploy** → **New deployment**
2. לחץ על האייקון של גלגל השיניים ליד "Select type" → **Web app**
3. **Execute as:** `Me` (החשבון שלך)
4. **Who has access:** `Anyone`
5. לחץ **Deploy**
6. אשר הרשאות (Authorize access) אם מתבקש
7. העתק את ה-URL שמופיע (מסתיים ב-`/exec`)

## שלב 3: הגדרת הפרויקט

1. צור קובץ `.env` בתיקיית הפרויקט (העתק מ-`.env.example`)
2. הדבק את ה-URL:
   ```
   GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/XXXXX/exec
   ```

## שלב 4: הרצה

הפעל **שני** טרמינלים:

```bash
# טרמינל 1 – שרת הפרוקסי (מחובר ל-Google Sheets)
npm run server

# טרמינל 2 – האפליקציה
npm run dev
```

כעת כל שינוי ברשימה יעודכן אוטומטית ב-Google Sheets.
