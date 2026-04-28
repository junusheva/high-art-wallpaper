import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = "https://artmuseum.kg";
const START_URL = `${BASE_URL}/en/galleries/paintings`;
const OUTPUT_PATH = new URL("../data/artmuseum-kg-paintings.json", import.meta.url);
const JS_OUTPUT_PATH = new URL("../data/artmuseum-kg-paintings.js", import.meta.url);
const MAX_PAGES = Number.parseInt(process.env.MAX_PAGES || "12", 10);

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)));
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(path) {
  return new URL(path, BASE_URL).toString();
}

function getLastPage(html) {
  const pages = [...html.matchAll(/href="\/en\/galleries\/paintings\?page=(\d+)"/g)]
    .map((match) => Number.parseInt(match[1], 10))
    .filter(Number.isFinite);

  return Math.max(1, ...pages);
}

function getField(cardHtml, label) {
  const pattern = new RegExp(`<span[^>]*>${label}:<\\/span>\\s*([^<]+)`, "i");
  return stripTags(cardHtml.match(pattern)?.[1] || "");
}

function parseCards(html) {
  return [...html.matchAll(/<a href="(\/galleries\/\d+\/show_painting\?locale=en)">([\s\S]*?)<\/a>/g)]
    .map((match) => {
      const [, path, cardHtml] = match;
      const imagePath = cardHtml.match(/<img src="([^"]+)"/)?.[1];
      const title = stripTags(cardHtml.match(/<p class="title is-4">([\s\S]*?)<\/p>/)?.[1] || "");
      const artist = stripTags(cardHtml.match(/<p class="title is-6 has-text-grey">([\s\S]*?)<\/p>/)?.[1] || "");
      const date = stripTags(cardHtml.match(/<div class="has-text-centered\s+is-size-7 has-text-grey\s+">\s*<p>([\s\S]*?)<\/p>/)?.[1] || "");
      const genre = getField(cardHtml, "Genre");
      const medium = getField(cardHtml, "Material / Technique");

      if (!imagePath || !title) {
        return null;
      }

      return {
        museum: "Gapar Aitiev Kyrgyz National Museum of Fine Arts",
        title,
        artist: artist || "Unknown artist",
        date,
        genre,
        medium,
        imageUrl: absoluteUrl(imagePath),
        recordUrl: absoluteUrl(path),
        alt: `${title} from the Gapar Aitiev Kyrgyz National Museum of Fine Arts`,
      };
    })
    .filter(Boolean);
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

const firstPageHtml = await fetchText(START_URL);
const lastPage = Math.min(getLastPage(firstPageHtml), MAX_PAGES);
const artworks = parseCards(firstPageHtml);

for (let page = 2; page <= lastPage; page += 1) {
  const html = await fetchText(`${START_URL}?page=${page}`);
  artworks.push(...parseCards(html));
}

await mkdir(new URL("../data", import.meta.url), { recursive: true });
const manifest = {
  source: START_URL,
  generatedAt: new Date().toISOString(),
  pageCount: lastPage,
  artworks,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  JS_OUTPUT_PATH,
  `window.AITIEV_ARTWORKS = ${JSON.stringify(artworks, null, 2)};\n`
);

console.log(`Wrote ${artworks.length} artworks from ${lastPage} pages to ${OUTPUT_PATH.pathname}`);
console.log(`Wrote local preview manifest to ${JS_OUTPUT_PATH.pathname}`);
