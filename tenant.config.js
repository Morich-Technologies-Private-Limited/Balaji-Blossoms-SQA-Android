/* ------------------------------------------------------------------ */
/* Tenant configuration — the ONE place to change branding.           */
/*                                                                     */
/* To rebrand for a new tenant:                                        */
/*   1. Update the logos in ../frontend/src/assets/ (or point the      */
/*      `logos` paths below at other files).                           */
/*   2. Update the values in this file.                                */
/*   3. Run `npm run tenant` — copies the logos into assets/tenant/    */
/*      and renders the app icon, splash and favicon from them.        */
/*   4. Restart Expo with `npx expo start -c` (or rebuild with EAS).   */
/*                                                                     */
/* Everything else (login page, sidebars, splash, app icon, app name,  */
/* Android package, API URL) reads from here.                          */
/*                                                                     */
/* Plain CommonJS on purpose: this file is read by Node (app.config.js */
/* and scripts/sync-tenant.js) as well as by the app bundle.           */
/* ------------------------------------------------------------------ */

module.exports = {
  /* Identity */
  name: "Morich Technologies", // footer, accessibility labels
  appName: "Sales App", // name under the icon on the phone

  /* Sidebar wordmark, shown next to the logo mark */
  wordmark: {
    title: "MORICH",
    subtitle: "TECHNOLOGIES",
  },

  /* Backend */
  apiBaseUrl: "https://sales.morichtechnologies.com/api/sqa",

  /* Android application id. Changing it installs as a separate app. */
  androidPackage: "com.morichtechnologies.sqaapp",

  /* Colours used for the generated app icon and the splash screen */
  iconBackgroundColor: "#FFFFFF",
  splashBackgroundColor: "#FFFFFF",

  /* Logo sources, relative to this file. SVG or PNG.
     These are read by `npm run tenant` only — the app itself uses the
     copies it writes to assets/tenant/, so builds don't need ../frontend. */
  logos: {
    logo: "../frontend/src/assets/logo.svg", // full logo — login + splash
    mark: "../frontend/src/assets/logo_mark.svg", // square mark — sidebar + app icon
  },
};
