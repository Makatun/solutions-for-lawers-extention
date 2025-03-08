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
    // Reset accumulated changes and clear ALL tracking data
    chrome.storage.local.set({
      changesAcknowledged: true,
      accumulatedChanges: 0,
      trackedChanges: {},  // Clear tracked changes
      changeRegistry: {},  // Clear change registry to reset tracking
      hasChanges: false   // Reset changes flag
    });
    displayNotification(false, 0);
    sendResponse({ status: "acknowledged" });
    return true;
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
          "CHINA": "Jan 1, 2022",
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
          "CHINA": "Jul 12, 2024",
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
      'trackedChanges',
      'changeRegistry'
    ], (result) => {
      const oldData = result.visaBulletinData;
      const newData = data;
      const now = new Date().toISOString();

      // Get existing change registry
      const existingRegistry = result.changeRegistry || {};

      // Count new changes using the registry
      const { count: newChangeCount, changes: newChanges } = countChanges(oldData, newData, existingRegistry);

      // Only consider it a change if at least one date actually changed
      const hasChanges = newChangeCount > 0;

      // Update the registry with new changes
      const updatedRegistry = { ...existingRegistry, ...newChanges };

      // Track changes for highlighting
      const updatedTrackedChanges = hasChanges ?
        trackChanges(oldData, newData, result.changesAcknowledged ? {} : result.trackedChanges, updatedRegistry) :
        result.trackedChanges || {};

      // Calculate total highlighted changes
      const totalHighlightedChanges = Object.keys(updatedTrackedChanges)
        .reduce((sum, section) =>
          sum + Object.keys(updatedTrackedChanges[section])
            .reduce((sectionSum, category) =>
              sectionSum + Object.keys(updatedTrackedChanges[section][category])
                .filter(country => updatedTrackedChanges[section][category][country].changed)
                .length, 0), 0);

      // Update storage
      const storageUpdate = {
        visaBulletinData: newData,
        lastUpdated: now,
        changeRegistry: updatedRegistry,
        trackedChanges: updatedTrackedChanges,
        hasChanges: hasChanges || (!result.changesAcknowledged && totalHighlightedChanges > 0),
        previousData: oldData || null,
        changeCount: newChangeCount,
        accumulatedChanges: totalHighlightedChanges,
        changesAcknowledged: result.changesAcknowledged && !hasChanges
      };

      if (hasChanges) {
        storageUpdate.lastChangeDate = now;
      }

      // Store updates
      chrome.storage.local.set(storageUpdate);

      // Update notification
      if ((hasChanges || !result.changesAcknowledged) && totalHighlightedChanges > 0) {
        chrome.storage.local.set({ changesAcknowledged: false });
        displayNotification(true, totalHighlightedChanges);
      } else if (totalHighlightedChanges <= 0) {
        displayNotification(false, 0);
      }

      console.log(`Visa Bulletin data updated. New changes: ${newChangeCount}, Total highlighted: ${totalHighlightedChanges}`);
    });

  } catch (error) {
    console.error('Error fetching Visa Bulletin data:', error);
  }
}