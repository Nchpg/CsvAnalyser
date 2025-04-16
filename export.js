// Function to export as CSV
function exportAsCSV() {
    if (filteredData.length === 0) { alert("Aucune donnée à exporter."); return; } const csvContent = Papa.unparse({ fields: headers, data: filteredData }); const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", "donnees_filtrees.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }

// Function to export as JSON
function exportAsJSON() {
    if (filteredData.length === 0) { alert("Aucune donnée à exporter."); return; } const jsonContent = JSON.stringify(filteredData, null, 2); const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;", }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", "donnees_filtrees.json"); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }