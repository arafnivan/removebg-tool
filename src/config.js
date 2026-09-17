/**
 * Links shown on the page. Override them at build time with environment
 * variables (see .env.example) instead of editing this file.
 *
 * SOURCE_URL matters for the licence: the AGPL-3.0 (section 13) requires a
 * public deployment to offer its users the source code of the version they
 * are using, so it must point at the repository you actually deploy from.
 */
export const SOURCE_URL = import.meta.env.VITE_SOURCE_URL || "https://github.com/arafnivan/removebg-tool";

export const MAIN_SITE_URL = import.meta.env.VITE_MAIN_SITE_URL || "https://imgdoctor.vercel.app";

export const MAIN_SITE_NAME = "ImageDoctor";

export const LICENSE_URL = "https://www.gnu.org/licenses/agpl-3.0.html";

export const LIBRARY_URL = "https://github.com/imgly/background-removal-js";
