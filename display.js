// Function to display data (rows or grouped/sorted results)
function displayData() {
    // Determine the correct base data source based on view state
    let dataToSort = isGroupedView ? [...groupedAndFilteredData] : [...filteredData]; // Use copies for sorting

    // --- Sorting (apply before pagination/display) ---
    if (currentSort.column && currentSort.order !== 'none') {
        let columnTypeToSort = 'string';
        if (isGroupedView) {
            if (currentSort.column === 'Count') {
                columnTypeToSort = 'number';
            } else {
                const originalCol = originalHeaders.find(h => currentSort.column.startsWith(h));
                if (originalCol && columnTypes[originalCol]) {
                    columnTypeToSort = columnTypes[originalCol];
                }
            }
        } else {
            columnTypeToSort = columnTypes[currentSort.column] || 'string';
        }

        console.log(`Sorting column: ${currentSort.column}, Order: ${currentSort.order}, Type: ${columnTypeToSort}`);

        dataToSort.sort((a, b) => {
            let valA = a[currentSort.column];
            let valB = b[currentSort.column];
            const aIsEmpty = valA === null || valA === undefined || String(valA).trim() === '';
            const bIsEmpty = valB === null || valB === undefined || String(valB).trim() === '';

            if (aIsEmpty && bIsEmpty) return 0;
            if (aIsEmpty) return 1;
            if (bIsEmpty) return -1;

            let comparison = 0;
            try {
                if (columnTypeToSort === 'number') {
                    const numA = Number(valA); const numB = Number(valB);
                    if (!isNaN(numA) && !isNaN(numB)) comparison = numA - numB;
                    else if (!isNaN(numA)) comparison = -1;
                    else if (!isNaN(numB)) comparison = 1;
                } else if (columnTypeToSort === 'date') {
                    let dateA = valA instanceof Date ? valA : (parseDMYDate(valA) || new Date(valA));
                    let dateB = valB instanceof Date ? valB : (parseDMYDate(valB) || new Date(valB));
                    const aValid = dateA && !isNaN(dateA.getTime());
                    const bValid = dateB && !isNaN(dateB.getTime());
                    if (aValid && bValid) comparison = dateA.getTime() - dateB.getTime();
                    else if (aValid) comparison = -1;
                    else if (bValid) comparison = 1;
                } else {
                    const strA = String(valA).trim().toLowerCase();
                    const strB = String(valB).trim().toLowerCase();
                    comparison = strA.localeCompare(strB);
                }
            } catch (e) {
                console.warn(`Sort Err ${currentSort.column}:`, e);
            }
            return currentSort.order === 'asc' ? comparison : -comparison;
        });
    }
    // --- End Sorting ---

    const dataToDisplay = dataToSort; // Use the (potentially) sorted data

    if (!dataToDisplay || dataToDisplay.length === 0) {
        tableContainer.innerHTML = "<p>Aucune donnée à afficher.</p>";
        resultStats.textContent = "Affichage de 0 lignes/groupes";
        pagination.innerHTML = "";
        if (rowsPerPageSelect) rowsPerPageSelect.style.display = 'none'; // Hide selector if no data
        return;
    }

    // Ensure RowsPerPage selector is visible if there's data
    if (rowsPerPageSelect) rowsPerPageSelect.style.display = '';

    // --- Pagination --- Apply to whatever data is being displayed
    const currentRowsPerPage = (rowsPerPage === Number.MAX_SAFE_INTEGER || !rowsPerPageSelect) ? dataToDisplay.length : parseInt(rowsPerPageSelect.value, 10);
    const totalItems = dataToDisplay.length;
    const totalPages = currentRowsPerPage > 0 ? Math.ceil(totalItems / currentRowsPerPage) : 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * currentRowsPerPage;
    const endIndex = Math.min(startIndex + currentRowsPerPage, totalItems);
    const pageData = dataToDisplay.slice(startIndex, endIndex);
    // --- End Pagination ---

     // Update stats based on view type and pagination
     const startItemNum = startIndex + 1;
     const endItemNum = endIndex;
     if (isGroupedView) {
         resultStats.textContent = `Affichage des groupes ${startItemNum} à ${endItemNum} sur ${totalItems}`;
     } else {
         resultStats.textContent = `Affichage des lignes ${startItemNum} à ${endItemNum} sur ${filteredData.length} (Total: ${originalData.length})`;
     }

    // --- Generate Table HTML ---
    let tableHTML = "<table><thead><tr>";
    headers.forEach((header) => {
        tableHTML += `<th data-column="${header.replace(/"/g, '&quot;')}">${header}</th>`;
    });
    tableHTML += "</tr></thead><tbody>";
    pageData.forEach((row) => {
        tableHTML += "<tr>";
        headers.forEach((header) => {
            const cellContent = row[header] !== null && row[header] !== undefined ? row[header] : "";
            tableHTML += `<td>${cellContent}</td>`;
        });
        tableHTML += "</tr>";
    });
    tableHTML += "</tbody></table>";
    tableContainer.innerHTML = tableHTML;
    // --- End Generate Table HTML ---

    // --- Setup Header Click Listeners & Indicators ---
    document.querySelectorAll("th[data-column]").forEach((th) => {
        const columnName = th.dataset.column;
        th.style.cursor = 'pointer';
        th.innerHTML = th.innerHTML.replace(/ ↑| ↓/g, ""); // Clear existing
        if (columnName === currentSort.column && currentSort.order !== 'none') {
            th.innerHTML += currentSort.order === 'asc' ? ' ↑' : ' ↓';
        }
        // Remove old listener before adding new one
        const newTh = th.cloneNode(true);
        th.parentNode.replaceChild(newTh, th);
        newTh.addEventListener("click", () => handleHeaderClick(columnName));
    });
    // --- End Setup Headers ---

    // Generate pagination controls (always)
    generatePagination(totalPages);
}

