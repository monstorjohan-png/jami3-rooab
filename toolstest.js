const fs = require("fs");
const d = fs.readFileSync("assets/js/data.js", "utf8");
// Count lines that start with [ and contain "
let count = 0;
const lines = d.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim().startsWith("[") && line.includes("\"http")) {
    count++;
  }
}
console.log("Count of entries with https URL:", count);
// Also try matching the pattern
const re = /^\s*\"\"\"\s*\\["/gm;
const m = d.match(re);
console.log("Regex matches:", m ? m.length : 0);