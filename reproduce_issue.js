
import XLSX from "xlsx";

// Mock the file content
const wb = XLSX.utils.book_new();
const ws_data = [
    ["My ETF Report"], // Row 1: Title (causes issue)
    ["Symbol", "Price"], // Row 2: Actual Headers
    ["JEPI", 55.23],     // Row 3: Data
    ["JEPQ", 52.18]      // Row 4: Data
];
const ws = XLSX.utils.aoa_to_sheet(ws_data);
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

// Logic from server/index.js
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(sheet, { defval: null });

console.log("Raw Data:", rawData);

const etfsToUpsert = [];
let skippedRows = 0;

for (const row of rawData) {
    const symbolValue = row.SYMBOL || row.Symbol || row.symbol;
    if (!symbolValue) {
        skippedRows++;
        continue;
    }

    const symbol = String(symbolValue).trim().toUpperCase();
    if (!symbol) {
        skippedRows++;
        continue;
    }

    etfsToUpsert.push({ symbol });
}

if (etfsToUpsert.length === 0) {
    console.log("Error: No valid ETF data found. Make sure SYMBOL column exists and has values.");
} else {
    console.log(`Success: Found ${etfsToUpsert.length} ETFs`);
}
