// Global variables
let originalData = [];
let headers = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;

// DOM elements
const importBtn = document.getElementById("importBtn");
const csvFileInput = document.getElementById("csvFile");
const importStatus = document.getElementById("importStatus");
const importLoader = document.getElementById("importLoader");
const filterSection = document.getElementById("filterSection");
const filterControls = document.getElementById("filterControls");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const resultsSection = document.getElementById("resultsSection");
const tableContainer = document.getElementById("tableContainer");
const resultStats = document.getElementById("resultStats");
const pagination = document.getElementById("pagination");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const sqlQuery = document.getElementById("sqlQuery");
const executeSqlBtn = document.getElementById("executeSqlBtn");

// Event listeners
importBtn.addEventListener("click", importCSV);
applyFiltersBtn.addEventListener("click", applyFilters);
resetFiltersBtn.addEventListener("click", resetFilters);
exportCsvBtn.addEventListener("click", exportAsCSV);
exportJsonBtn.addEventListener("click", exportAsJSON);
executeSqlBtn.addEventListener("click", executeSQL);

// Tab system for filter methods
document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    // Deactivate all tabs and contents
    document
      .querySelectorAll(".filter-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));

    // Activate the clicked tab
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add("active");
  });
});

// Function to import CSV
function importCSV() {
  const file = csvFileInput.files[0];
  if (!file) {
    importStatus.textContent = "Please select a CSV file.";
    return;
  }

  importLoader.style.display = "block";
  importStatus.textContent = "Importing...";

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      if (results.data && results.data.length > 0) {
        originalData = results.data;
        headers = results.meta.fields;
        filteredData = [...originalData];

        importStatus.textContent = `Successfully imported ${originalData.length} rows with ${headers.length} columns.`;

        // Show filter and results sections
        filterSection.style.display = "block";
        resultsSection.style.display = "block";

        // Generate filter controls
        generateFilterControls();

        // Display the data
        displayData();

        // Provide example SQL query based on actual data
        const exampleColumn = headers[0] || "column_name";
        sqlQuery.placeholder = `Example: SELECT * FROM ? WHERE ${exampleColumn} IS NOT NULL`;
      } else {
        importStatus.textContent =
          "The CSV file appears to be empty or invalid.";
      }
      importLoader.style.display = "none";
    },
    error: function (error) {
      importStatus.textContent = `Error importing CSV: ${error}`;
      importLoader.style.display = "none";
    },
  });
}

// Function to generate filter controls based on CSV headers
function generateFilterControls() {
  filterControls.innerHTML = "";

  headers.forEach((header) => {
    const filterGroup = document.createElement("div");
    filterGroup.style.marginBottom = "10px";

    const label = document.createElement("label");
    label.textContent = header + ": ";

    const input = document.createElement("input");
    input.type = "text";
    input.dataset.column = header;
    input.className = "filter-input";
    input.placeholder = `Filter by ${header}...`;

    filterGroup.appendChild(label);
    filterGroup.appendChild(input);
    filterControls.appendChild(filterGroup);
  });
}

// Function to apply filters
function applyFilters() {
  const filterInputs = document.querySelectorAll(".filter-input");

  filteredData = originalData.filter((row) => {
    let includeRow = true;

    filterInputs.forEach((input) => {
      const column = input.dataset.column;
      const filterValue = input.value.trim().toLowerCase();

      if (filterValue && row[column]) {
        const cellValue = String(row[column]).toLowerCase();
        if (!cellValue.includes(filterValue)) {
          includeRow = false;
        }
      }
    });

    return includeRow;
  });

  currentPage = 1; // Reset to first page
  displayData();
}

// Function to reset filters
function resetFilters() {
  document.querySelectorAll(".filter-input").forEach((input) => {
    input.value = "";
  });

  filteredData = [...originalData];
  currentPage = 1;
  displayData();
}

