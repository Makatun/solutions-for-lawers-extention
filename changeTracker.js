/**
 * Functions for tracking and analyzing changes between visa bulletin versions
 */

import { isDate, parseVisaDate } from './utils.js';

// Count changes between two objects
export function countChanges(oldData, newData) {
    if (!oldData) return 0;

    let changeCount = 0;

    // Count changes in FINAL ACTION DATES
    if (oldData["FINAL ACTION DATES"] && newData["FINAL ACTION DATES"]) {
        Object.keys(newData["FINAL ACTION DATES"]).forEach(category => {
            if (oldData["FINAL ACTION DATES"][category]) {
                Object.keys(newData["FINAL ACTION DATES"][category]).forEach(country => {
                    if (oldData["FINAL ACTION DATES"][category][country] !==
                        newData["FINAL ACTION DATES"][category][country]) {
                        changeCount++;
                    }
                });
            }
        });
    }

    // Count changes in DATES FOR FILING
    if (oldData["DATES FOR FILING"] && newData["DATES FOR FILING"]) {
        Object.keys(newData["DATES FOR FILING"]).forEach(category => {
            if (oldData["DATES FOR FILING"][category]) {
                Object.keys(newData["DATES FOR FILING"][category]).forEach(country => {
                    if (oldData["DATES FOR FILING"][category][country] !==
                        newData["DATES FOR FILING"][category][country]) {
                        changeCount++;
                    }
                });
            }
        });
    }

    return changeCount;
}

// Track specific changes between versions to maintain highlighting
export function trackChanges(oldData, newData, existingTrackedChanges = {}) {
    if (!oldData) return existingTrackedChanges;

    const trackedChanges = JSON.parse(JSON.stringify(existingTrackedChanges)) || {};

    // Initialize section objects if they don't exist
    if (!trackedChanges["FINAL ACTION DATES"]) trackedChanges["FINAL ACTION DATES"] = {};
    if (!trackedChanges["DATES FOR FILING"]) trackedChanges["DATES FOR FILING"] = {};

    // Track changes in FINAL ACTION DATES
    if (oldData["FINAL ACTION DATES"] && newData["FINAL ACTION DATES"]) {
        Object.keys(newData["FINAL ACTION DATES"]).forEach(category => {
            if (!trackedChanges["FINAL ACTION DATES"][category]) {
                trackedChanges["FINAL ACTION DATES"][category] = {};
            }

            if (oldData["FINAL ACTION DATES"][category]) {
                Object.keys(newData["FINAL ACTION DATES"][category]).forEach(country => {
                    const oldValue = oldData["FINAL ACTION DATES"][category][country];
                    const newValue = newData["FINAL ACTION DATES"][category][country];

                    if (oldValue !== newValue) {
                        trackedChanges["FINAL ACTION DATES"][category][country] = {
                            oldValue,
                            newValue,
                            changed: true,
                            direction: getChangeDirection(oldValue, newValue)
                        };
                    }
                });
            }
        });
    }

    // Track changes in DATES FOR FILING
    if (oldData["DATES FOR FILING"] && newData["DATES FOR FILING"]) {
        Object.keys(newData["DATES FOR FILING"]).forEach(category => {
            if (!trackedChanges["DATES FOR FILING"][category]) {
                trackedChanges["DATES FOR FILING"][category] = {};
            }

            if (oldData["DATES FOR FILING"][category]) {
                Object.keys(newData["DATES FOR FILING"][category]).forEach(country => {
                    const oldValue = oldData["DATES FOR FILING"][category][country];
                    const newValue = newData["DATES FOR FILING"][category][country];

                    if (oldValue !== newValue) {
                        trackedChanges["DATES FOR FILING"][category][country] = {
                            oldValue,
                            newValue,
                            changed: true,
                            direction: getChangeDirection(oldValue, newValue)
                        };
                    }
                });
            }
        });
    }

    return trackedChanges;
}

// Helper function to determine change direction for dates
export function getChangeDirection(oldValue, newValue) {
    if (!isDate(oldValue) || !isDate(newValue)) return 'changed';

    const oldDate = parseVisaDate(oldValue);
    const newDate = parseVisaDate(newValue);

    if (newDate > oldDate) {
        return 'moved-forward';
    } else if (newDate < oldDate) {
        return 'moved-backward';
    } else {
        return 'changed';
    }
}

// Check if a section has any changes
export function sectionHasChanges(sectionChanges) {
    if (!sectionChanges) return false;

    // Check each category in the section
    for (const category in sectionChanges) {
        // For each country in the category
        for (const country in sectionChanges[category]) {
            // If this entry has a change, return true
            if (sectionChanges[category][country] && sectionChanges[category][country].changed) {
                return true;
            }
        }
    }

    return false;
}
