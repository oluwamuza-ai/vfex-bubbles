import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, 'zse-data.json');
const logoDir = path.join(__dirname, 'client', 'public', 'logos', 'zse');

await mkdir(logoDir, { recursive: true });
const raw = await readFile(dataPath, 'utf8');
const data = JSON.parse(raw);

const colors = ['#22c55e', '#38bdf8', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6', '#fb7185', '#60a5fa'];

for (let index = 0; index < data.length; index += 1) {
  const item = data[index];
  const ticker = String(item.ticker || '');
  const short = ticker.replace(/\.ZW$/i, '').replace(/\.zw$/i, '');
  const color = colors[index % colors.length];
  const fileName = `${short}.svg`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="${color}"/>
  <rect x="24" y="24" width="208" height="208" rx="36" fill="#0f172a" opacity="0.92"/>
  <circle cx="128" cy="128" r="80" fill="none" stroke="#f8fafc" stroke-width="12" opacity="0.9"/>
  <text x="128" y="142" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#f8fafc">${short}</text>
</svg>`;
  await writeFile(path.join(logoDir, fileName), svg, 'utf8');
  item.logoUrl = `/logos/zse/${fileName}`;
}

await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Generated ${data.length} ZSE logos in ${logoDir}`);
