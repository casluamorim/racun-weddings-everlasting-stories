export type GridLayout =
  | "masonry"
  | "classic"
  | "editorial"
  | "magazine"
  | "minimal"
  | "fullscreen"
  | "slider";

export type DesignSettings = {
  cover: {
    type: "image" | "video" | "slider";
    heightVh: number;
    overlay: number; // 0..1
    blur: number; // 0..20 px
    position: "left" | "center" | "right";
    align: "top" | "center" | "bottom";
    zoom: number; // 1..1.5
    parallax: boolean;
    heroVideoUrl?: string;
    desktopUrl?: string;
    mobileUrl?: string;
  };
  typography: {
    heading: string;
    body: string;
    titleSize: number;
    titleWeight: number;
    letterSpacing: number; // em * 100
    align: "left" | "center" | "right";
    titleColor: string;
    subtitleColor: string;
  };
  colors: {
    primary: string;
    secondary: string;
    bg: string;
    text: string;
    button: string;
    overlay: string;
  };
  grid: {
    layout: GridLayout;
    columns: number;
    gap: number;
    radius: number;
    shadow: "none" | "sm" | "md" | "lg";
    hover: "zoom" | "fade" | "lift" | "none";
  };
  toggles: {
    showCouple: boolean;
    showDate: boolean;
    showVenue: boolean;
    showDescription: boolean;
    showCta: boolean;
    showFilm: boolean;
    showCount: boolean;
    showFavorites: boolean;
    showDownload: boolean;
    showShare: boolean;
  };
};

export const DEFAULT_DESIGN: DesignSettings = {
  cover: {
    type: "image",
    heightVh: 90,
    overlay: 0.55,
    blur: 0,
    position: "left",
    align: "bottom",
    zoom: 1,
    parallax: false,
  },
  typography: {
    heading: "Cormorant Garamond",
    body: "Montserrat",
    titleSize: 72,
    titleWeight: 400,
    letterSpacing: 0,
    align: "left",
    titleColor: "#ffffff",
    subtitleColor: "#f5f5f5",
  },
  colors: {
    primary: "#f60eca",
    secondary: "#111111",
    bg: "#0a0a0a",
    text: "#f5f5f5",
    button: "#f60eca",
    overlay: "#000000",
  },
  grid: {
    layout: "masonry",
    columns: 4,
    gap: 8,
    radius: 0,
    shadow: "none",
    hover: "zoom",
  },
  toggles: {
    showCouple: true,
    showDate: true,
    showVenue: true,
    showDescription: true,
    showCta: true,
    showFilm: true,
    showCount: true,
    showFavorites: true,
    showDownload: true,
    showShare: true,
  },
};

export function mergeDesign(raw: unknown): DesignSettings {
  const d = (raw ?? {}) as Partial<DesignSettings>;
  return {
    cover: { ...DEFAULT_DESIGN.cover, ...(d.cover ?? {}) },
    typography: { ...DEFAULT_DESIGN.typography, ...(d.typography ?? {}) },
    colors: { ...DEFAULT_DESIGN.colors, ...(d.colors ?? {}) },
    grid: { ...DEFAULT_DESIGN.grid, ...(d.grid ?? {}) },
    toggles: { ...DEFAULT_DESIGN.toggles, ...(d.toggles ?? {}) },
  };
}

export const FONT_OPTIONS = [
  "Cormorant Garamond",
  "Playfair Display",
  "EB Garamond",
  "Bodoni Moda",
  "Cinzel",
  "Cormorant Infant",
  "Libre Caslon Text",
  "Montserrat",
  "Inter",
  "Jost",
  "DM Sans",
];

// Load Google Fonts once for editor preview + public view.
export function ensureFontsLoaded(fonts: string[]) {
  if (typeof document === "undefined") return;
  const id = "racun-gallery-fonts";
  const families = Array.from(new Set(fonts.filter(Boolean)))
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700`)
    .join("&");
  if (!families) return;
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

export function hexToRgba(hex: string, a = 1): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
