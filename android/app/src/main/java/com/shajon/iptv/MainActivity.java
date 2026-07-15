package com.shajon.iptv;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Localhost.startServer();
        registerPlugin(OrientationPlugin.class);
    }

    @CapacitorPlugin(name = "OrientationPlugin")
    public static class OrientationPlugin extends Plugin {
        @PluginMethod
        public void setLandscape(PluginCall call) {
            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                    call.resolve();
                } catch (Exception e) {
                    call.reject(e.getMessage());
                }
            });
        }

        @PluginMethod
        public void unlock(PluginCall call) {
            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                    call.resolve();
                } catch (Exception e) {
                    call.reject(e.getMessage());
                }
            });
        }
    }
}
