#!/usr/bin/env node
/* global __dirname */

/**
 * Renders every image a tenant needs from the logos named in tenant.config.js,
 * into assets/brands/<tenant>/:
 *
 *   logo.png                 full logo (login page, splash)
 *   mark.png                 square mark (sidebars)
 *   icon.png                 app icon — mark on iconBackgroundColor
 *   adaptive-foreground.png  Android adaptive icon foreground
 *   favicon.png              web favicon
 *   meta.json                logo aspect ratio, used to size the splash
 *
 * The results are committed, so builds don't need the source logos' tools.
 *
 * Usage: npm run tenant -- <tenant>     e.g. npm run tenant -- morich
 *        (no argument → the EXPO_PUBLIC_TENANT tenant)
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const { TENANTS, id: activeId } = require("../tenant.config");

const tenantId = (process.argv[2] || activeId).trim().toLowerCase();
const tenant = TENANTS[tenantId];
if (!tenant) {
  console.error(`Unknown tenant "${tenantId}". Known: ${Object.keys(TENANTS).join(", ")}`);
  process.exit(1);
}
const OUT = path.join(ROOT, "assets", "brands", tenantId);

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function readSource(key) {
  const file = path.resolve(ROOT, tenant.logos[key]);
  if (!fs.existsSync(file)) {
    throw new Error(`logos.${key} not found: ${file}`);
  }
  return file;
}

/* SVGs are rasterised at a high density so the result stays sharp. */
function load(file) {
  return sharp(file, { density: 600 });
}

/* Renders `file` to fit inside size*scale and centres it on a size x size
   square of `background`. */
async function square(file, size, scale, background, outName) {
  const inner = Math.round(size * scale);
  const art = await load(file)
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, outName));
}

async function main() {
  const logoFile = readSource("logo");
  const markFile = readSource("mark");

  fs.mkdirSync(OUT, { recursive: true });

  // Full logo: fixed width, height follows the artwork.
  const logo = await load(logoFile)
    .resize({ width: 1200 })
    .png()
    .toFile(path.join(OUT, "logo.png"));

  await square(markFile, 512, 1, TRANSPARENT, "mark.png");
  await square(markFile, 1024, 0.72, tenant.iconBackgroundColor, "icon.png");
  // Android crops adaptive icons to a circle/squircle; keep inside the safe zone.
  await square(markFile, 1024, 0.58, TRANSPARENT, "adaptive-foreground.png");
  await square(markFile, 48, 1, TRANSPARENT, "favicon.png");

  fs.writeFileSync(
    path.join(OUT, "meta.json"),
    JSON.stringify({ logoAspect: logo.width / logo.height }, null, 2) + "\n",
  );

  console.log(`Tenant "${tenant.name}" synced to assets/brands/${tenantId}/`);
  console.log("Restart Expo with `npx expo start -c` to pick up the changes.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
