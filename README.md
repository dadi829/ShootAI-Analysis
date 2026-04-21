# 🎯 气步枪打靶数据分析系统

这是网页版，基于AI的智能射击数据分析系统，支持多种AI模型，提供完整的历史记录管理功能。

## ✨ 功能特点

- 📷 **智能图片分析** - 上传射击训练截图，AI自动提取数据
- 🤖 **多模型支持** - 支持模拟数据、OpenAI、通义千问、豆包等模型
- 📊 **数据可视化** - 统计图表、趋势分析、数据表格
- 📚 **历史记录** - 完整的历史数据管理、检索、对比
- 🔐 **安全机制** - API密钥安全存储在后端，不暴露前端
- 📤 **数据导出** - CSV格式导出历史数据

## 📁 项目结构

```
ai.analysis/
├── frontend/           # 前端应用（React + Vite）
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── types.ts
│   └── package.json
├── backend/            # 后端API服务器（Express）
│   ├── server.js
│   ├── package.json
│   └── .env
└── start.bat           # 一键启动脚本
```

## 🚀 快速开始

### 方式一：一键启动（Windows）

双击 `start.bat` 文件即可同时启动前后端服务！

### 方式二：手动启动

#### 1. 启动后端服务

```bash
cd backend
npm install
npm start
```

#### 2. 启动前端服务（新终端）

```bash
cd ..
npm install
npm run dev
```

## 🔧 配置说明

### 配置API密钥

编辑 `backend/.env` 文件，添加你的API密钥：

```env
# OpenAI API
OPENAI_API_KEY=sk-your-key

# 通义千问 API
TONGYI_API_KEY=sk-your-key

# 豆包 API
DOUBAO_API_KEY=sk-your-key
```

### 环境变量说明

- `PORT`: 后端服务端口（默认3001）
- `OPENAI_API_KEY`: OpenAI API密钥
- `TONGYI_API_KEY`: 通义千问API密钥
- `DOUBAO_API_KEY`: 豆包API密钥

## 🌐 访问地址

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:3001
- **健康检查**: http://localhost:3001/api/health

## 📊 使用说明

### 1. 智能分析页面

1. 在左侧设置面板选择AI模型
2. 上传射击训练截图（支持拖拽）
3. 点击"开始AI分析"
4. 查看分析结果和图表

### 2. 历史记录页面

1. 查看所有历史分析记录
2. 使用筛选功能（时间、类型、分数、标签）
3. 选择多个记录进行对比分析
4. 导出数据为CSV格式

## 🔐 安全设计

### API密钥保护

1. 密钥只存储在后端 `.env` 文件
2. 前端只发送分析请求，不接触密钥
3. 后端使用环境变量安全管理密钥
4. 支持多种模型的密钥独立配置

## 📝 更新日志

### v2.0 - 后端API系统

- ✅ 新增后端API服务器（Express）
- ✅ 实现API密钥安全存储（环境变量）
- ✅ 多模型支持（模拟数据、OpenAI、通义千问、豆包）
- ✅ 模型选择界面
- ✅ 实时进度显示
- ✅ 完善的错误处理

### v1.0 - 基础功能

- ✅ 图片上传和AI分析
- ✅ 数据可视化（图表、表格）
- ✅ 历史记录管理
- ✅ 数据对比和导出

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Ant Design
- ECharts
- Day.js

### 后端
- Node.js + Express
- CORS
- Multer
- Dotenv

## 🐛 问题排查

### 后端服务无法启动

1. 检查端口3001是否被占用
2. 确认后端依赖已安装 (`cd backend && npm install`)
3. 检查Node.js版本（建议v16+）

### API密钥不生效

1. 重启后端服务
2. 检查 `.env` 文件格式
3. 刷新前端页面重新获取模型列表

### 前端无法连接后端

1. 确认后端服务已启动
2. 检查后端地址（http://localhost:3001）
3. 点击前端设置面板的"刷新"按钮

## 📄 License

MIT License

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request！
