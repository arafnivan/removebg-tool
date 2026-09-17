import { LIBRARY_URL, LICENSE_URL, MAIN_SITE_NAME, MAIN_SITE_URL, SOURCE_URL } from "../config";

/**
 * The source link here is what satisfies AGPL-3.0 section 13: everyone using
 * this page over the network is offered the source of the running version.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <p>
          Part of <a href={MAIN_SITE_URL}>{MAIN_SITE_NAME}</a> — free image tools that run in your browser.
        </p>
        <p>
          Free software under the{" "}
          <a href={LICENSE_URL} target="_blank" rel="noopener">
            GNU AGPL-3.0
          </a>{" "}
          ·{" "}
          <a href={SOURCE_URL} target="_blank" rel="noopener">
            Source code
          </a>{" "}
          · Powered by{" "}
          <a href={LIBRARY_URL} target="_blank" rel="noopener">
            @imgly/background-removal
          </a>
        </p>
      </div>
    </footer>
  );
}
