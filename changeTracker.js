/**
 * Functions for tracking and analyzing changes between visa bulletin versions
 */

import { isDate, parseVisaDate } from './utils.js';

// Count changes between two objects
export function countChanges(oldData, newData, changeRegistry = {}) {
    if (!oldData) return { count: 0, changes: {} };

    const newChanges = {};
    let changeCount = 0;

    ['FINAL ACTION DATES', 'DATES FOR FILING'].forEach(section => {
        if (oldData[section] && newData[section]) {
            Object.keys(newData[section]).forEach(category => {
                if (oldData[section][category]) {
                    Object.keys(newData[section][category]).forEach(country => {
                        const oldValue = oldData[section][category][country];
                        const newValue = newData[section][category][country];
                        const changeKey = `${section}|${category}|${country}`;

                        // Only count if value changed and it's not already in registry with same value
                        if (oldValue !== newValue &&
                            (!changeRegistry[changeKey] || changeRegistry[changeKey].currentValue !== newValue)) {

                            newChanges[changeKey] = {
                                originalValue: changeRegistry[changeKey]?.originalValue || oldValue,
                                currentValue: newValue,
                                section,
                                category,
                                country
                            };
                            changeCount++;
                        }
                    });
                }
            });
        }
    });

    return { count: changeCount, changes: newChanges };
}

// Track specific changes between versions to maintain highlighting
export function trackChanges(oldData, newData, existingTrackedChanges = {}, changeRegistry = {}) {
    if (!oldData) return existingTrackedChanges;

    const trackedChanges = JSON.parse(JSON.stringify(existingTrackedChanges)) || {};

    ['FINAL ACTION DATES', 'DATES FOR FILING'].forEach(section => {
        if (!trackedChanges[section]) trackedChanges[section] = {};

        if (oldData[section] && newData[section]) {
            Object.keys(newData[section]).forEach(category => {
                if (!trackedChanges[section][category]) {
                    trackedChanges[section][category] = {};
                }

                if (oldData[section][category]) {
                    Object.keys(newData[section][category]).forEach(country => {
                        const oldValue = oldData[section][category][country];
                        const newValue = newData[section][category][country];
                        const changeKey = `${section}|${category}|${country}`;

                        if (oldValue !== newValue) {
                            const registryEntry = changeRegistry[changeKey];
                            trackedChanges[section][category][country] = {
                                oldValue: registryEntry?.originalValue || oldValue,
                                newValue,
                                changed: true,
                                direction: getChangeDirection(
                                    registryEntry?.originalValue || oldValue,
                                    newValue
                                )
                            };
                        }
                    });
                }
            });
        }
    });

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
