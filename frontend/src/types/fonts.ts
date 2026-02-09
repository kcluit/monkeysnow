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
];

export function getFontById(id: string): Font | undefined {
  return fonts.find(font => font.id === id);
}

export function getDefaultFont(): Font {
  return fonts[0]; // SF Pro Display
}
