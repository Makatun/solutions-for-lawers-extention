// API configuration
const API_URL = 'https://lv8sqtgrfk.execute-api.us-east-1.amazonaws.com/dev/files/visa-bulleting-latest.json';
const API_KEY = '9y8AypqIpn2G5OQ9eTtcB59EVOOc7BBN7vuxSqGE';
const ALARM_NAME = 'fetch-visa-bulletin';
const FETCH_INTERVAL_MINUTES = 10;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Visa Bulletin Tracker installed');

  // Set up alarm for periodic fetching
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: FETCH_INTERVAL_MINUTES
  });

  // Initialize storage with acknowledged state
  chrome.storage.local.set({ changesAcknowledged: true });

  // Perform initial fetch
  fetchVisaBulletin();
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    fetchVisaBulletin();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "acknowledgeChanges") {
    // Reset accumulated changes and clear tracked changes
    chrome.storage.local.set({
      changesAcknowledged: true,
      accumulatedChanges: 0,
      trackedChanges: {}  // Clear tracked changes
    });
    displayNotification(false, 0);
    sendResponse({ status: "acknowledged" });
    return true; // Keep the message channel open for the async response
  }
});

// Function to update the extension icon
function displayNotification(hasUnacknowledgedChanges, changeCount = 0) {
  // Only show badge if there are changes to acknowledge
  if (changeCount <= 0 || !hasUnacknowledgedChanges) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  chrome.action.setBadgeBackgroundColor({ color: 'red' });
  chrome.action.setBadgeTextColor({ color: 'white' });
  chrome.action.setBadgeText({ text: changeCount.toString() });
}

// Count changes between two objects
function countChanges(oldData, newData) {
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
function trackChanges(oldData, newData, existingTrackedChanges = {}) {
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
function getChangeDirection(oldValue, newValue) {
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

// Helper functions for date parsing
function isDate(str) {
  // Check if string matches visa bulletin date format (e.g., "01MAY15")
  return /^\d{2}[A-Z]{3}\d{2}$/.test(str);
}

function parseVisaDate(dateStr) {
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

// Fetch data from API
async function fetchVisaBulletin() {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // const data = {
    //   "FINAL ACTION DATES": {
    //     "F1": {
    //       "All": "Nov 14, 2015",
    //       "CHINA": "Nov 22, 2015",
    //       "INDIA": "Nov 24, 2015",
    //       "Mexico": "Nov 2, 2004",
    //       "Philippines": "Mar 8, 2012"
    //     },
    //     "F2A": {
    //       "All": "Jan 13, 2022",
    //       "CHINA": "Jan 12, 2022",
    //       "INDIA": "Jan 1, 2022",
    //       "Mexico": "May 1, 2021",
    //       "Philippines": "Jan 1, 2022"
    //     },
    //     "F2B": {
    //       "All": "May 6, 2016",
    //       "CHINA": "May 21, 2016",
    //       "INDIA": "May 22, 2016",
    //       "Mexico": "Jul 13, 2005",
    //       "Philippines": "Oct 22, 2011"
    //     },
    //     "F3": {
    //       "All": "Jul 14, 2010",
    //       "CHINA": "Jul 13, 2010",
    //       "INDIA": "Jul 4, 2010",
    //       "Mexico": "Nov 22, 2000",
    //       "Philippines": "Jan 22, 2003"
    //     },
    //     "F4": {
    //       "All": "Aug 12, 2007",
    //       "CHINA": "Aug 2, 2007",
    //       "INDIA": "Apr 8, 2006",
    //       "Mexico": "Mar 1, 2001",
    //       "Philippines": "Oct 15, 2004"
    //     }
    //   },
    //   "DATES FOR FILING": {
    //     "F1": {
    //       "All": "Sep 15, 2017",
    //       "CHINA": "Sep 14, 2017",
    //       "INDIA": "Sep 21, 2017",
    //       "Mexico": "Oct 14, 2005",
    //       "Philippines": "Apr 22, 2015"
    //     },
    //     "F2A": {
    //       "All": "Jul 11, 2024",
    //       "CHINA": "Jul 1, 2024",
    //       "INDIA": "Jul 1, 2024",
    //       "Mexico": "Jul 15, 2024",
    //       "Philippines": "Jul 15, 2024"
    //     },
    //     "F2B": {
    //       "All": "Jan 1, 2017",
    //       "CHINA": "Jan 1, 2017",
    //       "INDIA": "Jan 13, 2017",
    //       "Mexico": "Oct 1, 2006",
    //       "Philippines": "Oct 1, 2013"
    //     },
    //     "F3": {
    //       "All": "Jul 22, 2012",
    //       "CHINA": "Jul 2, 2012",
    //       "INDIA": "Jul 22, 2012",
    //       "Mexico": "Jun 15, 2001",
    //       "Philippines": "May 8, 2004"
    //     },
    //     "F4": {
    //       "All": "Mar 1, 2008",
    //       "CHINA": "Mar 1, 2008",
    //       "INDIA": "Aug 15, 2006",
    //       "Mexico": "Apr 3, 2001",
    //       "Philippines": "Jan 1, 2008"
    //     }
    //   }
    // }

    // Get current stored data to compare
    chrome.storage.local.get([
      'visaBulletinData',
      'lastUpdated',
      'changesAcknowledged',
      'accumulatedChanges',
      'trackedChanges'
    ], (result) => {
      const oldData = result.visaBulletinData;
      const newData = data;
      const hasChanges = oldData ? JSON.stringify(oldData) !== JSON.stringify(newData) : false;
      const existingTrackedChanges = result.trackedChanges || {};

      // Count number of changes in this update
      const newChangeCount = countChanges(oldData, newData);

      // Get the current accumulated changes
      let accumulatedChanges = result.accumulatedChanges || 0;

      // Track changes for highlighting
      let updatedTrackedChanges = existingTrackedChanges;

      // If there are new changes, add them to tracked changes
      if (hasChanges) {
        if (result.changesAcknowledged) {
          // If previously acknowledged, start fresh with new changes
          accumulatedChanges = newChangeCount;
          updatedTrackedChanges = trackChanges(oldData, newData);
        } else {
          // Otherwise add to accumulated changes and tracked changes
          accumulatedChanges += newChangeCount;
          updatedTrackedChanges = trackChanges(oldData, newData, existingTrackedChanges);
        }
      }

      // Store new data and timestamp
      chrome.storage.local.set({
        visaBulletinData: newData,
        lastUpdated: new Date().toISOString(),
        hasChanges: hasChanges || (!result.changesAcknowledged && accumulatedChanges > 0),
        previousData: oldData || null,
        changeCount: newChangeCount,
        accumulatedChanges: accumulatedChanges,
        changesAcknowledged: result.changesAcknowledged && !hasChanges,
        trackedChanges: updatedTrackedChanges
      });

      // If changes detected and count is greater than zero, set changesAcknowledged to false and update icon
      if ((hasChanges || !result.changesAcknowledged) && accumulatedChanges > 0) {
        chrome.storage.local.set({ changesAcknowledged: false });
        displayNotification(true, accumulatedChanges);
      } else if (accumulatedChanges <= 0) {
        // If no changes to acknowledge, make sure notification is cleared
        displayNotification(false, 0);
      }

      console.log(`Visa Bulletin data updated. New changes: ${newChangeCount}, Total accumulated: ${accumulatedChanges}`);
    });

  } catch (error) {
    console.error('Error fetching Visa Bulletin data:', error);
  }
}