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

// Function to generate filter controls (based on original headers)
function generateFilterControls() {
    filterControls.innerHTML = "";
    // Always generate based on the original headers
    originalHeaders.forEach((header) => {
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
        clearBtn.innerHTML = "<span class='visually-hidden'>Effacer filtre</span>🗑️";
        clearBtn.className = "clear-filter-btn"; clearBtn.type = "button"; clearBtn.style.display = 'none'; clearBtn.title = "Effacer ce filtre";

        // --- Define local helper functions for this filter group ---
        const isFilterActiveLocal = (op, val1, val2) => {
            const requiresValue = !['is null', 'is not null'].includes(op);
            const hasValue = val1 !== null && String(val1).trim() !== '';
            const hasValue2 = val2 !== null && String(val2).trim() !== '';
            if (!requiresValue && ['is null', 'is not null'].includes(op)) return true;
            if (op === 'between') return hasValue && hasValue2;
            return hasValue;
        };
        const updateClearButtonVisibilityLocal = () => {
            const opSelect = filterGroup.querySelector(".filter-operator");
            const val1Input = filterGroup.querySelector(".filter-value1");
            const val2Input = filterGroup.querySelector(".filter-value2");
            const currentOp = opSelect ? opSelect.value : null;
            const currentVal1 = val1Input ? val1Input.value : null;
            const currentVal2 = val2Input ? val2Input.value : null;
            clearBtn.style.display = isFilterActiveLocal(currentOp, currentVal1, currentVal2) ? 'inline-block' : 'none';
        };
        const regenerateControlsLocal = (selectedType, container, group, typeSel, defaultOperator = null) => {
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
                    input1.addEventListener('input', updateClearButtonVisibilityLocal);
                    inputWrapper.appendChild(input1);
                    if (isBetween) {
                        const input2 = document.createElement("input"); input2.className = "filter-input filter-value2"; input2.type = input1.type; if (input1.step) input2.step = input1.step;
                        input2.placeholder = 'Valeur fin';
                        input2.addEventListener('input', updateClearButtonVisibilityLocal);
                        inputWrapper.appendChild(input2);
                    }
                }
                updateClearButtonVisibilityLocal();
            };
            createInputs(operatorToSelect);
            operatorSelect.addEventListener('change', (e) => { createInputs(e.target.value); updateClearButtonVisibilityLocal(); });
        };
        // --- End local helper functions ---

        clearBtn.addEventListener("click", () => {
             const opSelect = filterGroup.querySelector(".filter-operator");
             const val1Input = filterGroup.querySelector(".filter-value1");
             const val2Input = filterGroup.querySelector(".filter-value2");
             if (opSelect) opSelect.selectedIndex = 0;
             if (val1Input) val1Input.value = "";
             if (val2Input) val2Input.value = "";
             const currentType = filterGroup.dataset.type;
             const firstOperator = opSelect ? opSelect.options[0].value : 'contains';
             regenerateControlsLocal(currentType, controlsContainer, filterGroup, typeSelect, firstOperator);
             clearBtn.style.display = 'none';
             applyFilters(); // Re-apply after clearing one filter
        });
        filterGroup.appendChild(clearBtn);

        typeSelect.addEventListener('change', (e) => {
            const newType = e.target.value;
            filterGroup.dataset.type = newType;
            regenerateControlsLocal(newType, controlsContainer, filterGroup, typeSelect);
            updateClearButtonVisibilityLocal();
        });

        regenerateControlsLocal(initialType, controlsContainer, filterGroup, typeSelect);
        filterControls.appendChild(filterGroup);
        updateClearButtonVisibilityLocal();
    });
}

