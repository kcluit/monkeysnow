import { z } from 'zod';

// Zod schema for font validation
export const FontSchema = z.object({
  id: z.string(),
  name: z.string(),
  family: z.string(),           // CSS font-family value
  googleFontsUrl: z.string().optional(), // Google Fonts URL (if applicable)
  isMonospace: z.boolean(),
  // The alphabets it has letters for; a language written in another draws them in the fallback font
  scripts: z.array(z.enum(['latin', 'cyrillic', 'han'])),
});

export type Font = z.infer<typeof FontSchema>;

// Font definitions - mix of sans-serif and monospace
export const fonts: Font[] = [
  {
    id: 'sf-pro',
    name: 'SF Pro Display',
    family: "'SF Pro Display', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.cdnfonts.com/css/sf-pro-display',
    isMonospace: false,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'roboto',
    name: 'Roboto',
    family: "'Roboto', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'lexend',
    name: 'Lexend Deca',
    family: "'Lexend Deca', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin'],
  },
  {
    id: 'jetbrains',
    name: 'JetBrains Mono',
    family: "'JetBrains Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap',
    isMonospace: true,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'fira-code',
    name: 'Fira Code',
    family: "'Fira Code', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap',
    isMonospace: true,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'ibm-plex',
    name: 'IBM Plex Mono',
    family: "'IBM Plex Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap',
    isMonospace: true,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'roboto-mono',
    name: 'Roboto Mono',
    family: "'Roboto Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap',
    isMonospace: true,
    scripts: ['latin', 'cyrillic'],
  },
  // --- Sans-serif additions ---
  {
    id: 'geist',
    name: 'Geist',
    family: "'Geist', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin'],
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    family: "'DM Sans', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin'],
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: "'Outfit', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin'],
  },
  {
    id: 'nunito',
    name: 'Nunito',
    family: "'Nunito', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    family: "'Space Grotesk', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
    isMonospace: false,
    scripts: ['latin'],
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: "'Poppins', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin'],
  },
  {
    id: 'comfortaa',
    name: 'Comfortaa',
    family: "'Comfortaa', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&display=swap',
    isMonospace: false,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'comic-sans',
    name: 'Comic Sans MS',
    family: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif",
    isMonospace: false,
    scripts: ['latin', 'cyrillic'],
  },
  // --- Monospace additions ---
  {
    id: 'geist-mono',
    name: 'Geist Mono',
    family: "'Geist Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700;800&display=swap',
    isMonospace: true,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'space-mono',
    name: 'Space Mono',
    family: "'Space Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
    isMonospace: true,
    scripts: ['latin'],
  },
  {
    id: 'source-code-pro',
    name: 'Source Code Pro',
    family: "'Source Code Pro', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600;700;800&display=swap',
    isMonospace: true,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'inconsolata',
    name: 'Inconsolata',
    family: "'Inconsolata', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;500;600;700;800&display=swap',
    isMonospace: true,
    scripts: ['latin'],
  },
  // --- Serif additions ---
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: "'Playfair Display', Georgia, serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap',
    isMonospace: false,
    scripts: ['latin', 'cyrillic'],
  },
  {
    id: 'lora',
    name: 'Lora',
    family: "'Lora', Georgia, serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
    isMonospace: false,
    scripts: ['latin', 'cyrillic'],
  },
  // --- Accessibility ---
  {
    id: 'open-dyslexic',
    name: 'OpenDyslexic',
    family: "'Open-Dyslexic', 'OpenDyslexic', sans-serif", // cdnfonts names the family 'Open-Dyslexic'
    googleFontsUrl: 'https://fonts.cdnfonts.com/css/open-dyslexic',
    isMonospace: false,
    scripts: ['latin'],
  },
];

// None of the fonts above has Chinese characters. Named before a stack's generic family,
// these draw them in a sans-serif face on every platform (Mac and iPhone, older Macs,
// Windows, Android and Linux), where the generic monospace would give Windows' serif
// NSimSun. A serif stack keeps its generic, whose Chinese face is a serif one too.
const CHINESE_SANS_SERIF = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC'";

/** The CSS font-family to apply for a font: its own, with a Chinese face before its generic family */
export function fontFamilyWithChinese(font: Font): string {
  const families = font.family.split(',').map(family => family.trim());
  const generic = families[families.length - 1];
  if (generic === 'serif') return font.family;
  return [...families.slice(0, -1), CHINESE_SANS_SERIF, generic].join(', ');
}

/**
 * Whether the font pickers mark a font as having no letters for a language's script: only
 * where another font has them, so picking it would change the language's text. No font
 * here has Chinese characters, so in Chinese none is marked.
 */
export function lacksLettersFor(font: Font, script: Font['scripts'][number]): boolean {
  return !font.scripts.includes(script) && fonts.some(other => other.scripts.includes(script));
}

export function getFontById(id: string): Font | undefined {
  return fonts.find(font => font.id === id);
}

export function getDefaultFont(): Font {
  return fonts[0]; // SF Pro Display
}
