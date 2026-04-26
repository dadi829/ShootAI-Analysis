package com.screencapture.helper;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * 靶面图片上传分析工具类
 * 用于老师APP集成
 * 
 * 使用示例：
 * TargetImageUploadHelper helper = new TargetImageUploadHelper(context);
 * helper.setServerUrl("http://your-server.com:3002");
 * helper.setTargetImagePath("/sdcard/ShootAI/target.png");
 * helper.uploadAndAnalyze(new TargetImageUploadHelper.UploadCallback() {
 *     @Override
 *     public void onSuccess(JSONObject analysisResult) {
 *         // 分析成功
 *     }
 *     @Override
 *     public void onFailed(String errorMsg) {
 *         // 失败
 *     }
 * });
 */
public class TargetImageUploadHelper {

    private static final String TAG = "TargetUploadHelper";
    private static final MediaType MEDIA_TYPE_PNG = MediaType.parse("image/png");

    private Context context;
    private String serverUrl = "http://localhost:3002"; // 默认地址，部署后修改
    private String targetImagePath = "/sdcard/ShootAI/target.png"; // 默认路径
    
    private OkHttpClient httpClient;
    private Handler mainHandler;

    /**
     * 上传回调接口
     */
    public interface UploadCallback {
        void onSuccess(JSONObject analysisResult);
        void onFailed(String errorMsg);
    }

    /**
     * 构造函数
     */
    public TargetImageUploadHelper(Context context) {
        this.context = context.getApplicationContext();
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)  // 增加到120秒，等待AI分析
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    /**
     * 设置服务器地址
     */
    public void setServerUrl(String url) {
        this.serverUrl = url;
    }

    /**
     * 设置靶面图片保存路径
     */
    public void setTargetImagePath(String path) {
        this.targetImagePath = path;
    }

    /**
     * 获取服务器地址
     */
    public String getServerUrl() {
        return serverUrl;
    }

    /**
     * 获取靶面图片路径
     */
    public String getTargetImagePath() {
        return targetImagePath;
    }

    /**
     * 获取文件夹里最新的图片
     */
    public File getLatestImageFromFolder(String folderPath) {
        try {
            File folder = new File(folderPath);
            if (!folder.exists() || !folder.isDirectory()) {
                Log.e(TAG, "文件夹不存在或不是文件夹: " + folderPath);
                return null;
            }

            // 获取文件夹里所有图片文件
            File[] files = folder.listFiles((dir, name) -> {
                String lower = name.toLowerCase();
                return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || 
                       lower.endsWith(".png") || lower.endsWith(".webp");
            });

            if (files == null || files.length == 0) {
                Log.e(TAG, "文件夹里没有图片: " + folderPath);
                return null;
            }

            // 找到最新的文件
            File latestFile = null;
            long lastModified = Long.MIN_VALUE;
            for (File file : files) {
                if (file.lastModified() > lastModified) {
                    lastModified = file.lastModified();
                    latestFile = file;
                }
            }

            Log.d(TAG, "找到最新图片: " + latestFile.getAbsolutePath());
            return latestFile;

        } catch (Exception e) {
            Log.e(TAG, "获取最新图片失败", e);
            return null;
        }
    }

    /**
     * 上传文件夹里最新的图片并分析
     */
    public void uploadLatestFromFolder(String folderPath, UploadCallback callback) {
        new Thread(() -> {
            try {
                Log.d(TAG, "从文件夹获取最新图片: " + folderPath);

                // 1. 获取最新图片
                File imageFile = getLatestImageFromFolder(folderPath);
                if (imageFile == null) {
                    postCallbackError(callback, "文件夹里没有找到图片: " + folderPath);
                    return;
                }

                // 2. 更新当前图片路径
                this.targetImagePath = imageFile.getAbsolutePath();

                Log.d(TAG, "找到图片文件: " + imageFile.getAbsolutePath() + ", 大小: " + imageFile.length() + " bytes");

                // 3. 上传图片并直接获取分析结果（/upload端点已同步分析）
                JSONObject analysisResult = uploadImageAndGetAnalysis(imageFile);
                if (analysisResult == null) {
                    postCallbackError(callback, "图片上传或分析失败");
                    return;
                }

                Log.d(TAG, "上传和AI分析完成");

                // 4. 返回成功
                postCallbackSuccess(callback, analysisResult);

            } catch (Exception e) {
                Log.e(TAG, "上传分析异常", e);
                postCallbackError(callback, "异常: " + e.getMessage());
            }
        }).start();
    }

