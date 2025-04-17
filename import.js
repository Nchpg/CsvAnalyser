// Function to import CSV
function importCSV() {
    const file = csvFileInput.files[0];
    if (!file) { importStatus.textContent = "Veuillez sélectionner un fichier CSV."; return; }
    importLoader.style.display = "block"; importStatus.textContent = "Importation en cours...";
    filterSection.style.display = "none"; resultsSection.style.display = "none";
    groupBySection.style.display = "none"; // Hide group by initially
    groupByRulesContainer.innerHTML = ""; // Clear old rules
    isGroupedView = false; // Reset view flag

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: function (results) {
            importLoader.style.display = "none";
            if (results.data && results.data.length > 0 && results.meta.fields) {
                originalData = results.data;
                // Store both original and working headers
                originalHeaders = results.meta.fields.map(h => String(h || '').trim()).filter(h => h);
                headers = [...originalHeaders]; // Initialize working headers
                
                // Clean data rows to only include defined headers
                originalData = originalData.map(row => { 
                    const newRow = {}; 
                    const rowKeys = Object.keys(row);
                    originalHeaders.forEach(header => {
                        const originalKey = rowKeys.find(k => String(k || '').trim() === header);
                        newRow[header] = row[originalKey];
                    });
                    return newRow;
                });
                
                filteredData = [...originalData]; // Initialize filtered data
                columnTypes = detectColumnTypes(originalData, originalHeaders); // Detect types based on original headers
                importStatus.textContent = `Importation réussie : ${originalData.length} lignes et ${originalHeaders.length} colonnes.`;
                
                // Show relevant sections
                filterSection.style.display = "block"; 
                resultsSection.style.display = "block";
                groupBySection.style.display = "block"; // Show group by section

                // Setup controls
                setupRowsPerPageOptions(originalData.length);
                generateFilterControls(); // Based on original headers
                // No need to populate group by dropdowns here, addGroupByRule does it
                
                currentPage = 1; // Reset page on new import
                isGroupedView = false; // Ensure initial view is not grouped
                displayData(); // Initial display with default rowsPerPage
                
                const exampleColumn = originalHeaders[0] || "nom_colonne";
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
        dynamicTyping: (field) => { 
            // Try to force string typing initially for dates if needed
            // return columnTypes[field] === 'date' ? false : true; 
            return false; // Let's rely on our detection for now
         }, 
        transformHeader: header => String(header || '').trim()
    });
}

// Setup Rows Per Page Options dynamically (Unchanged)
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

// Handle Rows Per Page Change (Unchanged)
function handleRowsPerPageChange() {
    rowsPerPage = parseInt(rowsPerPageSelect.value, 10);
    currentPage = 1; // Reset to first page when changing page size
    displayData();
}