// Global variables
let originalData = [];
let headers = [];
let filteredData = [];
let columnTypes = {}; // Stores initially detected types: 'string', 'number', 'date'
let currentPage = 1;
let rowsPerPage = 10; // Default, will be adjustable
const availableRowsPerPage = [10, 25, 50, 100]; // Options for pagination size

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
// Add new DOM element for rows per page selector
const rowsPerPageSelect = document.getElementById("rowsPerPageSelect");

// Event listeners
importBtn.addEventListener("click", importCSV);
applyFiltersBtn.addEventListener("click", applyFilters);
resetFiltersBtn.addEventListener("click", resetFilters);
exportCsvBtn.addEventListener("click", exportAsCSV);
exportJsonBtn.addEventListener("click", exportAsJSON);
executeSqlBtn.addEventListener("click", executeSQL);
// Add event listener for rows per page change
if(rowsPerPageSelect) { // Check if element exists before adding listener
    rowsPerPageSelect.addEventListener("change", handleRowsPerPageChange);
} else {
    console.error("L'élément #rowsPerPageSelect n'a pas été trouvé dans le HTML.");
}


// Tab system for filter methods
document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add("active");
  });
});

// Function to parse DD-MM-YYYY or DD/MM/YYYY dates (Unchanged)
function parseDMYDate(dateString) {
    if (!dateString) return null;
    const match = String(dateString).match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        if (year < 1000 || year > 3000) return null;
        const date = new Date(Date.UTC(year, month, day));
        if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
            return date;
        }
    }
    return null;
}

// Function to detect column types (Unchanged)
function detectColumnTypes(data, headers) {
    const types = {};
    const sampleSize = Math.min(data.length, 20);
    headers.forEach(header => {
        let isDate = true; let isNumber = true; let hasNonNullSample = false; let potentialDateCount = 0;
        for (let i = 0; i < sampleSize; i++) {
            const value = data[i][header];
            if (value === null || value === undefined || String(value).trim() === '') continue;
            hasNonNullSample = true; const stringValue = String(value).trim();
            if (isNumber && isNaN(Number(stringValue))) { isNumber = false; }
            const parsedStandard = new Date(stringValue); const parsedDMY = parseDMYDate(stringValue);
            if (isDate && isNaN(parsedStandard.getTime()) && !parsedDMY) { isDate = false; }
            else if (parsedStandard.getTime() || parsedDMY) { potentialDateCount++; }
            if (/^\d+$/.test(stringValue) && stringValue.length <= 4) { isDate = false; }
        }
        if (isNumber && hasNonNullSample) { types[header] = 'number'; }
        else if (isDate && hasNonNullSample && potentialDateCount >= Math.max(1, sampleSize / 3)) { types[header] = 'date'; }
        else { types[header] = 'string'; }
    });
    console.log("Types détectés:", types); return types;
}

// Function to import CSV (Setup rows per page options)
function importCSV() {
    const file = csvFileInput.files[0];
    if (!file) { importStatus.textContent = "Veuillez sélectionner un fichier CSV."; return; }
    importLoader.style.display = "block"; importStatus.textContent = "Importation en cours...";
    filterSection.style.display = "none"; resultsSection.style.display = "none";

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: function (results) {
            importLoader.style.display = "none";
            if (results.data && results.data.length > 0 && results.meta.fields) {
                originalData = results.data;
                headers = results.meta.fields.map(h => String(h || '').trim()).filter(h => h);
                originalData = originalData.map(row => { 
                    const newRow = {}; const rowKeys = Object.keys(row);
                    headers.forEach(header => { const originalKey = rowKeys.find(k => String(k || '').trim() === header); newRow[header] = row[originalKey]; });
                    return newRow;
                });
                filteredData = [...originalData];
                columnTypes = detectColumnTypes(originalData, headers);
                importStatus.textContent = `Importation réussie : ${originalData.length} lignes et ${headers.length} colonnes.`;
                filterSection.style.display = "block"; resultsSection.style.display = "block";

                // Setup Rows Per Page Selector options based on data length
                setupRowsPerPageOptions(originalData.length);

                generateFilterControls();
                currentPage = 1; // Reset page on new import
                displayData(); // Initial display with default rowsPerPage
                const exampleColumn = headers[0] || "nom_colonne";
                sqlQuery.placeholder = `Exemple : SELECT * FROM ? WHERE \`${exampleColumn}\` IS NOT NULL`;
            } else { 
                 let errorMsg = "Le fichier CSV semble vide ou invalide.";
                 if (!results.meta || !results.meta.fields || results.meta.fields.filter(h => String(h||'').trim()).length === 0) { errorMsg += " Impossible de détecter les en-têtes."; }
                 if (results.errors && results.errors.length > 0) { errorMsg += ` Erreurs d'analyse détectées : ${results.errors.map(e => e.message).join(', ')}`; console.error("Erreurs d'analyse:", results.errors); }
                 importStatus.textContent = errorMsg;
            }
        },
        error: function (error) { 
             importStatus.textContent = `Erreur d'importation CSV : ${error.message || error}`; importLoader.style.display = "none"; console.error("Erreur PapaParse:", error); },
        dynamicTyping: false, transformHeader: header => String(header || '').trim()
    });
}

