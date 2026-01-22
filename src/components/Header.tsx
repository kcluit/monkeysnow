import { useEffect } from 'react';

export function Header(): JSX.Element {
    useEffect(() => {
        // Add SF Pro Display font
        const sfProLink = document.createElement('link');
        sfProLink.rel = 'stylesheet';
        sfProLink.href = 'https://fonts.cdnfonts.com/css/sf-pro-display';
        document.head.appendChild(sfProLink);

        // Add Lexend Deca font for logo
        const lexendLink = document.createElement('link');
        lexendLink.rel = 'stylesheet';
        lexendLink.href = 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400&display=swap';
        document.head.appendChild(lexendLink);

        // Add meta tags
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        document.head.appendChild(meta);

        const metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        metaDesc.content = 'Get real-time snow forecasts for your favorite British Columbia ski resorts';
        document.head.appendChild(metaDesc);

        // Set title
        document.title = 'monkeysnow';

        // Cleanup function
        return () => {
            document.head.removeChild(sfProLink);
            document.head.removeChild(lexendLink);
            document.head.removeChild(meta);
            document.head.removeChild(metaDesc);
        };
    }, []);

    return (
        <header className="mb-8 pt-4">
            <h1 className="logo-text apple-rainbow-text">
                <div className="subtitle">monkey do</div>
                monkeysnow
            </h1>
        </header>
    );
}
