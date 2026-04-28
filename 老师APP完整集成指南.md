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
    private void showAnalysisResult(JSONObject result) {
        try {
            // ⚠️ 第一步：检查后端返回的 success 字段
            if (!result.optBoolean("success", false)) {
                String errorMsg = result.optString("error", "AI分析失败");
                showError(errorMsg);
                return;
            }
            
            // ⚠️ 第二步：获取 analysis 数据
            JSONObject analysis = result.getJSONObject("analysis");
            if (analysis == null) {
                showError("分析结果为空");
                return;
            }
            
            // 1. 解析射击数据（从metadata中获取）
            JSONObject metadata = analysis.getJSONObject("metadata");
            String firearmType = metadata.getString("firearm_type");
            double shotDistance = metadata.getDouble("shot_distance");
            double ring = metadata.optDouble("hit_ring", 0);
            JSONObject hitCoords = metadata.getJSONObject("hit_coordinates");
            double x = hitCoords.getDouble("horizontal");
            double y = hitCoords.getDouble("vertical");
            double deviation = metadata.optDouble("deviation_distance", 0);
            double confidence = metadata.optDouble("confidence_level", 0.9) * 100;
            
            // 2. 解析整体评价
            JSONObject overall = analysis.getJSONObject("overall_assessment");
            int score = overall.getInt("comprehensive_score");
            String summary = overall.getString("summary");
            JSONArray strengths = overall.optJSONArray("strengths");
            
            // 3. 解析轨迹分析
            JSONObject trajectory = analysis.getJSONObject("trajectory_analysis");
            JSONObject preFireFull = trajectory.getJSONObject("pre_fire_full");
            JSONObject preFire05 = trajectory.getJSONObject("pre_fire_05");
            JSONObject postFire = trajectory.getJSONObject("post_fire");
            JSONObject deviationAnalysis = trajectory.getJSONObject("deviation_analysis");
            
            // 4. 解析扳机压力分析
            JSONObject trigger = analysis.getJSONObject("trigger_pressure_analysis");
            int triggerScore = trigger.getInt("control_score");
            String curveFeatures = trigger.getString("curve_features");
            
            // 5. 解析改进建议
            JSONArray suggestions = analysis.optJSONArray("improvement_suggestions");

            // 6. 在老师的UI上显示（示例，请根据老师的实际布局修改）
            // 射击数据
            TextView firearmTypeText = findViewById(R.id.firearm_type_text);
            firearmTypeText.setText("枪型: " + firearmType);
            
            TextView distanceText = findViewById(R.id.distance_text);
            distanceText.setText("射击距离: " + shotDistance + "米");
            
            TextView ringText = findViewById(R.id.ring_number_text);
            ringText.setText("着弹环数: " + ring + " 环");
            
            TextView xText = findViewById(R.id.x_coordinate_text);
            xText.setText("水平坐标: " + String.format("%.2f", x));
            
            TextView yText = findViewById(R.id.y_coordinate_text);
            yText.setText("垂直坐标: " + String.format("%.2f", y));
            
            TextView deviationText = findViewById(R.id.deviation_text);
            deviationText.setText("偏离靶心: " + String.format("%.2f", deviation) + "mm");
            
            TextView confidenceText = findViewById(R.id.confidence_text);
            confidenceText.setText("分析置信度: " + (int)confidence + "%");

            // 整体评价
            TextView scoreText = findViewById(R.id.score_text);
            scoreText.setText(score + "/10");
            
            TextView summaryText = findViewById(R.id.summary_text);
            summaryText.setText(summary);
            
            // 优势点
            if (strengths != null && strengths.length() > 0) {
                StringBuilder strengthsStr = new StringBuilder();
                for (int i = 0; i < strengths.length(); i++) {
                    strengthsStr.append("✅ ").append(strengths.getString(i)).append("\n");
                }
                TextView strengthsText = findViewById(R.id.strengths_text);
                strengthsText.setText(strengthsStr.toString());
            }

            // 轨迹分析
            TextView preFireFullText = findViewById(R.id.pre_fire_full_text);
            preFireFullText.setText("完整瞄准轨迹 - " + preFireFull.getString("status"));
            
            TextView preFire05Text = findViewById(R.id.pre_fire_05_text);
            preFire05Text.setText("击发前0.5秒 - " + preFire05.getString("status"));
            
            TextView postFireText = findViewById(R.id.post_fire_text);
            postFireText.setText("击发后复位 - " + postFire.getString("status"));
            
            TextView deviationDirText = findViewById(R.id.deviation_dir_text);
            deviationDirText.setText("偏差方向: " + deviationAnalysis.getString("direction"));
            
            TextView rootCauseText = findViewById(R.id.root_cause_text);
            rootCauseText.setText("原因分析: " + deviationAnalysis.getString("root_cause"));

            // 扳机分析
            TextView triggerScoreText = findViewById(R.id.trigger_score_text);
            triggerScoreText.setText("扳机控制评分: " + triggerScore + "/10");
            
            TextView curveText = findViewById(R.id.curve_features_text);
            curveText.setText("曲线特征: " + curveFeatures);

            // 改进建议
            if (suggestions != null && suggestions.length() > 0) {
                StringBuilder suggestionStr = new StringBuilder();
                for (int i = 0; i < suggestions.length(); i++) {
                    JSONObject sug = suggestions.getJSONObject(i);
                    suggestionStr.append("【").append(sug.getString("priority"))
                            .append("】").append(sug.getString("title")).append("\n")
                            .append(sug.getString("practice_method")).append("\n\n");
                }
                TextView suggestionText = findViewById(R.id.suggestions_text);
                suggestionText.setText(suggestionStr.toString());
            }

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

### 5.2 从文件夹自动获取最新图片

如果老师的APP将图片保存在某个文件夹中，可以自动获取最新图片：

```java
// 指定文件夹路径，自动获取最新图片并分析
String folderPath = "/sdcard/shoot.test/";
uploadHelper.uploadLatestFromFolder(folderPath, new TargetImageUploadHelper.UploadCallback() {
    @Override
    public void onSuccess(JSONObject analysisResult) {
        // 分析成功
        showAnalysisResult(analysisResult);
    }
    @Override
    public void onFailed(String errorMsg) {
        showError(errorMsg);
    }
});
```

### 5.3 支持的图片格式

系统支持以下图片格式：
- `.jpg` / `.jpeg`
- `.png`
- `.webp`

建议：使用 `.jpg` 格式，压缩率好且兼容性强。

---

## 六、配置说明

### 6.1 服务器地址配置

**⚠️ 重要：端口说明**
- **后端API端口：3002** - 老师APP需要连接这个端口
- **前端管理界面：3001** - 用于浏览器查看，APP不需要

**测试阶段（局域网）：**
```java
// 确保手机和电脑在同一WiFi网络
// 使用电脑的局域网IP地址（根据实际情况修改）
uploadHelper.setServerUrl("http://192.168.31.175:3002");
```

**查看本机IP地址的方法：**
- Windows：在命令提示符运行 `ipconfig`，查看"IPv4地址"
- Mac/Linux：在终端运行 `ifconfig` 或 `ip addr`

**生产阶段（公网）：**
```java
uploadHelper.setServerUrl("https://your-domain.com");
// 注意：生产环境建议使用HTTPS，不需要指定端口
```

### 6.2 图片路径配置

老师的APP保存图片后，调用：
```java
uploadHelper.setTargetImagePath("/path/to/saved/image.jpg");
```

---

## 七、完整测试流程

### 7.1 测试前检查清单

- ✅ 后端已部署并运行（端口3002）
- ✅ 手机和电脑在同一WiFi网络（测试阶段）
- ✅ 权限已正确添加
- ✅ `TargetImageUploadHelper.java` 已复制并修改包名
- ✅ OkHttp 依赖已添加
- ✅ 网络安全配置已设置（如果需要HTTP）
- ✅ 服务器地址配置正确（使用电脑的局域网IP，不是localhost）

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
2. 服务器地址配置错误（使用了localhost而不是局域网IP）
3. 手机和电脑不在同一网络
4. 豆包API Key未配置
5. 图片格式不支持

**解决**：
1. 确认后端服务正常运行（检查端口3002）
2. 检查服务器地址是否使用电脑的**局域网IP**（如192.168.x.x），不是localhost
3. 确保手机和电脑连接**同一个WiFi**
4. 检查后端的 `.env` 文件中的API Key
5. 使用 .jpg/.png/.jpeg/.webp 格式

**快速诊断步骤：**
```bash
# 1. 确认后端运行（在浏览器访问）
http://192.168.31.175:3002/records

# 2. 确认手机和电脑在同一网络
# 在手机上用浏览器访问上面的地址，应该能看到JSON数据
```

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
