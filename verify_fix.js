
import XLSX from "xlsx";

// Mock the file content with a title row
const wb = XLSX.utils.book_new();
const ws_data = [
    ["My ETF Report"], // Row 1: Title
    ["Symbol", "Price"], // Row 2: Actual Headers
    ["JEPI", 55.23],     // Row 3: Data
    ["JEPQ", 52.18]      // Row 4: Data
];
const ws = XLSX.utils.aoa_to_sheet(ws_data);
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

// New Logic from server/index.js
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];

// First, convert to array of arrays to find the header row
const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

let headerRowIndex = 0;
const maxRowsToScan = 20;

for (let i = 0; i < Math.min(allRows.length, maxRowsToScan); i++) {
    const row = allRows[i];
    if (!row) continue;

    // Check if this row looks like a header row (contains "Symbol" or "SYMBOL")
    const hasSymbol = row.some(cell =>
        cell && String(cell).trim().toUpperCase() === "SYMBOL"
    );

    if (hasSymbol) {
        headerRowIndex = i;
        break;
    }
}

console.log(`Found header at row index: ${headerRowIndex}`);

// Now parse with the correct header row
const rawData = XLSX.utils.sheet_to_json(sheet, {
    range: headerRowIndex,
    defval: null
});

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

if (etfsToUpsert.length === 2 && etfsToUpsert[0].symbol === "JEPI" && etfsToUpsert[1].symbol === "JEPQ") {
    console.log("SUCCESS: Correctly parsed ETFs despite title row.");
} else {
    console.log("FAILURE: Did not parse ETFs correctly.");
    console.log("ETFs found:", etfsToUpsert);
}
