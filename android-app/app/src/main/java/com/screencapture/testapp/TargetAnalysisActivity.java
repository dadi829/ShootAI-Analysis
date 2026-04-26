package com.screencapture.testapp;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.text.TextUtils;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.screencapture.helper.TargetImageUploadHelper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * 靶面分析Activity - 完整卡片式视图
 */
public class TargetAnalysisActivity extends AppCompatActivity {

    private static final String TAG = "TargetAnalysisActivity";
    private static final int REQUEST_PERMISSION = 1001;
    private static final int REQUEST_OPEN_FOLDER = 1003;

    // UI组件 - 基础部分
    private EditText etServerUrl;
    private Button btnSelectFolder;
    private Button btnAnalyze;
    private TextView tvStatus;
    private TextView tvFolderStatus;
    private ProgressBar progressBar;

    // UI组件 - 射击数据卡片
    private LinearLayout cardMetadata;
    private TextView tvFirearm;
    private TextView tvDistance;
    private TextView tvRing;
    private TextView tvHCoord;
    private TextView tvVCoord;
    private TextView tvDeviation;
    private LinearLayout layoutConfidence;
    private ProgressBar progressConfidence;
    private TextView tvConfidence;

    // UI组件 - 整体评价卡片
    private LinearLayout cardOverall;
    private ProgressBar progressScore;
    private TextView tvScore;
    private TextView tvSummary;
    private LinearLayout layoutStrengths;
    private LinearLayout containerStrengths;

    // UI组件 - 轨迹分析卡片
    private LinearLayout cardTrajectory;
    private LinearLayout sectionPreFull;
    private TextView tvPreFullTitle;
    private LinearLayout layoutPreFullAdvantages;
    private LinearLayout containerPreFullAdv;
    private LinearLayout layoutPreFullIssues;
    private LinearLayout containerPreFullIssues;
    private LinearLayout sectionPre05;
    private TextView tvPre05Title;
    private LinearLayout layoutPre05Advantages;
    private LinearLayout containerPre05Adv;
    private LinearLayout layoutPre05Issues;
    private LinearLayout containerPre05Issues;
    private LinearLayout sectionPost;
    private TextView tvPostTitle;
    private LinearLayout layoutPostAdvantages;
    private LinearLayout containerPostAdv;
    private LinearLayout layoutPostIssues;
    private LinearLayout containerPostIssues;
    private LinearLayout sectionDeviation;
    private TextView tvDeviationDirection;
    private TextView tvDeviationCause;

    // UI组件 - 扳机分析卡片
    private LinearLayout cardTrigger;
    private TextView tvTriggerScore;
    private TextView tvCurveFeatures;
    private LinearLayout layoutTriggerIssues;
    private LinearLayout containerTriggerIssues;

    // UI组件 - 改进建议卡片
    private LinearLayout cardSuggestions;
    private LinearLayout containerSuggestions;

