import * as XLSX_STAR from "xlsx";
import XLSX_DEFAULT from "xlsx";

console.log("import * as XLSX keys:", Object.keys(XLSX_STAR));
try {
  console.log("XLSX_STAR.readFile type:", typeof XLSX_STAR.readFile);
} catch (e) {
  console.log("XLSX_STAR.readFile error:", e.message);
}

try {
  console.log("XLSX_STAR.default.readFile type:", typeof XLSX_STAR.default?.readFile);
} catch (e) {
  console.log("XLSX_STAR.default.readFile error:", e.message);
}

console.log("import XLSX_DEFAULT keys:", Object.keys(XLSX_DEFAULT));
try {
  console.log("XLSX_DEFAULT.readFile type:", typeof XLSX_DEFAULT.readFile);
} catch (e) {
  console.log("XLSX_DEFAULT.readFile error:", e.message);
}
