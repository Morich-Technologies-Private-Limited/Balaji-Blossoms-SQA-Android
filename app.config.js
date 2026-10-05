/* Tenant-specific values come from tenant.config.js — edit that, not this. */
const tenant = require("./tenant.config");

module.exports = {
  expo: {
    name: tenant.appName,
    slug: "sqa-app",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/tenant/icon.png",
    scheme: "sqaapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/tenant/adaptive-foreground.png",
        backgroundColor: tenant.iconBackgroundColor,
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: tenant.androidPackage,
    },
    web: {
      output: "static",
      favicon: "./assets/tenant/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/tenant/logo.png",
          imageWidth: 176,
          resizeMode: "contain",
          backgroundColor: tenant.splashBackgroundColor,
          ios: {
            image: "./assets/tenant/logo.png",
            imageWidth: 220,
            resizeMode: "contain",
            backgroundColor: tenant.splashBackgroundColor,
          },
        },
      ],
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "eefd0283-9033-4489-b686-d17b8a988497",
      },
    },
  },
};
