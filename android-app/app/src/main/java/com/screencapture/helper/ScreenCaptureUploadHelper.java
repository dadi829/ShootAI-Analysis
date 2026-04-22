package com.screencapture.helper;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.WindowManager;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class ScreenCaptureUploadHelper {
    private static final int REQUEST_CODE_SCREEN_CAPTURE = 1001;
    private static final MediaType MEDIA_TYPE_JPEG = MediaType.parse("image/jpeg");
    private static final int UPLOAD_TIMEOUT_SECONDS = 15;

    private static MediaProjectionManager projectionManager;
    private static MediaProjection mediaProjection;
    private static VirtualDisplay virtualDisplay;
    private static ImageReader imageReader;
    private static int screenWidth;
    private static int screenHeight;
    private static int screenDensity;
    private static UploadCallback currentCallback;
    private static String currentServerUrl;
    private static Activity currentActivity;
    private static boolean isCapturing = false;

    public interface UploadCallback {
        void onSuccess(String response);
        void onFailed(int errorCode, String errorMsg);
    }

    public static final class ErrorCode {
        public static final int PERMISSION_DENIED = 1;
        public static final int CAPTURE_FAILED = 2;
        public static final int NETWORK_ERROR = 3;
        public static final int SERVER_ERROR = 4;
        public static final int ALREADY_CAPTURING = 5;
    }

    public static void startCaptureAndUpload(Activity activity, String serverUrl, UploadCallback callback) {
        if (isCapturing) {
            callback.onFailed(ErrorCode.ALREADY_CAPTURING, "正在截图中，请稍后再试");
            return;
        }

        currentActivity = activity;
        currentServerUrl = serverUrl;
        currentCallback = callback;
        isCapturing = true;

        ScreenCaptureService.startService(activity);

        if (projectionManager == null) {
            projectionManager = (MediaProjectionManager) activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            WindowManager windowManager = (WindowManager) activity.getSystemService(Context.WINDOW_SERVICE);
            DisplayMetrics metrics = new DisplayMetrics();
            windowManager.getDefaultDisplay().getMetrics(metrics);
            screenWidth = metrics.widthPixels;
            screenHeight = metrics.heightPixels;
            screenDensity = metrics.densityDpi;
        }

        if (mediaProjection == null) {
            Intent intent = projectionManager.createScreenCaptureIntent();
            activity.startActivityForResult(intent, REQUEST_CODE_SCREEN_CAPTURE);
        } else {
            startCapture();
        }
    }

    public static void handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                mediaProjection = projectionManager.getMediaProjection(resultCode, data);
                startCapture();
            } else {
                notifyError(ErrorCode.PERMISSION_DENIED, "用户拒绝了屏幕录制权限");
            }
        }
    }

    private static void startCapture() {
        Log.d("ScreenCapture", "开始截图");
        try {
            // 第一步：先注册回调（Android 14 要求）
            mediaProjection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    Log.d("ScreenCapture", "MediaProjection 停止回调");
                }
            }, new Handler(Looper.getMainLooper()));
            Log.d("ScreenCapture", "MediaProjectionCallback 注册成功");

            // 第二步：创建 ImageReader
            imageReader = ImageReader.newInstance(screenWidth, screenHeight, PixelFormat.RGBA_8888, 2);
            Log.d("ScreenCapture", "ImageReader 创建成功");

            imageReader.setOnImageAvailableListener(new ImageReader.OnImageAvailableListener() {
                boolean hasCaptured = false;
                @Override
                public void onImageAvailable(ImageReader reader) {
                    if (hasCaptured) return;
                    hasCaptured = true;

                    Log.d("ScreenCapture", "图像可用回调触发");
                    try {
                        Image image = reader.acquireLatestImage();
                        if (image != null) {
                            Bitmap bitmap = imageToBitmap(image);
                            image.close();

                            if (bitmap != null) {
                                byte[] imageBytes = bitmapToBytes(bitmap);
                                bitmap.recycle();

                                if (imageBytes != null) {
                                    Log.d("ScreenCapture", "图片字节大小: " + imageBytes.length);
                                    uploadImage(imageBytes);
                                } else {
                                    notifyError(ErrorCode.CAPTURE_FAILED, "图片转换失败");
                                }
                            } else {
                                notifyError(ErrorCode.CAPTURE_FAILED, "截图失败");
                            }
                        } else {
                            Log.d("ScreenCapture", "获取图像为null");
                        }
                    } catch (Exception e) {
                        Log.e("ScreenCapture", "截图异常", e);
                        notifyError(ErrorCode.CAPTURE_FAILED, "截图异常: " + e.getMessage());
                    }
                }
            }, new Handler(Looper.getMainLooper()));

            Log.d("ScreenCapture", "设置回调成功，准备创建VirtualDisplay");

            // 第三步：创建 VirtualDisplay
            virtualDisplay = mediaProjection.createVirtualDisplay(
                    "ScreenCapture",
                    screenWidth,
                    screenHeight,
                    screenDensity,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    imageReader.getSurface(),
                    null,
                    null
            );
            Log.d("ScreenCapture", "VirtualDisplay 创建成功");

            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                Log.d("ScreenCapture", "3秒超时，释放资源");
                if (!isCapturing) {
                    cleanupResources();
                }
            }, 3000);

        } catch (Exception e) {
            Log.e("ScreenCapture", "启动截图失败", e);
            notifyError(ErrorCode.CAPTURE_FAILED, "启动截图失败: " + e.getMessage());
        }
    }

    private static Bitmap imageToBitmap(Image image) {
        Image.Plane[] planes = image.getPlanes();
        ByteBuffer buffer = planes[0].getBuffer();
        int pixelStride = planes[0].getPixelStride();
        int rowStride = planes[0].getRowStride();
        int rowPadding = rowStride - pixelStride * screenWidth;

        Bitmap bitmap = Bitmap.createBitmap(screenWidth + rowPadding / pixelStride, screenHeight, Bitmap.Config.ARGB_8888);
        bitmap.copyPixelsFromBuffer(buffer);
        Bitmap croppedBitmap = Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight);
        bitmap.recycle();

        return croppedBitmap;
    }

    private static byte[] bitmapToBytes(Bitmap bitmap) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, baos);
        return baos.toByteArray();
    }

    private static void uploadImage(byte[] imageBytes) {
        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(UPLOAD_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(UPLOAD_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .writeTimeout(UPLOAD_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .build();

        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("image", "screenshot.jpg",
                        RequestBody.create(imageBytes, MEDIA_TYPE_JPEG))
                .build();

        Request request = new Request.Builder()
                .url(currentServerUrl)
                .post(requestBody)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                notifyError(ErrorCode.NETWORK_ERROR, "网络请求失败: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    String responseBody = response.body() != null ? response.body().string() : "";
                    notifySuccess(responseBody);
                } else {
                    notifyError(ErrorCode.SERVER_ERROR, "服务器返回错误: " + response.code());
                }
            }
        });
    }

    private static void cleanupResources() {
        Log.d("ScreenCapture", "清理资源");
        
        try {
            if (virtualDisplay != null) {
                virtualDisplay.release();
                virtualDisplay = null;
                Log.d("ScreenCapture", "VirtualDisplay 已释放");
            }
        } catch (Exception e) {
            Log.e("ScreenCapture", "释放 VirtualDisplay 异常", e);
        }

        try {
            if (imageReader != null) {
                imageReader.close();
                imageReader = null;
                Log.d("ScreenCapture", "ImageReader 已关闭");
            }
        } catch (Exception e) {
            Log.e("ScreenCapture", "关闭 ImageReader 异常", e);
        }

        try {
            if (mediaProjection != null) {
                mediaProjection.stop();
                mediaProjection = null;
                Log.d("ScreenCapture", "MediaProjection 已停止");
            }
        } catch (Exception e) {
            Log.e("ScreenCapture", "停止 MediaProjection 异常", e);
        }

        try {
            if (currentActivity != null) {
                ScreenCaptureService.stopService(currentActivity);
                Log.d("ScreenCapture", "前台服务已停止");
            }
        } catch (Exception e) {
            Log.e("ScreenCapture", "停止服务异常", e);
        }
    }

    private static void notifySuccess(String response) {
        isCapturing = false;
        cleanupResources();
        if (currentCallback != null) {
            new Handler(Looper.getMainLooper()).post(() -> {
                currentCallback.onSuccess(response);
            });
        }
    }

    private static void notifyError(int errorCode, String errorMsg) {
        isCapturing = false;
        cleanupResources();
        if (currentCallback != null) {
            new Handler(Looper.getMainLooper()).post(() -> {
                currentCallback.onFailed(errorCode, errorMsg);
            });
        }
    }

    public static void release() {
        Log.d("ScreenCapture", "Release 被调用");
        cleanupResources();
    }
}
