/**
 * Extraction: tables parsed in code (fast, exact). Free text via Ollama.
 * Env: OLLAMA_MODEL, OLLAMA_HOST, OLLAMA_NUM_THREAD, OLLAMA_KEEP_ALIVE
 */

const STATUS_MAP = { 'הגיע': 'אותר', 'לא הגיע': 'נעדר', 'לא ידוע': 'נעדר', 'נוכח': 'אותר', 'לא נוכח': 'נעדר' };

function splitTableLine(line, sep) {
  if (sep === '|') {
    const parts = line.split('|').map((h) => h.trim());
    if (parts[0] === '' && parts.length > 1) parts.shift();
    if (parts[parts.length - 1] === '' && parts.length > 1) parts.pop();
    return parts;
  }
  return line.split(sep).map((h) => h.trim());
}

function isTableHeaderLine(line, sep) {
  const parts = splitTableLine(line, sep);
  const hasPhone = parts.some((h) => /טלפון|phone/i.test(h));
  const hasName = parts.some((h) => /^שם$/i.test(h.trim()));
  const hasId = parts.some((h) => /תעודת\s*זהות|תעודה/i.test(h));
  const hasReason = parts.some((h) => /סיבה|ביקור/i.test(h));
  const hasRole = parts.some((h) => /תפקיד|קשר/i.test(h));
  const hasEntrySign = parts.some((h) => /החתמה|כניסה/i.test(h));
  return (hasPhone || hasName || hasId || hasReason) || (hasRole && hasName) || (hasEntrySign && hasName);
}

/** אם הטקסט נראה כמו טבלה עם טלפון/שם - נפרסר בקוד. מדלג על שורות כותרת עד שמגיע לשורת עמודות */
function parseTableInPlace(text) {
  const lines = String(text || '').trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;

  let headerIdx = -1;
  let sep = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let s = null;
    if (line.includes('|') && line.trim().startsWith('|')) s = '|';
    else if (line.includes('\t')) s = '\t';
    else if (line.includes(',')) s = ',';
    if (s && isTableHeaderLine(line, s)) {
      headerIdx = i;
      sep = s;
      break;
    }
  }
  if (headerIdx < 0 || !sep) return null;

  const headers = splitTableLine(lines[headerIdx], sep);
  if (headers.some((h) => /^-+$/.test(h))) return null;

  const idx = {
    id: headers.findIndex((h) => /תעודת\s*זהות|תעודה\s*\/\s*דרכון/i.test(h)),
    tel: headers.findIndex((h) => /טלפון/i.test(h)),
    reason: headers.findIndex((h) => /סיבה|ביקור/i.test(h)),
    name: headers.findIndex((h) => /^שם$/i.test(h.trim())),
    status: headers.findIndex((h) => /סטטוס/i.test(h)),
    note: headers.findIndex((h) => /הערה/i.test(h)),
    time: headers.findIndex((h) => /^שעה$/i.test(h.trim())),
    role: headers.findIndex((h) => /תפקיד|קשר/i.test(h)),
    entrySign: headers.findIndex((h) => /החתמה|כניסה/i.test(h)),
  };
  if (idx.name < 0 && idx.tel < 0 && idx.id < 0) return null;

  const people = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitTableLine(lines[i], sep);
    if (cells.some((c) => /^-+$/.test(c))) continue;
    const get = (i) => (i >= 0 && cells[i] !== undefined ? String(cells[i]).trim() : '');
    const idNum = get(idx.id);
    const tel = get(idx.tel);
    const reason = get(idx.reason);
    const statusRaw = get(idx.status);
    const note = get(idx.note);
    const time = get(idx.time);
    const role = get(idx.role);
    const entrySign = get(idx.entrySign);
    const status = STATUS_MAP[statusRaw] || 'נעדר';
    const remarks = [note, time, role, entrySign].filter(Boolean).join(' ').trim();

    const namesRaw = get(idx.name) || '';
    const names = namesRaw.split(/\s+ו[\s־]?|\s*,\s*/).map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) names.push('');
    for (const fullName of names) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      people.push({
        אירוע: reason,
        שם_פרטי: firstName,
        שם_משפחה: lastName,
        תעודת_זהות_דרכון: idNum,
        קומה: '',
        דירה: '',
        טלפון: tel,
        הערות: remarks,
        מקום_פינוי: '',
        סטטוס: status,
        חי_חלל: '',
        מדווח: '',
      });
    }
  }
  return people.length > 0 ? { אנשים: people } : null;
}

