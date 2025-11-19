import XLSX from "xlsx";
import fs from "fs";
import path from "path";

console.log("Checking XLSX.readFile...");
if (typeof XLSX.readFile === "function") {
    console.log("SUCCESS: XLSX.readFile is a function.");
} else {
    console.error("FAILURE: XLSX.readFile is NOT a function. Type:", typeof XLSX.readFile);
    process.exit(1);
}

// Optional: Create a dummy excel file and try to read it to be 100% sure
const dummyFile = "test.xlsx";
try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ a: 1, b: 2 }]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, dummyFile);

    console.log("Created dummy file. Reading it back...");
    const readWb = XLSX.readFile(dummyFile);
    console.log("SUCCESS: Read file successfully. Sheet names:", readWb.SheetNames);
} catch (e) {
    console.error("FAILURE: Error during file operations:", e);
    process.exit(1);
} finally {
    if (fs.existsSync(dummyFile)) {
        fs.unlinkSync(dummyFile);
    }
}