// Setup Rows Per Page Options dynamically
function setupRowsPerPageOptions(totalRows) {
    if (!rowsPerPageSelect) return; // Guard clause if element doesn't exist
    rowsPerPageSelect.innerHTML = ''; // Clear existing options
    availableRowsPerPage.forEach(num => {
        const option = document.createElement('option');
        option.value = num;
        option.textContent = num;
        rowsPerPageSelect.appendChild(option);
    });
    // Add "All" option (using a large number)
    const allOption = document.createElement('option');
    allOption.value = Number.MAX_SAFE_INTEGER; // Represents 'All'
    allOption.textContent = "Tout"; // French for "All"
    rowsPerPageSelect.appendChild(allOption);
    

    // Set default selection (usually the first option)
    rowsPerPageSelect.value = availableRowsPerPage[0];
    rowsPerPage = parseInt(rowsPerPageSelect.value, 10);
}

// Handle Rows Per Page Change
function handleRowsPerPageChange() {
    rowsPerPage = parseInt(rowsPerPageSelect.value, 10);
    currentPage = 1; // Reset to first page when changing page size
    displayData();
}

// --- Operator Translations ---
const operatorTranslations = {
    '=': '=', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=',
    'between': 'entre',
    'is null': 'est nul',
    'is not null': "n'est pas nul",
    'contains': 'contient',
    'does not contain': 'ne contient pas',
    'starts with': 'commence par',
    'ends with': 'finit par'
};

