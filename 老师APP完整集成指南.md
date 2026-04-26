# 老师APP完整集成指南

## 一、文件清单

老师需要以下文件：

| 文件名 | 说明 | 是否必需 |
|--------|------|----------|
| `TargetImageUploadHelper.java` | 核心上传分析类 | ✅ 必需 |
| `network_security_config.xml` | 网络安全配置（Android 9+） | ⚠️ 需要时复制 |

---

## 二、第一步：添加依赖

### 2.1 在 `app/build.gradle` 中添加依赖

在 `dependencies` 块中添加：

```gradle
dependencies {
    // ... 老师已有的其他依赖
    
    // 添加这个依赖（OkHttp，用于网络请求）
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    
    // 如果老师使用的是较旧的Android版本，可能还需要
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.10.0'
}
```

### 2.2 同步 Gradle

在 Android Studio 中点击 **Sync Now** 同步项目。

---

## 三、第二步：配置权限和网络安全

### 3.1 在 `AndroidManifest.xml` 中添加权限

在 `<manifest>` 标签内，`</application>` 之前添加：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<!-- 如果需要读取本地文件，添加以下权限（可选） -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
```

### 3.2 配置网络安全（重要！Android 9+）

**问题：** Android 9+ 默认禁止使用 HTTP（明文），只允许 HTTPS。

**解决方案1（测试阶段）：允许特定HTTP地址**

1. 复制我们的 `network_security_config.xml` 到老师项目的 `res/xml/` 文件夹。

2. 在 `AndroidManifest.xml` 的 `<application>` 标签中添加：

```xml
<application
    android:icon="..."
    android:label="..."
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

**解决方案2（生产阶段，推荐）：**
- 使用 HTTPS 协议
- 配置 SSL 证书
- 后端部署时启用 HTTPS

---

## 四、第三步：复制核心类文件

### 4.1 复制文件

将 `TargetImageUploadHelper.java` 复制到老师项目的合适位置，例如：
`com.teacher.app.helper/TargetImageUploadHelper.java`

### 4.2 修改包名

打开复制的 `TargetImageUploadHelper.java`，修改第一行的包名：

```java
// 修改成老师项目的包名
package com.teacher.app.helper;
```

---

## 五、第四步：集成代码示例

### 5.1 基础使用（最简单的方式）

在老师需要使用的 Activity 或 Fragment 中：

```java
import com.teacher.app.helper.TargetImageUploadHelper;

public class MainActivity extends AppCompatActivity {

    // 声明上传助手
    private TargetImageUploadHelper uploadHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 初始化
        uploadHelper = new TargetImageUploadHelper(this);

        // 配置服务器地址（测试时用局域网IP，部署后用公网地址）
        uploadHelper.setServerUrl("http://你的服务器IP:3002");

        // 绑定按钮
        Button analyzeButton = findViewById(R.id.analyze_button);
        analyzeButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                startAnalysis();
            }
        });
    }

    private void startAnalysis() {
        // 1. 老师的APP保存图片到指定路径（这部分老师已有）
        String targetImagePath = "/sdcard/shoot.test/target.jpg";

        // 2. 配置图片路径
        uploadHelper.setTargetImagePath(targetImagePath);

        // 3. 开始上传和分析（一次调用，完成全部！）
        uploadHelper.uploadAndAnalyze(new TargetImageUploadHelper.UploadCallback() {
            @Override
            public void onSuccess(JSONObject analysisResult) {
                // 分析成功！在老师的UI上显示结果
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        showAnalysisResult(analysisResult);
                    }
                });
            }

            @Override
            public void onFailed(final String errorMsg) {
                // 分析失败！显示错误
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        showError(errorMsg);
                    }
                });
            }
        });
    }

    // 在老师的UI上显示分析结果
    private void showAnalysisResult(JSONObject analysisResult) {
        try {
            // 1. 解析弹孔信息
            JSONObject shot = analysisResult.getJSONObject("shot");
            int ring = shot.getInt("ring");
            JSONObject pos = shot.getJSONObject("position");
            double x = pos.getDouble("x");
            double y = pos.getDouble("y");

            // 2. 解析技术评价
            JSONObject summary = analysisResult.getJSONObject("summary");
            String stability = summary.getString("stabilityRating");
            String triggerControl = summary.getString("triggerControlRating");
            String followThrough = summary.getString("followThroughRating");
            String mainIssue = summary.getString("mainIssue");
            String suggestion = summary.getString("suggestion");

            // 3. 在老师的UI上显示（示例，请根据老师的实际布局修改）
            TextView ringText = findViewById(R.id.ring_number_text);
            ringText.setText("环数: " + ring);

            TextView positionText = findViewById(R.id.position_text);
            positionText.setText("位置: (" + x + ", " + y + ")");

            TextView stabilityText = findViewById(R.id.stability_text);
            stabilityText.setText("稳定性: " + stability);

            TextView triggerText = findViewById(R.id.trigger_text);
            triggerText.setText("扳机控制: " + triggerControl);

            TextView followText = findViewById(R.id.follow_text);
            followText.setText("跟进质量: " + followThrough);

            TextView issueText = findViewById(R.id.issue_text);
            issueText.setText("主要问题: " + mainIssue);

            TextView suggestionText = findViewById(R.id.suggestion_text);
            suggestionText.setText("改进建议: " + suggestion);

        } catch (Exception e) {
            e.printStackTrace();
            showError("解析结果失败: " + e.getMessage());
        }
    }

    private void showError(String errorMsg) {
        Toast.makeText(MainActivity.this, "错误: " + errorMsg, Toast.LENGTH_LONG).show();
    }
}
```

