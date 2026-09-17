/**
 * Collects the licence text of every production dependency (and their
 * dependencies) into one file, so the deployed site carries the notices its
 * bundled code requires. Runs at build time; see vite.config.js.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\.|-|$)/i;

/** Copyright holders for packages whose npm tarball has no licence file. */
const HOLDERS = {
  "onnxruntime-common": "Microsoft Corporation",
  "onnxruntime-web": "Microsoft Corporation",
};

/** Packages whose package.json points elsewhere for the licence name. */
const LICENSE_NAMES = {
  "@imgly/background-removal": "AGPL-3.0",
};

const TEMPLATES = {
  MIT: (holder) => `MIT License

Copyright (c) ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  ISC: (holder) => `ISC License

Copyright (c) ${holder}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
};

function authorOf(pkg) {
  const author = typeof pkg.author === "string" ? pkg.author : pkg.author?.name;
  return author?.replace(/\s*<[^>]*>/, "").trim();
}

/** Standard licence text for a package that ships without a licence file. */
function fallbackText(pkg, license) {
  const template = TEMPLATES[license];
  const holder = HOLDERS[pkg.name] ?? authorOf(pkg);
  if (!template || !holder) {
    throw new Error(`No licence text for ${pkg.name} (${license}); add it to HOLDERS or TEMPLATES.`);
  }
  return `(Standard ${license} licence text; the package does not include a licence file.)\n\n${template(holder)}`;
}

/** Find a package's folder the way Node resolves it: walk up node_modules. */
function findPackage(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function licenseOf(pkg) {
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((entry) => entry.type ?? entry).join(" OR ");
  return "UNKNOWN";
}

function repositoryOf(pkg) {
  const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  return (repo || pkg.homepage || "").replace(/^git\+/, "").replace(/\.git$/, "");
}

export function collectThirdPartyLicenses(rootDir) {
  const root = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
  const found = new Map();

  const visit = (name, fromDir, optional) => {
    const dir = findPackage(name, fromDir);
    if (!dir) {
      // Optional platform binaries are only installed where they apply.
      if (!optional) throw new Error(`Dependency "${name}" is not installed; run npm install.`);
      return;
    }
    if (found.has(dir)) return;
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    const files = readdirSync(dir).filter((file) => LICENSE_FILE.test(file));
    const license = LICENSE_NAMES[pkg.name] ?? licenseOf(pkg);
    found.set(dir, {
      name: pkg.name,
      version: pkg.version,
      license,
      repository: repositoryOf(pkg),
      texts: files.length
        ? files.map((file) => readFileSync(join(dir, file), "utf8").trim())
        : [fallbackText(pkg, license)],
    });
    for (const dep of Object.keys(pkg.dependencies ?? {})) visit(dep, dir, false);
    for (const dep of Object.keys(pkg.optionalDependencies ?? {})) visit(dep, dir, true);
    for (const dep of Object.keys(pkg.peerDependencies ?? {})) {
      visit(dep, dir, pkg.peerDependenciesMeta?.[dep]?.optional ?? false);
    }
  };

  for (const dep of Object.keys(root.dependencies ?? {})) visit(dep, rootDir, false);

  const entries = [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
  const sections = entries.map((entry) => {
    const header = `${entry.name} ${entry.version} — ${entry.license}${entry.repository ? `\n${entry.repository}` : ""}`;
    return `${"=".repeat(78)}\n${header}\n${"=".repeat(78)}\n\n${entry.texts.join("\n\n")}\n`;
  });

  return [
    "Third-party software included in ImageDoctor Background Remover",
    "",
    "This site is licensed under the GNU AGPL-3.0 (see LICENSE.txt). It includes",
    "the following packages, each under its own licence, reproduced below.",
    "",
    ...entries.map((entry) => `- ${entry.name} ${entry.version} (${entry.license})`),
    "",
    ...sections,
  ].join("\n");
}
