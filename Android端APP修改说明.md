# Android端APP - 新返回格式适配说明

## 📋 版本说明

- 旧版本：简单格式（已弃用）
- 新版本：专业分析格式（当前使用）

---

## 🔄 新返回格式说明

### API 端点不变
```
POST /api/analyze/trajectory
```

### 新的响应结构
```json
{
  "success": true,
  "analysis": {
    "metadata": {
      "sample_id": "SAMPLE-001",
      "shot_distance": 8.3,
      "hit_coordinates": { "horizontal": -29.65, "vertical": -17.16 },
      "analysis_timestamp": "2026-04-25T..."
    },
    "overall_assessment": {
      "rating": 7,
      "summary": "整体射击表现描述...",
      "strengths": ["优势1", "优势2"]
    },
    "trajectory_analysis": {...},
    "trigger_pressure_analysis": {...},
    "improvement_suggestions": [...],
    "confidence_level": 0.9
  }
}
```

---

## 📱 Android端建议展示方式

### 方案1：简洁展示（推荐用于快速查看）
```
=== 分析结果 ===

📊 总评分：7/10

🎯 射击数据：
- 距离：8.3米
- 位置：( -29.65, -17.16 )

📝 总体评价：
整体射击表现不错，稳定性尚可...

✅ 优势：
- 扳机压力控制平稳
- 击发后枪口复位稳定

📌 改进建议（高优先级）：
强化击发前枪口稳定性练习
```

### 方案2：完整卡片式展示（推荐）
用多个卡片展示不同模块，类似网站端的展示。

---

## 🔧 Android端APP修改步骤

### 1. 新增数据模型类
在 `TargetImageUploadHelper.java` 旁边新建数据模型，或者直接解析JSON。

### 2. 修改分析结果解析逻辑
原解析代码：
```java
// 旧代码（已弃用）
JSONObject shot = analysis.optJSONObject("shot");
JSONObject summary = analysis.optJSONObject("summary");
```

新代码示例：
```java
// 新代码
JSONObject metadata = analysis.optJSONObject("metadata");
JSONObject overall = analysis.optJSONObject("overall_assessment");

// 获取基础信息
double rating = overall.optDouble("rating", 0);
String summaryText = overall.optString("summary", "");

// 获取命中坐标
JSONObject hitCoords = metadata.optJSONObject("hit_coordinates");
double horizontal = hitCoords.optDouble("horizontal");
double vertical = hitCoords.optDouble("vertical");

// 获取改进建议
JSONArray suggestions = analysis.optJSONArray("improvement_suggestions");
```

### 3. 更新UI展示
- 把简单的TextView改成更丰富的展示
- 建议用多个LinearLayout或CardView展示不同模块

---

## 📋 字段速查表

| 字段 | 类型 | 说明 |
|------|------|------|
| `metadata.shot_distance` | Double | 射击距离（米） |
| `metadata.hit_coordinates` | Object | 弹孔坐标 |
| `overall_assessment.rating` | Integer | 总评分(1-10) |
| `overall_assessment.summary` | String | 总体评价 |
| `overall_assessment.strengths` | String[] | 优势列表 |
| `improvement_suggestions` | Array | 改进建议列表 |

---

## ⚠️ 注意事项

1. **保持上传/下载逻辑不变**：只修改分析结果的解析和展示
2. **向后兼容**：如果需要兼容旧数据，可以做格式检测
3. **错误处理**：增加必要的try-catch和空值检查

---

## 📞 如有问题
如有疑问随时沟通！
