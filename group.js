// Helper function to quote column names only if necessary
function quoteIdentifierIfNeeded(identifier) {
    // Allow '*' for COUNT(*)
    if (identifier === 'COUNT(*)') return identifier;
    // Basic check for safe identifiers (letters, numbers, underscore, not starting with number)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
        return identifier;
    }
    // Quote if it contains special characters, starts with a number, or is a reserved word
    const escapedIdentifier = identifier.replace(/`/g, '``'); // Escape backticks within the identifier
    return `\`${escapedIdentifier}\``;
}


// Helper function to parse DD-MM-YYYY or DD/MM/YYYY dates (assuming it exists elsewhere, e.g., utils.js)
// If it doesn't exist, it needs to be implemented.
// function parseDMYDate(str) { ... }

// --- Group By Rule UI Functions ---

function addGroupByRule() {
    const ruleDiv = document.createElement("div");
    ruleDiv.className = "group-by-rule";

    const moveUpBtn = document.createElement("button");
    moveUpBtn.innerHTML = "&uarr;";
    moveUpBtn.className = "move-group-rule-btn move-up-btn";
    moveUpBtn.type = "button";
    moveUpBtn.title = "Monter";
    moveUpBtn.addEventListener('click', () => moveRule(ruleDiv, 'up'));
    ruleDiv.appendChild(moveUpBtn);

    const moveDownBtn = document.createElement("button");
    moveDownBtn.innerHTML = "&darr;";
    moveDownBtn.className = "move-group-rule-btn move-down-btn";
    moveDownBtn.type = "button";
    moveDownBtn.title = "Descendre";
    moveDownBtn.addEventListener('click', () => moveRule(ruleDiv, 'down'));
    ruleDiv.appendChild(moveDownBtn);

    const columnSelect = document.createElement("select");
    columnSelect.className = "group-by-column-select";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "-- Choisir colonne --";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    columnSelect.appendChild(placeholderOption);
    // Assume originalHeaders is globally available
    originalHeaders.forEach(header => {
        const option = document.createElement("option");
        option.value = header;
        option.textContent = header;
        columnSelect.appendChild(option);
    });
    ruleDiv.appendChild(columnSelect);

    const dateOptionsDiv = document.createElement("div");
    dateOptionsDiv.className = "date-group-options";
    dateOptionsDiv.style.display = 'inline-block';
    ruleDiv.appendChild(dateOptionsDiv);

    columnSelect.addEventListener('change', (event) => {
        const selectedColumn = event.target.value;
        // Assume columnTypes is globally available
        const type = columnTypes[selectedColumn];
        dateOptionsDiv.innerHTML = '';
        if (type === 'date') {
            const dateSelect = document.createElement("select");
            dateSelect.className = "date-group-select";
            const dateOptions = { 'full': 'Date complète', 'monthYear': 'Mois/Année', 'year': 'Année' };
            Object.entries(dateOptions).forEach(([value, text]) => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = text;
                dateSelect.appendChild(option);
            });
            dateOptionsDiv.appendChild(dateSelect);
        }
    });

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "-";
    removeBtn.className = "remove-group-rule-btn";
    removeBtn.type = "button";
    removeBtn.title = "Supprimer";
    removeBtn.addEventListener('click', () => {
        if (typeof groupByRulesContainer !== 'undefined') {
            ruleDiv.remove();
            updateMoveButtonsState();
        } else {
            console.error('groupByRulesContainer not found when trying to remove rule');
        }
    });
    ruleDiv.appendChild(removeBtn);

    if (typeof groupByRulesContainer !== 'undefined' && groupByRulesContainer) {
        groupByRulesContainer.appendChild(ruleDiv);
        updateMoveButtonsState();
    } else {
        console.error("groupByRulesContainer is not defined. Cannot add group rule UI element.");
        alert("Erreur: Impossible d'ajouter la règle de groupement car le conteneur est introuvable.");
    }
}

function moveRule(ruleDiv, direction) {
    if (typeof groupByRulesContainer === 'undefined' || !groupByRulesContainer) {
        console.error("groupByRulesContainer is not defined. Cannot move rule.");
        return;
    }
    const container = groupByRulesContainer;
    const sibling = direction === 'up' ? ruleDiv.previousElementSibling : ruleDiv.nextElementSibling;
    if (sibling) {
        container.insertBefore(ruleDiv, direction === 'down' ? sibling.nextElementSibling : sibling);
        updateMoveButtonsState();
    }
}

function updateMoveButtonsState() {
    if (typeof groupByRulesContainer === 'undefined' || !groupByRulesContainer) {
        console.error("groupByRulesContainer is not defined. Cannot update move button states.");
        return;
    }
    const rules = groupByRulesContainer.querySelectorAll(".group-by-rule");
    rules.forEach((rule, index) => {
        const upBtn = rule.querySelector(".move-up-btn");
        const downBtn = rule.querySelector(".move-down-btn");
        if (upBtn) upBtn.disabled = (index === 0);
        if (downBtn) downBtn.disabled = (index === rules.length - 1);
    });
}

