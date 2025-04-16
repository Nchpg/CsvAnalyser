// Function to display data with pagination
function displayData() {
  resultStats.textContent = `Affichage de ${filteredData.length} sur ${originalData.length} lignes`;
  const currentRowsPerPage = (rowsPerPage === Number.MAX_SAFE_INTEGER) ? filteredData.length : rowsPerPage;
  const totalPages = currentRowsPerPage > 0 ? Math.ceil(filteredData.length / currentRowsPerPage) : 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * currentRowsPerPage;
  const endIndex = (rowsPerPage === Number.MAX_SAFE_INTEGER) ? filteredData.length : Math.min(startIndex + currentRowsPerPage, filteredData.length);
  const pageData = filteredData.slice(startIndex, endIndex);

  let tableHTML = "<table><thead><tr>";
  headers.forEach((header) => { tableHTML += `<th data-column="${header.replace(/"/g, '&quot;')}">${header}</th>`; });
  tableHTML += "</tr></thead><tbody>";
  pageData.forEach((row) => { tableHTML += "<tr>"; headers.forEach((header) => { const cellContent = row[header] !== null && row[header] !== undefined ? row[header] : ""; tableHTML += `<td>${cellContent}</td>`; }); tableHTML += "</tr>"; });
  tableHTML += "</tbody></table>";
  tableContainer.innerHTML = tableHTML;

  document.querySelectorAll("th").forEach((th) => {
      const columnName = th.dataset.column; th.addEventListener("click", () => sortTable(columnName));
      th.innerHTML = th.innerHTML.replace(/ ↑| ↓/g, ""); if (columnName === currentSortColumn) { th.innerHTML += currentSortOrder === 'asc' ? ' ↑' : ' ↓'; } });

  generatePagination(totalPages);
}

// Function to generate pagination controls
function generatePagination(totalPages) {
    pagination.innerHTML = ""; if (totalPages <= 1) return;
    const prevBtn = document.createElement("button"); prevBtn.textContent = "Précédent"; prevBtn.disabled = currentPage === 1; prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; displayData(); } }); pagination.appendChild(prevBtn);
    const maxPageButtons = 5; let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2)); let endPage = Math.min(totalPages, startPage + maxPageButtons - 1); if (endPage - startPage + 1 < maxPageButtons) { startPage = Math.max(1, endPage - maxPageButtons + 1); }
    if (startPage > 1) { const firstBtn = document.createElement("button"); firstBtn.textContent = "1"; firstBtn.addEventListener("click", () => { currentPage = 1; displayData(); }); pagination.appendChild(firstBtn); if (startPage > 2) { const ellipsis = document.createElement("span"); ellipsis.textContent = "..."; pagination.appendChild(ellipsis); } }
    for (let i = startPage; i <= endPage; i++) { const pageBtn = document.createElement("button"); pageBtn.textContent = i; pageBtn.classList.toggle("active", i === currentPage); pageBtn.addEventListener("click", () => { currentPage = i; displayData(); }); pagination.appendChild(pageBtn); }
    if (endPage < totalPages) { if (endPage < totalPages - 1) { const ellipsis = document.createElement("span"); ellipsis.textContent = "..."; pagination.appendChild(ellipsis); } const lastBtn = document.createElement("button"); lastBtn.textContent = totalPages; lastBtn.addEventListener("click", () => { currentPage = totalPages; displayData(); }); pagination.appendChild(lastBtn); }
    const nextBtn = document.createElement("button"); nextBtn.textContent = "Suivant"; nextBtn.disabled = currentPage === totalPages; nextBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; displayData(); } }); pagination.appendChild(nextBtn);
}