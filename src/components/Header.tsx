import { useEffect } from 'react';

export function Header(): JSX.Element {
    useEffect(() => {
        // Add SF Pro Display font
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.cdnfonts.com/css/sf-pro-display';
        document.head.appendChild(fontLink);

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
            document.head.removeChild(fontLink);
            document.head.removeChild(meta);
            document.head.removeChild(metaDesc);
        };
    }, []);

    return (
        <header className="mb-8 pt-4">
            <div className="flex items-baseline gap-2">
                <h1 className="text-2xl font-semibold apple-rainbow-text tracking-tight">monkeysnow</h1>
                <span className="text-sm text-gray-500 dark:text-dark-text-secondary">monkey do</span>
            </div>
        </header>
    );
}