// --- Core Grouping Logic ---

function performGroupByQuery(dataToGroup, groupingRules) {
    if (!groupingRules || groupingRules.length === 0) return null;

    let selectExpressions = []; // SELECT expressions (without AS)
    let groupByExpressions = []; // GROUP BY expressions
    let desiredHeaders = []; // The headers we WANT in the final result
    let errorOccurred = false;

    // Define dataForAlasql here so it's accessible in the catch block if needed
    // Although the primary error seems to be SQL related, this ensures it exists for logging
    let dataForAlasql = null;

    groupingRules.forEach(rule => {
        if (errorOccurred) return;
        const selectedColumn = rule.column;
        const dateGrouping = rule.dateOption;
        const columnType = columnTypes[selectedColumn]; // Assume columnTypes is globally available
        const baseColumnRef = quoteIdentifierIfNeeded(selectedColumn);
        let selectExpression = baseColumnRef;
        let groupByExpression = baseColumnRef;
        let headerName = selectedColumn; // Default desired header

        if (columnType === 'date' && dateGrouping) {
            try {
                switch (dateGrouping) {
                    case 'year':
                        selectExpression = `YEAR(${baseColumnRef})`;
                        groupByExpression = `YEAR(${baseColumnRef})`;
                        headerName = `Année(${selectedColumn})`;
                        break;
                    case 'monthYear':
                        // Use concatenation with leading zero for month: YYYY-MM
                        selectExpression = `(YEAR(${baseColumnRef}) || '-' || CASE WHEN MONTH(${baseColumnRef}) < 10 THEN '0' ELSE '' END || MONTH(${baseColumnRef}))`;
                        groupByExpression = selectExpression; // Group by the same formatted string
                        headerName = `MoisAnnée(${selectedColumn})`;
                        break;
                    case 'full':
                        // Use concatenation with leading zeros for day and month: DD-MM-YYYY
                        selectExpression = `(CASE WHEN DAY(${baseColumnRef}) < 10 THEN '0' ELSE '' END || DAY(${baseColumnRef}) || '-' || CASE WHEN MONTH(${baseColumnRef}) < 10 THEN '0' ELSE '' END || MONTH(${baseColumnRef}) || '-' || YEAR(${baseColumnRef}))`;
                        groupByExpression = selectExpression; // Group by the same formatted string
                        headerName = selectedColumn;
                        break;
                    default:
                        selectExpression = baseColumnRef; // Keep original column reference
                        groupByExpression = baseColumnRef;
                        headerName = selectedColumn;
                        break;
                }
            } catch (e) {
                console.error(`Error processing grouping rule for date column ${selectedColumn}:`, e);
                alert(`Erreur lors de la configuration du groupement pour la colonne date '${selectedColumn}'. Vérifiez la console pour les détails.`);
                errorOccurred = true; return;
            }
        }
        // Add the expression WITHOUT AS keyword
        selectExpressions.push(selectExpression);
        groupByExpressions.push(groupByExpression);
        desiredHeaders.push(headerName); // Store the desired final header name
    });

    if (errorOccurred) {
        console.error("Could not build group query due to errors in rule processing.");
        return null;
    }
    if (selectExpressions.length === 0) {
         console.warn("No valid grouping rules provided.");
         return null;
    }

    // Add COUNT(*) expression (without AS)
    const countHeader = "COUNT(*)"; // Desired header for the count
    selectExpressions.push("COUNT(*)");
    desiredHeaders.push(countHeader);

    // Construct the query WITHOUT AS ALIASES
    const query = `SELECT ${selectExpressions.join(", ")} FROM ? GROUP BY ${groupByExpressions.join(", ")}`;
    console.log("Executing Group By Query (no AS):", query);

    try {
        // Prepare data (convert date strings to Date objects for AlaSQL)
        dataForAlasql = dataToGroup.map(row => {
             const newRow = { ...row };
             originalHeaders.forEach(hdr => {
                 if (columnTypes[hdr] === 'date' && newRow[hdr] != null) {
                    let parsedDate = null;
                    if (newRow[hdr] instanceof Date && !isNaN(newRow[hdr])) {
                        parsedDate = newRow[hdr];
                    } else if (typeof newRow[hdr] === 'string' && newRow[hdr].trim()) {
                         if (typeof parseDMYDate === 'function') {
                            parsedDate = parseDMYDate(newRow[hdr]);
                         }
                         if (!parsedDate || isNaN(parsedDate.getTime())) {
                             parsedDate = new Date(newRow[hdr]);
                         }
                    } else if (typeof newRow[hdr] === 'number') {
                        parsedDate = new Date(newRow[hdr]);
                    }
                    newRow[hdr] = (parsedDate && !isNaN(parsedDate.getTime())) ? parsedDate : null;
                 }
             });
             return newRow;
        });

        // Execute the AlaSQL query
        if (typeof alasql !== 'function') {
             console.error("AlaSQL function is not available.");
             alert("Erreur critique: La librairie de requêtes (AlaSQL) n'est pas chargée.");
             return null;
        }
        const rawGroupedResult = alasql(query, [dataForAlasql]);

        // --- Post-process results to rename headers --- 
        let finalGroupedResult = [];
        if (rawGroupedResult && rawGroupedResult.length > 0) {
            const actualKeys = Object.keys(rawGroupedResult[0]);
            if (actualKeys.length !== desiredHeaders.length) {
                console.error("Mismatch between expected headers count and actual result keys count from AlaSQL.", desiredHeaders.length, actualKeys.length, desiredHeaders, actualKeys);
                alert("Erreur: Incohérence dans les résultats du groupement. Le nombre de colonnes retournées ne correspond pas.");
                return null; 
            }

            finalGroupedResult = rawGroupedResult.map(row => {
                const newRow = {};
                desiredHeaders.forEach((desiredHeader, index) => {
                    const actualKey = actualKeys[index]; // Get AlaSQL's key based on column order
                    newRow[desiredHeader] = row[actualKey];
                });
                return newRow;
            });
        }
        // --- End of post-processing ---

        // Return the data with the corrected headers
        return { data: finalGroupedResult, headers: desiredHeaders };

    } catch (error) {
        // Log the error WITH the query that was actually run
        alert(`Erreur lors de l'exécution du groupement: ${error.message}`);
        console.error("AlaSQL Error during grouping:", error);
        console.error("Query executed:", query);
        // Log data sample only if dataForAlasql was successfully created
        const dataSample = dataForAlasql && dataForAlasql.length > 0 ? dataForAlasql[0] : "N/A (data prep might have failed or was empty)";
        console.error("Data Sample (first row passed to AlaSQL):", dataSample);
        return null;
    }
}


