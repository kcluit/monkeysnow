import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { HierarchyProvider } from './contexts/HierarchyContext'
import { MAX_SELECTED_RESORTS } from './hooks/useResortHierarchy'
import { resolveResortId } from './data/resortLocations'
import { getSavedLocation, isSavedLocationId } from './utils/savedLocations'
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
