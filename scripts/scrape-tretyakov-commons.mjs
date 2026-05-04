import { mkdir, writeFile } from "node:fs/promises";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "MuseumPictureMachine/1.0 (https://junusheva.github.io/high-art-wallpaper/)";
const OUTPUT_PATH = new URL("../data/tretyakov-gallery.json", import.meta.url);
const JS_OUTPUT_PATH = new URL("../data/tretyakov-gallery.js", import.meta.url);
const MAX_ARTWORKS = Number.parseInt(process.env.MAX_ARTWORKS || "120", 10);
const THUMB_WIDTH = Number.parseInt(process.env.THUMB_WIDTH || "1600", 10);
const CATEGORIES = [
  "Category:14th-century paintings in the Tretyakov Gallery",
  "Category:18th-century paintings in the Tretyakov Gallery",
  "Category:19th-century paintings in the Tretyakov Gallery",
  "Category:20th-century paintings in the Tretyakov Gallery",
];

const SKIP_TITLE_PATTERN = /\b(CPA|stamp|mint|frame|IMG|SM\s+\d+)\b/i;

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

function stripTags(value = "") {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCommonsMetadata(value) {
  return value
    .replace(/\s*label QS:[^,]+,"[^"]*"/g, "")
    .replace(/\s*title QS:P\d+,[a-z-]+:"[^"]*"/gi, "")
    .replace(/\s*date QS:P\d+,[^\s]+/g, "")
    .replace(/^(English|Russian):\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFileTitle(title) {
  return title
    .replace(/^File:/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\s*-\s*Google Art Project$/i, "")
    .replace(/\s+anagoria$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildApiUrl(params) {
  const url = new URL(COMMONS_API);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getJson(params) {
  const url = buildApiUrl({
    format: "json",
    origin: "*",
    ...params,
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "Api-User-Agent": USER_AGENT,
      },
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status === 429 || response.status >= 500) {
      await sleep((attempt + 1) * 1500);
      continue;
    }

    throw new Error(`Commons request failed: ${response.status}`);
  }

  throw new Error("Commons request failed after retries.");
}

async function getCategoryFiles(category, limit) {
  const files = [];
  let cmcontinue = "";

  do {
    const result = await getJson({
      action: "query",
      list: "categorymembers",
      cmtitle: category,
      cmtype: "file",
      cmlimit: String(Math.min(50, limit - files.length)),
      ...(cmcontinue ? { cmcontinue } : {}),
    });

    files.push(...(result.query?.categorymembers || []));
    cmcontinue = result.continue?.cmcontinue || "";
    await sleep(300);
  } while (cmcontinue && files.length < limit);

  return files;
}

function getMetadataValue(metadata, key) {
  return cleanCommonsMetadata(stripTags(metadata?.[key]?.value || ""));
}

function buildArtwork(page) {
  const imageInfo = page.imageinfo?.[0];
  const metadata = imageInfo?.extmetadata || {};
  const title = getMetadataValue(metadata, "ObjectName") || cleanFileTitle(page.title);
  const artist = getMetadataValue(metadata, "Artist") || "Unknown artist";
  const date = getMetadataValue(metadata, "DateTimeOriginal");
  const categories = getMetadataValue(metadata, "Categories");
  const imageUrl = imageInfo?.thumburl || imageInfo?.url;

  if (!imageUrl || SKIP_TITLE_PATTERN.test(page.title) || /stamps/i.test(categories)) {
    return null;
  }

  return {
    museum: "Tretyakov Gallery (Wikimedia Commons)",
    title,
    artist,
    date,
    imageUrl,
    originalImageUrl: imageInfo.url,
    recordUrl: imageInfo.descriptionurl,
    alt: `${title} from the Tretyakov Gallery via Wikimedia Commons`,
  };
}

async function getImageInfo(files) {
  const artworks = [];

  for (let index = 0; index < files.length; index += 25) {
    const batch = files.slice(index, index + 25);
    const result = await getJson({
      action: "query",
      titles: batch.map((file) => file.title).join("|"),
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: String(THUMB_WIDTH),
    });

    for (const page of Object.values(result.query?.pages || {})) {
      const artwork = buildArtwork(page);

      if (artwork) {
        artworks.push(artwork);
      }
    }

    await sleep(500);
  }

  return artworks;
}

const seenTitles = new Set();
const files = [];

for (const category of CATEGORIES) {
  if (files.length >= MAX_ARTWORKS) {
    break;
  }

  const categoryFiles = await getCategoryFiles(category, MAX_ARTWORKS - files.length);

  for (const file of categoryFiles) {
    if (!seenTitles.has(file.title)) {
      seenTitles.add(file.title);
      files.push(file);
    }
  }
}

const artworks = (await getImageInfo(files)).slice(0, MAX_ARTWORKS);

await mkdir(new URL("../data", import.meta.url), { recursive: true });

const manifest = {
  source: "https://commons.wikimedia.org/wiki/Category:Paintings_in_the_Tretyakov_Gallery",
  generatedAt: new Date().toISOString(),
  categories: CATEGORIES,
  artworks,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  JS_OUTPUT_PATH,
  `window.TRETYAKOV_ARTWORKS = ${JSON.stringify(artworks, null, 2)};\n`
);

console.log(`Wrote ${artworks.length} Tretyakov artworks to ${OUTPUT_PATH.pathname}`);
console.log(`Wrote local preview manifest to ${JS_OUTPUT_PATH.pathname}`);
