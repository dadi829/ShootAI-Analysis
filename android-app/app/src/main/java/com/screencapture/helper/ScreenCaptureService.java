package com.screencapture.helper;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class ScreenCaptureService extends Service {
    private static final String CHANNEL_ID = "ScreenCaptureChannel";
    private static final int NOTIFICATION_ID = 1001;

    public static void startService(Context context) {
        Intent intent = new Intent(context, ScreenCaptureService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void stopService(Context context) {
        Intent intent = new Intent(context, ScreenCaptureService.class);
        context.stopService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "屏幕截图",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("正在截图中...");
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("屏幕截图")
                .setContentText("正在处理...")
                .setSmallIcon(android.R.drawable.ic_menu_gallery)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }
}
