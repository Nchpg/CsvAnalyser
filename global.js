// Global variables
let originalData = [];
let originalHeaders = []; // Store the original headers
let headers = []; // Can be modified by Group By
let filteredData = []; // Data after applying filters
let groupedAndFilteredData = []; // Data after applying filters AND grouping
let columnTypes = {}; // Stores initially detected types: 'string', 'number', 'date'
let currentPage = 1;
let rowsPerPage = 10; // Default, will be adjustable
const availableRowsPerPage = [10, 25, 50, 100]; // Options for pagination size
let isGroupedView = false; // Flag to track if grouped data is displayed
let activeGroupingRules = []; // Store the current grouping rules [{column: 'colName', dateOption: 'year'}, ...]
let currentSort = { column: null, order: 'none' }; // Track sort state {column: 'colName', order: 'asc'|'desc'|'none'}

// DOM elements
const importBtn = document.getElementById("importBtn");
const csvFileInput = document.getElementById("csvFile");
const importStatus = document.getElementById("importStatus");
const importLoader = document.getElementById("importLoader");
const filterSection = document.getElementById("filterSection");
const filterControls = document.getElementById("filterControls");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn"); // Resets Filters & Grouping
const resultsSection = document.getElementById("resultsSection");
const tableContainer = document.getElementById("tableContainer");
const resultStats = document.getElementById("resultStats");
const pagination = document.getElementById("pagination");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const sqlQuery = document.getElementById("sqlQuery");
const executeSqlBtn = document.getElementById("executeSqlBtn");
const rowsPerPageSelect = document.getElementById("rowsPerPageSelect");
const groupBySection = document.getElementById("groupBySection");
const groupByRulesContainer = document.getElementById("groupByRulesContainer");
const addGroupByRuleBtn = document.getElementById("addGroupByRuleBtn");
const applyGroupByBtn = document.getElementById("applyGroupByBtn");
const resetGroupByBtn = document.getElementById("resetGroupByBtn"); // New button to only reset grouping