// Function to execute SQL-like query using AlaSQL
function executeSQL() {
  const query = sqlQuery.value.trim();

  if (!query) {
    alert("Please enter an SQL query.");
    return;
  }

  try {
    // Execute the query using AlaSQL, passing our data as a parameter
    const result = alasql(query, [originalData]);

    if (Array.isArray(result)) {
      filteredData = result;
      currentPage = 1;
      displayData();
    } else {
      alert("The query didn't return an array of results.");
    }
  } catch (error) {
    alert(`SQL Error: ${error.message}`);
    console.error(error);
  }
}

// Function to display data with pagination
function displayData() {
  resultStats.textContent = `Showing ${filteredData.length} of ${originalData.length} rows`;

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
  const pageData = filteredData.slice(startIndex, endIndex);

  // Create table
  let tableHTML = "<table><thead><tr>";
  headers.forEach((header) => {
    tableHTML += `<th data-column="${header}">${header}</th>`;
  });
  tableHTML += "</tr></thead><tbody>";

  pageData.forEach((row) => {
    tableHTML += "<tr>";
    headers.forEach((header) => {
      tableHTML += `<td>${row[header] || ""}</td>`;
    });
    tableHTML += "</tr>";
  });

  tableHTML += "</tbody></table>";
  tableContainer.innerHTML = tableHTML;

  // Add click event listeners to table headers for sorting
  document.querySelectorAll("th").forEach((th) => {
    th.addEventListener("click", () => sortTable(th.dataset.column));
  });

  // Generate pagination controls
  generatePagination(totalPages);
}

// Function to generate pagination controls
function generatePagination(totalPages) {
  pagination.innerHTML = "";

  if (totalPages <= 1) return;

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      displayData();
    }
  });
  pagination.appendChild(prevBtn);

  // Page numbers
  const maxPageButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

  if (endPage - startPage < maxPageButtons - 1) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.textContent = i;
    pageBtn.classList.toggle("active", i === currentPage);
    pageBtn.addEventListener("click", () => {
      currentPage = i;
      displayData();
    });
    pagination.appendChild(pageBtn);
  }

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayData();
    }
  });
  pagination.appendChild(nextBtn);
}

// Function to sort table by column
function sortTable(column) {
  const sortOrder = getSortOrder(column);

  filteredData.sort((a, b) => {
    const valA = (a[column] || "").toString().toLowerCase();
    const valB = (b[column] || "").toString().toLowerCase();

    // Try numeric sort if possible
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);

    if (!isNaN(numA) && !isNaN(numB)) {
      return sortOrder === "asc" ? numA - numB : numB - numA;
    }

    // Default to string comparison
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  displayData();
}

// Helper to determine sort order
function getSortOrder(column) {
  const headerElement = document.querySelector(`th[data-column="${column}"]`);
  const currentOrder = headerElement.dataset.sortOrder || "none";

  // Reset sort indicators on all headers
  document.querySelectorAll("th").forEach((th) => {
    th.dataset.sortOrder = "none";
    th.textContent = th.textContent.replace(" ↑", "").replace(" ↓", "");
  });

  let newOrder;
  if (currentOrder === "none" || currentOrder === "desc") {
    newOrder = "asc";
    headerElement.textContent += " ↑";
  } else {
    newOrder = "desc";
    headerElement.textContent += " ↓";
  }

  headerElement.dataset.sortOrder = newOrder;
  return newOrder;
}

// Function to export as CSV
function exportAsCSV() {
  if (filteredData.length === 0) {
    alert("No data to export.");
    return;
  }

  // Create CSV content
  const csvContent = Papa.unparse(filteredData);

  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "filtered_data.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to export as JSON
function exportAsJSON() {
  if (filteredData.length === 0) {
    alert("No data to export.");
    return;
  }

  // Create JSON content
  const jsonContent = JSON.stringify(filteredData, null, 2);

  // Create download link
  const blob = new Blob([jsonContent], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "filtered_data.json");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
