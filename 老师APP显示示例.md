# 老师APP完整显示示例

## 后端返回的完整数据结构

```json
{
  "success": true,
  "record": { ... },
  "analysis": {
    "metadata": {
      "sample_id": "SHOT-xxx",
      "firearm_type": "10米气步枪",
      "shot_distance": 8.3,
      "hit_coordinates": {
        "horizontal": 33.51,
        "vertical": -19.01
      },
      "deviation_distance": 38.53,
      "hit_ring": 5.5,
      "analysis_time": "2026-04-28T00:00:00Z",
      "confidence_level": 0.9
    },
    "overall_assessment": {
      "comprehensive_score": 7,
      "summary": "击发前轨迹(红色)稳定性较好，击发前0.5秒轨迹(蓝色)精度突出，击发后复位轨迹(绿色)收敛性强，但弹孔存在右下方向偏差，需优化瞄准一致性与扳机控制",
      "strengths": [
        "击发前0.5秒轨迹(蓝色)紧凑稳定，瞄准精度高",
        "击发后复位轨迹(绿色)动作规范，收敛于靶心区域"
      ]
    },
    "trajectory_analysis": {
      "pre_fire_full": {
        "status": "stable with minor fluctuations",
        "issues": ["轨迹存在局部横向波动，瞄准过程中位置调整幅度较大"],
        "advantages": ["覆盖靶心核心区域，瞄准范围合理"]
      },
      "pre_fire_05": {
        "status": "stable",
        "issues": [],
        "advantages": ["关键阶段轨迹紧凑，瞄准稳定性强"]
      },
      "post_fire": {
        "status": "stable",
        "issues": [],
        "advantages": ["复位动作规范，收敛于靶心"]
      },
      "deviation_analysis": {
        "direction": "right-down",
        "root_cause": "扣扳机瞬间手腕轻微向右下方偏移"
      }
    },
    "trigger_pressure_analysis": {
      "curve_features": "扣扳机压力曲线基本平稳",
      "key_issues": ["扣扳机初期力度略有不均"],
      "control_score": 7
    },
    "improvement_suggestions": [
      {
        "priority": "high",
        "title": "手腕稳定性训练",
        "practice_method": "使用握力器增强手腕力量，进行无弹空枪瞄准练习，保持手腕稳定10秒"
      },
      {
        "priority": "medium",
        "title": "扳机控制训练",
        "practice_method": "使用电子扳机训练器，控制扣扳机力度均匀，避免突然发力"
      }
    ]
  }
}
```

## Java 完整解析代码

