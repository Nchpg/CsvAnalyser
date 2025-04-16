// Event listeners
importBtn.addEventListener("click", importCSV);
applyFiltersBtn.addEventListener("click", applyFilters);
resetFiltersBtn.addEventListener("click", resetFilters);
exportCsvBtn.addEventListener("click", exportAsCSV);
exportJsonBtn.addEventListener("click", exportAsJSON);
executeSqlBtn.addEventListener("click", executeSQL);
// Add event listener for rows per page change
if(rowsPerPageSelect) { // Check if element exists before adding listener
    rowsPerPageSelect.addEventListener("change", handleRowsPerPageChange);
} else {
    console.error("L'élément #rowsPerPageSelect n'a pas été trouvé dans le HTML.");
}


// Tab system for filter methods
document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add("active");
  });
});