import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { icons } from '../constants/icons';
import { LogoSnowflake } from './LogoSnowflake';
import type { Font } from '../types/fonts';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface HeaderProps {
    font?: Font;
}

interface NavIconLinkProps {
    to: string;
    icon: IconDefinition;
    isActive: boolean;
    title: string;
}

function NavIconLink({ to, icon, isActive, title }: NavIconLinkProps): JSX.Element {
    return (
        <Link
            to={to}
            title={title}
            className={`nav-icon-btn ${isActive ? 'active' : ''}`}
        >
            <Icon icon={icon} size="sm" />
        </Link>
    );
}

export function Header({ font }: HeaderProps): JSX.Element {
    const location = useLocation();
    // Track font links to properly clean them up
    const fontLinksRef = useRef<HTMLLinkElement[]>([]);

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
            <div className="header-content">
                <Link to="/">
                    <h1 className="logo-text apple-rainbow-text">
                        <div className="subtitle">monkey do</div>
                        <LogoSnowflake className="logo-snowflake" />
                        monkeysnow
                    </h1>
                </Link>
                <nav className="header-nav">
                    <NavIconLink
                        to="/"
                        icon={icons.home}
                        isActive={location.pathname === '/' || location.pathname.startsWith('/resort/')}
                        title="Home"
                    />
                    <NavIconLink
                        to="/about"
                        icon={icons.info}
                        isActive={location.pathname === '/about'}
                        title="About"
                    />
                    <NavIconLink
                        to="/settings"
                        icon={icons.settings}
                        isActive={location.pathname === '/settings'}
                        title="Settings"
                    />
                </nav>
            </div>
        </header>
    );
}
