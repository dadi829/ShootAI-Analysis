# 📖 API集成文档 - 给老师

---

## 一、快速开始

### 1.1 集成流程

```
老师的App → 截取屏幕 → 调用我们的API → 获取分析结果
```

### 1.2 基础信息

| 项目 | 说明 |
|------|------|
| **API地址** | `http://your-server.com/api/analyze`（本地测试用 `http://10.0.2.2:3002/api/analyze`） |
| **请求方式** | POST |
| **Content-Type** | multipart/form-data |
| **超时时间** | 建议 60秒（AI分析需要5-50秒） |

---

## 二、API详解

### 2.1 上传并分析截图

**接口地址：** `POST /api/analyze`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `screenshot` | File | 是 | 截图文件（PNG/JPG/JPEG格式） |
| `model` | String | 否 | AI模型选择，默认 `mock` |
| `targetArea` | String | 否 | 靶面区域坐标（JSON格式） |

**AI模型可选值：**

| 值 | 说明 |
|----|------|
| `mock` | 模拟数据（测试用，无需API Key，2秒返回） |
| `openai` | OpenAI GPT-4V（需要API Key） |
| `tongyi` | 通义千问（需要API Key） |
| `doubao` | 豆包（需要API Key） |

**成功响应（200 OK）：**

```json
{
  "success": true,
  "url": "http://your-server.com/screenshots/screenshot_xxx.jpg",
  "filename": "screenshot_xxx.jpg",
  "analysis": "---\n### 一、轨迹特征分析\n..."
}
```

**失败响应：**

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

---

## 三、Android集成示例

### 3.1 Kotlin + OkHttp 示例

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// 初始化OkHttp客户端
private val client = OkHttpClient.Builder()
  .connectTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
  .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
  .writeTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
  .build()

/**
 * 分析射击截图
 * @param imageFile 截图文件
 * @param model AI模型，默认mock
 * @return 分析结果
 */
suspend fun analyzeShootingScreenshot(
  imageFile: File,
  model: String = "mock"
): Result<String> = withContext(Dispatchers.IO) {
  try {
    // 构建请求体
    val requestBody = MultipartBody.Builder()
      .setType(MultipartBody.FORM)
      .addFormDataPart(
        "screenshot",
        imageFile.name,
        imageFile.asRequestBody("image/jpeg".toMediaType())
      )
      .addFormDataPart("model", model)
      .build()

    // 构建请求
    val request = Request.Builder()
      .url("http://10.0.2.2:3002/api/analyze") // 本地测试
      // .url("http://your-server.com/api/analyze") // 正式环境
      .post(requestBody)
      .build()

    // 执行请求
    val response = client.newCall(request).execute()

    if (!response.isSuccessful) {
      return@withContext Result.failure(Exception("请求失败：${response.code}"))
    }

    // 解析响应
    val responseBody = response.body?.string() ?: return@withContext Result.failure(Exception("响应为空"))
    
    // 简单JSON解析
    val result = org.json.JSONObject(responseBody)
    
    if (result.optBoolean("success")) {
      val analysis = result.optString("analysis")
      Result.success(analysis)
    } else {
      val error = result.optString("error", "未知错误")
      Result.failure(Exception(error))
    }
  } catch (e: Exception) {
    Result.failure(e)
  }
}
```

### 3.2 Java + OkHttp 示例

```java
import okhttp3.*;
import org.json.JSONObject;
import java.io.File;
import java.io.IOException;

public class ShootingAnalysisApi {
    private static final MediaType MEDIA_TYPE_JPEG = MediaType.parse("image/jpeg");
    private static final String API_URL = "http://10.0.2.2:3002/api/analyze";
    
    private OkHttpClient client;

    public ShootingAnalysisApi() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .build();
    }

    public interface AnalysisCallback {
        void onSuccess(String analysisResult);
        void onError(String errorMessage);
    }

    public void analyzeScreenshot(File imageFile, String model, AnalysisCallback callback) {
        new Thread(() -> {
            try {
                MultipartBody requestBody = new MultipartBody.Builder()
                        .setType(MultipartBody.FORM)
                        .addFormDataPart("screenshot", imageFile.getName(),
                                RequestBody.create(imageFile, MEDIA_TYPE_JPEG))
                        .addFormDataPart("model", model)
                        .build();

                Request request = new Request.Builder()
                        .url(API_URL)
                        .post(requestBody)
                        .build();

                Response response = client.newCall(request).execute();

                if (!response.isSuccessful()) {
                    callback.onError("请求失败：" + response.code());
                    return;
                }

                String responseBody = response.body().string();
                JSONObject result = new JSONObject(responseBody);

                if (result.optBoolean("success")) {
                    String analysis = result.optString("analysis");
                    callback.onSuccess(analysis);
                } else {
                    String error = result.optString("error", "未知错误");
                    callback.onError(error);
                }
            } catch (IOException e) {
                callback.onError("网络错误：" + e.getMessage());
            } catch (Exception e) {
                callback.onError("解析错误：" + e.getMessage());
            }
        }).start();
    }
}
```

### 3.3 使用示例

```kotlin
// 在您的Activity中使用
class TrainingActivity : AppCompatActivity() {
    
    // 当用户点击"分析"按钮时
    fun onAnalyzeClick() {
        // 1. 先截取屏幕（使用您现有的截图方法）
        val screenshotFile = takeScreenshot()
        
        // 2. 调用API分析
        lifecycleScope.launch {
            val result = analyzeShootingScreenshot(screenshotFile, model = "mock")
            
            result.onSuccess { analysis ->
                // 显示分析结果
                showAnalysisResult(analysis)
            }
            
            result.onFailure { error ->
                // 显示错误
                showError(error.message)
            }
        }
    }
}
```

---

## 四、分析结果格式

目前API返回的 `analysis` 字段是 Markdown 格式的文本：

```markdown
---
### 一、轨迹特征分析
1. 预瞄阶段：...
2. 击发瞬间：...
3. 击发后：...

### 二、报靶数据统计
- 总发数：10发
- 总分：141.2环
- ...

### 三、常见问题原因
1. ...
2. ...
3. ...

### 四、改进建议
1. ...
2. ...
3. ...
---
```

**如果需要JSON格式的结构化数据，请告诉我们，我们可以修改！**

---

## 五、注意事项

### 5.1 网络配置

Android 9+ 默认不允许明文HTTP请求，如果使用HTTP（非HTTPS），需要在 `AndroidManifest.xml` 中配置：

```xml
<application
    android:usesCleartextTraffic="true"
    ...>
    ...
</application>
```

### 5.2 权限

确保您的App有以下权限：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### 5.3 测试建议

1. **先用mock模式测试**：设置 `model="mock"`，快速验证集成是否成功
2. **超时设置**：建议设置60秒超时
3. **错误处理**：优雅处理网络错误、超时等情况

---

## 六、后端启动方法（如果老师需要本地测试）

### 6.1 启动后端

```bash
cd d:\ai.analysis\backend
npm install
npm start
```

后端会在 `http://localhost:3002` 启动

### 6.2 Android模拟器访问

在Android模拟器中访问本机后端，使用 `http://10.0.2.2:3002` 而不是 `http://localhost:3002`

---

## 七、联系方式

如有问题，请随时联系我们！