    private TargetImageUploadHelper uploadHelper;
    private SharedPreferences prefs;
    private Uri selectedFolderUri = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_target_analysis);

        initViews();
        uploadHelper = new TargetImageUploadHelper(this);
        prefs = getSharedPreferences("TargetAnalysis", MODE_PRIVATE);
        etServerUrl.setText("http://192.168.31.175:3002");
        checkPersistedPermissions();
        btnSelectFolder.setOnClickListener(v -> openFolderPicker());
        btnAnalyze.setOnClickListener(v -> startAnalysis());
        checkBasicPermissions();
    }

    private void initViews() {
        etServerUrl = findViewById(R.id.et_server_url);
        btnSelectFolder = findViewById(R.id.btn_select_folder);
        btnAnalyze = findViewById(R.id.btn_analyze);
        tvStatus = findViewById(R.id.tv_status);
        tvFolderStatus = findViewById(R.id.tv_folder_status);
        progressBar = findViewById(R.id.progress_bar);

        cardMetadata = findViewById(R.id.card_metadata);
        tvFirearm = findViewById(R.id.tv_firearm);
        tvDistance = findViewById(R.id.tv_distance);
        tvRing = findViewById(R.id.tv_ring);
        tvHCoord = findViewById(R.id.tv_h_coord);
        tvVCoord = findViewById(R.id.tv_v_coord);
        tvDeviation = findViewById(R.id.tv_deviation);
        layoutConfidence = findViewById(R.id.layout_confidence);
        progressConfidence = findViewById(R.id.progress_confidence);
        tvConfidence = findViewById(R.id.tv_confidence);

        cardOverall = findViewById(R.id.card_overall);
        progressScore = findViewById(R.id.progress_score);
        tvScore = findViewById(R.id.tv_score);
        tvSummary = findViewById(R.id.tv_summary);
        layoutStrengths = findViewById(R.id.layout_strengths);
        containerStrengths = findViewById(R.id.container_strengths);

        cardTrajectory = findViewById(R.id.card_trajectory);
        sectionPreFull = findViewById(R.id.section_pre_full);
        tvPreFullTitle = findViewById(R.id.tv_pre_full_title);
        layoutPreFullAdvantages = findViewById(R.id.layout_pre_full_advantages);
        containerPreFullAdv = findViewById(R.id.container_pre_full_adv);
        layoutPreFullIssues = findViewById(R.id.layout_pre_full_issues);
        containerPreFullIssues = findViewById(R.id.container_pre_full_issues);
        sectionPre05 = findViewById(R.id.section_pre_05);
        tvPre05Title = findViewById(R.id.tv_pre_05_title);
        layoutPre05Advantages = findViewById(R.id.layout_pre_05_advantages);
        containerPre05Adv = findViewById(R.id.container_pre_05_adv);
        layoutPre05Issues = findViewById(R.id.layout_pre_05_issues);
        containerPre05Issues = findViewById(R.id.container_pre_05_issues);
        sectionPost = findViewById(R.id.section_post);
        tvPostTitle = findViewById(R.id.tv_post_title);
        layoutPostAdvantages = findViewById(R.id.layout_post_advantages);
        containerPostAdv = findViewById(R.id.container_post_adv);
        layoutPostIssues = findViewById(R.id.layout_post_issues);
        containerPostIssues = findViewById(R.id.container_post_issues);
        sectionDeviation = findViewById(R.id.section_deviation);
        tvDeviationDirection = findViewById(R.id.tv_deviation_direction);
        tvDeviationCause = findViewById(R.id.tv_deviation_cause);

        cardTrigger = findViewById(R.id.card_trigger);
        tvTriggerScore = findViewById(R.id.tv_trigger_score);
        tvCurveFeatures = findViewById(R.id.tv_curve_features);
        layoutTriggerIssues = findViewById(R.id.layout_trigger_issues);
        containerTriggerIssues = findViewById(R.id.container_trigger_issues);

        cardSuggestions = findViewById(R.id.card_suggestions);
        containerSuggestions = findViewById(R.id.container_suggestions);
    }

    private void checkPersistedPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            List<UriPermission> perms = getContentResolver().getPersistedUriPermissions();
            for (UriPermission perm : perms) {
                if (perm.isReadPermission()) {
                    selectedFolderUri = perm.getUri();
                    tvFolderStatus.setText("已选择文件夹 (点击可更换)");
                    btnAnalyze.setEnabled(true);
                    return;
                }
            }
        }
        tvFolderStatus.setText("未选择文件夹");
        btnAnalyze.setEnabled(false);
    }

    private void checkBasicPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] permissions = {Manifest.permission.INTERNET};
            boolean hasPermission = true;
            for (String perm : permissions) {
                if (checkSelfPermission(perm) != PackageManager.PERMISSION_GRANTED) {
                    hasPermission = false;
                    break;
                }
            }
            if (!hasPermission) {
                requestPermissions(permissions, REQUEST_PERMISSION);
            }
        }
    }

    private void openFolderPicker() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            startActivityForResult(intent, REQUEST_OPEN_FOLDER);
        } else {
            Toast.makeText(this, "Android版本过低，不支持", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_OPEN_FOLDER && resultCode == RESULT_OK && data != null) {
            Uri treeUri = data.getData();
            if (treeUri != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    getContentResolver().takePersistableUriPermission(
                        treeUri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    );
                }
                selectedFolderUri = treeUri;
                saveFolderPath(treeUri.toString());
                tvFolderStatus.setText("已选择文件夹 (点击可更换)");
                btnAnalyze.setEnabled(true);
                Toast.makeText(this, "文件夹选择成功！", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void saveFolderPath(String path) {
        prefs.edit().putString("folderPath", path).apply();
    }

    private void startAnalysis() {
        String serverUrl = etServerUrl.getText().toString().trim();
        if (TextUtils.isEmpty(serverUrl)) {
            Toast.makeText(this, "请输入服务器地址", Toast.LENGTH_SHORT).show();
            return;
        }
        if (selectedFolderUri == null) {
            Toast.makeText(this, "请先选择文件夹", Toast.LENGTH_SHORT).show();
            return;
        }

        btnAnalyze.setEnabled(false);
        progressBar.setVisibility(View.VISIBLE);
        tvStatus.setText("正在处理...");
        
        cardMetadata.setVisibility(View.GONE);
        cardOverall.setVisibility(View.GONE);
        cardTrajectory.setVisibility(View.GONE);
        cardTrigger.setVisibility(View.GONE);
        cardSuggestions.setVisibility(View.GONE);

        uploadHelper.setServerUrl(serverUrl);
        new Thread(() -> {
            try {
                String latestImagePath = findAndCopyLatestImage();
                if (latestImagePath == null) {
                    runOnUiThread(() -> {
                        tvStatus.setText("文件夹里没有图片");
                        resetUI();
                    });
                    return;
                }
                runOnUiThread(() -> tvStatus.setText("正在上传并分析..."));
                uploadHelper.setTargetImagePath(latestImagePath);
                uploadHelper.uploadAndAnalyze(new TargetImageUploadHelper.UploadCallback() {
                    @Override
                    public void onSuccess(JSONObject analysisResult) {
                        Log.d(TAG, "分析成功: " + analysisResult.toString());
                        runOnUiThread(() -> {
                            tvStatus.setText("分析成功！");
                            displayResult(analysisResult);
                            resetUI();
                        });
                    }
                    @Override
                    public void onFailed(String errorMsg) {
                        Log.e(TAG, "分析失败: " + errorMsg);
                        runOnUiThread(() -> {
                            tvStatus.setText("分析失败: " + errorMsg);
                            resetUI();
                        });
                    }
                });
            } catch (Exception e) {
                Log.e(TAG, "处理异常", e);
                runOnUiThread(() -> {
                    tvStatus.setText("处理异常: " + e.getMessage());
                    resetUI();
                });
            }
        }).start();
    }

    private String findAndCopyLatestImage() throws Exception {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            throw new Exception("Android版本过低");
        }
        List<FileInfo> files = listFilesInFolder(selectedFolderUri);
        if (files.isEmpty()) return null;

        FileInfo latest = files.get(0);
        for (FileInfo file : files) {
            if (file.lastModified > latest.lastModified && (
                file.name.toLowerCase().endsWith(".jpg") ||
                file.name.toLowerCase().endsWith(".jpeg") ||
                file.name.toLowerCase().endsWith(".png") ||
                file.name.toLowerCase().endsWith(".webp"))) {
                latest = file;
            }
        }

        if (!(latest.name.toLowerCase().endsWith(".jpg") ||
              latest.name.toLowerCase().endsWith(".jpeg") ||
              latest.name.toLowerCase().endsWith(".png") ||
              latest.name.toLowerCase().endsWith(".webp"))) {
            return null;
        }

        Log.d(TAG, "找到最新图片: " + latest.name);
        return copyUriToCache(latest.uri);
    }

    private List<FileInfo> listFilesInFolder(Uri treeUri) {
        List<FileInfo> files = new ArrayList<>();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            return files;
        }

        try {
            Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
                treeUri,
                DocumentsContract.getTreeDocumentId(treeUri)
            );

            String[] projection = {
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_LAST_MODIFIED,
                DocumentsContract.Document.COLUMN_MIME_TYPE
            };

            Cursor cursor = getContentResolver().query(childrenUri, projection, null, null, null);
            if (cursor != null) {
                int idIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
                int nameIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
                int lastModifiedIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED);

                while (cursor.moveToNext()) {
                    String docId = cursor.getString(idIndex);
                    String name = cursor.getString(nameIndex);
                    long lastModified = cursor.getLong(lastModifiedIndex);
                    Uri fileUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId);
                    files.add(new FileInfo(name, fileUri, lastModified));
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "列出文件失败", e);
        }
        return files;
    }

    private String copyUriToCache(Uri uri) throws Exception {
        InputStream inputStream = getContentResolver().openInputStream(uri);
        if (inputStream == null) throw new Exception("无法打开图片");
        File cacheFile = new File(getCacheDir(), "target_image_" + System.currentTimeMillis() + ".jpg");
        FileOutputStream outputStream = new FileOutputStream(cacheFile);

        byte[] buffer = new byte[4096];
        int bytesRead;
        while ((bytesRead = inputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, bytesRead);
        }
        inputStream.close();
        outputStream.close();

        Log.d(TAG, "图片已缓存: " + cacheFile.getAbsolutePath());
        return cacheFile.getAbsolutePath();
    }

    private void displayResult(JSONObject result) {
        try {
            boolean hasContent = false;
            JSONObject metadata = result.optJSONObject("metadata");
            if (metadata != null) {
                hasContent = true;
                renderMetadataCard(metadata);
            }
            if (result.has("confidence_level")) {
                double conf = result.optDouble("confidence_level", 0);
                renderConfidence(conf);
            }

            JSONObject overall = result.optJSONObject("overall_assessment");
            if (overall != null) {
                hasContent = true;
                renderOverallCard(overall);
            }

            JSONObject trajectory = result.optJSONObject("trajectory_analysis");
            if (trajectory != null) {
                hasContent = true;
                renderTrajectoryCard(trajectory);
            }

            JSONObject trigger = result.optJSONObject("trigger_pressure_analysis");
            if (trigger != null) {
                hasContent = true;
                renderTriggerCard(trigger);
            }

            JSONArray suggestions = result.optJSONArray("improvement_suggestions");
            if (suggestions != null && suggestions.length() > 0) {
                hasContent = true;
                renderSuggestionsCard(suggestions);
            }

            if (!hasContent) {
                tvStatus.setText("没有有效分析数据");
            }
        } catch (Exception e) {
            Log.e(TAG, "解析结果失败", e);
            tvStatus.setText("解析结果失败: " + e.getMessage());
        }
    }

    private void renderMetadataCard(JSONObject metadata) {
        cardMetadata.setVisibility(View.VISIBLE);
        
        String firearm = metadata.optString("firearm_type", "");
        if (!TextUtils.isEmpty(firearm)) {
            tvFirearm.setText(firearm);
            tvFirearm.setVisibility(View.VISIBLE);
        } else {
            tvFirearm.setText("--");
        }
        
        if (metadata.has("shot_distance")) {
            tvDistance.setText(metadata.optString("shot_distance") + "米");
        } else {
            tvDistance.setText("--");
        }

        if (metadata.has("hit_ring")) {
            tvRing.setText(String.valueOf(metadata.optDouble("hit_ring")) + " 环");
        } else {
            tvRing.setText("--");
        }

        JSONObject coords = metadata.optJSONObject("hit_coordinates");
        if (coords != null) {
            double h = coords.optDouble("horizontal", 0);
            double v = coords.optDouble("vertical", 0);
            tvHCoord.setText(String.valueOf(h));
            tvVCoord.setText(String.valueOf(v));
        }

        if (metadata.has("deviation_distance")) {
            tvDeviation.setText(metadata.optString("deviation_distance") + "mm");
        } else {
            tvDeviation.setText("--");
        }
    }

    private void renderConfidence(double conf) {
        if (conf > 0) {
            layoutConfidence.setVisibility(View.VISIBLE);
            int progressValue = (int)(conf * 100);
            progressConfidence.setProgress(progressValue);
            tvConfidence.setText(progressValue + "%");
        } else {
            layoutConfidence.setVisibility(View.GONE);
        }
    }

    private void renderOverallCard(JSONObject overall) {
        cardOverall.setVisibility(View.VISIBLE);
        int score = overall.optInt("comprehensive_score", 0);
        progressScore.setProgress(score * 10);
        tvScore.setText(score + "/10");
        
        int color;
        if (score >= 8) color = Color.parseColor("#4CAF50");
        else if (score >= 6) color = Color.parseColor("#2196F3");
        else if (score >= 4) color = Color.parseColor("#FF9800");
        else color = Color.parseColor("#F44336");
        progressScore.setProgressTintList(android.content.res.ColorStateList.valueOf(color));
        
        tvSummary.setText(overall.optString("summary"));
        
        JSONArray strengths = overall.optJSONArray("strengths");
        if (strengths != null && strengths.length() > 0) {
            layoutStrengths.setVisibility(View.VISIBLE);
            containerStrengths.removeAllViews();
            for (int i = 0; i < strengths.length(); i++) {
                String s = strengths.optString(i);
                TextView tag = createTagView(s, Color.parseColor("#E8F5E9"), Color.parseColor("#4CAF50"));
                containerStrengths.addView(tag);
            }
        } else {
            layoutStrengths.setVisibility(View.GONE);
        }
    }

    private void renderTrajectoryCard(JSONObject trajectory) {
        cardTrajectory.setVisibility(View.VISIBLE);
        renderTrajectorySection(
            trajectory.optJSONObject("pre_fire_full"),
            sectionPreFull,
            tvPreFullTitle,
            "🔴 完整瞄准轨迹",
            layoutPreFullAdvantages,
            containerPreFullAdv,
            layoutPreFullIssues,
            containerPreFullIssues
        );
        renderTrajectorySection(
            trajectory.optJSONObject("pre_fire_05"),
            sectionPre05,
            tvPre05Title,
            "🔵 击发前0.5秒",
            layoutPre05Advantages,
            containerPre05Adv,
            layoutPre05Issues,
            containerPre05Issues
        );
        renderTrajectorySection(
            trajectory.optJSONObject("post_fire"),
            sectionPost,
            tvPostTitle,
            "🟢 击发后复位",
            layoutPostAdvantages,
            containerPostAdv,
            layoutPostIssues,
            containerPostIssues
        );
        JSONObject deviation = trajectory.optJSONObject("deviation_analysis");
        if (deviation != null) {
            sectionDeviation.setVisibility(View.VISIBLE);
            tvDeviationDirection.setText(deviation.optString("direction"));
            tvDeviationCause.setText(deviation.optString("root_cause"));
        } else {
            sectionDeviation.setVisibility(View.GONE);
        }
    }

    private void renderTrajectorySection(JSONObject section, LinearLayout layout, TextView title, String titlePrefix, LinearLayout advLayout, LinearLayout advContainer, LinearLayout issueLayout, LinearLayout issueContainer) {
        if (section == null) {
            layout.setVisibility(View.GONE);
            return;
        }
        layout.setVisibility(View.VISIBLE);
        title.setText(titlePrefix + " - " + section.optString("status"));
        
        advContainer.removeAllViews();
        JSONArray advantages = section.optJSONArray("advantages");
        if (advantages != null && advantages.length() > 0) {
            advLayout.setVisibility(View.VISIBLE);
            for (int i = 0; i < advantages.length(); i++) {
                TextView item = createListItem(advantages.optString(i), Color.parseColor("#4CAF50"));
                advContainer.addView(item);
            }
        } else {
            advLayout.setVisibility(View.GONE);
        }
        
        issueContainer.removeAllViews();
        JSONArray issues = section.optJSONArray("issues");
        if (issues != null && issues.length() > 0) {
            issueLayout.setVisibility(View.VISIBLE);
            for (int i = 0; i < issues.length(); i++) {
                TextView item = createListItem(issues.optString(i), Color.parseColor("#F44336"));
                issueContainer.addView(item);
            }
        } else {
            issueLayout.setVisibility(View.GONE);
        }
    }

    private void renderTriggerCard(JSONObject trigger) {
        cardTrigger.setVisibility(View.VISIBLE);
        int score = trigger.optInt("control_score", 0);
        tvTriggerScore.setText(score + "/10");
        int scoreColor;
        if (score >= 8) scoreColor = Color.parseColor("#4CAF50");
        else if (score >= 6) scoreColor = Color.parseColor("#2196F3");
        else if (score >= 4) scoreColor = Color.parseColor("#FF9800");
        else scoreColor = Color.parseColor("#F44336");
        tvTriggerScore.setTextColor(scoreColor);
        
        tvCurveFeatures.setText(trigger.optString("curve_features"));
        
        JSONArray keyIssues = trigger.optJSONArray("key_issues");
        if (keyIssues != null && keyIssues.length() > 0) {
            layoutTriggerIssues.setVisibility(View.VISIBLE);
            containerTriggerIssues.removeAllViews();
            for (int i = 0; i < keyIssues.length(); i++) {
                TextView item = createListItem(keyIssues.optString(i), Color.parseColor("#FF9800"));
                containerTriggerIssues.addView(item);
            }
        } else {
            layoutTriggerIssues.setVisibility(View.GONE);
        }
    }

    private void renderSuggestionsCard(JSONArray suggestions) {
        cardSuggestions.setVisibility(View.VISIBLE);
        containerSuggestions.removeAllViews();
        
        for (int i = 0; i < suggestions.length(); i++) {
            JSONObject s = suggestions.optJSONObject(i);
            if (s == null) continue;
            
            LinearLayout itemLayout = new LinearLayout(this);
            itemLayout.setOrientation(LinearLayout.VERTICAL);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            lp.setMargins(0, 0, 0, dpToPx(16));
            itemLayout.setLayoutParams(lp);
            itemLayout.setPadding(dpToPx(12), dpToPx(12), dpToPx(12), dpToPx(12));
            itemLayout.setBackgroundResource(android.R.drawable.dialog_holo_light_frame);
            
            String priority = s.optString("priority", "low");
            int prioColor;
            if ("high".equals(priority)) prioColor = Color.parseColor("#F44336");
            else if ("medium".equals(priority)) prioColor = Color.parseColor("#FF9800");
            else prioColor = Color.parseColor("#4CAF50");
            
            TextView prioTag = createTagView(
                priority.equals("high") ? "高" : priority.equals("medium") ? "中" : "低",
                Color.argb(30, Color.red(prioColor), Color.green(prioColor), Color.blue(prioColor)),
                prioColor
            );
            itemLayout.addView(prioTag);
            
            TextView titleTv = new TextView(this);
            titleTv.setText(s.optString("title"));
            titleTv.setTextSize(15);
            titleTv.setTextColor(Color.parseColor("#333333"));
            titleTv.setTypeface(null, android.graphics.Typeface.BOLD);
            titleTv.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ));
            titleTv.setPadding(0, dpToPx(8), 0, 0);
            itemLayout.addView(titleTv);
            
            TextView methodTv = new TextView(this);
            methodTv.setText("📝 练习方法: " + s.optString("practice_method"));
            methodTv.setTextSize(14);
            methodTv.setTextColor(Color.parseColor("#666666"));
            methodTv.setPadding(0, dpToPx(8), 0, 0);
            methodTv.setBackgroundColor(Color.parseColor("#F9F9F9"));
            methodTv.setPadding(dpToPx(12), dpToPx(12), dpToPx(12), dpToPx(12));
            itemLayout.addView(methodTv);
            
            containerSuggestions.addView(itemLayout);
        }
    }

    private TextView createTagView(String text, int bgColor, int textColor) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextSize(14);
        tv.setTextColor(textColor);
        tv.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
        tv.setBackgroundColor(bgColor);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        lp.setMargins(0, 0, dpToPx(8), 0);
        tv.setLayoutParams(lp);
        return tv;
    }

    private TextView createListItem(String text, int textColor) {
        TextView tv = new TextView(this);
        tv.setText("• " + text);
        tv.setTextSize(14);
        tv.setTextColor(textColor);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        lp.setMargins(0, dpToPx(4), 0, 0);
        tv.setLayoutParams(lp);
        return tv;
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return (int)(dp * density + 0.5f);
    }

    private void resetUI() {
        btnAnalyze.setEnabled(true);
        progressBar.setVisibility(View.GONE);
    }

    private static class FileInfo {
        String name;
        Uri uri;
        long lastModified;

        FileInfo(String name, Uri uri, long lastModified) {
            this.name = name;
            this.uri = uri;
            this.lastModified = lastModified;
        }
    }
}
