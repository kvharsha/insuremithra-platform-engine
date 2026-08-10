import fs from "node:fs";
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const vulnerabilities = data.vulnerabilities || data.metadata?.vulnerabilities || {};
const hasHigh = Object.values(vulnerabilities).some(v => (v.severity || "").toLowerCase() === "high" || (v.severity || "").toLowerCase() === "critical");
if (hasHigh) {
  console.error("High/Critical vulnerabilities found by npm audit");
  process.exit(1);
}
console.log("npm audit passed (no high/critical)");
