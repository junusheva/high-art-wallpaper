const picture = document.querySelector("#random-picture");
const button = document.querySelector("#randomize");
const caption = document.querySelector("#caption");
const museumName = document.querySelector("#museum-name");
const artworkLink = document.querySelector("#artwork-link");

const MET_API = "https://collectionapi.metmuseum.org/public/collection/v1";
const AIC_API = "https://api.artic.edu/api/v1";

const searchTerms = [
  "landscape",
  "portrait",
  "flower",
  "ocean",
  "bird",
  "city",
  "night",
  "textile",
  "ceramic",
  "garden",
  "horse",
  "moon",
];

const sources = [
  { name: "The Met", fetchArtwork: fetchMetArtwork },
  { name: "Art Institute of Chicago", fetchArtwork: fetchAicArtwork },
];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

async function getJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = resolve;
    nextImage.onerror = reject;
    nextImage.src = url;
  });
}

function formatCredit(...parts) {
  return parts.filter(Boolean).join(" | ");
}

async function fetchMetArtwork() {
  const term = randomItem(searchTerms);
  const searchUrl = `${MET_API}/search?hasImages=true&q=${encodeURIComponent(term)}`;
  const results = await getJson(searchUrl);
  const objectIds = results.objectIDs || [];

  if (!objectIds.length) {
    throw new Error("No Met records found.");
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const objectId = randomItem(objectIds);
    const artwork = await getJson(`${MET_API}/objects/${objectId}`);
    const imageUrl = artwork.primaryImageSmall || artwork.primaryImage;

    if (imageUrl) {
      return {
        museum: "The Met",
        title: artwork.title || "Untitled",
        artist: artwork.artistDisplayName || "Unknown artist",
        date: artwork.objectDate,
        imageUrl,
        recordUrl: artwork.objectURL,
        alt: `${artwork.title || "Artwork"} from The Met`,
      };
    }
  }

  throw new Error("Met records found, but none had a usable image.");
}

async function fetchAicArtwork() {
  const firstPageUrl = `${AIC_API}/artworks/search?query[term][is_public_domain]=true&fields=id,title,artist_display,date_display,image_id,thumbnail&limit=1&page=1`;
  const firstPage = await getJson(firstPageUrl);
  const totalPages = Math.min(firstPage.pagination?.total_pages || 1, 10000);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const page = Math.floor(Math.random() * totalPages) + 1;
    const artworkUrl = `${AIC_API}/artworks/search?query[term][is_public_domain]=true&fields=id,title,artist_display,date_display,image_id,thumbnail&limit=1&page=${page}`;
    const result = await getJson(artworkUrl);
    const artwork = result.data?.[0];

    if (artwork?.image_id) {
      const iiifUrl = result.config?.iiif_url || "https://www.artic.edu/iiif/2";

      return {
        museum: "Art Institute of Chicago",
        title: artwork.title || "Untitled",
        artist: artwork.artist_display || "Unknown artist",
        date: artwork.date_display,
        imageUrl: `${iiifUrl}/${artwork.image_id}/full/843,/0/default.jpg`,
        recordUrl: `https://www.artic.edu/artworks/${artwork.id}`,
        alt: artwork.thumbnail?.alt_text || `${artwork.title || "Artwork"} from the Art Institute of Chicago`,
      };
    }
  }

  throw new Error("AIC records found, but none had a usable image.");
}

async function findRandomArtwork() {
  const shuffledSources = shuffle(sources);

  for (const source of shuffledSources) {
    try {
      const artwork = await source.fetchArtwork();
      await preloadImage(artwork.imageUrl);
      return artwork;
    } catch (error) {
      console.warn(`${source.name} did not return an artwork this time.`, error);
    }
  }

  throw new Error("No museum returned a usable artwork.");
}

function setLoading(isLoading) {
  picture.classList.toggle("is-loading", isLoading);
  button.disabled = isLoading;
  button.textContent = isLoading ? "Walking the galleries..." : "Find random art";
}

function renderArtwork(artwork) {
  picture.src = artwork.imageUrl;
  picture.alt = artwork.alt;
  museumName.textContent = artwork.museum;
  caption.textContent = formatCredit(artwork.title, artwork.artist, artwork.date);
  artworkLink.href = artwork.recordUrl;
}

async function showRandomPicture() {
  setLoading(true);

  try {
    const artwork = await findRandomArtwork();
    renderArtwork(artwork);
  } catch (error) {
    caption.textContent = "The museum gremlin misplaced the image. Try again.";
    console.error(error);
  } finally {
    setLoading(false);
  }
}

button.addEventListener("click", showRandomPicture);
