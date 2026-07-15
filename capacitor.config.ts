import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shajon.iptv',
  appName: 'IPTV',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    allowNavigation: ['*']
  }
};

export default config;

