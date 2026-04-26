import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use((req, res, next) => { console.log(`${req.method} ${req.path}`); next(); });
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

const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 50 * 1024 * 1024 } 
});

const SYSTEM_PROMPT = `你是10米气步枪专业射击教练。分析图片，仅输出JSON，无其他文本。

颜色定义：
- 红色轨迹：击发前完整瞄准轨迹
- 蓝色轨迹：击发前0.5秒关键轨迹  
- 绿色轨迹：击发后复位轨迹
- 紫色点：弹孔位置
- 灰色点：忽略

扳机曲线：红色=扣扳机压力，绿色=击发后释放。

输出JSON：
{"metadata":{"sample_id":"SHOT-xxx","firearm_type":"10米气步枪","shot_distance":8.3,"hit_coordinates":{"horizontal":0,"vertical":0},"deviation_distance":10.0,"analysis_time":"2026-01-01T00:00:00Z"},"overall_assessment":{"comprehensive_score":7,"summary":"评价","strengths":["优势1","优势2"]},"trajectory_analysis":{"pre_fire_full":{"status":"stable","issues":[],"advantages":[]},"pre_fire_05":{"status":"stable","issues":[],"advantages":[]},"post_fire":{"status":"stable","issues":[],"advantages":[]},"deviation_analysis":{"direction":"left","root_cause":"原因"}},"trigger_pressure_analysis":{"curve_features":"特征","key_issues":["问题"],"control_score":7},"improvement_suggestions":[{"priority":"high","title":"标题","practice_method":"方法"}],"confidence_level":0.9}`;

async function preprocessImageFromBuffer(buffer, options = {}) {
  const { quality = 60, maxSize = 720 } = options;
  try {
    const startTime = Date.now();
    const image = sharp(buffer);
    const metadata = await image.metadata();
    let width = metadata.width;
    let height = metadata.height;
    if (width > maxSize || height > maxSize) {
      if (width > height) {
        height = Math.round(height * (maxSize / width));
        width = maxSize;
      } else {
        width = Math.round(width * (maxSize / height));
        height = maxSize;
      }
    }
    const processedBuffer = await image
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, progressive: true })
      .toBuffer();
    console.log(`预处理完成: ${width}x${height}, 质量${quality}%, 大小${(processedBuffer.length/1024).toFixed(1)}KB, 耗时${Date.now() - startTime}ms`);
    return processedBuffer;
  } catch (error) { 
    console.error('preprocess error:', error); 
    return buffer;
  }
}

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 5000
});

// 根据坐标计算环数（每环间距7.5mm，靶心为(0,0)）
function calculateRing(hit_x, hit_y) {
  try {
    if (hit_x === undefined || hit_y === undefined) return null;
    const distance = Math.sqrt(hit_x * hit_x + hit_y * hit_y);
    
    // 每环半径7.5mm
    // 10环区：0-7.5mm (10.9-10)
    // 9环区：7.5-15mm (9.9-9)
    // 以此类推...
    if (distance <= 3.75) return 10.9; // 10.9环（最中心）
    if (distance <= 7.5) return 10.5; // 10环
    if (distance <= 15) return 9.5; // 9环
    if (distance <= 22.5) return 8.5; // 8环
    if (distance <= 30) return 7.5; // 7环
    if (distance <= 37.5) return 6.5; // 6环
    if (distance <= 45) return 5.5; // 5环
    if (distance <= 52.5) return 4.5; // 4环
    if (distance <= 60) return 3.5; // 3环
    if (distance <= 67.5) return 2.5; // 2环
    if (distance <= 75) return 1.5; // 1环
    return 0.5; // 脱靶边缘
  } catch (e) {
    console.error("计算环数出错", e);
    return null;
  }
}

