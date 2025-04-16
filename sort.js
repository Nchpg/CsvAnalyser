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