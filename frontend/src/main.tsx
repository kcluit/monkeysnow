import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PerformanceTest } from './pages/PerformanceTest'
import { HierarchyProvider } from './contexts/HierarchyContext'
import './style.css'

// Simple URL-based routing for test pages
function Root(): JSX.Element {
    // Check if we're on the performance test page
    const isPerformanceTest = window.location.hash === '#/perf-test' ||
        window.location.pathname === '/perf-test';

    if (isPerformanceTest) {
        return <PerformanceTest />;
    }

    return (
        <HierarchyProvider>
            <App />
        </HierarchyProvider>
    );
}

// Migrate old resort IDs in localStorage to new backend IDs
// This runs once on app load before rendering
const migrateResortIds = () => {
    const ID_MIGRATIONS: Record<string, string> = {
        'Ski-Smithers': 'Hudson Bay Mountain',
        'HemlockResort': 'Sasquatch Mountain Resort',
    };

    try {
        const stored = localStorage.getItem('selectedResorts');
        if (!stored) return;

        const selectedResorts: string[] = JSON.parse(stored);
        let migrated = false;

        const newSelectedResorts = selectedResorts.map((id) => {
            if (ID_MIGRATIONS[id]) {
                migrated = true;
                console.log(`Migrating resort ID: ${id} -> ${ID_MIGRATIONS[id]}`);
                return ID_MIGRATIONS[id];
            }
            return id;
        });

        if (migrated) {
            localStorage.setItem('selectedResorts', JSON.stringify(newSelectedResorts));
            console.log('Resort ID migration complete');
        }
    } catch (err) {
        console.error('Error migrating resort IDs:', err);
    }
};

// Run migration before rendering
migrateResortIds();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HierarchyProvider>
            <App />
        </HierarchyProvider>
    </React.StrictMode>,
)
