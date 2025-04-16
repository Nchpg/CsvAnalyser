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
                         switch (operator) { case '=': if (!(cell === filterVal1)) return false; break; case '!=': if (!(cell !== filterVal1)) return false; break; case '>': if (!(cell > filterVal1)) return false; break; case '<': if (!(cell < filterVal1)) return false; break; case '>=': if (!(cell >= filterVal1)) return false; break; case '<=': if (!(cell <= filterVal1)) return false; break; case 'between': if (!(cell >= filterVal1 && cell <= filterVal2)) return false; break; default: console.warn(`Opérateur numérique non géré: ${operator}`); break; }
                    case 'date': let cellDate = new Date(cellValue); if (isNaN(cellDate.getTime())) cellDate = parseDMYDate(cellValue); let filterDate1 = rawValue1 ? new Date(rawValue1) : null; let filterDate2 = (operator === 'between' && rawValue2) ? new Date(rawValue2) : null;
                         if (!cellDate || isNaN(cellDate.getTime())) return false; if (!filterDate1 || isNaN(filterDate1.getTime())) continue; if (operator === 'between' && (!filterDate2 || isNaN(filterDate2.getTime()))) continue;
                         cellDate.setUTCHours(0, 0, 0, 0); filterDate1.setUTCHours(0, 0, 0, 0); const cellTime = cellDate.getTime(); const filterTime1 = filterDate1.getTime();
                         switch (operator) { case '=': if (!(cellTime === filterTime1)) return false; break; case '!=': if (!(cellTime !== filterTime1)) return false; break; case '>': if (!(cellTime > filterTime1)) return false; break; case '<': if (!(cellTime < filterTime1)) return false; break; case '>=': if (!(cellTime >= filterTime1)) return false; break; case '<=': if (!(cellTime <= filterTime1)) return false; break; case 'between': filterDate2.setUTCHours(0, 0, 0, 0); const filterTime2 = filterDate2.getTime(); if (!(cellTime >= filterTime1 && cellTime <= filterTime2)) return false; break; default: console.warn(`Opérateur de date non géré: ${operator}`); break; }
                    case 'string': default: cell = String(cellValue).trim().toLowerCase(); filterVal1 = String(rawValue1).trim().toLowerCase();
                        switch (operator) { case 'contains': if (!cell.includes(filterVal1)) return false; break; case 'does not contain': if (cell.includes(filterVal1)) return false; break; case '=': if (!(cell === filterVal1)) return false; break; case '!=': if (!(cell !== filterVal1)) return false; break; case 'starts with': if (!cell.startsWith(filterVal1)) return false; break; case 'ends with': if (!cell.endsWith(filterVal1)) return false; break; default: console.warn(`Opérateur de chaîne non géré: ${operator}`); break; }
                }
            } catch (e) { console.error(`Erreur de comparaison colonne ${column} (valeur: ${cellValue}, type: ${type}, opérateur: ${operator}):`, e); return false; }
        } return true; });
    currentPage = 1;
    displayData();
}

// Function to reset filters
function resetFilters() { generateFilterControls(); filteredData = [...originalData]; currentPage = 1; displayData(); }