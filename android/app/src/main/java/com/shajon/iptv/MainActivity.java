package com.shajon.iptv;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FullscreenPlugin.class);
        super.onCreate(savedInstanceState);
        Localhost.startServer();
    }

    @CapacitorPlugin(name = "FullscreenPlugin")
    public static class FullscreenPlugin extends Plugin {
        @PluginMethod
        public void enterFullscreen(PluginCall call) {
            getActivity().runOnUiThread(() -> {
                try {
                    // 1. Force screen orientation to landscape
                    getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);

                    // 2. Hide status bar, navigation bar, and system indicators (Immersive Mode)
                    Window window = getActivity().getWindow();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        window.setDecorFitsSystemWindows(false);
                        WindowInsetsController controller = window.getInsetsController();
                        if (controller != null) {
                            controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                            controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                        }
                    } else {
                        window.getDecorView().setSystemUiVisibility(
                            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        );
                    }
                    call.resolve();
                } catch (Exception e) {
                    call.reject(e.getMessage());
                }
            });
        }

        @PluginMethod
        public void exitFullscreen(PluginCall call) {
            getActivity().runOnUiThread(() -> {
                try {
                    // 1. Restore screen orientation to portrait / unspecified
                    getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);

                    // 2. Restore status bar and navigation bar (Show system bars)
                    Window window = getActivity().getWindow();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        window.setDecorFitsSystemWindows(true);
                        WindowInsetsController controller = window.getInsetsController();
                        if (controller != null) {
                            controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                        }
                    } else {
                        window.getDecorView().setSystemUiVisibility(
                            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        );
                    }
                    call.resolve();
                } catch (Exception e) {
                    call.reject(e.getMessage());
                }
            });
        }
    }
}