async function fetchWithRetry(url, options = {}, maxRetries = 0) {
  let lastError = null;
  const retryDelays = [1000, 3000, 5000];
  
  for (let i = 0; i <= maxRetries; i++) {
    const attemptStart = Date.now();
    try {
      console.log(`\n=== AI调用尝试 ${i + 1}/${maxRetries + 1} ===`);
      console.log(`请求URL: ${url}`);
      console.log(`请求时间: ${new Date().toISOString()}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`读超时触发(90秒)`);
        controller.abort();
      }, 90000);
      
      const response = await fetch(url, {
        ...options,
        agent,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`响应状态: ${response.status}`);
      console.log(`响应时间: ${Date.now() - attemptStart}ms`);
      
      if (!response.ok) {
        const errText = await response.text();
        console.error(`API错误响应: ${errText}`);
        throw new Error(`API error ${response.status}: ${errText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      const elapsed = Date.now() - attemptStart;
      
      if (error.name === 'AbortError') {
        console.error(`[读超时] 请求在${elapsed}ms后超时`);
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`[连接被拒绝] 无法连接到服务器`);
      } else if (error.code === 'ENOTFOUND') {
        console.error(`[DNS解析失败] 无法解析域名`);
      } else if (error.code === 'ETIMEDOUT') {
        console.error(`[连接超时] TCP连接超时`);
      } else {
        console.error(`[其他错误] ${error.name}: ${error.message}`);
      }
      
      if (i < maxRetries) {
        const delay = retryDelays[i];
        console.log(`等待${delay/1000}秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

async function callAI(imageBase64) {
  const apiKey = process.env.DOUBAO_API_KEY;
  const endpoint = process.env.DOUBAO_ENDPOINT;
  if (!apiKey) throw new Error('DOUBAO_API_KEY未配置');
  if (!endpoint) throw new Error('DOUBAO_ENDPOINT未配置');

  console.log(`\n=== AI调用配置 ===`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`图片Base64长度: ${imageBase64.length}`);

  const requestBody = {
    model: endpoint,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: [
        { type: 'text', text: '分析这张射击靶图' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      ]}
    ],
    temperature: 0.25,
    top_p: 0.6,
    max_tokens: 1024
  };

  const aiStartTime = Date.now();
  
  const response = await fetchWithRetry('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${apiKey}` 
    },
    body: JSON.stringify(requestBody)
  }, 2);

  const data = await response.json();
  console.log(`\n=== AI响应 ===`);
  console.log(`总耗时: ${Date.now() - aiStartTime}ms`);
  console.log(`响应ID: ${data.id}`);
  
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    console.error('AI响应无内容:', JSON.stringify(data));
    throw new Error('AI响应无内容');
  }
  
  console.log(`响应内容长度: ${content.length}字符`);
  
  let jsonStr = content;
  const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) jsonStr = m[1].trim();
  
  const firstBrace = jsonStr.indexOf('{');
  if (firstBrace === -1) {
    console.error('未找到JSON:', content.substring(0, 200));
    return { success: false, error: 'No JSON found' };
  }
  jsonStr = jsonStr.substring(firstBrace);

  let parsed = null;
  let str = jsonStr;
  while (str.length > 0) {
    try { parsed = JSON.parse(str); break; }
    catch {
      const lastBrace = str.lastIndexOf('}');
      if (lastBrace === -1) break;
      str = str.substring(0, lastBrace);
    }
  }

  if (parsed) {
    console.log('JSON解析成功');
    return parsed;
  }
  
  console.error('JSON解析失败');
  return { success: false, error: 'Invalid JSON' };
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.post('/upload', upload.any(), async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No file uploaded' });
    
    const file = req.files[0];
    console.log(`\n=== 收到上传 ===`);
    console.log(`文件名: ${file.originalname}`);
    console.log(`原始大小: ${(file.size / 1024).toFixed(1)}KB`);
    
    const processedBuffer = await preprocessImageFromBuffer(file.buffer);
    
    const filename = `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '')}.jpg`;
    const filepath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filepath, processedBuffer);
    
    const recordId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const record = {
      id: recordId,
      filename: filename,
      originalFilename: file.originalname,
      uploadedAt: new Date().toISOString(),
      url: `/screenshots/${filename}`
    };
    
    // 同步调用AI分析
    console.log(`\n=== 开始AI分析: ${recordId} ===`);
    const b64 = processedBuffer.toString('base64');
    let analysis = null;
    try {
      analysis = await callAI(b64);
      
      // 用坐标计算环数（每环7.5mm）
      if (analysis && analysis.metadata && analysis.metadata.hit_coordinates) {
        const hit_x = analysis.metadata.hit_coordinates.horizontal;
        const hit_y = analysis.metadata.hit_coordinates.vertical;
        const ring = calculateRing(hit_x, hit_y);
        if (ring !== null) {
          analysis.metadata.hit_ring = ring;
          console.log(`环数计算结果: ${ring} (坐标: ${hit_x}, ${hit_y})`);
        }
      }
      
      record.analysis = analysis;
      record.analyzedAt = new Date().toISOString();
      console.log(`\n=== AI分析完成 ===`);
    } catch (error) {
      console.error(`\n=== AI分析失败 ===`);
      console.error(`错误: ${error.message}`);
    }
    
    const records = readRecords();
    records.unshift(record);
    saveRecords(records);
    
    console.log(`上传总耗时: ${Date.now() - startTime}ms`);
    res.json({ success: true, record, analysis });
    
  } catch (error) { 
    console.error('Upload failed:', error); 
    res.status(500).json({ error: 'Upload failed: ' + error.message }); 
  }
});

