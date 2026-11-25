import { readFile, writeFile } from "node:fs/promises";

const [repositoryFile, outputFile] = process.argv.slice(2);
if (!repositoryFile || !outputFile) {
  throw new Error("Usage: node scripts/generate-profile.mjs <repositories.json> <output.md>");
}

const topics = new Map([
  ["Obsidian Community plugins", "profile-obsidian"],
  ["Realmglass", "profile-minecraft"],
  ["Sites", "profile-sites"],
  ["Path Notes", "profile-file-tools"],
]);

const profile = await readFile(new URL("../profile/README.md", import.meta.url), "utf8");
const newline = profile.includes("\r\n") ? "\r\n" : "\n";
const sections = profile.split(/(?=^## )/m);
const tables = new Map();
const existing = new Map();

for (const [index, section] of sections.entries()) {
  const lines = section.split(/\r?\n/);
  const name = lines[0].slice(3).trim();
  if (!topics.has(name)) continue;

  const header = lines.findIndex((line) => /^\|\s*(Plugin|Project)\s*\|\s*What it does\s*\|\s*Status\s*\|$/.test(line));
  if (header === -1 || tables.has(name)) throw new Error(`Expected one project table under ${name}.`);

  const start = header + 2;
  let end = start;
  while (lines[end]?.startsWith("|")) {
    const cells = lines[end].split("|").map((cell) => cell.trim());
    const link = cells[1]?.match(/^\[([^\]]+)\]\(https:\/\/github\.com\/committed-sins\/([\w.-]+)\)$/);
    if (cells.length !== 5 || !link || !cells[2] || !cells[3] || existing.has(link[2])) {
      throw new Error(`Invalid or duplicate entry under ${name}: ${lines[end]}`);
    }

    existing.set(link[2], { name, label: link[1], description: cells[2], status: cells[3] });
    end++;
  }

  tables.set(name, { index, lines, start, end, rows: [] });
}

for (const name of topics.keys()) {
  if (!tables.has(name)) throw new Error(`Missing project table under ${name}.`);
}

const pages = JSON.parse((await readFile(repositoryFile, "utf8")).replace(/^\uFEFF/, ""));
const repositories = new Map(pages.flat()
  .filter((repo) => repo.private === false)
  .map((repo) => [repo.name, repo]));
const names = new Set([...existing.keys(), ...Array.from(repositories.keys()).sort()]);

for (const name of names) {
  const repo = repositories.get(name);
  if (!repo) throw new Error(`The listed repository ${name} is missing from the public GitHub results.`);

  const current = existing.get(name);
  const matching = Array.from(topics).filter(([, topic]) => repo.topics?.includes(topic));
  if (matching.length > 1) throw new Error(`${name} has multiple profile category topics.`);

  const category = matching[0]?.[0] ?? current?.name;
  if (!category) continue;

  const label = current?.label ?? name;
  const description = repo.description?.replaceAll("|", "/").replace(/\s+/g, " ").trim() || current?.description;
  if (!description) throw new Error(`Add a GitHub description for ${name}.`);

  const status = current?.status ?? "In development";
  if (category === "Obsidian Community plugins") {
    const knownStatus = ["Test preview", "Development preview", "In development", "Design stage", `[GitHub release](${repo.html_url}/releases/latest)`].includes(status);
    const directoryListing = /^\[Published\]\(https:\/\/obsidian\.md\/plugins\?id=[\w-]+\)$/.test(status);
    if (!knownStatus && !directoryListing) throw new Error(`Set a plugin status for ${name} before moving it to ${category}.`);
  }
  tables.get(category).rows.push(`| [${label}](${repo.html_url}) | ${description} | ${status} |`);
}

for (const [name, { index, lines, start, end, rows }] of tables) {
  if (!rows.length) throw new Error(`No public repositories selected for ${name}.`);
  lines.splice(start, end - start, ...rows);
  sections[index] = lines.join(newline);
}

await writeFile(outputFile, sections.join(""), "utf8");
