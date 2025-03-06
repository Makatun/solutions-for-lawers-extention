document.addEventListener('DOMContentLoaded', () => {
  // Get elements
  const tableContainer = document.getElementById('visa-bulletin-table');
  const lastUpdatedElement = document.getElementById('last-updated-time');
  const changesIndicator = document.getElementById('changes-indicator');
  const tabButtons = document.querySelectorAll('.tab-button');
  
  // Initial active section
  let activeSection = 'FINAL ACTION DATES';
  
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
    chrome.storage.local.get(['visaBulletinData', 'lastUpdated', 'hasChanges', 'previousData'], (result) => {
      // Update last updated time
      if (result.lastUpdated) {
        const date = new Date(result.lastUpdated);
        lastUpdatedElement.textContent = date.toLocaleString();
      } else {
        lastUpdatedElement.textContent = 'No data yet';
      }
      
      // Show/hide changes indicator
      if (result.hasChanges) {
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
        
        // Check if value has changed
        if (previousSectionData && 
            previousSectionData[category] && 
            previousSectionData[category][country] !== currentValue) {
          cellClass = 'changed';
        }
        
        tableHtml += `<td class="${cellClass}">${currentValue}</td>`;
      });
      
      tableHtml += '</tr>';
    });
    
    tableHtml += '</tbody></table>';
    
    // Update table container
    tableContainer.innerHTML = tableHtml;
  }
});
