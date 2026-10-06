const fs = require("fs");
const d = fs.readFileSync("assets/js/data.js", "utf8");

// Count entries with Arabic in title
let arabicCount = 0;
const lines = d.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Extract title from ["title", ... format
  const titleMatch = line.match(/^\s*\[\"([^\"]+)\"/);
  if (titleMatch) {
    const title = titleMatch[1];
    // Check for Arabic characters
    if (/[\u0600-\u06FF]/.test(title)) {
      arabicCount++;
    }
  }
}
console.log("Entries with Arabic titles:", arabicCount);

// Show examples
let count = 0;
for (let i = 0; i < lines.length && i < 200 && arabicCount > 0; i++) {
  const line = lines[i];
  const titleMatch = line.match(/^\s*\[\"([^\"]+)\"/);
  if (titleMatch) {
    const title = titleMatch[1];
    if (/[\u0600-\u06FF]/.test(title)) {
      console.log((++count) + ". " + title.substring(0, 40));
      if (count >= 5) break;
    }
  }
}