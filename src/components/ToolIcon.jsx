import {
  Activity,
  Binary,
  Bookmark,
  CircleUser,
  Crop,
  Droplets,
  Eraser,
  FileCode2,
  FileImage,
  FileText,
  Gauge,
  IdCard,
  Image as ImageIcon,
  Info,
  Layers,
  Link2,
  Minimize2,
  MonitorSmartphone,
  Pipette,
  Repeat,
  Scaling,
  ScanFace,
  Share2,
  SlidersHorizontal,
  Stamp,
  WandSparkles,
} from "lucide-react";
import { cn } from "../lib/cn";

/** Explicit map keeps the icon set tree-shakeable. */
const ICONS = {
  Activity,
  Binary,
  Bookmark,
  CircleUser,
  Crop,
  Droplets,
  Eraser,
  FileCode2,
  FileImage,
  FileText,
  Gauge,
  IdCard,
  Info,
  Layers,
  Link2,
  Minimize2,
  MonitorSmartphone,
  Pipette,
  Repeat,
  Scaling,
  ScanFace,
  Share2,
  SlidersHorizontal,
  Stamp,
  WandSparkles,
};

const TILE_SIZES = {
  sm: { box: "size-7 rounded-md", icon: "size-3.5" },
  md: { box: "size-9 rounded-xl", icon: "size-[18px]" },
  lg: { box: "size-11 rounded-xl", icon: "size-5" },
};

/** A tool's icon on its own tinted tile, as on the main site. */
export function ToolTile({ icon, hue, size = "md", className }) {
  const Icon = ICONS[icon] ?? ImageIcon;
  const dims = TILE_SIZES[size];
  return (
    <span
      className={cn("tool-tile flex shrink-0 items-center justify-center", dims.box, className)}
      style={{ "--hue": hue }}
    >
      <Icon className={dims.icon} aria-hidden />
    </span>
  );
}
