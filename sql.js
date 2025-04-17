// Function to execute SQL query
function executeSQL() {
  const query = sqlQuery.value.trim(); 
  if (!query) { 
      alert("Veuillez entrer une requête SQL."); 
      return; 
  }

  // Reset grouping state when executing custom SQL
  activeGroupingRules = []; // Clear stored rules
  isGroupedView = false;
  groupByRulesContainer.innerHTML = ""; // Clear group rules UI
  
  // Ensure filter controls are visible (might be hidden by group by)
  // Although filters might not apply if SQL changes structure drastically
  filterControls.style.display = '';
  applyFiltersBtn.style.display = '';
  resetFiltersBtn.style.display = '';

  try { 
      // Use originalData as the base for SQL tab queries
      const result = alasql(query, [originalData]);
      
      if (Array.isArray(result)) { 
          filteredData = result; // Update filtered data with SQL results
          
          // Determine headers from the SQL result
          if (filteredData.length > 0) { 
              headers = Object.keys(filteredData[0]); 
              // Re-detect column types for the new structure
              columnTypes = detectColumnTypes(filteredData, headers); 
              // Regenerate filter controls based on the NEW headers
              // This allows filtering the SQL results if desired
              generateFilterControls(); 
          } else { 
              // Query returned no results
              headers = []; // Reset headers
              filterControls.innerHTML = "<p>La requête SQL n'a retourné aucune ligne. Filtres désactivés.</p>"; 
              console.warn("SQL query returned no results. Cannot determine headers for filtering.");
          }
          
          currentPage = 1; 
          // isGroupedView is already false
          displayData(); // Display the SQL query results
      
      } else { 
          alert("La requête n'a pas retourné un tableau de résultats (attendu: Array)."); 
      }  
  } catch (error) { 
      alert(`Erreur SQL : ${error.message}`); 
      console.error("Erreur AlaSQL:", error); 
  } 
}