const SYSTEM_PROMPT = `חלץ לטבלה. שורה=אדם. עמודות: אירוע, שם_פרטי, שם_משפחה, טלפון, הערות, מקום_פינוי, סטטוס.
סטטוס: נעדר|אותר|לכוד סמוי|לכוד מאותר|לכוד גלוי|פונה|חולץ. הגיע=אותר, לא הגיע=נעדר.
שם "משה כהן" → שם_פרטי:משה שם_משפחה:כהן.

כללים חשובים:
• לכוד שלא יודעים את שמו → שם_פרטי:אנונימי שם_משפחה:אנונימי (למשל: "מצאנו לכוד אחד לא יודעים איך קוראים לו")
• פינינו/פונה לבית חולים רמבם → מקום_פינוי:רמבם, סטטוס:פונה
• פינינו לבית חולים X → מקום_פינוי:X, סטטוס:פונה
• כמה שמות בשורה – פריד לרישומים. החזר JSON בלבד.`;

const buildUserPrompt = (text) => `חלץ JSON:
${text}

{"אנשים":[{"אירוע":"","שם_פרטי":"","שם_משפחה":"","תעודת_זהות_דרכון":"","קומה":"","דירה":"","טלפון":"","הערות":"","מקום_פינוי":"","סטטוס":"נעדר","חי_חלל":"","מדווח":""}]}`;

const STATUS_OPTIONS = ['נעדר', 'לכוד סמוי', 'לכוד מאותר', 'לכוד גלוי', 'אותר', 'פונה', 'חולץ'];

function normalizeStatus(s) {
  const raw = String(s ?? '').trim();
  if (STATUS_OPTIONS.includes(raw)) return raw;
  return STATUS_MAP[raw] || 'נעדר';
}

