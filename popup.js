import { formatDateTime } from './utils.js';
import { sectionHasChanges } from './changeTracker.js';

document.addEventListener('DOMContentLoaded', () => {
  // Get elements
  const tableContainer = document.getElementById('visa-bulletin-table');
  const lastUpdatedElement = document.getElementById('last-updated-time');
  const changesIndicator = document.getElementById('changes-indicator');
  const changesText = document.getElementById('changes-text');
  const acknowledgeBtn = document.getElementById('acknowledge-btn');
  const tabButtons = document.querySelectorAll('.tab-button');

  // Initial active section
  let activeSection = 'FINAL ACTION DATES';

  // Set up acknowledge button
  acknowledgeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "acknowledgeChanges" }, (response) => {
      if (response && response.status === "acknowledged") {
        changesIndicator.classList.remove('visible');
        acknowledgeBtn.style.display = 'none';

        // Clear tab change indicators
        tabButtons.forEach(btn => btn.classList.remove('has-changes'));

        // Remove all highlighting by re-rendering the table without tracked changes
        chrome.storage.local.get(['visaBulletinData'], (result) => {
          if (result.visaBulletinData) {
            renderTable(result.visaBulletinData, {});  // Pass empty object for tracked changes
          }
        });
      }
    });
  });

  // Load data from storage
  loadData();

  // Set up tab buttons
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active tab
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update active section
      activeSection = button.dataset.section;

      // Reload table with new section
      loadData();
    });
  });

  function loadData() {
    // Get visa bulletin data from storage
    chrome.storage.local.get([
      'visaBulletinData',
      'lastUpdated',
      'lastChangeDate',
      'hasChanges',
      'previousData',
      'changesAcknowledged',
      'accumulatedChanges',
      'trackedChanges'
    ], (result) => {
      // Update last change time instead of last updated time
      lastUpdatedElement.textContent = formatDateTime(result.lastChangeDate || result.lastUpdated);

      // Show/hide changes indicator
      const accumulatedChanges = result.accumulatedChanges || 0;

      if (result.hasChanges && !result.changesAcknowledged && accumulatedChanges > 0) {
        changesIndicator.classList.add('visible');
        // Update the changes text to show the accumulated count
        const changeCountText = accumulatedChanges === 1 ? '1 date' : `${accumulatedChanges} dates`;
        changesText.textContent = `${changeCountText} changed`;
        acknowledgeBtn.style.display = 'block'; // Show the button

        // Add indicators to tabs with changes
        highlightTabsWithChanges(result.trackedChanges || {});
      } else {
        changesIndicator.classList.remove('visible');
        acknowledgeBtn.style.display = 'none'; // Hide the button
        // Remove all tab indicators
        tabButtons.forEach(btn => btn.classList.remove('has-changes'));
      }

      // Render table if data exists
      if (result.visaBulletinData) {
        renderTable(result.visaBulletinData, result.trackedChanges);
      } else {
        tableContainer.innerHTML = '<div class="no-data">No data available. Try again later.</div>';
      }
    });
  }

  // Function to highlight tabs that have changes
  function highlightTabsWithChanges(trackedChanges) {
    // First reset all tab indicators
    tabButtons.forEach(btn => btn.classList.remove('has-changes'));

    if (!trackedChanges) return;

    // For each section, check if there are changes
    for (const section in trackedChanges) {
      const sectionChanges = trackedChanges[section];

      // If there are any changes in this section, find the corresponding tab and highlight it
      if (sectionHasChanges(sectionChanges)) {
        const tabButton = document.querySelector(`.tab-button[data-section="${section}"]`);
        if (tabButton) {
          tabButton.classList.add('has-changes');
        }
      }
    }
  }

  function renderTable(data, trackedChanges) {
    // Select the active section data
    const sectionData = data[activeSection];
    const trackedSectionChanges = trackedChanges && trackedChanges[activeSection] ? trackedChanges[activeSection] : {};

    if (!sectionData) {
      tableContainer.innerHTML = '<div class="error">Invalid data format</div>';
      return;
    }

    // Get all visa categories and countries
    const categories = Object.keys(sectionData);
    const allCountries = new Set();

    categories.forEach(category => {
      Object.keys(sectionData[category]).forEach(country => {
        allCountries.add(country);
      });
    });

    const countries = Array.from(allCountries);

    // Create table
    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Category</th>
            ${countries.map(country => `<th>${country}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    // Add rows for each category
    categories.forEach(category => {
      tableHtml += `<tr><td>${category}</td>`;

      countries.forEach(country => {
        const currentValue = sectionData[category][country] || 'N/A';
        let cellClass = '';
        let changeDirection = '';
        let tooltip = '';

        // Only add change indicators if we have tracked changes
        if (Object.keys(trackedChanges).length > 0 &&
          trackedSectionChanges?.[category]?.[country]?.changed) {
          cellClass = 'changed';
          changeDirection = trackedSectionChanges[category][country].direction || '';
          tooltip = `Changed from ${trackedSectionChanges[category][country].oldValue}`;
        }

        tableHtml += `<td class="${cellClass} ${changeDirection}"
                         title="${tooltip}">${currentValue}</td>`;
      });

      tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';

    // Update table container
    tableContainer.innerHTML = tableHtml;
  }
});
