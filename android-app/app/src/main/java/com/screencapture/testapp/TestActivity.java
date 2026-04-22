package com.screencapture.testapp;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.screencapture.helper.ScreenCaptureUploadHelper;

public class TestActivity extends AppCompatActivity {
    private static final String SERVER_URL = "http://192.168.31.175:3002/upload";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_test);

        Button btnCapture = findViewById(R.id.btn_capture);
        btnCapture.setText("测试截图上传 v10");
        btnCapture.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                ScreenCaptureUploadHelper.startCaptureAndUpload(
                        TestActivity.this,
                        SERVER_URL,
                        new ScreenCaptureUploadHelper.UploadCallback() {
                            @Override
                            public void onSuccess(String response) {
                                Toast.makeText(TestActivity.this, "上传成功: " + response, Toast.LENGTH_LONG).show();
                            }

                            @Override
                            public void onFailed(int errorCode, String errorMsg) {
                                Toast.makeText(TestActivity.this, "失败: " + errorMsg, Toast.LENGTH_LONG).show();
                            }
                        }
                );
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        ScreenCaptureUploadHelper.handleActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        ScreenCaptureUploadHelper.release();
    }
}
