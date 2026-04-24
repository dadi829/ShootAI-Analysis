# 🎯 AI轨迹分析功能需求文档

## 一、功能概述

在网站「AI分析入口」页面中，用户可以选择一张已上传的轨迹图片，调用豆包视觉模型进行射击轨迹分析，返回结构化的分析结果。

---

## 二、现有基础

### 已有能力
| 能力 | 状态 | 位置 |
|------|------|------|
| 图片上传与存储 | ✅ 已有 | 后端 `/upload`、`/api/screenshot` |
| 记录列表查询 | ✅ 已有 | 后端 `/api/records`、前端 LiveUploadPage |
| 图片预处理（sharp） | ✅ 已有 | 后端 `preprocessImage()` |
| AI分析接口框架 | ✅ 已有 | 后端 `/api/analyze`、`callAI()` |
| 豆包API测试 | ✅ 已有 | `test-doubao.js`（API Key + Endpoint） |
| Mock分析 | ✅ 已有 | 前端 `handleMockTest()`、后端 `/api/analyze/mock` |

### 需要改造的部分
| 项目 | 现状 | 改造方向 |
|------|------|----------|
| 图片预处理 | 仅缩放到1920x1080 | 加入裁剪靶纸区域 + 降采样到800x600 |
| 提示词 | 旧版通用提示词（含右侧表格分析） | 替换为v3专业提示词（仅轨迹分析） |
| AI调用 | 调用OpenAI GPT-4V | 改为调用豆包 doubao-seed-1.6-vision |
| 前端AI页面 | 仅有Mock测试按钮 | 增加图片选择 + 真实分析功能 |
| 分析结果展示 | 纯文本展示 | 结构化展示（JSON解析 + 可视化） |

---

## 三、功能需求

### 3.1 图片选择

**需求描述**：用户在AI分析页面可以选择一张已上传的轨迹图片进行分析。

**交互流程**：
1. 进入AI分析页面，显示「选择图片」区域
2. 图片来源：从已上传记录列表中选择（调用 `/api/records`）
3. 选中图片后显示预览缩略图
4. 点击「开始AI分析」按钮触发分析

**界面要素**：
- 图片选择器：展示已上传图片的缩略图列表，支持点击选中
- 选中状态：高亮边框 + 勾选标记
- 预览区域：选中后右侧显示大图预览
- 也可支持本地上传一张新图片

### 3.2 图片预处理（后端）

**需求描述**：后端接收到图片后，进行裁剪和压缩优化，减少token消耗。

**处理流程**：
```
原图 → 裁剪靶纸区域 → 降采样压缩 → JPEG编码 → Base64 → 调用AI
```

**裁剪策略**（按优先级）：
1. **方案A - 固定比例裁剪**：裁剪左侧50%（快速实现，优先用于测试）
2. **方案B - 颜色检测裁剪**：检测浅黄色区域边界，精确裁剪（后续优化）

**压缩参数**：
| 参数 | 值 |
|------|-----|
| 最大宽度 | 800px |
| 最大高度 | 600px |
| JPEG质量 | 70% |
| 输出格式 | JPEG |

### 3.3 AI分析调用（后端）

**需求描述**：后端将预处理后的图片发送给豆包视觉模型，返回结构化分析结果。

