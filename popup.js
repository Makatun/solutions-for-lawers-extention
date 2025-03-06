document.addEventListener('DOMContentLoaded', () => {
  // Get elements
  const tableContainer = document.getElementById('visa-bulletin-table');
  const lastUpdatedElement = document.getElementById('last-updated-time');
  const changesIndicator = document.getElementById('changes-indicator');
  const acknowledgeBtn = document.getElementById('acknowledge-btn');
  const tabButtons = document.querySelectorAll('.tab-button');

  // Initial active section
  let activeSection = 'FINAL ACTION DATES';

  // Set up acknowledge button
  acknowledgeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "acknowledgeChanges" }, (response) => {
      if (response && response.status === "acknowledged") {
        changesIndicator.classList.remove('visible');
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
    chrome.storage.local.get(['visaBulletinData', 'lastUpdated', 'hasChanges', 'previousData', 'changesAcknowledged'], (result) => {
      // Update last updated time
      if (result.lastUpdated) {
        const date = new Date(result.lastUpdated);
        lastUpdatedElement.textContent = date.toLocaleString();
      } else {
        lastUpdatedElement.textContent = 'No data yet';
      }

      // Show/hide changes indicator
      if (result.hasChanges && !result.changesAcknowledged) {
        changesIndicator.classList.add('visible');
      } else {
        changesIndicator.classList.remove('visible');
      }

      // Render table if data exists
      if (result.visaBulletinData) {
        renderTable(result.visaBulletinData, result.previousData);
      } else {
        tableContainer.innerHTML = '<div class="no-data">No data available. Try again later.</div>';
      }
    });
  }

  function renderTable(data, previousData) {
    // Select the active section data
    const sectionData = data[activeSection];
    const previousSectionData = previousData ? previousData[activeSection] : null;

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

        // Check if value has changed
        if (previousSectionData &&
          previousSectionData[category] &&
          previousSectionData[category][country] !== undefined &&
          previousSectionData[category][country] !== currentValue) {

          cellClass = 'changed';
          const previousValue = previousSectionData[category][country];

          // Determine if date moved forward or backward (if applicable)
          if (isDate(currentValue) && isDate(previousValue)) {
            const currentDate = parseVisaDate(currentValue);
            const previousDate = parseVisaDate(previousValue);

            if (currentDate > previousDate) {
              changeDirection = 'moved-forward';
              tooltip = `Moved forward from ${previousValue}`;
            } else {
              changeDirection = 'moved-backward';
              tooltip = `Moved backward from ${previousValue}`;
            }
          } else {
            tooltip = `Changed from ${previousValue}`;
          }
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
});
