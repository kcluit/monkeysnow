import { z } from 'zod';

// Zod schema for font validation
export const FontSchema = z.object({
  id: z.string(),
  name: z.string(),
  family: z.string(),           // CSS font-family value
  googleFontsUrl: z.string().optional(), // Google Fonts URL (if applicable)
  isMonospace: z.boolean(),
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
  },
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'roboto',
    name: 'Roboto',
    family: "'Roboto', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'lexend',
    name: 'Lexend Deca',
    family: "'Lexend Deca', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'jetbrains',
    name: 'JetBrains Mono',
    family: "'JetBrains Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap',
    isMonospace: true,
  },
  {
    id: 'fira-code',
    name: 'Fira Code',
    family: "'Fira Code', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap',
    isMonospace: true,
  },
  {
    id: 'ibm-plex',
    name: 'IBM Plex Mono',
    family: "'IBM Plex Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap',
    isMonospace: true,
  },
  {
    id: 'roboto-mono',
    name: 'Roboto Mono',
    family: "'Roboto Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap',
    isMonospace: true,
  },
  // --- Sans-serif additions ---
  {
    id: 'geist',
    name: 'Geist',
    family: "'Geist', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    family: "'DM Sans', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: "'Outfit', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'nunito',
    name: 'Nunito',
    family: "'Nunito', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    family: "'Space Grotesk', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: "'Poppins', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'comfortaa',
    name: 'Comfortaa',
    family: "'Comfortaa', system-ui, sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'comic-sans',
    name: 'Comic Sans MS',
    family: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif",
    isMonospace: false,
  },
  // --- Monospace additions ---
  {
    id: 'geist-mono',
    name: 'Geist Mono',
    family: "'Geist Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&display=swap',
    isMonospace: true,
  },
  {
    id: 'space-mono',
    name: 'Space Mono',
    family: "'Space Mono', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
    isMonospace: true,
  },
  {
    id: 'source-code-pro',
    name: 'Source Code Pro',
    family: "'Source Code Pro', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600;700&display=swap',
    isMonospace: true,
  },
  {
    id: 'inconsolata',
    name: 'Inconsolata',
    family: "'Inconsolata', monospace",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;500;600;700&display=swap',
    isMonospace: true,
  },
  // --- Serif additions ---
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: "'Playfair Display', Georgia, serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
  {
    id: 'lora',
    name: 'Lora',
    family: "'Lora', Georgia, serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
    isMonospace: false,
  },
];

export function getFontById(id: string): Font | undefined {
  return fonts.find(font => font.id === id);
}

export function getDefaultFont(): Font {
  return fonts[0]; // SF Pro Display
}
