// Global variables
let originalData = [];
let headers = [];
let filteredData = [];
let columnTypes = {}; // Stores initially detected types: 'string', 'number', 'date'
let currentPage = 1;
let rowsPerPage = 10; // Default, will be adjustable
const availableRowsPerPage = [10, 25, 50, 100]; // Options for pagination size

// DOM elements
const importBtn = document.getElementById("importBtn");
const csvFileInput = document.getElementById("csvFile");
const importStatus = document.getElementById("importStatus");
const importLoader = document.getElementById("importLoader");
const filterSection = document.getElementById("filterSection");
const filterControls = document.getElementById("filterControls");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const resultsSection = document.getElementById("resultsSection");
const tableContainer = document.getElementById("tableContainer");
const resultStats = document.getElementById("resultStats");
const pagination = document.getElementById("pagination");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const sqlQuery = document.getElementById("sqlQuery");
const executeSqlBtn = document.getElementById("executeSqlBtn");
// Add new DOM element for rows per page selector
const rowsPerPageSelect = document.getElementById("rowsPerPageSelect");