// Function to handle the 2-state sort cycle (Asc -> Desc -> Asc)
function handleHeaderClick(columnName) {
    if (currentSort.column === columnName) {
        currentSort.order = (currentSort.order === 'asc') ? 'desc' : 'asc';
    } else {
        currentSort.column = columnName;
        currentSort.order = 'asc';
    }
    currentPage = 1;
    displayData();
}

// Function to generate pagination controls
function generatePagination(totalPages) {
    pagination.innerHTML = ""; // Clear existing buttons
    if (totalPages <= 1) return; // No controls needed for single page

    const prevBtn = document.createElement("button"); prevBtn.textContent = "Précédent"; prevBtn.disabled = currentPage === 1; prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; displayData(); } }); pagination.appendChild(prevBtn);
    const maxPageButtons = 5; let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2)); let endPage = Math.min(totalPages, startPage + maxPageButtons - 1); if (endPage - startPage + 1 < maxPageButtons) { startPage = Math.max(1, endPage - maxPageButtons + 1); }
    if (startPage > 1) { const firstBtn = document.createElement("button"); firstBtn.textContent = "1"; firstBtn.addEventListener("click", () => { currentPage = 1; displayData(); }); pagination.appendChild(firstBtn); if (startPage > 2) { const ellipsis = document.createElement("span"); ellipsis.textContent = "..."; pagination.appendChild(ellipsis); } }
    for (let i = startPage; i <= endPage; i++) { const pageBtn = document.createElement("button"); pageBtn.textContent = i; pageBtn.classList.toggle("active", i === currentPage); pageBtn.addEventListener("click", () => { currentPage = i; displayData(); }); pagination.appendChild(pageBtn); }
    if (endPage < totalPages) { if (endPage < totalPages - 1) { const ellipsis = document.createElement("span"); ellipsis.textContent = "..."; pagination.appendChild(ellipsis); } const lastBtn = document.createElement("button"); lastBtn.textContent = totalPages; lastBtn.addEventListener("click", () => { currentPage = totalPages; displayData(); }); pagination.appendChild(lastBtn); }
    const nextBtn = document.createElement("button"); nextBtn.textContent = "Suivant"; nextBtn.disabled = currentPage === totalPages; nextBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; displayData(); } }); pagination.appendChild(nextBtn);
}