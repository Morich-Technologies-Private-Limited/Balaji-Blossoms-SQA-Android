/* App-side view of tenant.config.js plus the tenant's images. Import branding
   from here, never hard-code it.

   Metro needs static require() paths, so every tenant's images are listed and
   the active one (EXPO_PUBLIC_TENANT) is picked at runtime. Only images that
   are referenced end up in the bundle per platform, so keep this list short. */
import config from "../tenant.config";

const IMAGES = {
  balaji: {
    logo: require("../assets/brands/balaji/logo.png"),
    mark: require("../assets/brands/balaji/mark.png"),
    meta: require("../assets/brands/balaji/meta.json"),
  },
  morich: {
    logo: require("../assets/brands/morich/logo.png"),
    mark: require("../assets/brands/morich/mark.png"),
    meta: require("../assets/brands/morich/meta.json"),
  },
};

const images = IMAGES[config.id] ?? IMAGES.balaji;

export const TENANT = {
  ...config,
  images: { logo: images.logo, mark: images.mark },
  logoAspect: images.meta.logoAspect,
};

export default TENANT;