// Function to generate filter controls (translated operators, conditional icon)
function generateFilterControls() {
    filterControls.innerHTML = "";
    headers.forEach((header) => {
        const initialType = columnTypes[header] || 'string';
        const filterGroup = document.createElement("div");
        filterGroup.className = "filter-group";
        filterGroup.dataset.column = header;
        filterGroup.dataset.type = initialType;

        const label = document.createElement("label"); label.textContent = `${header}: `; filterGroup.appendChild(label);
        const typeSelect = document.createElement("select"); typeSelect.className = "filter-type-select";
        const availableTypes = {'string': 'Texte', 'number': 'Nombre', 'date': 'Date'};
        Object.entries(availableTypes).forEach(([value, text]) => {
            const option = document.createElement("option"); option.value = value; option.textContent = text;
            if (value === initialType) { option.selected = true; }
            typeSelect.appendChild(option);
        });
        filterGroup.appendChild(typeSelect);

        const controlsContainer = document.createElement("div"); controlsContainer.className = "filter-controls-container"; filterGroup.appendChild(controlsContainer);

        const clearBtn = document.createElement("button");
        clearBtn.innerHTML = "<span class='visually-hidden'>Effacer filtre</span>🗑️"; // Icon + hidden text for accessibility
        clearBtn.className = "clear-filter-btn";
        clearBtn.type = "button";
        clearBtn.style.display = 'none'; // Initially hidden
        clearBtn.title = "Effacer ce filtre";

        clearBtn.addEventListener("click", () => {
            const opSelect = filterGroup.querySelector(".filter-operator");
            const val1Input = filterGroup.querySelector(".filter-value1");
            const val2Input = filterGroup.querySelector(".filter-value2");
            if (opSelect) opSelect.selectedIndex = 0;
            if (val1Input) val1Input.value = "";
            if (val2Input) val2Input.value = "";
            const currentType = filterGroup.dataset.type;
            const firstOperator = opSelect ? opSelect.options[0].value : 'contains';
            regenerateControls(currentType, controlsContainer, filterGroup, typeSelect, firstOperator);
            clearBtn.style.display = 'none';
            applyFilters();
        });
        filterGroup.appendChild(clearBtn);

        const isFilterActive = (op, val1, val2) => {
             const requiresValue = !['is null', 'is not null'].includes(op);
             const hasValue = val1 !== null && String(val1).trim() !== '';
             const hasValue2 = val2 !== null && String(val2).trim() !== '';
             if (!requiresValue && ['is null', 'is not null'].includes(op)) return true;
             if (op === 'between') return hasValue && hasValue2;
             return hasValue;
        };

        const updateClearButtonVisibility = () => {
            const opSelect = filterGroup.querySelector(".filter-operator");
            const val1Input = filterGroup.querySelector(".filter-value1");
            const val2Input = filterGroup.querySelector(".filter-value2");
            const currentOp = opSelect ? opSelect.value : null;
            const currentVal1 = val1Input ? val1Input.value : null;
            const currentVal2 = val2Input ? val2Input.value : null;
            clearBtn.style.display = isFilterActive(currentOp, currentVal1, currentVal2) ? 'inline-block' : 'none';
        };

        const regenerateControls = (selectedType, container, group, typeSel, defaultOperator = null) => {
            container.innerHTML = '';
            const operatorSelect = document.createElement("select"); operatorSelect.className = "filter-operator";
            let operators = [];
            switch (selectedType) {
                case 'number': operators = ['=', '!=', '>', '<', '>=', '<=', 'between', 'is null', 'is not null']; break;
                case 'date': operators = ['=', '!=', '>', '<', '>=', '<=', 'between', 'is null', 'is not null']; break;
                case 'string': default: operators = ['contains', 'does not contain', '=', '!=', 'starts with', 'ends with', 'is null', 'is not null']; break;
            }
            let operatorToSelect = defaultOperator;
            operators.forEach(opValue => {
                const option = document.createElement("option"); option.value = opValue; option.textContent = operatorTranslations[opValue] || opValue;
                if(operatorToSelect && opValue === operatorToSelect) { option.selected = true; }
                operatorSelect.appendChild(option);
            });
             if(!operatorToSelect && operatorSelect.options.length > 0) { operatorToSelect = operatorSelect.options[0].value; }

            container.appendChild(operatorSelect);
            const inputWrapper = document.createElement("div"); inputWrapper.className = "input-wrapper"; container.appendChild(inputWrapper);

            const createInputs = (currentOperator) => {
                inputWrapper.innerHTML = '';
                const requiresValue = !['is null', 'is not null'].includes(currentOperator);
                const isBetween = currentOperator === 'between';
                if (requiresValue) {
                    const input1 = document.createElement("input"); input1.className = "filter-input filter-value1"; input1.type = (selectedType === 'date') ? 'date' : (selectedType === 'number') ? 'number' : 'text';
                    if (selectedType === 'number') input1.step = 'any';
                    input1.placeholder = isBetween ? 'Valeur début' : 'Valeur';
                    input1.addEventListener('input', updateClearButtonVisibility);
                    inputWrapper.appendChild(input1);
                    if (isBetween) {
                        const input2 = document.createElement("input"); input2.className = "filter-input filter-value2"; input2.type = input1.type; if (input1.step) input2.step = input1.step;
                        input2.placeholder = 'Valeur fin';
                         input2.addEventListener('input', updateClearButtonVisibility);
                        inputWrapper.appendChild(input2);
                    }
                }
                 updateClearButtonVisibility();
            };

            createInputs(operatorToSelect);
            operatorSelect.addEventListener('change', (e) => { createInputs(e.target.value); updateClearButtonVisibility(); });
        };

        typeSelect.addEventListener('change', (e) => {
            const newType = e.target.value;
            filterGroup.dataset.type = newType;
            regenerateControls(newType, controlsContainer, filterGroup, typeSelect);
            updateClearButtonVisibility();
        });

        regenerateControls(initialType, controlsContainer, filterGroup, typeSelect);
        filterControls.appendChild(filterGroup);
        updateClearButtonVisibility(); // Initial check
    });
}

