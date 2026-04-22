# 截图上传工具

一个轻量级的 Android 屏幕截图 + 上传工具，支持第三方 App 集成。

## 功能特点

- 📱 **一键截图**：基于 MediaProjection API，支持 Android 5.0+
- 💾 **无本地文件**：截图直接在内存中转字节流，不上保存到设备
- 🔌 **可集成**：核心功能封装在单个 Helper 类中，第三方 App 轻松调用
- 🚀 **快速上传**：通过 HTTP POST 上传到服务器

## 项目结构

```
ai.analysis/
├── android-app/          # Android 应用源码
│   ├── app/src/main/java/com/screencapture/helper/
│   │   └── ScreenCaptureUploadHelper.java  # 核心集成类
│   └── app/src/main/java/com/screencapture/testapp/  # 测试应用
└── backend/              # Node.js 后端服务
    └── server.js
```

## Android 集成使用

查看 [android-app/集成说明.md](android-app/集成说明.md)。

## 后端服务

```bash
cd backend
npm install
node server.js
```

默认端口：3002

## 许可证

MIT
