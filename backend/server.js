import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const PORT = process.env.PORT || 3002;
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

const RECORDS_FILE = path.join(__dirname, 'records.json');
if (!fs.existsSync(RECORDS_FILE)) fs.writeFileSync(RECORDS_FILE, '[]');

function readRecords() {
  try { return JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf-8')); }
  catch { return []; }
}
function saveRecords(records) { fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2)); }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, screenshotsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const SYSTEM_PROMPT = `You are a shooting trajectory analysis expert. Analyze this target image.

Color definitions:
- Red line: pre-shot aiming trajectory
- Blue line: last 0.5s before shot (trigger control)
- Green line: post-shot trajectory (follow-through)
- Purple dot: bullet hole (hit point)

Each image contains only ONE shot's trajectory.

Tasks:
1. Find purple bullet hole and ring score
2. Analyze red/blue/green trajectory characteristics
3. Evaluate shooting technique

Return ONLY valid JSON:
{"success":true,"shot":{"ring":9,"position":{"x":50,"y":50},"trajectory":{"red":{"direction":"bottom to top","stability":"stable","hasStraightSegment":false},"blue":{"length":"short","hasSuddenShift":false,"quality":"good"},"green":{"stable":true,"hasJump":false}}},"summary":{"stabilityRating":"A","triggerControlRating":"A","followThroughRating":"A","mainIssue":"none","suggestion":"keep it up"}}

If cannot identify:
{"success":false,"error":"cannot identify"}`;

async function preprocessImage(imagePath, options = {}) {
  const { quality = 92 } = options;
  try {
    const processedPath = imagePath.replace(/\.(png|jpg|jpeg|webp)$/i, '_processed.jpg');
    await sharp(imagePath).jpeg({ quality, progressive: true }).toFile(processedPath);
    return processedPath;
  } catch (error) { console.error('preprocess error:', error); return imagePath; }
}

async function fetchWithTimeout(url, options = {}, timeout = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(id); }
}

async function callAI(imageBase64, model = 'mock') {
  if (model === 'mock') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      success: true,
      shot: {
        ring: 9,
        position: { x: 48, y: 45 },
        trajectory: {
          red: { direction: 'bottom-left to center', stability: 'stable', hasStraightSegment: false },
          blue: { length: 'short', hasSuddenShift: false, quality: 'good' },
          green: { stable: true, hasJump: false }
        }
      },
      summary: {
        stabilityRating: 'B',
        triggerControlRating: 'A',
        followThroughRating: 'B',
        mainIssue: 'red trajectory direction slightly left',
        suggestion: 'keep natural aim direction'
      }
    };
  }

  const apiKey = process.env.DOUBAO_API_KEY;
  const endpoint = process.env.DOUBAO_ENDPOINT;
  if (!apiKey || !endpoint) throw new Error('DOUBAO API config missing');

  const response = await fetchWithTimeout('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: endpoint,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: [{ type: 'text', text: 'Analyze this shooting trajectory image' }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }] }
      ],
      max_tokens: 1024
    })
  });

  if (!response.ok) { const err = await response.text(); throw new Error(`Doubao API error: ${err}`); }

  const data = await response.json();
  let content = data.choices[0].message.content.trim();
  console.log('AI raw response:', content);
  
  let jsonStr = content;
  
  const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) {
    jsonStr = m[1].trim();
  }
  
  const firstBrace = jsonStr.indexOf('{');
  if (firstBrace === -1) {
    return { success: false, error: 'No JSON found', rawContent: content };
  }
  jsonStr = jsonStr.substring(firstBrace);

  let parsed = null;
  let str = jsonStr;
  while (str.length > 0) {
    try {
      parsed = JSON.parse(str);
      break;
    } catch {
      const lastBrace = str.lastIndexOf('}');
      if (lastBrace === -1) break;
      str = str.substring(0, lastBrace);
    }
  }

  if (parsed) {
    console.log('Parsed successfully:', JSON.stringify(parsed).substring(0, 200));
    return parsed;
  }
  
  console.error('JSON parse failed completely');
  return { success: false, error: 'Invalid AI response format', rawContent: content };
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.post('/api/screenshot', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No file uploaded' });
    const file = req.files[0];
    const processedPath = await preprocessImage(file.path);
    const records = readRecords();
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      filename: path.basename(processedPath),
      originalFilename: file.originalname,
      uploadedAt: new Date().toISOString(),
      url: `/screenshots/${path.basename(processedPath)}`
    };
    records.unshift(record);
    saveRecords(records);
    res.json({ success: true, record });
  } catch (error) { console.error('Upload failed:', error); res.status(500).json({ error: 'Upload failed: ' + error.message }); }
});

