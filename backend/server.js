import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;
const TIMEOUT = 50000; // 50秒超时

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 添加请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.headers['user-agent']}`);
  next();
});

const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, screenshotsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `screenshot_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PNG、JPG、JPEG、WEBP 格式的图片'));
    }
  }
});

app.use('/screenshots', express.static(screenshotsDir));

// 图片预处理函数
async function preprocessImage(imagePath) {
  try {
    const processedPath = imagePath.replace(/\.(png|jpg|jpeg|webp)$/i, '_processed.jpg');
    
    await sharp(imagePath)
      .resize(1920, 1080, { fit: 'inside' })
      .jpeg({ quality: 85, progressive: true })
      .toFile(processedPath);
    
    return processedPath;
  } catch (error) {
    console.error('图片预处理失败:', error);
    return imagePath; // 失败时返回原图片
  }
}

// 读取图片为Base64
function imageToBase64(imagePath) {
  return fs.readFileSync(imagePath, { encoding: 'base64' });
}

const SYSTEM_PROMPT = `【绝对角色】你是10米气步枪专业射击轨迹分析教练，只处理用户上传的「10米射击训练系统截图」，禁止回答任何其他问题。

【输入截图固定格式说明（你必须严格按此理解）】
1. 左侧靶图区域：
   - 红色线条：开枪前（预瞄阶段）的枪口实时移动轨迹
   - 蓝色线条：开枪后（击发瞬间及后续）的枪口实时移动轨迹
   - 靶心为坐标原点(0,0)，越靠近靶心分数越高
2. 右侧表格区域：
   - 序号：射击发数
   - 方向：弹着点相对于靶心的偏移方向（↑上 ↓下 ←左 →右 ↗右上 ↖左上 ↘右下 ↙左下）
   - 分数：该发子弹的得分（10环最高）
   - 时间：该发子弹的击发时间（秒）
   - 间隔：与上一发子弹的时间间隔（秒）

【你的分析任务（必须全部完成，缺一不可）】
1. 轨迹特征分析：
   - 预瞄阶段（红线）：稳定性如何？是否有明显的抖动、大范围偏移？
   - 击发瞬间（红蓝线交接处）：是否有猛扣扳机导致的枪口跳动？跳动方向和幅度？
   - 击发后（蓝线）：枪口是否有过度上扬/下沉？
2. 报靶数据统计：
   - 本次射击总发数、总分、平均环数
   - 弹着点主要偏移方向（统计出现次数最多的方向）
   - 射击节奏分析（平均射击间隔，节奏是否稳定）
3. 问题原因诊断（结合轨迹和数据，只列最常见的3个）
4. 针对性改进建议（对应原因，每条建议要具体可操作）

【输出格式（必须严格遵守，禁止添加任何额外内容）】
---
### 一、轨迹特征分析
1. 预瞄阶段：xxx
2. 击发瞬间：xxx
3. 击发后：xxx

### 二、报靶数据统计
- 总发数：X发 | 总分：X环 | 平均环数：X.X环
- 主要偏移方向：xxx
- 射击节奏：平均间隔X.X秒，节奏[稳定/偏快/偏慢/不稳定]

### 三、常见问题原因
1. xxx
2. xxx
3. xxx

### 四、改进建议
1. xxx
2. xxx
3. xxx
---

【绝对禁止项】
- 禁止回答与射击训练截图分析无关的任何问题
- 禁止解释自己的身份、功能
- 禁止输出格式外的任何文字（包括开场白、结束语）
- 如果用户上传的不是指定格式的射击训练截图，直接回复：「请上传10米射击训练系统的完整截图」`;

const mockAnalysisResult = `---
### 一、轨迹特征分析
1. 预瞄阶段：红线显示枪口在靶心周围小幅度晃动，整体稳定性尚可，但有细微的上下抖动
2. 击发瞬间：红蓝线交接处有轻微的左下偏移，说明击发时手腕有轻微下压动作
3. 击发后：蓝线有轻微上扬，幅度在可接受范围内

### 二、报靶数据统计
- 总发数：10发 | 总分：141.2环 | 平均环数：7.6环
- 主要偏移方向：左下方（↙）出现6次
- 射击节奏：平均间隔3.8秒，节奏不稳定（波动范围2.7-7.8秒）

### 三、常见问题原因
1. 击发瞬间手腕无意识下压，导致弹着点偏左下
2. 预瞄阶段注意力集中不够，枪口出现无规律抖动
3. 射击节奏把控不好，心理状态波动影响了击发时机

### 四、改进建议
1. 增加空枪预习练习，特别注意击发瞬间手腕的稳定性
2. 进行专注度训练，使用节拍器辅助稳定预瞄节奏
3. 加强心理训练，保持每一发之间的状态一致性
---`;

// 带超时的fetch请求包装器
async function fetchWithTimeout(url, options, timeout = TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function callAI(imageBase64, model = 'mock') {
  if (model === 'mock') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return mockAnalysisResult;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API密钥未配置');

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请分析这张射击训练截图' },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }
      ],
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API请求失败: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return content;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传截图' });
    }

    // 图片预处理
    const processedPath = await preprocessImage(req.file.path);
    
    res.json({
      success: true,
      filename: path.basename(processedPath)
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: error.message || '上传失败' });
  }
});

app.post('/api/screenshot', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传截图' });
    }

    // 图片预处理
    const processedPath = await preprocessImage(req.file.path);
    
    const screenshotUrl = `http://192.168.31.175:${PORT}/screenshots/${path.basename(processedPath)}`;
    res.json({
      success: true,
      url: screenshotUrl,
      filename: path.basename(processedPath),
      size: fs.statSync(processedPath).size
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: error.message || '上传失败' });
  }
});

app.post('/api/analyze', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传截图' });
    }

    const { model = 'mock' } = req.body;

    // 图片预处理
    const processedPath = await preprocessImage(req.file.path);
    const imageBase64 = imageToBase64(processedPath);

    // 异步分析
    const analysisResult = await callAI(imageBase64, model);

    const screenshotUrl = `http://192.168.31.175:${PORT}/screenshots/${path.basename(processedPath)}`;
    
    res.json({
      success: true,
      url: screenshotUrl,
      analysis: analysisResult,
      filename: path.basename(processedPath)
    });
  } catch (error) {
    console.error('分析失败:', error);
    res.status(500).json({ error: error.message || '分析失败' });
  }
});

// 获取所有截图列表
app.get('/api/screenshots', (req, res) => {
  try {
    const files = fs.readdirSync(screenshotsDir)
      .filter(file => {
        // 只返回图片文件，忽略其他
        return file.match(/\.(jpg|jpeg|png|webp)$/i) && !file.includes('_processed');
      })
      .map(file => ({
        filename: file,
        url: `http://192.168.31.175:${PORT}/screenshots/${file}`,
        uploadedAt: fs.statSync(path.join(screenshotsDir, file)).mtime
      }))
      // 按时间倒序，最新的在最前
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
      success: true,
      screenshots: files
    });
  } catch (error) {
    console.error('获取截图列表失败:', error);
    res.status(500).json({ error: '获取截图列表失败' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 服务已启动！`);
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`📱 局域网访问: http://192.168.31.175:${PORT}`);
  console.log(`📁 截图保存目录: ${screenshotsDir}`);
  console.log(`
`);
});