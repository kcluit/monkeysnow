import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { HierarchyProvider } from './contexts/HierarchyContext'
import './style.css'

// Main app wrapper
function Root(): JSX.Element {
    return (
        <BrowserRouter>
            <HierarchyProvider>
                <App />
            </HierarchyProvider>
        </BrowserRouter>
    );
}

// Migrate old resort IDs in localStorage to current resort IDs
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

// Selections saved under the old 600-resort cap are trimmed to the current
// Selection cap before anything is fetched. App shows a one-time notice.
const trimOversizedSelection = () => {
    try {
        const stored = localStorage.getItem('selectedResorts');
        if (!stored) return;

        const selectedResorts: string[] = JSON.parse(stored);
        if (selectedResorts.length <= MAX_SELECTED_RESORTS) return;

        localStorage.setItem('selectedResorts', JSON.stringify(selectedResorts.slice(0, MAX_SELECTED_RESORTS)));
        localStorage.setItem('selectionTrimmed', 'true');
    } catch (err) {
        console.error('Error trimming resort selection:', err);
    }
};

// Run migrations before rendering
migrateResortIds();
trimOversizedSelection();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
