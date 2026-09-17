/**
 * The tools on the main ImageDoctor site, for the header menus, footer and
 * related-tools list. Mirrors the main site's registry; update it when a tool
 * is added there.
 */

export const CATEGORIES = [
  { id: "main", label: "Main tools" },
  { id: "specialized", label: "Specialized tools" },
  { id: "developer", label: "Developer tools" },
];

export const TOOLS = [
  { slug: "compress", title: "Image Compressor", category: "main", icon: "Minimize2", hue: 250, description: "Shrink JPG, PNG and WebP files by quality or to an exact target size." },
  { slug: "resize", title: "Image Resizer", category: "main", icon: "Scaling", hue: 225, description: "Set exact dimensions, scale by percentage or fit inside a box." },
  { slug: "crop", title: "Image Cropper", category: "main", icon: "Crop", hue: 30, description: "Crop freely or to a fixed ratio, rotate, straighten and flip." },
  { slug: "convert", title: "Image Converter", category: "main", icon: "Repeat", hue: 185, description: "Convert between JPG, PNG, WebP and AVIF with transparency control." },
  { slug: "editor", title: "Image Editor", category: "main", icon: "SlidersHorizontal", hue: 330, description: "Adjust colour, then draw, annotate and add text." },
  { slug: "optimize", title: "Image Optimizer", category: "main", icon: "Gauge", hue: 155, description: "One-pass web optimisation: dimensions, format and metadata." },
  { slug: "batch", title: "Batch Image Tools", category: "main", icon: "Layers", hue: 275, description: "Resize, compress, convert and watermark dozens of images." },
  { slug: "watermark", title: "Watermark Tool", category: "main", icon: "Stamp", hue: 60, description: "Stamp text or a logo onto images, tiled or positioned." },
  { slug: "blur", title: "Blur & Pixelate", category: "main", icon: "Droplets", hue: 205, description: "Hide faces and sensitive details with blur or pixelation." },
  { slug: "image-to-pdf", title: "Image to PDF", category: "main", icon: "FileText", hue: 20, description: "Combine images into a single PDF." },
  { slug: "pdf-to-image", title: "PDF to Image", category: "main", icon: "FileImage", hue: 355, description: "Render PDF pages to PNG or JPG." },
  { slug: "social-resizer", title: "Social Media Image Resizer", category: "specialized", icon: "Share2", hue: 300, description: "Every post, cover and profile size for the big platforms." },
  { slug: "passport-photo", title: "Passport Photo Maker", category: "specialized", icon: "IdCard", hue: 265, description: "Passport and visa photos at the exact size, ready to print." },
  { slug: "id-photo", title: "ID Photo Maker", category: "specialized", icon: "ScanFace", hue: 240, description: "ID card and badge photos with custom size and background." },
  { slug: "profile-picture", title: "Profile Picture Maker", category: "specialized", icon: "CircleUser", hue: 345, description: "Frame an avatar as a circle or square with borders." },
  { slug: "brand-poster", title: "Brand Poster Maker", category: "specialized", icon: "LayoutTemplate", hue: 290, description: "Design on-brand posters and social graphics from templates." },
  { slug: "favicon", title: "Favicon Generator", category: "specialized", icon: "Bookmark", hue: 75, description: "favicon.ico, every PNG size and the HTML snippet." },
  { slug: "screenshot", title: "Screenshot Tool", category: "specialized", icon: "MonitorSmartphone", hue: 215, description: "Crop, annotate and blur screenshots." },
  { slug: "base64", title: "Image to Base64", category: "developer", icon: "Binary", hue: 165, description: "Encode an image as a Base64 string or data URI." },
  { slug: "base64-to-image", title: "Base64 to Image", category: "developer", icon: "FileCode2", hue: 180, description: "Decode a Base64 string back into an image." },
  { slug: "metadata", title: "Image Metadata Viewer", category: "developer", icon: "Info", hue: 140, description: "Read EXIF, camera, GPS and colour data." },
  { slug: "metadata-remover", title: "Image Metadata Remover", category: "developer", icon: "Eraser", hue: 10, description: "Strip EXIF and GPS information before sharing." },
  { slug: "color-picker", title: "Color Picker", category: "developer", icon: "Pipette", hue: 315, description: "Sample any pixel for HEX, RGB and HSL values." },
  { slug: "analyze", title: "Image Analyzer", category: "developer", icon: "Activity", hue: 130, description: "Inspect dimensions, weight and transparency." },
  { slug: "image-url", title: "Image URL Processor", category: "developer", icon: "Link2", hue: 195, description: "Load an image by URL, then resize, compress or convert it." },
];

export const RELATED_TOOLS = ["convert", "crop", "profile-picture", "passport-photo"].map((slug) =>
  TOOLS.find((tool) => tool.slug === slug),
);

export const toolsIn = (category) => TOOLS.filter((tool) => tool.category === category);

/**
 * This tool, described the way the main site describes it (its
 * BACKGROUND_REMOVER entry). The main site highlights it in the header, the
 * mobile menu and the footer; here those links point at the current page.
 */
export const THIS_TOOL = {
  title: "AI Background Remover",
  shortTitle: "Remove Background",
  navTitle: "Remove BG",
  badge: "AI",
  description:
    "Cut out people, products, pets and objects automatically and download a transparent PNG — the AI runs on your device.",
  href: import.meta.env.BASE_URL,
  icon: "WandSparkles",
  hue: 290,
};
