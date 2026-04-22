# Android 屏幕截图上传工具

## 项目结构

```
android-app/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/screencapture/
│   │       │   ├── helper/
│   │       │   │   └── ScreenCaptureUploadHelper.java  # 核心封装类（供第三方集成使用）
│   │       │   └── testapp/
│   │       │       └── TestActivity.java              # 测试Activity
│   │       ├── res/
│   │       │   ├── layout/
│   │       │   │   └── activity_test.xml
│   │       │   └── values/
│   │       │       └── strings.xml
│   │       └── AndroidManifest.xml
│   ├── build.gradle
│   └── proguard-rules.pro
├── build.gradle
├── settings.gradle
├── gradle.properties
└── 集成说明.md
```

## 核心功能

1. **截图功能**：基于 MediaProjection API 实现
2. **无本地存储**：截图仅在内存中处理，不保存文件
3. **一键上传**：转成 JPEG 字节流直接上传服务器
4. **低侵入性**：单一入口，易集成到第三方 App

## 使用本项目测试

1. 用 Android Studio 打开 `android-app/` 目录
2. 连接 Android 设备或启动模拟器
3. 点击 "测试截图上传" 按钮测试功能

## 第三方集成

详见 [集成说明.md](集成说明.md)
