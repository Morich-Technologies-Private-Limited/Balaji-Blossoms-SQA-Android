/* ------------------------------------------------------------------ */
/* Tenant configuration — the ONE place to change branding.           */
/*                                                                     */
/* Pick the tenant in .env:  EXPO_PUBLIC_TENANT=balaji | morich        */
/* then restart Expo with `npx expo start -c` (or rebuild with EAS —   */
/* set the same variable in the EAS build profile / environment).      */
/*                                                                     */
/* Each tenant's images live in assets/brands/<tenant>/. To add a      */
/* tenant: add an entry below, put its logos in                        */
/* assets/brands/<tenant>/src/, run `npm run tenant -- <tenant>` to    */
/* render the icon / splash / favicon, and add its images to the       */
/* require map in constants/tenant.js.                                 */
/*                                                                     */
/* Everything else (login page, sidebars, splash, app icon, app name,  */
/* Android package, API URL) reads from here.                          */
/*                                                                     */
/* Plain CommonJS on purpose: this file is read by Node (app.config.js */
/* and scripts/sync-tenant.js) as well as by the app bundle.           */
/* ------------------------------------------------------------------ */

const TENANTS = {
  balaji: {
    /* Identity */
    name: "Balaji Blossoms", // footer, accessibility labels
    appName: "Sales App", // name under the icon on the phone

    /* Sidebar wordmark, shown next to the logo mark */
    wordmark: { title: "BALAJI", subtitle: "BLOSSOMS" },

    /* Backend (EXPO_PUBLIC_BASE_URL in .env overrides it, e.g. for localhost) */
    apiBaseUrl: "https://sales.balajiblossomsstore.com/api/sqa",

    /* Android application id. Changing it installs as a separate app. */
    androidPackage: "com.balajiblossoms.sqaapp",

    /* Colours used for the app icon and the splash screen */
    iconBackgroundColor: "#021F63",
    splashBackgroundColor: "#FFFFFF",

    /* Logo sources, read only by `npm run tenant`. Balaji's images in
       assets/brands/balaji/ are main's originals, so don't re-render them
       unless the logo changes. */
    logos: {
      logo: "./assets/brands/balaji/src/logo.png", // full logo — login + splash
      mark: "./assets/brands/balaji/src/mark.png", // square mark — sidebar + app icon
    },
  },

  morich: {
    name: "Morich Technologies",
    appName: "Sales App",

    wordmark: { title: "MORICH", subtitle: "TECHNOLOGIES" },

    apiBaseUrl: "https://sales.morichtechnologies.com/api/sqa",

    androidPackage: "com.morichtechnologies.sqaapp",

    iconBackgroundColor: "#FFFFFF",
    splashBackgroundColor: "#FFFFFF",

    logos: {
      logo: "./assets/brands/morich/src/logo.svg",
      mark: "./assets/brands/morich/src/mark.svg",
    },
  },
};

/* Written exactly as process.env.EXPO_PUBLIC_TENANT so Expo inlines it into the bundle. */
const requested = String(process.env.EXPO_PUBLIC_TENANT || "balaji").trim().toLowerCase();
const id = TENANTS[requested] ? requested : "balaji";

if (!TENANTS[requested]) {
  console.warn(
    `Unknown EXPO_PUBLIC_TENANT "${requested}" — using "balaji". Known: ${Object.keys(TENANTS).join(", ")}`,
  );
}

const active = TENANTS[id];

module.exports = {
  ...active,
  id,
  apiBaseUrl: process.env.EXPO_PUBLIC_BASE_URL || active.apiBaseUrl,
  TENANTS,
};