function splitName(full) {
  const s = String(full ?? '').trim();
  if (!s) return { first: '', last: '' };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function normalizePerson(p) {
  const statusRaw = p.סטטוס ?? p['סטטוס בפועל'] ?? '';
  const status = normalizeStatus(statusRaw);
  let first = String(p.שם_פרטי ?? '').trim();
  let last = String(p.שם_משפחה ?? '').trim();
  if (!first && !last && p.שם) {
    const n = splitName(p.שם);
    first = n.first;
    last = n.last;
  }
  return {
    אירוע: String(p.אירוע ?? p['סיבה/ביקור'] ?? '').trim(),
    שם_פרטי: first,
    שם_משפחה: last,
    תעודת_זהות_דרכון: String(p.תעודת_זהות_דרכון ?? p['תעודת זהות/דרכון'] ?? '').trim(),
    קומה: String(p.קומה ?? '').trim(),
    דירה: String(p.דירה ?? '').trim(),
    טלפון: String(p.טלפון ?? '').trim(),
    הערות: [p.הערות, p.הערה, p.שעה].filter(Boolean).map(String).join(' ').trim(),
    מקום_פינוי: String(p.מקום_פינוי ?? p['מקום פינוי'] ?? '').trim(),
    סטטוס: status,
    חי_חלל: String(p.חי_חלל ?? p['חי/חלל'] ?? '').trim(),
    מדווח: String(p.מדווח ?? '').trim(),
  };
}

function parseJsonFromContent(content) {
  let str = String(content || '').trim();
  const start = str.indexOf('{');
  if (start < 0) return null;
  const end = str.lastIndexOf('}');
  if (end < start) return null;
  str = str.slice(start, end + 1);
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// מהמהירים לאיטיים: 1B ואז 2–3B. tinyllama/phi הכי קלים.
const FAST_MODELS = ['tinyllama', 'llama3.2:1b', 'qwen2.5:1.5b', 'smollm2', 'phi', 'phi3:mini', 'qwen2.5:3b', 'gemma2:2b', 'llama3.2:3b'];
const FALLBACK_MODELS = ['phi', 'llama3.2', 'llama3.1', 'mistral', 'qwen2.5', 'llama2', 'gemma'];

async function getModelsToTry(client) {
  const envModel = process.env.OLLAMA_MODEL;
  if (envModel) return [envModel];
  try {
    const list = await client.list();
    const models = list?.models || [];
    const names = models.map((m) => m.name || m.model || '').filter(Boolean);
    if (names.length === 0) return FALLBACK_MODELS;
    // Prefer fast models: put matching fast models first
    const fast = names.filter((n) => FAST_MODELS.some((f) => n.startsWith(f.split(':')[0])));
    const rest = names.filter((n) => !fast.includes(n));
    return fast.length > 0 ? [...fast, ...rest] : names;
  } catch (_) {}
  return FALLBACK_MODELS;
}

export async function extractWithOllama(text, options = {}) {
  const host = options.host || process.env.OLLAMA_HOST;

  const ollama = await import('ollama');
  const client = host ? new ollama.Ollama({ host }) : ollama.default;

  const modelsToTry = options.model
    ? [options.model]
    : await getModelsToTry(client);

  const tableResult = parseTableInPlace(text);
  if (tableResult && Array.isArray(tableResult.אנשים)) {
    const people = tableResult.אנשים.filter((p) => p && typeof p === 'object').map(normalizePerson);
    return { אנשים: people };
  }

  let lastErr;
  for (const tryModel of modelsToTry) {
    try {
      const response = await client.chat({
        model: tryModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(text) },
        ],
        format: 'json',
        options: {
          num_predict: 1024,     // מספיק לטבלאות עם כמה אנשים
          num_ctx: 2048,         // חלון לטבלאות
          temperature: 0,        // דטרמיניסטי, מהיר
          ...(process.env.OLLAMA_NUM_THREAD && { num_thread: +process.env.OLLAMA_NUM_THREAD }),
        },
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || '10m',  // פחות טעינה מחדש
      });

      const content = response?.message?.content || '';
      const data = parseJsonFromContent(content);
      if (!data || !Array.isArray(data.אנשים)) {
        return { אנשים: [] };
      }

      const people = data.אנשים
        .filter((p) => p && typeof p === 'object')
        .map(normalizePerson);

      return { אנשים: people };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('No Ollama model available');
}

/**
 * Cloud extraction via Groq (fallback when Ollama unavailable, e.g. production).
 * Requires: GROQ_API_KEY. Free tier: console.groq.com
 */
export async function extractWithGroq(text) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const tableResult = parseTableInPlace(text);
  if (tableResult && Array.isArray(tableResult.אנשים)) {
    const people = tableResult.אנשים.filter((p) => p && typeof p === 'object').map(normalizePerson);
    return { אנשים: people };
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(text) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content || '';
  const data = parseJsonFromContent(content);
  if (!data || !Array.isArray(data.אנשים)) return { אנשים: [] };

  const people = data.אנשים
    .filter((p) => p && typeof p === 'object')
    .map(normalizePerson);
  return { אנשים: people };
}

/** Try extraction: Ollama first, then Groq (cloud) if Ollama unavailable */
export async function extractFreeText(text, options = {}) {
  try {
    return await extractWithOllama(text, options);
  } catch (ollamaErr) {
    if (process.env.GROQ_API_KEY) {
      try {
        return await extractWithGroq(text);
      } catch (groqErr) {
        console.warn('[extract] Groq:', groqErr.message);
        throw ollamaErr;
      }
    }
    throw ollamaErr;
  }
}

/** Stream: Ollama first, fallback to Groq (non-stream) */
export async function extractFreeTextStream(text, onChunk) {
  try {
    return await extractWithOllamaStream(text, onChunk);
  } catch (ollamaErr) {
    if (process.env.GROQ_API_KEY) {
      try {
        const data = await extractWithGroq(text);
        if (onChunk && data?.אנשים?.length) {
          onChunk(JSON.stringify(data).length, JSON.stringify(data));
        }
        return data;
      } catch (groqErr) {
        console.warn('[extract] Groq:', groqErr.message);
        throw ollamaErr;
      }
    }
    throw ollamaErr;
  }
}

/** Stream extraction - calls onChunk(charsReceived, contentSoFar) for progress, returns final result */
export async function extractWithOllamaStream(text, onChunk, options = {}) {
  const host = options.host || process.env.OLLAMA_HOST;
  const ollama = await import('ollama');
  const client = host ? new ollama.Ollama({ host }) : ollama.default;
  const tableResult = parseTableInPlace(text);
  if (tableResult && Array.isArray(tableResult.אנשים)) {
    const people = tableResult.אנשים.filter((p) => p && typeof p === 'object').map(normalizePerson);
    const out = { אנשים: people };
    if (onChunk) onChunk(JSON.stringify(out).length, JSON.stringify(out));
    return out;
  }

  const modelsToTry = options.model ? [options.model] : await getModelsToTry(client);
  let lastErr;
  for (const tryModel of modelsToTry) {
    try {
      const stream = await client.chat({
        model: tryModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(text) },
        ],
        format: 'json',
        stream: true,
        options: {
          num_predict: 1024,
          num_ctx: 2048,
          temperature: 0,
          ...(process.env.OLLAMA_NUM_THREAD && { num_thread: +process.env.OLLAMA_NUM_THREAD }),
        },
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || '10m',
      });

      let content = '';
      for await (const part of stream) {
        const chunk = part?.message?.content || '';
        if (chunk) {
          content += chunk;
          if (onChunk) onChunk(content.length, content);
        }
      }

      const data = parseJsonFromContent(content);
      if (!data || !Array.isArray(data.אנשים)) return { אנשים: [] };
      const people = data.אנשים
        .filter((p) => p && typeof p === 'object')
        .map(normalizePerson);
      return { אנשים: people };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('No Ollama model available');
}
