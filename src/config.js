/**
 * Links shown on the page. Override them at build time with environment
 * variables (see .env.example) instead of editing this file.
 *
 * SOURCE_URL matters for the licence: the AGPL-3.0 (section 13) requires a
 * public deployment to offer its users the source code of the version they
 * are using, so it must point at the repository you actually deploy from.
 */
export const SOURCE_URL = import.meta.env.VITE_SOURCE_URL || "https://github.com/arafnivan/removebg-tool";

export const MAIN_SITE_URL = (import.meta.env.VITE_MAIN_SITE_URL || "https://imgdoctor.vercel.app").replace(
  /\/$/,
  "",
);

export const MAIN_SITE_NAME = "ImageDoctor";

/** A page on the main site, e.g. mainUrl("/tools"). */
export const mainUrl = (path = "/") => `${MAIN_SITE_URL}${path}`;

/**
 * The ImageDoctor logo, served from this site (public/brand/) so it loads
 * under the page's cross-origin isolation and Content-Security-Policy. The
 * brand artwork is not covered by this repository's AGPL-3.0 licence (see
 * THIRD_PARTY_NOTICES.md).
 */
export const LOGO_URL = `${import.meta.env.BASE_URL}brand/logo.png`;
export const LOGO_WIDTH = 991;
export const LOGO_HEIGHT = 220;

/** Shown in the footer's copyright notice. */
export const COPYRIGHT = "© 2026 ImageDoctor Background Remover";

/** Licence files published with the site (see vite.config.js). */
export const LICENSE_URL = "./LICENSE.txt";
export const THIRD_PARTY_LICENSES_URL = "./third-party-licenses.txt";

export const LIBRARY_URL = "https://github.com/imgly/background-removal-js";
