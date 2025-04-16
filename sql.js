// Function to execute SQL query
function executeSQL() {
  const query = sqlQuery.value.trim(); if (!query) { alert("Veuillez entrer une requête SQL."); return; }
  try { const result = alasql(query, [originalData]);
    if (Array.isArray(result)) { filteredData = result;
       if (filteredData.length > 0) { headers = Object.keys(filteredData[0]); columnTypes = detectColumnTypes(filteredData, headers);/* generateFilterControls(); */}
       else { headers = results.meta.fields ? results.meta.fields.map(h => String(h || '').trim()) : headers; /*filterControls.innerHTML = "<p>Aucune donnée après requête SQL. Les filtres de base sont désactivés.</p>";*/ }
      currentPage = 1; displayData();
    } else { alert("La requête n'a pas retourné un tableau de résultats."); }
  } catch (error) { alert(`Erreur SQL : ${error.message}`); console.error("Erreur AlaSQL:", error); } }