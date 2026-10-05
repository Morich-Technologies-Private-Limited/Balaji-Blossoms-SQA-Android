/* App-side view of tenant.config.js plus the images `npm run tenant`
   generates. Import branding from here, never hard-code it. */
import config from "../tenant.config";
import meta from "../assets/tenant/meta.json";

export const TENANT = {
  ...config,
  images: {
    logo: require("../assets/tenant/logo.png"),
    mark: require("../assets/tenant/mark.png"),
  },
  logoAspect: meta.logoAspect,
};

export default TENANT;