```java
import org.json.JSONArray;
import org.json.JSONObject;
import android.widget.TextView;
import android.widget.Toast;

public class AnalysisDisplay {
    
    // 解析并显示完整分析结果
    public void displayFullResult(JSONObject result, android.content.Context context) {
        try {
            JSONObject analysis = result.getJSONObject("analysis");
            
            // 1. 射击数据
            JSONObject metadata = analysis.getJSONObject("metadata");
            String firearmType = metadata.getString("firearm_type");
            double shotDistance = metadata.getDouble("shot_distance");
            double ring = metadata.optDouble("hit_ring", 0);
            JSONObject hitCoords = metadata.getJSONObject("hit_coordinates");
            double x = hitCoords.getDouble("horizontal");
            double y = hitCoords.getDouble("vertical");
            double deviation = metadata.optDouble("deviation_distance", 0);
            double confidence = metadata.optDouble("confidence_level", 0.9) * 100;
            
            // 2. 整体评价
            JSONObject overall = analysis.getJSONObject("overall_assessment");
            int score = overall.getInt("comprehensive_score");
            String summary = overall.getString("summary");
            JSONArray strengths = overall.optJSONArray("strengths");
            
            // 3. 轨迹分析
            JSONObject trajectory = analysis.getJSONObject("trajectory_analysis");
            JSONObject preFireFull = trajectory.getJSONObject("pre_fire_full");
            JSONObject preFire05 = trajectory.getJSONObject("pre_fire_05");
            JSONObject postFire = trajectory.getJSONObject("post_fire");
            JSONObject deviationAnalysis = trajectory.getJSONObject("deviation_analysis");
            
            // 4. 扳机分析
            JSONObject trigger = analysis.getJSONObject("trigger_pressure_analysis");
            int triggerScore = trigger.getInt("control_score");
            
            // 5. 改进建议
            JSONArray suggestions = analysis.optJSONArray("improvement_suggestions");
            
            // 显示数据到UI（示例）
            setTextSafe(context, R.id.firearm_type, "枪型: " + firearmType);
            setTextSafe(context, R.id.shot_distance, "射击距离: " + shotDistance + "米");
            setTextSafe(context, R.id.hit_ring, String.format("%.1f", ring) + " 环");
            setTextSafe(context, R.id.horizontal_coord, String.format("%.2f", x));
            setTextSafe(context, R.id.vertical_coord, String.format("%.2f", y));
            setTextSafe(context, R.id.deviation_distance, String.format("%.2f", deviation) + "mm");
            setTextSafe(context, R.id.confidence, (int)confidence + "%");
            
            setTextSafe(context, R.id.comprehensive_score, score + "/10");
            setTextSafe(context, R.id.summary_text, summary);
            
            if (strengths != null) {
                StringBuilder strengthsStr = new StringBuilder();
                for (int i = 0; i < strengths.length(); i++) {
                    strengthsStr.append("✅ ").append(strengths.getString(i)).append("\n");
                }
                setTextSafe(context, R.id.strengths, strengthsStr.toString());
            }
            
            // 轨迹分析显示
            setTextSafe(context, R.id.pre_fire_full_status, "完整瞄准轨迹 - " + preFireFull.getString("status"));
            setTextSafe(context, R.id.pre_fire_05_status, "击发前0.5秒 - " + preFire05.getString("status"));
            setTextSafe(context, R.id.post_fire_status, "击发后复位 - " + postFire.getString("status"));
            setTextSafe(context, R.id.deviation_direction, "偏差方向: " + deviationAnalysis.getString("direction"));
            setTextSafe(context, R.id.root_cause, "原因分析: " + deviationAnalysis.getString("root_cause"));
            
            // 扳机分析
            setTextSafe(context, R.id.trigger_score, "扳机控制: " + triggerScore + "/10");
            
            // 改进建议
            if (suggestions != null) {
                StringBuilder suggestionStr = new StringBuilder();
                for (int i = 0; i < suggestions.length(); i++) {
                    JSONObject sug = suggestions.getJSONObject(i);
                    suggestionStr.append("【").append(sug.getString("priority"))
                            .append("】").append(sug.getString("title")).append("\n")
                            .append(sug.getString("practice_method")).append("\n\n");
                }
                setTextSafe(context, R.id.suggestions, suggestionStr.toString());
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, "显示结果失败: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
    
    // 安全设置TextView文本
    private void setTextSafe(android.content.Context context, int viewId, String text) {
        if (context instanceof android.app.Activity) {
            android.app.Activity activity = (android.app.Activity) context;
            TextView tv = activity.findViewById(viewId);
            if (tv != null) {
                tv.setText(text);
            }
        }
    }
}
```

## 必需的布局资源ID

| 控件ID | 用途 |
|--------|------|
| `firearm_type` | 枪型显示 |
| `shot_distance` | 射击距离 |
| `hit_ring` | 着弹环数 |
| `horizontal_coord` | 水平坐标 |
| `vertical_coord` | 垂直坐标 |
| `deviation_distance` | 偏离靶心距离 |
| `confidence` | 分析置信度 |
| `comprehensive_score` | 综合评分 |
| `summary_text` | 评价摘要 |
| `strengths` | 优势点 |
| `pre_fire_full_status` | 完整瞄准轨迹状态 |
| `pre_fire_05_status` | 击发前0.5秒状态 |
| `post_fire_status` | 击发后复位状态 |
| `deviation_direction` | 偏差方向 |
| `root_cause` | 原因分析 |
| `trigger_score` | 扳机控制评分 |
| `suggestions` | 改进建议 |
