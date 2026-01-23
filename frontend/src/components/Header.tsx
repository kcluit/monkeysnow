import { useEffect, useRef } from 'react';
import type { Font } from '../types/fonts';

interface HeaderProps {
    font?: Font;
}

export function Header({ font }: HeaderProps): JSX.Element {
    // Track font links to properly clean them up
    const fontLinksRef = useRef<HTMLLinkElement[]>([]);

    // Meta tags and title - only run once on mount
    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        document.head.appendChild(meta);

        const metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        metaDesc.content = 'Get real-time snow forecasts for your favorite British Columbia ski resorts';
        document.head.appendChild(metaDesc);

        document.title = 'monkeysnow';

        return () => {
            if (document.head.contains(meta)) {
                document.head.removeChild(meta);
            }
            if (document.head.contains(metaDesc)) {
                document.head.removeChild(metaDesc);
            }
        };
    }, []);

    // Load fonts dynamically - clean up old links before adding new ones
    useEffect(() => {
        // Clean up previous font links
        fontLinksRef.current.forEach(link => {
            if (document.head.contains(link)) {
                document.head.removeChild(link);
            }
        });
        fontLinksRef.current = [];

        // Always load Lexend Deca for logo
        const lexendLink = document.createElement('link');
        lexendLink.rel = 'stylesheet';
        lexendLink.href = 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400&display=swap';
        document.head.appendChild(lexendLink);
        fontLinksRef.current.push(lexendLink);

        // Load the selected font (if it has a Google Fonts URL and isn't Lexend)
        if (font?.googleFontsUrl && font.id !== 'lexend') {
            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = font.googleFontsUrl;
            document.head.appendChild(fontLink);
            fontLinksRef.current.push(fontLink);
        }

        // Cleanup function
        return () => {
            fontLinksRef.current.forEach(link => {
                if (document.head.contains(link)) {
                    document.head.removeChild(link);
                }
            });
            fontLinksRef.current = [];
        };
    }, [font]);

    return (
        <header className="mb-8 pt-4">
            <h1 className="logo-text apple-rainbow-text">
                <div className="subtitle">monkey do</div>
                <img src="/2744.webp" alt="" className="logo-snowflake" />
                monkeysnow
            </h1>
        </header>
    );
}