    /**
     * 上传图片并分析（主入口方法）
     */
    public void uploadAndAnalyze(UploadCallback callback) {
        new Thread(() -> {
            try {
                Log.d(TAG, "开始上传分析...");
                
                // 1. 检查文件是否存在
                File imageFile = new File(targetImagePath);
                if (!imageFile.exists()) {
                    postCallbackError(callback, "图片文件不存在: " + targetImagePath);
                    return;
                }

                Log.d(TAG, "找到图片文件: " + imageFile.getAbsolutePath() + ", 大小: " + imageFile.length() + " bytes");

                // 2. 上传图片并获取分析结果（后端已同步分析）
                JSONObject analysisResult = uploadImageAndGetAnalysis(imageFile);
                if (analysisResult == null) {
                    postCallbackError(callback, "图片上传或分析失败");
                    return;
                }

                Log.d(TAG, "上传和AI分析完成");

                // 3. 返回成功
                postCallbackSuccess(callback, analysisResult);

            } catch (Exception e) {
                Log.e(TAG, "上传分析异常", e);
                postCallbackError(callback, "异常: " + e.getMessage());
            }
        }).start();
    }

    /**
     * 只上传图片，不分析
     */
    public void uploadOnly(UploadCallback callback) {
        new Thread(() -> {
            try {
                File imageFile = new File(targetImagePath);
                if (!imageFile.exists()) {
                    postCallbackError(callback, "图片文件不存在: " + targetImagePath);
                    return;
                }

                String recordId = uploadImage(imageFile);
                if (recordId != null) {
                    JSONObject result = new JSONObject();
                    result.put("success", true);
                    result.put("recordId", recordId);
                    postCallbackSuccess(callback, result);
                } else {
                    postCallbackError(callback, "上传失败");
                }
            } catch (Exception e) {
                postCallbackError(callback, e.getMessage());
            }
        }).start();
    }

    /**
     * 上传图片到服务器
     */
    private String uploadImage(File imageFile) throws Exception {
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("image", imageFile.getName(),
                        RequestBody.create(imageFile, MEDIA_TYPE_PNG))
                .build();

        Request request = new Request.Builder()
                .url(serverUrl + "/upload")
                .post(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("上传失败: " + response.code());
            }

            String responseBody = response.body().string();
            Log.d(TAG, "上传响应: " + responseBody);

            JSONObject json = new JSONObject(responseBody);
            if (json.optBoolean("success")) {
                JSONObject record = json.optJSONObject("record");
                if (record != null) {
                    return record.optString("id");
                }
            }
            return null;
        }
    }

    /**
     * 上传图片到服务器并获取分析结果
     */
    private JSONObject uploadImageAndGetAnalysis(File imageFile) throws Exception {
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("image", imageFile.getName(),
                        RequestBody.create(imageFile, MEDIA_TYPE_PNG))
                .build();

        Request request = new Request.Builder()
                .url(serverUrl + "/upload")
                .post(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("上传失败: " + response.code());
            }

            String responseBody = response.body().string();
            Log.d(TAG, "上传响应: " + responseBody);

            JSONObject json = new JSONObject(responseBody);
            if (json.optBoolean("success")) {
                JSONObject analysis = json.optJSONObject("analysis");
                if (analysis != null) {
                    return analysis;
                }
            }
            return null;
        }
    }

    /**
     * 调用AI分析
     */
    private JSONObject analyzeImage(String recordId) throws Exception {
        JSONObject requestJson = new JSONObject();
        requestJson.put("recordId", recordId);

        RequestBody requestBody = RequestBody.create(
                requestJson.toString(),
                MediaType.parse("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
                .url(serverUrl + "/api/analyze/trajectory")
                .post(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("分析失败: " + response.code());
            }

            String responseBody = response.body().string();
            Log.d(TAG, "分析响应: " + responseBody);

            JSONObject json = new JSONObject(responseBody);
            if (json.optBoolean("success")) {
                return json.optJSONObject("analysis");
            } else {
                throw new Exception(json.optString("error", "分析失败"));
            }
        }
    }

    /**
     * 在主线程回调成功
     */
    private void postCallbackSuccess(UploadCallback callback, JSONObject result) {
        mainHandler.post(() -> {
            if (callback != null) {
                callback.onSuccess(result);
            }
        });
    }

    /**
     * 在主线程回调失败
     */
    private void postCallbackError(UploadCallback callback, String error) {
        mainHandler.post(() -> {
            if (callback != null) {
                callback.onFailed(error);
            }
        });
    }

    /**
     * 验证图片文件是否有效
     */
    public boolean isValidImageFile() {
        try {
            File file = new File(targetImagePath);
            if (!file.exists()) return false;
            
            // 尝试解码图片
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(targetImagePath, options);
            
            return options.outWidth > 0 && options.outHeight > 0;
        } catch (Exception e) {
            return false;
        }
    }
}
