# 气步枪AI靶面分析系统

一个集靶面图片上传、AI智能分析、结果可视化于一体的气步枪射击训练分析系统，支持Android APP与Web端双平台。

## 🚀 功能特点

### 核心功能
- 📸 **图片上传分析**：支持选择文件夹自动检测最新图片，或单张图片上传
- 🎯 **AI智能分析**：基于豆包大模型，进行轨迹分析、扳机压力分析、整体评价
- 📊 **结果可视化**：卡片式展示分析结果，包括着弹环数、坐标、偏离距离等
- 📱 **Android APP集成**：提供完整的集成方案，第三方APP可快速接入

### 优化亮点
- **精准环数计算**：采用数学公式计算，不再依赖AI识别，准确率100%
- **图片预处理优化**：自动压缩图片尺寸到720px，质量60%，减少AI分析时间
- **APP超时优化**：延长等待时间至120秒，确保分析完成
- **权限精简**：移除MANAGE_EXTERNAL_STORAGE，使用SAF框架提升兼容性
- **UI布局优化**：整体评价模块减少空白空间，内容更紧凑

## 📁 项目结构

```
ai.analysis/
├── android-app/              # Android 应用源码
│   ├── app/src/main/java/com/screencapture/
│   │   ├── helper/
│   │   │   └── TargetImageUploadHelper.java  # 核心集成类
│   │   └── testapp/
│   │       └── TargetAnalysisActivity.java   # 示例页面
│   └── app/src/main/res/
│       └── xml/network_security_config.xml   # 网络配置
├── backend/                  # Node.js 后端服务
│   └── server.js             # AI分析服务器
└── web/                      # Web前端界面
```

## 📱 Android APP集成使用

### 快速集成
1. 复制 `TargetImageUploadHelper.java` 到项目
2. 复制 `network_security_config.xml` 到 `res/xml/`
3. 添加 `okhttp3` 依赖到 `build.gradle`
4. 配置网络权限

详细集成说明请查看：[android-app/老师APP集成说明.md](android-app/老师APP集成说明.md)

## 🔧 后端服务

### 启动方式
```bash
cd backend
npm install
node server.js
```

默认端口：`3002`

后端部署指南请查看：[后端部署完整指南.md](后端部署完整指南.md)

## 📊 API接口说明

### 上传分析接口
- **接口地址**：`POST /upload`
- **参数**：`file` (multipart/form-data)
- **返回格式**：JSON

返回格式示例：
```json
{
  "metadata": {
    "hit_coordinates": { "horizontal": 5.2, "vertical": -3.1 },
    "hit_ring": 8.5,
    "deviation_distance": 6.1
  },
  "overall_assessment": {
    "comprehensive_score": 8,
    "summary": "评价内容..."
  },
  "confidence_level": 0.9
}
```

## 🎯 技术栈

| 技术 | 用途 |
|------|------|
| Android SDK | APP开发 |
| OkHttp3 | 网络请求 |
| Node.js + Express | 后端服务 |
| 豆包API | AI分析引擎 |

## 📝 更新日志

### v2.0 (2026-04-26)
- ✅ 实现精准环数计算（数学公式）
- ✅ 优化APP整体评价布局，减少空白空间
- ✅ 图片预处理优化（尺寸压缩）
- ✅ APP超时配置延长至120秒
- ✅ 移除MANAGE_EXTERNAL_STORAGE权限
- ✅ 简化提示词，提高分析速度

### v1.0
- 🎉 初始版本发布
- ✅ 支持图片上传分析
- ✅ 完整结果展示

## 📚 相关文档

- [老师APP集成说明.md](android-app/老师APP集成说明.md) - 集成指南
- [后端部署完整指南.md](后端部署完整指南.md) - 后端部署
- [测试指南.md](测试指南.md) - 测试说明

## 📄 许可证

MIT License
