const fs = require('fs');
const path = require('path');
const os = require('os');

const localPropertiesPath = path.join(__dirname, '../android/local.properties');

// If local.properties already exists, nothing to do
if (fs.existsSync(localPropertiesPath)) {
  console.log('android/local.properties already exists. Skipping SDK auto-detection.');
  process.exit(0);
}

// If ANDROID_HOME or ANDROID_SDK_ROOT environment variables are set, Gradle will use them
if (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT) {
  console.log('Android SDK environment variable is set. Skipping SDK auto-detection.');
  process.exit(0);
}

// Try to auto-detect Android SDK paths in default locations
let sdkPath = '';
const homeDir = os.homedir();

if (process.platform === 'win32') {
  const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData/Local');
  const winPath = path.join(localAppData, 'Android/Sdk');
  if (fs.existsSync(winPath)) {
    sdkPath = winPath;
  }
} else if (process.platform === 'darwin') {
  const macPath = path.join(homeDir, 'Library/Android/sdk');
  if (fs.existsSync(macPath)) {
    sdkPath = macPath;
  }
} else {
  // Linux and other platforms
  const linuxPath1 = path.join(homeDir, 'Android/Sdk');
  const linuxPath2 = '/usr/lib/android-sdk';
  if (fs.existsSync(linuxPath1)) {
    sdkPath = linuxPath1;
  } else if (fs.existsSync(linuxPath2)) {
    sdkPath = linuxPath2;
  }
}

if (sdkPath) {
  console.log(`Auto-detected Android SDK at: ${sdkPath}`);
  try {
    // Write local.properties with forward slashes for cross-platform safety
    const formattedPath = sdkPath.replace(/\\/g, '/');
    fs.writeFileSync(localPropertiesPath, `sdk.dir=${formattedPath}\n`);
    console.log('Generated android/local.properties successfully.');
  } catch (err) {
    console.error('Failed to create android/local.properties:', err.message);
  }
} else {
  console.warn(
    '\n⚠️  WARNING: Android SDK location not found.\n' +
    'Please set the ANDROID_HOME environment variable, open the "android" folder in Android Studio,\n' +
    'or create "android/local.properties" manually with your "sdk.dir" path.\n'
  );
}
