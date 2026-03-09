/**
 * Backend proxy for Google Sheets sync.
 * Google Apps Script doesn't support CORS, so we forward requests from the frontend.
 *
 * Run: node server/syncProxy.js
 * Requires: GOOGLE_SHEETS_WEB_APP_URL in .env (or env var)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const SHEETS_URL = process.env.GOOGLE_SHEETS_WEB_APP_URL;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// AI extraction (streaming) – real progress | fallback to non-stream
app.post('/api/extract', async (req, res) => {
  const stream = req.query?.stream === '1' || req.headers?.accept?.includes('text/event-stream');
  if (stream) {
    return handleExtractStream(req, res);
  }
  return handleExtractPlain(req, res);
});

async function handleExtractStream(req, res) {
  const text = req.body?.text?.trim() || '';
  if (!text) {
    return res.json({ אנשים: [] });
  }
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.flushHeaders?.();

  const send = (obj) => res.write(JSON.stringify(obj) + '\n');

  try {
    const { extractFreeTextStream } = await import('./ollamaExtract.js');
    const data = await extractFreeTextStream(text, (chars) => send({ type: 'progress', chars }));
    send({ type: 'done', data });
  } catch (err) {
    console.warn('[extract] AI:', err.message);
    send({ type: 'done', data: getStubResult(text) });
  } finally {
    res.end();
  }
}

function getStubResult(text) {
  return {
    אנשים: [{
      אירוע: '', שם_פרטי: '', שם_משפחה: '', תעודת_זהות_דרכון: '', קומה: '', דירה: '',
      טלפון: '', הערות: text.slice(0, 500), מקום_פינוי: '', סטטוס: 'נעדר', חי_חלל: '', מדווח: 'הזנה ידנית',
    }],
  };
}

async function handleExtractPlain(req, res) {
  const text = req.body?.text?.trim() || '';
  if (!text) return res.json({ אנשים: [] });

  try {
    const { extractFreeText } = await import('./ollamaExtract.js');
    const data = await extractFreeText(text);
    if (data.אנשים && data.אנשים.length > 0) {
      return res.json(data);
    }
  } catch (err) {
    console.warn('[extract] AI:', err.message);
  }
  res.json(getStubResult(text));
}

app.get('/api/load-sheets', async (req, res) => {
  if (!SHEETS_URL) {
    return res.status(500).json({ error: 'GOOGLE_SHEETS_WEB_APP_URL not configured' });
  }
  try {
    const forward = await fetch(SHEETS_URL, { method: 'GET' });
    const text = await forward.text();
    res.status(forward.status).set('Content-Type', 'application/json').send(text || '{}');
  } catch (err) {
    console.error('Load sheets error:', err);
    res.status(502).json({ error: 'Failed to load from Google Sheets' });
  }
});

app.post('/api/sync-sheets', async (req, res) => {
  if (!SHEETS_URL) {
    return res.status(500).json({ error: 'GOOGLE_SHEETS_WEB_APP_URL not configured' });
  }
  const rows = req.body?.rows ?? [];
  try {
    const payload = { action: 'sync', rows };
    const payloadStr = JSON.stringify(payload);
    console.log('[sync] Rows:', rows.length, 'Body size:', payloadStr.length);

    const forward = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadStr,
      redirect: 'manual',
    });

    const text = await forward.text();
    const location = forward.headers.get('location') || '';
    if (forward.status === 302 && location.includes('accounts.google.com')) {
      console.error('[sync] Google redirect to login');
      return res.status(502).json({
        error: 'Google מפנה להתחברות. פרוס מחדש: נהל פריסות → עריכה → מי יכול לגשת: "כל משתמש" → גרסה חדשה.',
      });
    }
    if (text.startsWith('<!')) {
      console.error('[sync] Google returned HTML');
      return res.status(502).json({
        error: 'Google החזיר דף התחברות. וודא שהפריסה מאפשרת "כל משתמש".',
      });
    }
    try {
      const data = JSON.parse(text || '{}');
      if (data.error) {
        console.error('[sync] Google error:', data.error);
        return res.status(502).json({ error: data.error });
      }
    } catch (_) {}
    res.status(forward.status).set('Content-Type', 'application/json').send(text || '{}');
  } catch (err) {
    console.error('Sheets proxy error:', err);
    res.status(502).json({ error: 'Failed to sync: ' + (err?.message || err) });
  }
});

app.post('/api/delete-sheets', async (req, res) => {
  if (!SHEETS_URL) {
    return res.status(500).json({ error: 'GOOGLE_SHEETS_WEB_APP_URL not configured' });
  }
  const rowIndex = req.body?.rowIndex;
  if (typeof rowIndex !== 'number' || rowIndex < 2) {
    return res.status(400).json({ error: 'rowIndex required (2=first data row)' });
  }
  try {
    const url = `${SHEETS_URL}?action=delete&rowIndex=${rowIndex}`;
    const forward = await fetch(url, { method: 'GET', redirect: 'manual' });
    const text = await forward.text();
    const location = forward.headers.get('location') || '';
    if (forward.status === 302 && location.includes('accounts.google.com')) {
      return res.status(502).json({ error: 'Google מפנה להתחברות.' });
    }
    if (text.startsWith('<!')) {
      return res.status(502).json({ error: 'Google החזיר דף התחברות.' });
    }
    res.status(forward.status).set('Content-Type', 'application/json').send(text || '{}');
  } catch (err) {
    console.error('Delete sheets error:', err);
    res.status(502).json({ error: 'Failed to delete row from Google Sheets' });
  }
});

// Production: serve built frontend (must be after all API routes)
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Sync proxy running at http://localhost:${PORT}`);
  if (!SHEETS_URL) console.warn('Warning: GOOGLE_SHEETS_WEB_APP_URL not set');
});