// Function called by the 'Apply Group By' button
function applyGroupBy() {
    if (typeof groupByRulesContainer === 'undefined' || !groupByRulesContainer) {
        console.error("groupByRulesContainer is not defined. Cannot apply group by.");
        alert("Erreur: Impossible d'appliquer le groupement car le conteneur de règles est introuvable.");
        return;
    }
    const ruleElements = groupByRulesContainer.querySelectorAll(".group-by-rule");
    activeGroupingRules = []; // Assume activeGroupingRules is globally available
    let rulesValid = true;

    ruleElements.forEach(ruleElement => {
        const columnSelect = ruleElement.querySelector(".group-by-column-select");
        const selectedColumn = columnSelect.value;
        if (!selectedColumn) {
             rulesValid = false;
             return;
        }
        const dateSelect = ruleElement.querySelector(".date-group-select");
        const dateOption = dateSelect ? dateSelect.value : null;
        activeGroupingRules.push({ column: selectedColumn, dateOption: dateOption });
    });

    if (!rulesValid) {
         alert("Veuillez sélectionner une colonne pour chaque règle de groupement ou supprimer les règles incomplètes.");
         return;
    }

    if (typeof applyFilters === 'function') {
        applyFilters();
    } else {
        console.error("applyFilters function is not defined.");
        alert("Erreur: Impossible d'appliquer les filtres et groupements.");
    }
}


// Function to handle the 'Reset Grouping' button
function resetGrouping() {
    activeGroupingRules = [];
    isGroupedView = false;

    if (typeof groupByRulesContainer !== 'undefined' && groupByRulesContainer) {
        groupByRulesContainer.innerHTML = "";
    } else {
        console.warn("groupByRulesContainer not defined on reset, cannot clear UI rules.")
    }

    headers = [...originalHeaders];
    currentSort = { column: null, order: 'none' };

    if (typeof applyFilters === 'function') {
        applyFilters();
    } else {
        console.error("applyFilters function is not defined.");
        alert("Erreur: Impossible de réinitialiser et réappliquer les filtres.");
    }
}

// Event listeners (assuming global variables)
if (typeof addGroupByRuleBtn !== 'undefined' && addGroupByRuleBtn) {
    addGroupByRuleBtn.addEventListener("click", addGroupByRule);
}
if (typeof applyGroupByBtn !== 'undefined' && applyGroupByBtn) {
    applyGroupByBtn.addEventListener("click", applyGroupBy);
}
if (typeof resetGroupByBtn !== 'undefined' && resetGroupByBtn) {
    resetGroupByBtn.addEventListener("click", resetGrouping);
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    if (typeof groupByRulesContainer !== 'undefined' && groupByRulesContainer) {
        updateMoveButtonsState();
    }
});
