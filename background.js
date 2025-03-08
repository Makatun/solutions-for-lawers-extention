// API configuration
const API_URL = 'https://lv8sqtgrfk.execute-api.us-east-1.amazonaws.com/dev/files/visa-bulleting-latest.json';
const API_KEY = '9y8AypqIpn2G5OQ9eTtcB59EVOOc7BBN7vuxSqGE';
const ALARM_NAME = 'fetch-visa-bulletin';
const FETCH_INTERVAL_MINUTES = 0.2;

// Import utility functions
import { isDate, parseVisaDate } from './utils.js';
import { trackChanges, countChanges } from './changeTracker.js';

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

    // const data = await response.json();

    const data = {
      "FINAL ACTION DATES": {
        "F1": {
          "All": "Nov 14, 2015",
          "CHINA": "Nov 21, 2015",
          "INDIA": "Nov 2, 2015",
          "Mexico": "Nov 2, 2004",
          "Philippines": "Mar 8, 2012"
        },
        "F2A": {
          "All": "Jan 13, 2022",
          "CHINA": "Jan 12, 2022",
          "INDIA": "Jan 1, 2022",
          "Mexico": "May 1, 2021",
          "Philippines": "Jan 1, 2022"
        },
        "F2B": {
          "All": "May 6, 2016",
          "CHINA": "May 21, 2016",
          "INDIA": "May 22, 2016",
          "Mexico": "Jul 13, 2005",
          "Philippines": "Oct 22, 2011"
        },
        "F3": {
          "All": "Jul 14, 2010",
          "CHINA": "Jul 1, 2010",
          "INDIA": "Jul 4, 2010",
          "Mexico": "Nov 22, 2000",
          "Philippines": "Jan 22, 2003"
        },
        "F4": {
          "All": "Aug 12, 2007",
          "CHINA": "Aug 2, 2007",
          "INDIA": "Apr 8, 2006",
          "Mexico": "Mar 1, 2001",
          "Philippines": "Oct 15, 2004"
        }
      },
      "DATES FOR FILING": {
        "F1": {
          "All": "Sep 13, 2017",
          "CHINA": "Sep 14, 2017",
          "INDIA": "Sep 21, 2017",
          "Mexico": "Oct 14, 2005",
          "Philippines": "Apr 22, 2015"
        },
        "F2A": {
          "All": "Jul 11, 2024",
          "CHINA": "Jul 1, 2024",
          "INDIA": "Jul 1, 2024",
          "Mexico": "Jul 15, 2024",
          "Philippines": "Jul 15, 2024"
        },
        "F2B": {
          "All": "Jan 12, 2017",
          "CHINA": "Jan 1, 2017",
          "INDIA": "Jan 13, 2017",
          "Mexico": "Oct 1, 2006",
          "Philippines": "Oct 1, 2013"
        },
        "F3": {
          "All": "Jul 2, 2012",
          "CHINA": "Jul 2, 2012",
          "INDIA": "Jul 2, 2012",
          "Mexico": "Jun 15, 2001",
          "Philippines": "May 8, 2004"
        },
        "F4": {
          "All": "Mar 1, 2008",
          "CHINA": "Mar 12, 2008",
          "INDIA": "Aug 15, 2006",
          "Mexico": "Apr 3, 2001",
          "Philippines": "Jan 1, 2008"
        }
      }
    }
    data["FINAL ACTION DATES"]["F1"]["All"] = "Nov " + (new Date()).getSeconds() / 2 + ", 2015";

    // Get current stored data to compare
    chrome.storage.local.get([
      'visaBulletinData',
      'lastUpdated',
      'lastChangeDate',
      'changesAcknowledged',
      'accumulatedChanges',
      'trackedChanges'
    ], (result) => {
      const oldData = result.visaBulletinData;
      const newData = data;

      // Count number of changes in this update
      const newChangeCount = countChanges(oldData, newData);

      // Only consider it a change if at least one date actually changed
      const hasChanges = newChangeCount > 0;

      const existingTrackedChanges = result.trackedChanges || {};
      const now = new Date().toISOString();

      // Get the current accumulated changes
      let accumulatedChanges = result.accumulatedChanges || 0;

      // Track changes for highlighting
      let updatedTrackedChanges = existingTrackedChanges;

      // Update storage object
      const storageUpdate = {
        visaBulletinData: newData,
        lastUpdated: now
      };

      // If there are new changes, add them to tracked changes and update last change date
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

        // Update last change date when changes are detected
        storageUpdate.lastChangeDate = now;
      }

      // Add remaining properties to storage update
      storageUpdate.hasChanges = hasChanges || (!result.changesAcknowledged && accumulatedChanges > 0);
      storageUpdate.previousData = oldData || null;
      storageUpdate.changeCount = newChangeCount;
      storageUpdate.accumulatedChanges = accumulatedChanges;
      storageUpdate.changesAcknowledged = result.changesAcknowledged && !hasChanges;
      storageUpdate.trackedChanges = updatedTrackedChanges;

      // Store new data and timestamp
      chrome.storage.local.set(storageUpdate);

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