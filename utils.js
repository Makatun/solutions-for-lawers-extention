/**
 * Utility functions for date parsing and other common operations
 */

// Check if string matches visa bulletin date format (e.g., "01MAY15")
export function isDate(str) {
    return /^\d{2}[A-Z]{3}\d{2}$/.test(str);
}

// Parse visa bulletin date format into JavaScript Date
export function parseVisaDate(dateStr) {
    if (dateStr === 'C') return new Date('9999-12-31'); // "Current" is latest date
    if (dateStr === 'U') return new Date('0000-01-01'); // "Unavailable" is earliest

    const months = {
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
        'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
    };

    const day = parseInt(dateStr.slice(0, 2), 10);
    const month = months[dateStr.slice(2, 5)];
    const year = 2000 + parseInt(dateStr.slice(5, 7), 10);

    return new Date(year, month, day);
}

// Format a timestamp as a locale string
export function formatDateTime(timestamp) {
    if (!timestamp) return 'No data yet';
    const date = new Date(timestamp);
    return date.toLocaleString();
}