// Function to apply filters AND potentially re-apply grouping
function applyFilters() {
    // 1. Apply filters from UI to originalData
    const filterGroups = document.querySelectorAll(".filter-group");
    filteredData = originalData.filter((row) => { // Store result in filteredData
         for (const group of filterGroups) {
            const column = group.dataset.column;
            const type = group.dataset.type;
            const operatorSelect = group.querySelector(".filter-operator");
            const operator = operatorSelect ? operatorSelect.value : null;
            if (!operator) continue;
            const value1Input = group.querySelector(".filter-value1");
            const value2Input = group.querySelector(".filter-value2");
            const rawValue1 = value1Input ? value1Input.value : null;
            const rawValue2 = value2Input ? value2Input.value : null;
            const cellValue = row[column];
            const isCellEmpty = cellValue === null || cellValue === undefined || String(cellValue).trim() === '';
            if (operator === 'is null') { if (!isCellEmpty) return false; continue; }
            if (operator === 'is not null') { if (isCellEmpty) return false; continue; }
            const requiresValue = !['is null', 'is not null'].includes(operator);
            const isBetween = operator === 'between';
            const val1Provided = rawValue1 !== null && String(rawValue1).trim() !== '';
            const val2Provided = isBetween && rawValue2 !== null && String(rawValue2).trim() !== '';
            let isFilterConditionActive = false;
            if (!requiresValue) { isFilterConditionActive = true; } else if (isBetween) { isFilterConditionActive = val1Provided && val2Provided; } else { isFilterConditionActive = val1Provided; }
            if (!isFilterConditionActive) { continue; }
            if (isCellEmpty) { return false; }
            let cell, filterVal1, filterVal2;
            try {
                 // --- Detailed Comparison Logic ---
                 switch (type) {
                     case 'number':
                          cell = Number(String(cellValue).trim());
                          filterVal1 = Number(String(rawValue1).trim());
                          if (isNaN(cell)) return false;
                          if (isNaN(filterVal1) && !(isBetween && !isNaN(Number(String(rawValue2).trim())))) continue;
                          if (isBetween) { filterVal2 = Number(String(rawValue2).trim()); if(isNaN(filterVal2)) continue; }
                          switch (operator) { case '=': if (!(cell === filterVal1)) return false; break; case '!=': if (!(cell !== filterVal1)) return false; break; case '>': if (!(cell > filterVal1)) return false; break; case '<': if (!(cell < filterVal1)) return false; break; case '>=': if (!(cell >= filterVal1)) return false; break; case '<=': if (!(cell <= filterVal1)) return false; break; case 'between': if (!(cell >= filterVal1 && cell <= filterVal2)) return false; break; default: console.warn(`Opérateur num non géré: ${operator}`); break; }
                          break;
                     case 'date':
                         let cellDate = cellValue instanceof Date ? cellValue : (parseDMYDate(cellValue) || new Date(cellValue));
                         if (!cellDate || isNaN(cellDate.getTime())) return false;
                         let filterDate1 = rawValue1 ? new Date(rawValue1) : null;
                         if (!filterDate1 || isNaN(filterDate1.getTime())) continue;
                         let filterDate2 = (isBetween && rawValue2) ? new Date(rawValue2) : null;
                         if (isBetween && (!filterDate2 || isNaN(filterDate2.getTime()))) continue;
                         cellDate.setUTCHours(0, 0, 0, 0); filterDate1.setUTCHours(0, 0, 0, 0);
                         const cellTime = cellDate.getTime(); const filterTime1 = filterDate1.getTime();
                         switch (operator) { case '=': if (!(cellTime === filterTime1)) return false; break; case '!=': if (!(cellTime !== filterTime1)) return false; break; case '>': if (!(cellTime > filterTime1)) return false; break; case '<': if (!(cellTime < filterTime1)) return false; break; case '>=': if (!(cellTime >= filterTime1)) return false; break; case '<=': if (!(cellTime <= filterTime1)) return false; break;
                             case 'between': filterDate2.setUTCHours(0, 0, 0, 0); const filterTime2 = filterDate2.getTime(); if (!(cellTime >= filterTime1 && cellTime <= filterTime2)) return false; break;
                             default: console.warn(`Opérateur date non géré: ${operator}`); break; }
                         break;
                     case 'string': default:
                          cell = String(cellValue).trim().toLowerCase(); filterVal1 = String(rawValue1).trim().toLowerCase();
                          switch (operator) { case 'contains': if (!cell.includes(filterVal1)) return false; break; case 'does not contain': if (cell.includes(filterVal1)) return false; break; case '=': if (!(cell === filterVal1)) return false; break; case '!=': if (!(cell !== filterVal1)) return false; break; case 'starts with': if (!cell.startsWith(filterVal1)) return false; break; case 'ends with': if (!cell.endsWith(filterVal1)) return false; break;
                              case '>': case '<': case '>=': case '<=': case 'between': console.warn(`Opérateur '${operator}' ignoré pour str col '${column}'.`); break;
                              default: console.warn(`Opérateur str non géré: ${operator}`); break; }
                          break;
                 }
                 // --- End Detailed Comparison Logic ---
            } catch (e) { console.error(`Erreur comp ${column} (val: ${cellValue}, type: ${type}, op: ${operator}):`, e); return false; }
         }
         return true; // Row passes all active filters
    });

    // 2. Check if grouping should be re-applied
    if (activeGroupingRules && activeGroupingRules.length > 0) {
        const groupingResult = performGroupByQuery(filteredData, activeGroupingRules);
        if (groupingResult) {
            groupedAndFilteredData = groupingResult.data; // Store grouped data
            headers = groupingResult.headers; // Update headers to grouped ones
            isGroupedView = true;
        } else {
            // Grouping failed, show filtered data instead
            console.error("Grouping failed. Displaying filtered data only.");
            groupedAndFilteredData = []; // Clear any stale grouped data
            headers = [...originalHeaders];
            isGroupedView = false;
            // Fall through to display filteredData
        }
    } else {
        // No active grouping
        groupedAndFilteredData = []; // Clear grouped data
        headers = [...originalHeaders];
        isGroupedView = false;
    }

    // 3. Reset sort state when filters/grouping changes fundamentally
    currentSort = { column: null, order: 'none' };

    // 4. Reset pagination and display
    currentPage = 1;
    // displayData will use isGroupedView, headers, filteredData, groupedAndFilteredData
    displayData();
}

// Function to reset filters AND grouping (Called by the main reset button)
function resetFilters() {
    // Use the dedicated resetGrouping function first
    resetGrouping(); 
    
    // Regenerate filter controls to their default state
    generateFilterControls();

    // Reset filtered data to original (resetGrouping handles the display part)
    filteredData = [...originalData];
    // Ensure displayData is called to show the full original data
    // applyFilters() is called by resetGrouping, so no need to call displayData here explicitly
    // We need applyFilters here to correctly display the reset state without group by
    applyFilters(); 
}