### 5.2 分步调用（更灵活）

如果老师需要更细的控制：

```java
// 步骤1：上传图片
String recordId = uploadHelper.uploadImage(new File(targetImagePath));

// 步骤2：调用AI分析
JSONObject analysisResult = uploadHelper.analyzeImage(recordId);

// 步骤3：处理结果
// ...
```

---

## 六、配置说明

### 6.1 服务器地址配置

**测试阶段（局域网）：**
```java
uploadHelper.setServerUrl("http://192.168.31.175:3002");
```

**生产阶段（公网）：**
```java
uploadHelper.setServerUrl("https://your-domain.com");
```

### 6.2 图片路径配置

老师的APP保存图片后，调用：
```java
uploadHelper.setTargetImagePath("/path/to/saved/image.jpg");
```

---

## 七、完整测试流程

### 7.1 测试前检查清单

- ✅ 后端已部署并运行
- ✅ 手机和服务器在同一网络（测试阶段）
- ✅ 权限已正确添加
- ✅ `TargetImageUploadHelper.java` 已复制并修改包名
- ✅ OkHttp 依赖已添加
- ✅ 网络安全配置已设置（如果需要HTTP）

### 7.2 测试步骤

1. **启动老师APP**
2. **确认服务器地址正确**
3. **保存一张测试图片到指定路径**
4. **点击"分析"按钮**
5. **等待并查看结果**
6. **如果失败，查看Logcat日志**

---

## 八、常见问题与解决方案

### 问题1：编译错误 "cannot resolve symbol OkHttp"

**原因**：没有添加 OkHttp 依赖。

**解决**：检查 `app/build.gradle` 的 `dependencies` 块，确保添加了：
```gradle
implementation 'com.squareup.okhttp3:okhttp:4.12.0'
```
然后点击 **Sync Now**。

---

### 问题2：APP安装后崩溃或无法访问网络

**原因1**：没有添加 `INTERNET` 权限。

**解决**：检查 `AndroidManifest.xml`，确保有：
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

**原因2**：使用 HTTP 被禁止（Android 9+）。

**解决**：添加网络安全配置（见第三步），或使用 HTTPS。

---

### 问题3：上传后提示 "文件不存在"

**原因**：没有读取存储的权限，或路径不正确。

**解决**：
1. 添加 `READ_EXTERNAL_STORAGE` 权限
2. 在 APP 设置中手动授予存储权限
3. 确认图片路径是否正确
4. 检查图片文件是否真的存在

---

### 问题4：AI分析返回失败

**原因**：
1. 后端没有运行
2. 服务器地址配置错误
3. 豆包API Key未配置
4. 图片格式不支持

**解决**：
1. 确认后端服务正常运行
2. 检查服务器地址是否正确
3. 检查后端的 `.env` 文件中的API Key
4. 使用 .jpg/.png/.jpeg/.webp 格式

---

### 问题5：如何查看日志进行调试？

在 Android Studio 的底部点击 **Logcat**，筛选 `TargetImageUploadHelper`。

---

## 九、文件结构参考

老师项目最终的结构应该类似于：

```
app/src/main/
├── AndroidManifest.xml
├── java/com/teacher/app/
│   ├── MainActivity.java
│   ├── helper/
│   │   └── TargetImageUploadHelper.java  <-- 我们的文件
│   └── ...
└── res/
    ├── layout/
    │   └── activity_main.xml
    └── xml/
        └── network_security_config.xml  <-- 网络安全配置
```

---

## 十、技术支持与联系

遇到问题时，请先检查：
1. Logcat 日志（筛选 `TargetImageUploadHelper`）
2. 后端服务是否正常运行
3. 网络连接和权限配置
4. 服务器地址和图片路径是否正确
