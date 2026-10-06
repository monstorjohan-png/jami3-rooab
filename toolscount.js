const fs = require("fs");
const d = fs.readFileSync("assets/js/data.js", "utf8");
// Count entries by matching the pattern at line start
const lines = d.split("\n");
let count = 0;
lines.forEach(line => {
  if (line.match(/^\s*\["/)) count++;
});
console.log("Entries count:", count);