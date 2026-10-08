import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { HierarchyProvider } from './contexts/HierarchyContext'
import { resolveResortId } from './data/resortLocations'
import { getSavedLocation, isSavedLocationId } from './utils/savedLocations'
import { idbClear } from './utils/indexedDB'
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

// One-off reset after the backend removal and the switch to the OpenSkiData resort
// list: a visitor without the marker loses their Selection, every setting and the
// cached forecasts, so this visit starts like a first one, Starter resort included.
const RESET_MARKER = 'storedDataReset';

const resetStoredData = () => {
    try {
        if (localStorage.getItem(RESET_MARKER)) return;
        localStorage.clear();
        localStorage.setItem(RESET_MARKER, 'true');
    } catch (err) {
        console.error('Error resetting stored data:', err);
        return;
    }
    // Emptying the store, unlike deleting the database, isn't blocked by an older tab left open
    idbClear().catch(() => {
        // IndexedDB unavailable — nothing cached to clear
    });
};

// Rewrite saved resort IDs to current slugs before rendering. Earlier slugs and
// pre-OpenSkiData IDs (e.g. "Big-White") resolve through the aliases in
// data/resorts/resorts.json; IDs that no longer name a Resort are dropped.
// Saved locations keep their IDs, unless they were deleted (e.g. in another tab).
const currentId = (id: string): string | null =>
    isSavedLocationId(id) ? (getSavedLocation(id) ? id : null) : resolveResortId(id);

const migrateResortIds = () => {
    try {
        const stored = localStorage.getItem('selectedResorts');
        if (!stored) return;

        const selectedResorts: string[] = JSON.parse(stored);
        const current = [...new Set(
            selectedResorts.map(currentId).filter((id): id is string => id !== null)
        )];

        if (current.length !== selectedResorts.length || current.some((id, i) => id !== selectedResorts[i])) {
            localStorage.setItem('selectedResorts', JSON.stringify(current));
        }
    } catch (err) {
        console.error('Error migrating resort IDs:', err);
    }
};

// Run migrations before rendering
resetStoredData();
migrateResortIds();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
