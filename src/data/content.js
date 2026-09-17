/**
 * Page copy that is also used at build time (vite.config.js turns the FAQ
 * into structured data), so it lives in a plain module without JSX.
 */

export const SEO = {
  name: "ImageDoctor AI Background Remover",
  description:
    "Remove the background from JPG, PNG and WebP images for free. The AI runs in your browser, so photos are never uploaded.",
};

export const HOW_IT_WORKS = [
  "An AI segmentation model looks at every pixel and estimates how likely it is to belong to the main subject — a person, a product, a pet or an object. That estimate becomes a transparency mask, which is applied to your original image so the cut-out keeps its full resolution.",
  "Everything runs inside your browser, so your photo stays on your device the whole time. The first image takes a little longer while the AI model downloads; after that, most images finish in a few seconds.",
  "The cut-out is saved as a transparent PNG by default. You can also export a WebP, which keeps the transparency at a fraction of the size, or a JPG on a white or custom background colour.",
];

export const FAQ = [
  {
    q: "Is the background remover really free?",
    a: "Yes. There are no credits or watermarks, and no account is needed.",
  },
  {
    q: "Are my images uploaded anywhere?",
    a: "No. The image is processed on your own device and never sent to a server.",
  },
  {
    q: "Why is the PNG larger than my original JPG?",
    a: "Transparent images are saved as lossless PNG. Choose WebP under Export to keep the transparency at a fraction of the size, or JPG to put the subject on a solid background.",
  },
  {
    q: "Is there a size limit?",
    a: "Very large photos are scaled down before processing so your browser doesn't run out of memory: to about 16 megapixels on iPhone and iPad, and about 36 megapixels elsewhere.",
  },
];
