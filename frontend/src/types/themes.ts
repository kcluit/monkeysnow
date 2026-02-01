import { z } from 'zod';

// Zod schema for theme validation
// Derived CSS var: --border (computed from isDark)
export const ThemeColorsSchema = z.object({
    background: z.string(),       // Main page background
    cardBg: z.string(),           // Card/panel backgrounds (semi-transparent)
    textPrimary: z.string(),      // Primary text color
    textSecondary: z.string(),    // Muted/secondary text color
    accent: z.string(),           // Links, highlights, interactive elements
    secondary: z.string(),        // Secondary/hover states
    titleColor: z.string(),       // Logo/title color (solid or gradient)
    specialColor: z.string(),     // Special highlights like powder days (solid or gradient)
});

export const ThemeSchema = z.object({
    id: z.string(),
    name: z.string(),
    isDark: z.boolean(),
    colors: ThemeColorsSchema,
});

export type ThemeColors = z.infer<typeof ThemeColorsSchema>;
export type Theme = z.infer<typeof ThemeSchema>;

// Theme definitions
export const themes: Theme[] = [
    {
        id: 'light',
        name: 'Light',
        isDark: false,
        colors: {
            background: '#ffffffff',
            cardBg: 'rgba(255, 255, 255, 0.8)',
            textPrimary: '#1d1d1f',
            textSecondary: '#6d6d75ff',
            accent: '#0071e3',
            secondary: '#f7f7f7ff',
            titleColor: 'linear-gradient(209deg, #ea6044 39%, #dc5083 50%, #9a6df7 67%, #3f8def 81%)',
            specialColor: 'linear-gradient(90deg, #0071e3, #af52de)',
        },
    },
    {
        id: 'dark',
        name: 'Dark',
        isDark: true,
        colors: {
            background: '#000000ff',
            cardBg: 'rgba(28, 28, 30, 0.8)',
            textPrimary: '#f5f5f7',
            textSecondary: '#a1a1a6',
            accent: '#0a84ff',
            secondary: '#2c2c2e',
            titleColor: 'linear-gradient(209deg, #ea6044 39%, #dc5083 50%, #9a6df7 67%, #3f8def 81%)',
            specialColor: 'linear-gradient(90deg, #FF375F, #FF453A, #FF9F0A, #FFD60A, #30D158, #66D4CF, #40C8E0, #0A84FF, #5E5CE6, #BF5AF2, #FF375F)',
        },
    },
    {
        id: 'serika-dark',
        name: 'Serika Dark',
        isDark: true,
        colors: {
            background: '#323437',
            cardBg: 'rgba(44, 46, 49, 0.8)',
            textPrimary: '#d1d0c5',
            textSecondary: '#646669',
            accent: '#e2b714',
            secondary: '#3c3e41',
            titleColor: '#e2b714',
            specialColor: '#e2b714',
        },
    },
    {
        id: 'nord',
        name: 'Nord',
        isDark: true,
        colors: {
            background: '#2e3440',
            cardBg: 'rgba(59, 66, 82, 0.8)',
            textPrimary: '#eceff4',
            textSecondary: '#d8dee9',
            accent: '#88c0d0',
            secondary: '#4c566a',
            titleColor: '#88c0d0',
            specialColor: '#88c0d0',
        },
    },
    {
        id: 'monokai',
        name: 'Monokai',
        isDark: true,
        colors: {
            background: '#272822',
            cardBg: 'rgba(62, 61, 50, 0.8)',
            textPrimary: '#f8f8f2',
            textSecondary: '#75715e',
            accent: '#a6e22e',
            secondary: '#4e4d42',
            titleColor: '#a6e22e',
            specialColor: '#a6e22e',
        },
    },
    {
        id: 'dracula',
        name: 'Dracula',
        isDark: true,
        colors: {
            background: '#282a36',
            cardBg: 'rgba(68, 71, 90, 0.8)',
            textPrimary: '#f8f8f2',
            textSecondary: '#6272a4',
            accent: '#bd93f9',
            secondary: '#545770',
            titleColor: '#bd93f9',
            specialColor: '#bd93f9',
        },
    },
    {
        id: 'macroblank',
        name: 'Macroblank',
        isDark: false,
        colors: {
            background: '#b2d2c8',
            cardBg: '#b2d2c8',
            textPrimary: '#414847',
            textSecondary: '#717977',
            accent: '#c13117',
            secondary: 'rgba(197, 221, 210, 1)',
            titleColor: '#c13117',
            specialColor: 'linear-gradient(90deg, #c13117, #61706b)',
        },
    },
    {
        id: 'matcha-mocha',
        name: 'Matcha Mocha',
        isDark: false,
        colors: {
            background: '#73655d',
            cardBg: '#73655d',
            textPrimary: '#f2ded0',
            textSecondary: '#bbbf7d',
            accent: '#d5eaa9',
            secondary: '#867b73ff',
            titleColor: '#f2ded0',
            specialColor: '#d0ff009a',
        },
    },
    {
        id: 'rose-gold',
        name: 'Rose Gold',
        isDark: false,
        colors: {
            background: '#ce9a95',
            cardBg: '#ce9a95',
            textPrimary: '#ffe4e4ff',
            textSecondary: '#5c4749ff',
            accent: '#f8c8c0ff',
            secondary: '#b98379',
            titleColor: '#ffd6d0ff',
            specialColor: '#7e2a33',
        },
    },
    {
        id: 'bushido',
        name: 'Bushido',
        isDark: true,
        colors: {
            background: '#242933',
            cardBg: '#242933',
            textPrimary: '#f1ebe4',
            textSecondary: '#596172',
            accent: '#ec4c56',
            secondary: '#1c222d',
            titleColor: '#ec4c56',
            specialColor: '#ec4c56',
        },
    }
];

export function getThemeById(id: string): Theme | undefined {
    return themes.find(theme => theme.id === id);
}

export function getDefaultTheme(): Theme {
    return themes[0];
}
