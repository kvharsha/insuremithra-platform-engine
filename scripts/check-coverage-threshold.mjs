import fs from "node:fs";
const threshold = parseInt(process.argv[2] || "75", 10);
const summaries = [];
if (fs.existsSync("coverage/coverage-summary.json"))
  summaries.push(JSON.parse(fs.readFileSync("coverage/coverage-summary.json")));
if (fs.existsSync("frontend/coverage/coverage-summary.json"))
  summaries.push(JSON.parse(fs.readFileSync("frontend/coverage/coverage-summary.json")));

if (!summaries.length) {
  console.error("No coverage summaries found");
  process.exit(1);
}
const totals = summaries.reduce((acc, s) => {
  const t = s.total;
  acc.statements += t.statements.covered; acc.statementsTotal += t.statements.total;
  acc.branches += t.branches.covered;     acc.branchesTotal += t.branches.total;
  acc.functions += t.functions.covered;   acc.functionsTotal += t.functions.total;
  acc.lines += t.lines.covered;           acc.linesTotal += t.lines.total;
  return acc;
}, {statements:0,branches:0,functions:0,lines:0,statementsTotal:0,branchesTotal:0,functionsTotal:0,linesTotal:0});

const pct = Math.floor((totals.lines / totals.linesTotal) * 100);
console.log(`Combined line coverage: ${pct}% (gate ${threshold}%)`);
if (pct < threshold) process.exit(1);
