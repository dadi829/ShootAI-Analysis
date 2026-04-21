import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;
const TIMEOUT = 50000; // 50秒超时

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

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

async function callOpenAI(imageBase64) {
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

async function callTongyi(imageBase64) {
  const apiKey = process.env.TONGYI_API_KEY;
  if (!apiKey) throw new Error('通义千问API密钥未配置');

  const response = await fetchWithTimeout('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      input: {
        messages: [
          {
            role: 'system',
            content: [{ text: SYSTEM_PROMPT }]
          },
          {
            role: 'user',
            content: [
              { image: `data:image/jpeg;base64,${imageBase64}` },
              { text: '请分析这张射击训练截图' }
            ]
          }
        ]
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`通义千问API请求失败: ${error}`);
  }

  const data = await response.json();
  const content = data.output.choices[0].message.content[0].text;
  return content;
}

async function callDoubao(imageBase64) {
  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) throw new Error('豆包API密钥未配置');

  const response = await fetchWithTimeout('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'ep-20260421181425-qstst',
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
    throw new Error(`豆包API请求失败: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return content;
}

// SSE流式响应函数
async function streamMockAnalysis(res) {
  // 分块发送模拟数据
  const chunks = [];
  let temp = '';
  mockAnalysisResult.split('').forEach(char => {
    temp += char;
    if (temp.length >= 20 || ['.', '!', '。', '！', '\n'].includes(char)) {
      if (temp.trim()) chunks.push(temp);
      temp = '';
    }
  });
  if (temp.trim()) chunks.push(temp);
  
  let currentContent = '';
  let currentProgress = 10;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    currentContent += chunk;
    res.write(`data: ${JSON.stringify({ type: 'content', data: currentContent })}\n\n`);
    currentProgress = Math.min(currentProgress + Math.floor(90 / chunks.length), 90);
    res.write(`data: ${JSON.stringify({ type: 'progress', data: currentProgress })}\n\n`);
    
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  
  res.write(`data: ${JSON.stringify({ type: 'progress', data: 100 })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done', data: mockAnalysisResult })}\n\n`);
  res.end();
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API服务器运行正常' });
});

app.get('/api/models', (req, res) => {
  res.json({
    models: [
      { id: 'mock', name: '模拟数据', available: true },
      { id: 'openai', name: 'OpenAI (GPT-4V)', available: !!process.env.OPENAI_API_KEY },
      { id: 'tongyi', name: '通义千问 (Qwen-VL)', available: !!process.env.TONGYI_API_KEY },
      { id: 'doubao', name: '豆包 (Doubao)', available: !!process.env.DOUBAO_API_KEY }
    ]
  });
});

// SSE流式分析端点
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    const { model = 'mock', stream = 'false' } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' });
    }

    const imageBase64 = req.file.buffer.toString('base64');

    const startTime = Date.now();
    console.log(`开始分析，使用模型: ${model}, 流式: ${stream}`);

    if (stream === 'true') {
      // SSE流式响应
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      if (model === 'mock') {
        await streamMockAnalysis(res);
        return;
      }

      // 对于真实模型，先完成分析再发送
      let result;
      switch (model) {
        case 'openai':
          result = await callOpenAI(imageBase64);
          break;
        case 'tongyi':
          result = await callTongyi(imageBase64);
          break;
        case 'doubao':
          result = await callDoubao(imageBase64);
          break;
        default:
          res.write(`data: ${JSON.stringify({ type: 'error', data: '不支持的模型' })}\n\n`);
          res.end();
          return;
      }

      // 流式发送结果
      const chunks = [];
      let temp = '';
      result.split('').forEach(char => {
        temp += char;
        if (temp.length >= 20 || ['.', '!', '。', '！', '\n'].includes(char)) {
          if (temp.trim()) chunks.push(temp);
          temp = '';
        }
      });
      if (temp.trim()) chunks.push(temp);
      
      let currentContent = '';
      let currentProgress = 10;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        currentContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'content', data: currentContent })}\n\n`);
        currentProgress = Math.min(currentProgress + Math.floor(90 / chunks.length), 90);
        res.write(`data: ${JSON.stringify({ type: 'progress', data: currentProgress })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      res.write(`data: ${JSON.stringify({ type: 'progress', data: 100 })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', data: result })}\n\n`);
      res.end();
      
      const duration = Date.now() - startTime;
      console.log(`流式分析完成，耗时: ${duration}ms`);
      return;
    }

    // 传统响应
    let result;
    switch (model) {
      case 'mock':
        await new Promise(resolve => setTimeout(resolve, 2000));
        result = mockAnalysisResult;
        break;
      case 'openai':
        result = await callOpenAI(imageBase64);
        break;
      case 'tongyi':
        result = await callTongyi(imageBase64);
        break;
      case 'doubao':
        result = await callDoubao(imageBase64);
        break;
      default:
        return res.status(400).json({ error: '不支持的模型' });
    }

    const duration = Date.now() - startTime;
    console.log(`分析完成，耗时: ${duration}ms`);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('分析失败:', error);
    
    if (req.body.stream === 'true') {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/event-stream' });
      }
      const errorMsg = error.name === 'AbortError' ? '请求超时，请稍后重试或使用模拟数据' : (error.message || '分析失败');
      res.write(`data: ${JSON.stringify({ type: 'error', data: errorMsg })}\n\n`);
      res.end();
    } else {
      if (error.name === 'AbortError') {
        res.status(504).json({ error: '请求超时，请稍后重试或使用模拟数据' });
      } else {
        res.status(500).json({ error: error.message || '分析失败，请稍后重试' });
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 API服务器已启动！`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`⏱️  请求超时: ${TIMEOUT/1000}秒`);
  console.log(`\n📊 可用模型:`);
  console.log(`   • 模拟数据: ${process.env.MOCK_ENABLED !== 'false' ? '✅ 可用' : '❌ 禁用'}`);
  console.log(`   • OpenAI: ${process.env.OPENAI_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`   • 通义千问: ${process.env.TONGYI_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`   • 豆包: ${process.env.DOUBAO_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`\n`);
});