// Function to apply filters
function applyFilters() {
    const filterGroups = document.querySelectorAll(".filter-group");
    filteredData = originalData.filter((row) => {
         for (const group of filterGroups) {
            const column = group.dataset.column; const type = group.dataset.type; const operator = group.querySelector(".filter-operator").value;
            const value1Input = group.querySelector(".filter-value1"); const value2Input = group.querySelector(".filter-value2");
            const rawValue1 = value1Input ? value1Input.value : null; const rawValue2 = value2Input ? value2Input.value : null; const cellValue = row[column];
            const isCellEmpty = cellValue === null || cellValue === undefined || String(cellValue).trim() === '';
            if (operator === 'is null') { if (!isCellEmpty) return false; continue; } if (operator === 'is not null') { if (isCellEmpty) return false; continue; }
            // Check if filter is actually active before potentially excluding row based on empty cell
            const requiresValue = !['is null', 'is not null'].includes(operator);
            const isBetween = operator === 'between';
            const val1Provided = rawValue1 !== null && String(rawValue1).trim() !== '';
            const val2Provided = rawValue2 !== null && String(rawValue2).trim() !== '';
            let isFilterConditionActive = false;
            if (!requiresValue) { isFilterConditionActive = true; } // is null / is not null are always active if selected
            else if (isBetween) { isFilterConditionActive = val1Provided && val2Provided; }
            else { isFilterConditionActive = val1Provided; }

            if (!isFilterConditionActive) { continue; } // If the filter condition isn't active, skip it
            if (isCellEmpty) { return false; } // If filter is active but cell is empty, exclude row

            let cell, filterVal1, filterVal2;
            try {
                switch (type) {
                    case 'number': cell = Number(String(cellValue).trim()); filterVal1 = Number(String(rawValue1).trim()); if (operator === 'between') filterVal2 = Number(String(rawValue2).trim());
                         if (isNaN(cell)) return false; if (isNaN(filterVal1)) continue; if (operator === 'between' && isNaN(filterVal2)) continue;
                         switch (operator) { case '=': if (!(cell === filterVal1)) return false; break; case '!=': if (!(cell !== filterVal1)) return false; break; case '>': if (!(cell > filterVal1)) return false; break; case '<': if (!(cell < filterVal1)) return false; break; case '>=': if (!(cell >= filterVal1)) return false; break; case '<=': if (!(cell <= filterVal1)) return false; break; case 'between': if (!(cell >= filterVal1 && cell <= filterVal2)) return false; break; default: console.warn(`Opérateur numérique non géré: ${operator}`); break; } break;
                    case 'date': let cellDate = new Date(cellValue); if (isNaN(cellDate.getTime())) cellDate = parseDMYDate(cellValue); let filterDate1 = rawValue1 ? new Date(rawValue1) : null; let filterDate2 = (operator === 'between' && rawValue2) ? new Date(rawValue2) : null;
                         if (!cellDate || isNaN(cellDate.getTime())) return false; if (!filterDate1 || isNaN(filterDate1.getTime())) continue; if (operator === 'between' && (!filterDate2 || isNaN(filterDate2.getTime()))) continue;
                         cellDate.setUTCHours(0, 0, 0, 0); filterDate1.setUTCHours(0, 0, 0, 0); const cellTime = cellDate.getTime(); const filterTime1 = filterDate1.getTime();
                         switch (operator) { case '=': if (!(cellTime === filterTime1)) return false; break; case '!=': if (!(cellTime !== filterTime1)) return false; break; case '>': if (!(cellTime > filterTime1)) return false; break; case '<': if (!(cellTime < filterTime1)) return false; break; case '>=': if (!(cellTime >= filterTime1)) return false; break; case '<=': if (!(cellTime <= filterTime1)) return false; break; case 'between': filterDate2.setUTCHours(0, 0, 0, 0); const filterTime2 = filterDate2.getTime(); if (!(cellTime >= filterTime1 && cellTime <= filterTime2)) return false; break; default: console.warn(`Opérateur de date non géré: ${operator}`); break; } break;
                    case 'string': default: cell = String(cellValue).trim().toLowerCase(); filterVal1 = String(rawValue1).trim().toLowerCase();
                        switch (operator) { case 'contains': if (!cell.includes(filterVal1)) return false; break; case 'does not contain': if (cell.includes(filterVal1)) return false; break; case '=': if (!(cell === filterVal1)) return false; break; case '!=': if (!(cell !== filterVal1)) return false; break; case 'starts with': if (!cell.startsWith(filterVal1)) return false; break; case 'ends with': if (!cell.endsWith(filterVal1)) return false; break; default: console.warn(`Opérateur de chaîne non géré: ${operator}`); break; } break;
                }
            } catch (e) { console.error(`Erreur de comparaison colonne ${column} (valeur: ${cellValue}, type: ${type}, opérateur: ${operator}):`, e); return false; }
        } return true; });
    currentPage = 1;
    displayData();
}

