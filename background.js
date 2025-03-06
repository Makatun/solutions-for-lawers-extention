// API configuration
const API_URL = 'https://lv8sqtgrfk.execute-api.us-east-1.amazonaws.com/dev/files/visa-bulleting-latest.json';
const API_KEY = '9y8AypqIpn2G5OQ9eTtcB59EVOOc7BBN7vuxSqGE';
const ALARM_NAME = 'fetch-visa-bulletin';
const FETCH_INTERVAL_MINUTES = 2;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Visa Bulletin Tracker installed');

  // Set up alarm for periodic fetching
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: FETCH_INTERVAL_MINUTES
  });

  // Perform initial fetch
  fetchVisaBulletin();
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    fetchVisaBulletin();
  }
});

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

    // Get current stored data to compare
    chrome.storage.local.get(['visaBulletinData', 'lastUpdated'], (result) => {
      const oldData = result.visaBulletinData;
      const newData = data;

      // Store new data and timestamp
      chrome.storage.local.set({
        visaBulletinData: newData,
        lastUpdated: new Date().toISOString(),
        hasChanges: oldData ? JSON.stringify(oldData) !== JSON.stringify(newData) : false,
        previousData: oldData || null
      });

      console.log('Visa Bulletin data updated');
    });

  } catch (error) {
    console.error('Error fetching Visa Bulletin data:', error);
  }
}