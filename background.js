// API configuration
const API_URL = 'https://lv8sqtgrfk.execute-api.us-east-1.amazonaws.com/dev/files/visa-bulleting-latest.json';
const API_KEY = '9y8AypqIpn2G5OQ9eTtcB59EVOOc7BBN7vuxSqGE';
const ALARM_NAME = 'fetch-visa-bulletin';
const FETCH_INTERVAL_MINUTES = .2;

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

    // const data = await response.json();

    const data = {
      "FINAL ACTION DATES": {
        "F1": {
          "All": "Nov 25, 2015",
          "CHINA": "Nov 22, 2015",
          "INDIA": "Nov 22, 2015",
          "Mexico": "Nov 22, 2004",
          "Philippines": "Mar 8, 2012"
        },
        "F2A": {
          "All": "Jan 1, 2022",
          "CHINA": "Jan 1, 2022",
          "INDIA": "Jan 1, 2022",
          "Mexico": "May 15, 2021",
          "Philippines": "Jan 1, 2022"
        },
        "F2B": {
          "All": "May 22, 2016",
          "CHINA": "May 22, 2016",
          "INDIA": "May 22, 2016",
          "Mexico": "Jul 1, 2005",
          "Philippines": "Oct 22, 2011"
        },
        "F3": {
          "All": "Jul 1, 2010",
          "CHINA": "Jul 1, 2010",
          "INDIA": "Jul 1, 2010",
          "Mexico": "Nov 22, 2000",
          "Philippines": "Jan 22, 2003"
        },
        "F4": {
          "All": "Aug 1, 2007",
          "CHINA": "Aug 1, 2007",
          "INDIA": "Apr 8, 2006",
          "Mexico": "Mar 1, 2001",
          "Philippines": "Oct 15, 2004"
        }
      },
      "DATES FOR FILING": {
        "F1": {
          "All": "Sep 1, 2017",
          "CHINA": "Sep 1, 2017",
          "INDIA": "Sep 1, 2017",
          "Mexico": "Oct 1, 2005",
          "Philippines": "Apr 22, 2015"
        },
        "F2A": {
          "All": "Jul 15, 2024",
          "CHINA": "Jul 15, 2024",
          "INDIA": "Jul 15, 2024",
          "Mexico": "Jul 15, 2024",
          "Philippines": "Jul 15, 2024"
        },
        "F2B": {
          "All": "Jan 1, 2017",
          "CHINA": "Jan 1, 2017",
          "INDIA": "Jan 1, 2017",
          "Mexico": "Oct 1, 2006",
          "Philippines": "Oct 1, 2013"
        },
        "F3": {
          "All": "Jul 22, 2012",
          "CHINA": "Jul 22, 2012",
          "INDIA": "Jul 22, 2012",
          "Mexico": "Jun 15, 2001",
          "Philippines": "May 8, 2004"
        },
        "F4": {
          "All": "Mar 1, 2008",
          "CHINA": "Mar 1, 2008",
          "INDIA": "Aug 15, 2006",
          "Mexico": "Apr 30, 2001",
          "Philippines": "Jan 1, 2008"
        }
      }
    }

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