// Function to reset filters
function resetFilters() { generateFilterControls(); filteredData = [...originalData]; currentPage = 1; displayData(); }

// Function to sort table by column
let currentSortColumn = null; let currentSortOrder = 'none';
function sortTable(column) {
    let newOrder; if (currentSortColumn === column) { newOrder = currentSortOrder === 'asc' ? 'desc' : 'asc'; } else { newOrder = 'asc'; }
    currentSortColumn = column; currentSortOrder = newOrder;
    const filterGroup = document.querySelector(`.filter-group[data-column="${column.replace(/"/g, '"')}"]`); const columnType = filterGroup ? filterGroup.dataset.type : (columnTypes[column] || 'string');
    console.log(`Tri colonne: ${column}, Type utilisé: ${columnType}, Ordre: ${newOrder}`);
    filteredData.sort((a, b) => {
        let valA = a[column]; let valB = b[column]; const aIsEmpty = valA === null || valA === undefined || String(valA).trim() === ''; const bIsEmpty = valB === null || valB === undefined || String(valB).trim() === ''; if (aIsEmpty && bIsEmpty) return 0; if (aIsEmpty) return 1; if (bIsEmpty) return -1;
        try { if (columnType === 'number') { const numA = Number(String(valA).trim()); const numB = Number(String(valB).trim()); if (isNaN(numA) && isNaN(numB)) return 0; if (isNaN(numA)) return 1; if (isNaN(numB)) return -1; return currentSortOrder === 'asc' ? numA - numB : numB - numA; } else if (columnType === 'date') { let dateA = new Date(valA); if (isNaN(dateA.getTime())) dateA = parseDMYDate(valA); let dateB = new Date(valB); if (isNaN(dateB.getTime())) dateB = parseDMYDate(valB); const aIsInvalid = !dateA || isNaN(dateA.getTime()); const bIsInvalid = !dateB || isNaN(dateB.getTime()); if (aIsInvalid && bIsInvalid) return 0; if (aIsInvalid) return 1; if (bIsInvalid) return -1; return currentSortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime(); } } catch (e) { console.warn(`Impossible de trier la colonne ${column} comme type ${columnType}`, e); }
        const strA = String(valA).trim().toLowerCase(); const strB = String(valB).trim().toLowerCase(); if (strA < strB) return currentSortOrder === 'asc' ? -1 : 1; if (strA > strB) return currentSortOrder === 'asc' ? 1 : -1; return 0; });
    document.querySelectorAll("th").forEach((th) => { const headerColumn = th.dataset.column; th.innerHTML = th.innerHTML.replace(/ ↑| ↓/g, ""); if (headerColumn === currentSortColumn) { th.innerHTML += currentSortOrder === 'asc' ? ' ↑' : ' ↓'; } });
    currentPage = 1; displayData(); }

// Function to execute SQL query
function executeSQL() {
  const query = sqlQuery.value.trim(); if (!query) { alert("Veuillez entrer une requête SQL."); return; }
  try { const result = alasql(query, [originalData]);
    if (Array.isArray(result)) { filteredData = result;
       if (filteredData.length > 0) { headers = Object.keys(filteredData[0]); columnTypes = detectColumnTypes(filteredData, headers); generateFilterControls(); }
       else { headers = results.meta.fields ? results.meta.fields.map(h => String(h || '').trim()) : headers; filterControls.innerHTML = "<p>Aucune donnée après requête SQL. Les filtres de base sont désactivés.</p>"; }
      currentPage = 1; displayData();
    } else { alert("La requête n'a pas retourné un tableau de résultats."); }
  } catch (error) { alert(`Erreur SQL : ${error.message}`); console.error("Erreur AlaSQL:", error); } }

