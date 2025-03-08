/**
 * This module contains utility functions for tracking and displaying changes
 * to visa bulletin data over time.
 */

// Initialize change tracking
function initializeChangeTracking() {
    chrome.storage.local.get(['changeHistory'], (result) => {
        if (!result.changeHistory) {
            chrome.storage.local.set({ changeHistory: [] });
        }
    });
}

// Record changes to the change history
function recordChanges(oldData, newData, timestamp) {
    if (!oldData) return;

    const changes = [];

    // Track changes in FINAL ACTION DATES
    if (oldData["FINAL ACTION DATES"] && newData["FINAL ACTION DATES"]) {
        Object.keys(newData["FINAL ACTION DATES"]).forEach(category => {
            if (oldData["FINAL ACTION DATES"][category]) {
                Object.keys(newData["FINAL ACTION DATES"][category]).forEach(country => {
                    const oldValue = oldData["FINAL ACTION DATES"][category][country];
                    const newValue = newData["FINAL ACTION DATES"][category][country];

                    if (oldValue !== newValue) {
                        changes.push({
                            section: "FINAL ACTION DATES",
                            category,
                            country,
                            oldValue,
                            newValue,
                            timestamp
                        });
                    }
                });
            }
        });
    }

    // Track changes in DATES FOR FILING
    if (oldData["DATES FOR FILING"] && newData["DATES FOR FILING"]) {
        Object.keys(newData["DATES FOR FILING"]).forEach(category => {
            if (oldData["DATES FOR FILING"][category]) {
                Object.keys(newData["DATES FOR FILING"][category]).forEach(country => {
                    const oldValue = oldData["DATES FOR FILING"][category][country];
                    const newValue = newData["DATES FOR FILING"][category][country];

                    if (oldValue !== newValue) {
                        changes.push({
                            section: "DATES FOR FILING",
                            category,
                            country,
                            oldValue,
                            newValue,
                            timestamp
                        });
                    }
                });
            }
        });
    }

    // Add changes to history
    if (changes.length > 0) {
        chrome.storage.local.get(['changeHistory'], (result) => {
            const changeHistory = result.changeHistory || [];
            const updatedHistory = [...changeHistory, ...changes];

            chrome.storage.local.set({ changeHistory: updatedHistory });
        });
    }

    return changes.length;
}

// Clear change history
function clearChangeHistory() {
    chrome.storage.local.set({ changeHistory: [] });
}

// Export functions
export {
    initializeChangeTracking,
    recordChanges,
    clearChangeHistory
};
