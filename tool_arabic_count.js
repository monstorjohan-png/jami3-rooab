const fs = require("fs");
const d = fs.readFileSync("assets/js/data.js", "utf8");
// Count entries by finding lines starting with [" and having http
let count = 0;
const lines = d.split("\n");
lines.forEach(line => {
  if (line.trim().startsWith("[") && line.includes("http")) count++;
});
console.log("Total entries with http URL:", count);
// Find Arabic entries by looking for Arabic Unicode range in the title field
// Format is ["title", "url", "desc", "cats", "lang", "tier", "votes"]
let arabicCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Check if title (first field) contains Arabic
  const titleMatch = line.match(/^\s*\[\"([^\"]+)\"/);
  if (titleMatch) {
    const title = titleMatch[1];
    // Check for Arabic characters (Unicode range 0600-06FF)
    if (/[\u0600-\u06FF]/.test(title)) {
      arabicCount++;
    }
  }
}
console.log("Entries with Arabic titles:", arabicCount);

// Show a few examples
const arabicEx = [];
for (let i = 0; i < lines.length && arabicEx.length < 5; i++) {
  const line = lines[i];
  const titleMatch = line.match(/^\s*\[\"([^\"]+)\"/);
  if (titleMatch) {
    const title = titleMatch[1];
    if (/[\u0600-\u06FF]/.test(title)) {
      arabicEx.push(title.substring(0, 30));
    }
  }
}
console.log("Examples of Arabic titles:", arabicEx);