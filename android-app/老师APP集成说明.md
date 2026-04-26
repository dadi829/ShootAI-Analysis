# 老师APP集成指南（最新版）

## 一、需要复制的文件

| 文件 | 目标位置 | 说明 |
|------|----------|------|
| `TargetImageUploadHelper.java` | `com/你的包名/helper/` | 核心上传分析类 |
| `network_security_config.xml` | `res/xml/` | 网络安全配置（Android 9+） |

---

## 二、集成步骤

### 步骤1：添加依赖

在 `app/build.gradle` 的 `dependencies` 中添加：

```gradle
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
}
```

### 步骤2：添加权限

在 `AndroidManifest.xml` 中添加：

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### 步骤3：配置网络安全（Android 9+需要）

在 `AndroidManifest.xml` 的 `<application>` 标签中添加：

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

### 步骤4：复制文件

1. 复制 `TargetImageUploadHelper.java` 到你的项目
2. 修改包名为你的项目包名
3. 复制 `network_security_config.xml` 到 `res/xml/`

---

## 三、代码示例

### 基础用法

```java
import com.你的包名.helper.TargetImageUploadHelper;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {

    private TargetImageUploadHelper helper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        helper = new TargetImageUploadHelper(this);
        helper.setServerUrl("http://你的服务器IP:3002");
        
        Button btnAnalyze = findViewById(R.id.btn_analyze);
        btnAnalyze.setOnClickListener(v -> doAnalysis());
    }

    private void doAnalysis() {
        helper.setTargetImagePath("/sdcard/ShootAI/target.png");
        
        helper.uploadAndAnalyze(new TargetImageUploadHelper.UploadCallback() {
            @Override
            public void onSuccess(JSONObject result) {
                runOnUiThread(() -> showResult(result));
            }

            @Override
            public void onFailed(String msg) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, 
                    "失败: " + msg, Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void showResult(JSONObject result) {
        try {
            JSONObject metadata = result.getJSONObject("metadata");
            JSONObject hitCoords = metadata.getJSONObject("hit_coordinates");
            double ring = metadata.optDouble("hit_ring", 0);
            double horizontal = hitCoords.getDouble("horizontal");
            double vertical = hitCoords.getDouble("vertical");
            
            JSONObject overall = result.getJSONObject("overall_assessment");
            int score = overall.getInt("comprehensive_score");
            String summary = overall.getString("summary");
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### 从文件夹获取最新图片

```java
helper.uploadLatestFromFolder("/sdcard/ShootAI/", callback);
```

---

## 四、返回数据格式

```json
{
  "metadata": {
    "sample_id": "SHOT-001",
    "hit_coordinates": {
      "horizontal": 3.5,
      "vertical": -2.1
    },
    "hit_ring": 9.5,
    "deviation_distance": 4.1
  },
  "overall_assessment": {
    "comprehensive_score": 7,
    "summary": "评价内容",
    "strengths": ["优势1", "优势2"]
  },
  "trajectory_analysis": {
    "pre_fire_full": { "status": "stable", "issues": [], "advantages": [] },
    "pre_fire_05": { "status": "stable", "issues": [], "advantages": [] },
    "post_fire": { "status": "stable", "issues": [], "advantages": [] },
    "deviation_analysis": { "direction": "left", "root_cause": "原因" }
  },
  "trigger_pressure_analysis": {
    "curve_features": "特征描述",
    "key_issues": ["问题1"],
    "control_score": 7
  },
  "improvement_suggestions": [
    { "priority": "high", "title": "标题", "practice_method": "方法" }
  ],
  "confidence_level": 0.9
}
```

---

## 五、API说明

| 方法 | 说明 |
|------|------|
| `setServerUrl(url)` | 设置服务器地址 |
| `setTargetImagePath(path)` | 设置图片路径 |
| `uploadAndAnalyze(callback)` | 上传并分析（一次调用完成） |
| `uploadLatestFromFolder(path, callback)` | 分析文件夹中最新图片 |
| `isValidImageFile()` | 验证图片是否有效 |

---

## 六、注意事项

1. **超时设置**：AI分析需要时间，已设置120秒超时
2. **网络配置**：Android 9+ 必须配置网络安全才能使用HTTP
3. **服务器地址**：测试用局域网IP，生产用公网地址

---

## 七、常见问题

### Q: 提示"上传失败"
- 检查服务器是否运行
- 检查网络连接
- 检查服务器地址是否正确

### Q: 提示"图片文件不存在"
- 检查图片路径是否正确
- 检查存储权限

### Q: 分析超时
- AI分析需要30-60秒，已设置120秒超时
- 检查网络稳定性
