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