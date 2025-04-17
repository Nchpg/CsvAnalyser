// Function to sort table by column (handles 3 states: asc, desc, none)
function sortTable(column) {
    let newOrder;
    // Determine the next sort order (asc -> desc -> none -> asc)
    if (currentSort.column === column) {
        if (currentSort.order === 'asc') {
            newOrder = 'desc';
        } else if (currentSort.order === 'desc') {
            newOrder = 'none'; // Third click resets to original order
        } else { // Was 'none'
            newOrder = 'asc';
        }
    } else { // First click on a new column
        newOrder = 'asc';
    }

    // Update the global sort state
    currentSort.column = column;
    currentSort.order = newOrder;

    // Determine which dataset to sort
    const dataToSort = isGroupedView ? groupedAndFilteredData : filteredData;

    // --- Determine column type for sorting --- 
    // For grouped data, we might need more robust type detection if headers change significantly
    // Let's try using the original columnTypes if the header exists there, 
    // otherwise default to string or simple number check for Count.
    let sortColumnType = 'string'; // Default
    if (columnTypes[column]) {
        sortColumnType = columnTypes[column];
    } else if (column === 'Count' || /COUNT\(\*\)/i.test(column)) { // Handle the count column specifically
        sortColumnType = 'number';
    } else {
        // If it's a derived date column (e.g., YEAR(col) or MonthYear(col))
        // Check if the base column name exists in originalHeaders
        const baseMatch = column.match(/^(?:YEAR|MonthYear)\((.*)\)$/);
        const baseColName = baseMatch ? baseMatch[1] : null;
        if (baseColName && columnTypes[baseColName] === 'date') {
             // Treat YEAR as number, MonthYear as string for sorting?
             sortColumnType = column.startsWith('YEAR') ? 'number' : 'string'; 
        } else {
             // Fallback: attempt simple number detection on first few values? Risky.
             // Let's stick to string for unknown derived columns for now.
             console.warn(`Unknown column type for sorting grouped header: ${column}. Using string comparison.`);
        }
    }
    console.log(`Sorting column: ${column}, Detected type: ${sortColumnType}, Order: ${newOrder}`);

    // --- Sorting Logic --- 
    if (newOrder === 'none') {
        // Reset to the order after filtering/grouping (before sorting)
        // This requires re-filtering and potentially re-grouping
        applyFilters(); // This function handles both filtering and re-grouping based on active rules
    } else {
        dataToSort.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];
            const aIsEmpty = valA === null || valA === undefined || String(valA).trim() === '';
            const bIsEmpty = valB === null || valB === undefined || String(valB).trim() === '';

            if (aIsEmpty && bIsEmpty) return 0;
            if (aIsEmpty) return 1; // Nulls/empty last
            if (bIsEmpty) return -1;

            let compareResult = 0;
            try {
                switch (sortColumnType) {
                    case 'number':
                        const numA = Number(String(valA).trim());
                        const numB = Number(String(valB).trim());
                        if (isNaN(numA) && isNaN(numB)) compareResult = 0;
                        else if (isNaN(numA)) compareResult = 1; // Treat NaN as greater
                        else if (isNaN(numB)) compareResult = -1;
                        else compareResult = numA - numB;
                        break;
                    case 'date': // Assumes values are Date objects from pre-processing
                        let dateA = (valA instanceof Date) ? valA : (parseDMYDate(valA) || new Date(valA));
                        let dateB = (valB instanceof Date) ? valB : (parseDMYDate(valB) || new Date(valB));
                        const aIsInvalid = !dateA || isNaN(dateA.getTime());
                        const bIsInvalid = !dateB || isNaN(dateB.getTime());
                        if (aIsInvalid && bIsInvalid) compareResult = 0;
                        else if (aIsInvalid) compareResult = 1;
                        else if (bIsInvalid) compareResult = -1;
                        else compareResult = dateA.getTime() - dateB.getTime();
                        break;
                    case 'string':
                    default:
                        // Consider using localeCompare for better string sorting
                        const strA = String(valA).trim().toLowerCase();
                        const strB = String(valB).trim().toLowerCase();
                        compareResult = strA.localeCompare(strB);
                        break;
                }
            } catch (e) {
                console.warn(`Comparison error during sort for column ${column} (type ${sortColumnType}):`, e);
            }

            return currentSort.order === 'asc' ? compareResult : -compareResult;
        });

        // Re-display the sorted data
        currentPage = 1; // Go to first page after sort
        displayData(dataToSort);
    }
}