app.post('/upload', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No file uploaded' });
    const file = req.files[0];
    const processedPath = await preprocessImage(file.path);
    const records = readRecords();
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      filename: path.basename(processedPath),
      originalFilename: file.originalname,
      uploadedAt: new Date().toISOString(),
      url: `/screenshots/${path.basename(processedPath)}`
    };
    records.unshift(record);
    saveRecords(records);
    res.json({ success: true, record });
  } catch (error) { console.error('Upload failed:', error); res.status(500).json({ error: 'Upload failed: ' + error.message }); }
});

app.get('/api/records', (req, res) => {
  try {
    const records = readRecords();
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const start = (page - 1) * pageSize;
    res.json({ success: true, records: records.slice(start, start + pageSize), total: records.length, page, pageSize });
  } catch (error) { console.error('Get records failed:', error); res.status(500).json({ error: 'Get records failed' }); }
});

app.delete('/api/records/:id', (req, res) => {
  try {
    const records = readRecords();
    const index = records.findIndex(r => r.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Record not found' });
    const rec = records[index];
    [path.join(screenshotsDir, rec.filename), path.join(screenshotsDir, rec.originalFilename)].forEach(p => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {} });
    records.splice(index, 1);
    saveRecords(records);
    res.json({ success: true });
  } catch (error) { console.error('Delete failed:', error); res.status(500).json({ error: 'Delete failed' }); }
});

app.post('/api/analyze/trajectory', async (req, res) => {
  try {
    const { recordId } = req.body;
    if (!recordId) return res.status(400).json({ success: false, error: 'recordId required' });
    const records = readRecords();
    const rec = records.find(r => r.id === recordId);
    if (!rec) return res.status(404).json({ success: false, error: 'Record not found' });
    const origPath = path.join(screenshotsDir, rec.originalFilename);
    const procPath = path.join(screenshotsDir, rec.filename);
    const imgPath = fs.existsSync(procPath) ? procPath : origPath;
    const trajPath = await preprocessImage(imgPath);
    const b64 = fs.readFileSync(trajPath, { encoding: 'base64' });
    const result = await callAI(b64, 'doubao');
    console.log('=== API Response to frontend ===');
    console.log('success: true, analysis:', JSON.stringify(result).substring(0, 300));
    console.log('================================');
    res.json({ success: true, analysis: result });
  } catch (error) { console.error('Analyze failed:', error); res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/analyze/trajectory/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
    const trajPath = await preprocessImage(req.file.path);
    const b64 = fs.readFileSync(trajPath, { encoding: 'base64' });
    const result = await callAI(b64, 'doubao');
    res.json({ success: true, analysis: result });
  } catch (error) { console.error('Analyze upload failed:', error); res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/analyze/mock', async (req, res) => {
  try { await new Promise(resolve => setTimeout(resolve, 1500)); res.json({ success: true, analysis: await callAI('', 'mock') }); }
  catch (error) { console.error('Mock failed:', error); res.status(500).json({ error: 'Mock failed' }); }
});

app.use('/screenshots', express.static(screenshotsDir));

app.listen(PORT, '0.0.0.0', () => {
  console.log('\nServer started!');
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`LAN: http://192.168.31.175:${PORT}`);
  console.log(`Screenshots dir: ${screenshotsDir}\n`);
});