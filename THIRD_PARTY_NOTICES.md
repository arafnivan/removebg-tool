# Third-party notices

ImageDoctor Background Remover is licensed under the
[GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0-only).

It includes or loads the third-party software listed below. Each component
stays under its own licence; all of them are compatible with the AGPL-3.0.
The full licence text of every bundled package is generated at build time
into `third-party-licenses.txt`, published with the site and linked from the
footer (see `scripts/third-party-licenses.js`).

## Loaded at runtime

| Component | Version | Licence | Source |
| --- | --- | --- | --- |
| @imgly/background-removal | 1.7.0 | AGPL-3.0 | https://github.com/imgly/background-removal-js |
| onnxruntime-web | 1.21.0 | MIT | https://github.com/microsoft/onnxruntime |
| onnxruntime-common | 1.21.0 | MIT | https://github.com/microsoft/onnxruntime |
| react | 19.3.0 | MIT | https://github.com/facebook/react |
| react-dom | 19.3.0 | MIT | https://github.com/facebook/react |
| scheduler | 0.28.0 | MIT | https://github.com/facebook/react |
| lucide-react | 1.46.0 | ISC | https://github.com/lucide-icons/lucide |
| @fontsource-variable/geist (Geist font) | 5.3.0 | OFL-1.1 | https://github.com/fontsource/font-files, https://github.com/vercel/geist-font |
| lodash-es | 4.18.1 | MIT | https://github.com/lodash/lodash |
| ndarray | 1.0.19 | MIT | https://github.com/mikolalysenko/ndarray |
| iota-array | 1.0.0 | MIT | https://github.com/mikolalysenko/iota-array |
| is-buffer | 1.1.6 | MIT | https://github.com/feross/is-buffer |
| zod | 3.25.76 | MIT | https://github.com/colinhacks/zod |
| platform | 1.3.6 | MIT | https://github.com/bestiejs/platform.js |
| flatbuffers | 25.9.23 | Apache-2.0 | https://github.com/google/flatbuffers |
| long | 5.3.2 | Apache-2.0 | https://github.com/dcodeIO/long.js |
| protobufjs and @protobufjs/* | 7.6.6 | BSD-3-Clause | https://github.com/protobufjs/protobuf.js |
| guid-typescript | 1.0.9 | ISC | https://github.com/NicolasDeveloper/guid-typescript |

Versions are the ones pinned in `package-lock.json` at the time of writing.
Run `npm ls --omit=dev --all` to see the current tree.

## AI model

The segmentation model is IS-Net
([Highly Accurate Dichotomous Image Segmentation](https://github.com/xuebinqin/DIS)),
listed by IMG.LY as MIT-licensed in `@imgly/background-removal`'s
`ThirdPartyLicenses.json`. The ONNX model files and the ONNX Runtime binaries
are downloaded at runtime from IMG.LY's CDN (`staticimgly.com`); they are not
part of this repository.

## Icons

Icons come from [Lucide](https://lucide.dev) (`lucide-react`), which is
licensed under the ISC License:

> Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part
> of Feather (MIT). All other copyright (c) for Lucide are held by Lucide
> Contributors 2022.
>
> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted, provided that the above
> copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
> REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
> AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
> INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
> LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
> OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
> PERFORMANCE OF THIS SOFTWARE.

The GitHub mark is a trademark of GitHub, Inc., used here only to link to the
source repository.

## Font

The Geist font is © Vercel, licensed under the
[SIL Open Font License 1.1](https://openfontlicense.org). The font files are
bundled from `@fontsource-variable/geist`; its licence text is in
`node_modules/@fontsource-variable/geist/LICENSE`.

## Brand assets

The ImageDoctor logo and favicon are not part of this repository. They are
loaded from the main ImageDoctor site at runtime and are not covered by the
AGPL-3.0.

## Development-only tools

Vite, @vitejs/plugin-react, Tailwind CSS and @tailwindcss/vite (all MIT) are
used to build the site. Only the CSS that Tailwind generates is included in
the built output.