// Function to display data with pagination
function displayData() {
  resultStats.textContent = `Affichage de ${filteredData.length} sur ${originalData.length} lignes`;
  const currentRowsPerPage = (rowsPerPage === Number.MAX_SAFE_INTEGER) ? filteredData.length : rowsPerPage;
  const totalPages = currentRowsPerPage > 0 ? Math.ceil(filteredData.length / currentRowsPerPage) : 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * currentRowsPerPage;
  const endIndex = (rowsPerPage === Number.MAX_SAFE_INTEGER) ? filteredData.length : Math.min(startIndex + currentRowsPerPage, filteredData.length);
  const pageData = filteredData.slice(startIndex, endIndex);

  let tableHTML = "<table><thead><tr>";
  headers.forEach((header) => { tableHTML += `<th data-column="${header.replace(/"/g, '&quot;')}">${header}</th>`; });
  tableHTML += "</tr></thead><tbody>";
  pageData.forEach((row) => { tableHTML += "<tr>"; headers.forEach((header) => { const cellContent = row[header] !== null && row[header] !== undefined ? row[header] : ""; tableHTML += `<td>${cellContent}</td>`; }); tableHTML += "</tr>"; });
  tableHTML += "</tbody></table>";
  tableContainer.innerHTML = tableHTML;

  document.querySelectorAll("th").forEach((th) => {
      const columnName = th.dataset.column; th.addEventListener("click", () => sortTable(columnName));
      th.innerHTML = th.innerHTML.replace(/ ↑| ↓/g, ""); if (columnName === currentSortColumn) { th.innerHTML += currentSortOrder === 'asc' ? ' ↑' : ' ↓'; } });

  generatePagination(totalPages);
}

// Function to generate pagination controls
function generatePagination(totalPages) {
    pagination.innerHTML = ""; if (totalPages <= 1) return;
    const prevBtn = document.createElement("button"); prevBtn.textContent = "Précédent"; prevBtn.disabled = currentPage === 1; prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; displayData(); } }); pagination.appendChild(prevBtn);
    const maxPageButtons = 5; let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2)); let endPage = Math.min(totalPages, startPage + maxPageButtons - 1); if (endPage - startPage + 1 < maxPageButtons) { startPage = Math.max(1, endPage - maxPageButtons + 1); }
    if (startPage > 1) { const firstBtn = document.createElement("button"); firstBtn.textContent = "1"; firstBtn.addEventListener("click", () => { currentPage = 1; displayData(); }); pagination.appendChild(firstBtn); if (startPage > 2) { const ellipsis = document.createElement("span"); ellipsis.textContent = "..."; pagination.appendChild(ellipsis); } }
    for (let i = startPage; i <= endPage; i++) { const pageBtn = document.createElement("button"); pageBtn.textContent = i; pageBtn.classList.toggle("active", i === currentPage); pageBtn.addEventListener("click", () => { currentPage = i; displayData(); }); pagination.appendChild(pageBtn); }
    if (endPage < totalPages) { if (endPage < totalPages - 1) { const ellipsis = document.createElement("span"); ellipsis.textContent = "..."; pagination.appendChild(ellipsis); } const lastBtn = document.createElement("button"); lastBtn.textContent = totalPages; lastBtn.addEventListener("click", () => { currentPage = totalPages; displayData(); }); pagination.appendChild(lastBtn); }
    const nextBtn = document.createElement("button"); nextBtn.textContent = "Suivant"; nextBtn.disabled = currentPage === totalPages; nextBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; displayData(); } }); pagination.appendChild(nextBtn);
}

// Function to export as CSV
function exportAsCSV() {
    if (filteredData.length === 0) { alert("Aucune donnée à exporter."); return; } const csvContent = Papa.unparse({ fields: headers, data: filteredData }); const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", "donnees_filtrees.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }

// Function to export as JSON
function exportAsJSON() {
    if (filteredData.length === 0) { alert("Aucune donnée à exporter."); return; } const jsonContent = JSON.stringify(filteredData, null, 2); const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;", }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", "donnees_filtrees.json"); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }

