import 'dotenv/config';

export default {
  expo: {
    name: "Sensybull",
    slug: "Sensybull",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "sensybull",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.sensybull.app",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "Sensybull needs access to your camera to set your profile photo.",
        NSPhotoLibraryUsageDescription: "Sensybull needs access to your photo library to set your profile photo.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.sensybull.app",
      versionCode: 1
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      router: {},
      eas: {
        // Run `eas init` to generate a new project ID under the new account
      },
      groqApiKey: process.env.GROQ_API_KEY,
      apiBaseUrl: process.env.API_BASE_URL,
    },
    // owner: Set this to your new Expo username after running `eas whoami`
    runtimeVersion: {
      policy: "appVersion"
    },
    // updates.url will be set after `eas init` generates a new project ID
  }
};