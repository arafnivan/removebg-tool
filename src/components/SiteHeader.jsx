import { MAIN_SITE_NAME, MAIN_SITE_URL, SOURCE_URL } from "../config";
import { GitHubIcon, WandIcon } from "./Icons";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href={MAIN_SITE_URL}>
          <span className="brand-mark">
            <WandIcon size={18} />
          </span>
          <span className="brand-name">{MAIN_SITE_NAME}</span>
          <span className="brand-sub">Background Remover</span>
        </a>
        <a className="button button-ghost" href={SOURCE_URL} target="_blank" rel="noopener">
          <GitHubIcon />
          <span className="hide-sm">Source code</span>
        </a>
      </div>
    </header>
  );
}