**API配置**：
| 配置项 | 值 |
|--------|-----|
| 模型 | doubao-seed-1.6-vision（通过火山方舟Endpoint调用） |
| API地址 | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` |
| 认证方式 | Bearer Token（从 .env 读取 DOUBAO_API_KEY） |
| Endpoint | 从 .env 读取 DOUBAO_ENDPOINT |

**提示词**：使用 `AI分析优化方案.md` 中的 v3 专业提示词

**请求格式**：
```json
{
  "model": "<endpoint_id>",
  "messages": [
    {
      "role": "system",
      "content": "<v3提示词>"
    },
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "请分析这张射击轨迹图片" },
        {
          "type": "image_url",
          "image_url": { "url": "data:image/jpeg;base64,<base64>" }
        }
      ]
    }
  ],
  "max_tokens": 1024
}
```

**响应处理**：
1. 解析AI返回的JSON（可能包含在markdown代码块中，需提取）
2. 校验JSON结构完整性
3. 返回结构化结果给前端

**新增API端点**：
```
POST /api/analyze/trajectory
Body: { recordId: string } 或 FormData { file: File }
Response: { success: boolean, analysis: object, error?: string }
```

### 3.4 分析结果展示（前端）

**需求描述**：将AI返回的JSON结果以结构化、直观的方式展示。

**展示内容**：

| 区域 | 展示内容 |
|------|----------|
| 命中信息 | 环数、弹孔位置（可在靶纸上标注） |
| 轨迹分析 | 红色段稳定性、蓝色段扳机控制、绿色段跟进质量 |
| 综合评级 | 稳定性/扳机控制/跟进 三个维度的评级（优/良/中/差） |
| 主要问题 | 最主要问题的一句话描述 |
| 改进建议 | 一条具体可操作的建议 |

**界面布局**：
```
┌─────────────────────────────────────────────┐
│  📷 原图预览          │  🎯 分析结果         │
│  （左侧显示选中的     │                      │
│    轨迹图片）          │  命中环数: 9环       │
│                       │  ──────────────      │
│                       │  🔴 稳定性: 良好     │
│                       │  🔵 扳机控制: 一般   │
│                       │  🟢 跟进: 良好       │
│                       │  ──────────────      │
│                       │  ⚠️ 主要问题: xxx    │
│                       │  💡 建议: xxx        │
└─────────────────────────────────────────────┘
```

### 3.5 Mock测试保留

**需求描述**：保留现有的Mock测试功能，用于不消耗token的流程验证。

- Mock测试按钮继续保留
- Mock返回的数据格式与真实AI分析保持一致（JSON结构）
- 方便前端开发时不依赖后端和AI服务

---

## 四、后端改造清单

### 4.1 新增/修改文件

| 文件 | 改动 | 说明 |
|------|------|------|
| `server.js` | 修改 `preprocessImage()` | 增加裁剪靶纸区域 + 压缩参数调整 |
| `server.js` | 修改 `SYSTEM_PROMPT` | 替换为v3提示词 |
| `server.js` | 修改 `callAI()` | 改为调用豆包API |
| `server.js` | 新增 `/api/analyze/trajectory` | 接收recordId或图片文件，返回结构化结果 |
| `.env` | 新增配置 | `DOUBAO_API_KEY`、`DOUBAO_ENDPOINT` |

### 4.2 `preprocessImage()` 改造

```
原逻辑: resize(1920, 1080) + quality 85%
新逻辑: 
  1. 读取图片元信息
  2. 裁剪左侧50%（方案A，快速实现）
  3. resize(800, 600) + quality 70%
  4. 输出JPEG
```

### 4.3 `callAI()` 改造

```
原逻辑: 调用 OpenAI GPT-4V
新逻辑:
  1. 读取 .env 中的 DOUBAO_API_KEY 和 DOUBAO_ENDPOINT
  2. 调用火山方舟API
  3. 解析返回的JSON（处理markdown代码块包裹）
  4. 返回结构化对象
```

---

## 五、前端改造清单

### 5.1 AIAnalysisPage 改造

**新增状态**：
| 状态 | 类型 | 说明 |
|------|------|------|
| records | Record[] | 已上传图片列表 |
| selectedRecord | Record \| null | 选中的图片 |
| analysisData | object \| null | AI返回的结构化结果 |
| loading | boolean | 分析中状态 |

**新增交互**：
1. 页面加载时获取已上传记录列表
2. 图片选择区域（缩略图网格）
3. 选中图片后显示预览
4. 「开始AI分析」按钮（需选中图片才可用）
5. 分析结果结构化展示

### 5.2 Mock数据格式对齐

Mock返回数据与真实AI返回保持一致：
```json
{
  "success": true,
  "shot": {
    "ring": 9,
    "position": { "x": 48, "y": 45 },
    "trajectory": {
      "red": { "direction": "从下往上偏左入靶", "stability": "稳定", "hasStraightSegment": false },
      "blue": { "length": "短", "hasSuddenShift": false, "quality": "良好" },
      "green": { "stable": true, "hasJump": false }
    }
  },
  "summary": {
    "stabilityRating": "良",
    "triggerControlRating": "优",
    "followThroughRating": "良",
    "mainIssue": "红色段入靶方向偏左，建议调整据枪姿势",
    "suggestion": "注意举枪入靶时保持自然指向，避免过度修正"
  }
}
```

---

## 六、.env 配置

```env
# 豆包 API 配置
DOUBAO_API_KEY=ark-xxxxxxxx
DOUBAO_ENDPOINT=ep-xxxxxxxx
```

---

## 七、开发优先级

| 优先级 | 任务 | 预估复杂度 |
|--------|------|-----------|
| P0 | 后端：改造 callAI() 对接豆包API | 中 |
| P0 | 后端：改造 preprocessImage()（裁剪+压缩） | 低 |
| P0 | 后端：替换 SYSTEM_PROMPT 为v3 | 低 |
| P0 | 后端：新增 /api/analyze/trajectory 端点 | 中 |
| P0 | 前端：AIAnalysisPage 增加图片选择 | 中 |
| P0 | 前端：调用真实AI分析接口 | 低 |
| P1 | 前端：分析结果结构化展示 | 中 |
| P1 | Mock数据格式对齐 | 低 |
| P2 | 智能裁剪（颜色检测） | 高 |
| P2 | 分析结果可视化（靶纸标注弹孔） | 高 |

---

## 八、下一阶段预告

本阶段完成后，下一阶段将实现：
- 实时截图 → 自动触发AI分析
- Android端截图后自动上传并分析
- 分析结果实时推送到前端
- 多发轨迹汇总统计