app.post('/api/screenshot', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No file uploaded' });
    const file = req.files[0];
    const processedBuffer = await preprocessImageFromBuffer(file.buffer);
    const filename = `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '')}.jpg`;
    fs.writeFileSync(path.join(screenshotsDir, filename), processedBuffer);
    const records = readRecords();
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      filename: filename,
      originalFilename: file.originalname,
      uploadedAt: new Date().toISOString(),
      url: `/screenshots/${filename}`
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
    const filepath = path.join(screenshotsDir, rec.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
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
    const recIndex = records.findIndex(r => r.id === recordId);
    if (recIndex === -1) return res.status(404).json({ success: false, error: 'Record not found' });
    const rec = records[recIndex];
    const filepath = path.join(screenshotsDir, rec.filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ success: false, error: 'File not found' });
    const buffer = fs.readFileSync(filepath);
    const b64 = buffer.toString('base64');
    const result = await callAI(b64);
    
    // 用坐标计算环数（每环7.5mm）
    if (result && result.metadata && result.metadata.hit_coordinates) {
      const hit_x = result.metadata.hit_coordinates.horizontal;
      const hit_y = result.metadata.hit_coordinates.vertical;
      const ring = calculateRing(hit_x, hit_y);
      if (ring !== null) {
        result.metadata.hit_ring = ring;
        console.log(`环数计算结果: ${ring} (坐标: ${hit_x}, ${hit_y})`);
      }
    }
    
    records[recIndex].analysis = result;
    records[recIndex].analyzedAt = new Date().toISOString();
    saveRecords(records);
    res.json({ success: true, analysis: result });
  } catch (error) { console.error('Analyze failed:', error); res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/analyze/trajectory/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
    const processedBuffer = await preprocessImageFromBuffer(req.file.buffer);
    const b64 = processedBuffer.toString('base64');
    const result = await callAI(b64);
    
    // 用坐标计算环数（每环7.5mm）
    if (result && result.metadata && result.metadata.hit_coordinates) {
      const hit_x = result.metadata.hit_coordinates.horizontal;
      const hit_y = result.metadata.hit_coordinates.vertical;
      const ring = calculateRing(hit_x, hit_y);
      if (ring !== null) {
        result.metadata.hit_ring = ring;
        console.log(`环数计算结果: ${ring} (坐标: ${hit_x}, ${hit_y})`);
      }
    }
    
    res.json({ success: true, analysis: result });
  } catch (error) { console.error('Analyze upload failed:', error); res.status(500).json({ success: false, error: error.message }); }
});

app.use('/screenshots', express.static(screenshotsDir));

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('Server started!');
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`LAN: http://192.168.31.175:${PORT}`);
  console.log('========================================\n');
});
