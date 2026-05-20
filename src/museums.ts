import type { Artwork, Manifest, MuseumId, MuseumSource } from "./types";

const MET_API = "https://collectionapi.metmuseum.org/public/collection/v1";
const AIC_API = "https://api.artic.edu/api/v1";
const CMA_API = "https://openaccess-api.clevelandart.org/api";
const VAM_API = "https://api.vam.ac.uk/v2";
const RIJKS_SEARCH_API = "https://data.rijksmuseum.nl/search/collection";
const AITIEV_MANIFEST = `${import.meta.env.BASE_URL}data/artmuseum-kg-paintings.json`;
const TRETYAKOV_MANIFEST = `${import.meta.env.BASE_URL}data/tretyakov-gallery.json`;

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
] as const;

const rijksTypes = ["painting", "print", "drawing", "photograph"] as const;

type MetSearchResponse = {
  objectIDs?: number[];
};

type MetObject = {
  title?: string;
  artistDisplayName?: string;
  objectDate?: string;
  primaryImage?: string;
  primaryImageSmall?: string;
  objectURL?: string;
};

type AicSearchResponse = {
  pagination?: {
    total_pages?: number;
  };
  config?: {
    iiif_url?: string;
  };
  data?: Array<{
    id: number;
    title?: string;
    artist_display?: string;
    date_display?: string;
    image_id?: string;
    thumbnail?: {
      alt_text?: string;
    };
  }>;
};

type CmaResponse = {
  info?: {
    total?: number;
  };
  data?: Array<{
    title?: string;
    creation_date?: string;
    url?: string;
    creators?: Array<{
      description?: string;
      name?: string;
    }>;
    images?: {
      web?: {
        url?: string;
      };
      print?: {
        url?: string;
      };
    };
  }>;
};

type VamResponse = {
  info?: {
    pages?: number;
  };
  records?: Array<{
    systemNumber: string;
    objectType?: string;
    _primaryTitle?: string;
    _primaryDate?: string;
    _primaryImageId?: string;
    _primaryMaker?: {
      name?: string;
    };
  }>;
};

type RijksReference = {
  id?: string;
  type?: string;
  content?: string;
  _label?: string;
  language?: RijksReference[];
  referred_to_by?: RijksReference[];
  identified_by?: RijksReference[];
  timespan?: {
    identified_by?: RijksReference[];
  };
  part?: RijksReference[];
  digitally_carried_by?: RijksReference[];
  access_point?: RijksReference[];
  digitally_shown_by?: RijksReference[];
};

type RijksSearchResponse = {
  orderedItems?: Array<{
    id?: string;
  }>;
};

type RijksArtwork = {
  identified_by?: RijksReference[];
  produced_by?: RijksReference;
  shows?: Array<{
    id?: string;
  }>;
  subject_of?: RijksReference[];
};

type RijksVisualItem = {
  digitally_shown_by?: Array<{
    id?: string;
  }>;
};

type RijksDigitalObject = {
  access_point?: Array<{
    id?: string;
  }>;
};

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: readonly T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function getEnglishName(items: RijksReference[] = []): string | undefined {
  const names = items.filter((item) => item.type === "Name" && item.content);
  const englishName = names.find((item) =>
    item.language?.some(
      (language) => language._label === "English" || language.id?.endsWith("300388277")
    )
  );

  return englishName?.content || names[0]?.content;
}

function getRijksArtist(artwork: RijksArtwork): string {
  const productionParts = [
    ...(artwork.produced_by?.part || []),
    artwork.produced_by,
  ].filter(Boolean) as RijksReference[];

  for (const part of productionParts) {
    const name = getEnglishName(part.referred_to_by);

    if (name && !name.includes(":")) {
      return name;
    }
  }

  return "Unknown artist";
}

function getRijksDate(artwork: RijksArtwork): string | undefined {
  return getEnglishName(artwork.produced_by?.timespan?.identified_by);
}

async function fetchMetArtwork(): Promise<Artwork> {
  const term = randomItem(searchTerms);
  const searchUrl = `${MET_API}/search?hasImages=true&q=${encodeURIComponent(term)}`;
  const results = await getJson<MetSearchResponse>(searchUrl);
  const objectIds = results.objectIDs || [];

  if (!objectIds.length) {
    throw new Error("No Met records found.");
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const objectId = randomItem(objectIds);
    const artwork = await getJson<MetObject>(`${MET_API}/objects/${objectId}`);
    const imageUrl = artwork.primaryImageSmall || artwork.primaryImage;

    if (imageUrl) {
      return {
        museum: "The Met",
        title: artwork.title || "Untitled",
        artist: artwork.artistDisplayName || "Unknown artist",
        date: artwork.objectDate,
        imageUrl,
        recordUrl: artwork.objectURL || `${MET_API}/objects/${objectId}`,
        alt: `${artwork.title || "Artwork"} from The Met`,
      };
    }
  }

  throw new Error("Met records found, but none had a usable image.");
}

async function fetchAicArtwork(): Promise<Artwork> {
  const firstPageUrl = `${AIC_API}/artworks/search?query[term][is_public_domain]=true&fields=id,title,artist_display,date_display,image_id,thumbnail&limit=1&page=1`;
  const firstPage = await getJson<AicSearchResponse>(firstPageUrl);
  const totalPages = Math.min(firstPage.pagination?.total_pages || 1, 10000);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const page = Math.floor(Math.random() * totalPages) + 1;
    const artworkUrl = `${AIC_API}/artworks/search?query[term][is_public_domain]=true&fields=id,title,artist_display,date_display,image_id,thumbnail&limit=1&page=${page}`;
    const result = await getJson<AicSearchResponse>(artworkUrl);
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

async function fetchCmaArtwork(): Promise<Artwork> {
  const firstPageUrl = `${CMA_API}/artworks/?cc0&has_image=1&limit=1&skip=0`;
  const firstPage = await getJson<CmaResponse>(firstPageUrl);
  const total = firstPage.info?.total || 1;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const skip = Math.floor(Math.random() * total);
    const artworkUrl = `${CMA_API}/artworks/?cc0&has_image=1&limit=1&skip=${skip}`;
    const result = await getJson<CmaResponse>(artworkUrl);
    const artwork = result.data?.[0];
    const imageUrl = artwork?.images?.web?.url || artwork?.images?.print?.url;

    if (artwork && imageUrl) {
      const artist = artwork.creators
        ?.map((creator) => creator.description || creator.name)
        .filter(Boolean)
        .join(", ");

      return {
        museum: "Cleveland Museum of Art",
        title: artwork.title || "Untitled",
        artist: artist || "Unknown artist",
        date: artwork.creation_date,
        imageUrl,
        recordUrl: artwork.url || "https://clevelandart.org/art",
        alt: `${artwork.title || "Artwork"} from the Cleveland Museum of Art`,
      };
    }
  }

  throw new Error("CMA records found, but none had a usable image.");
}

async function fetchVamArtwork(): Promise<Artwork> {
  const firstPageUrl = `${VAM_API}/objects/search?images_exist=1&page_size=1&page=1`;
  const firstPage = await getJson<VamResponse>(firstPageUrl);
  const totalPages = firstPage.info?.pages || 1;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const page = Math.floor(Math.random() * totalPages) + 1;
    const artworkUrl = `${VAM_API}/objects/search?images_exist=1&page_size=1&page=${page}`;
    const result = await getJson<VamResponse>(artworkUrl);
    const artwork = result.records?.[0];
    const imageId = artwork?._primaryImageId;

    if (artwork && imageId) {
      return {
        museum: "Victoria and Albert Museum",
        title: artwork._primaryTitle || artwork.objectType || "Untitled",
        artist: artwork._primaryMaker?.name || "Unknown maker",
        date: artwork._primaryDate,
        imageUrl: `https://framemark.vam.ac.uk/collections/${imageId}/full/!1000,1000/0/default.jpg`,
        recordUrl: `https://collections.vam.ac.uk/item/${artwork.systemNumber}/`,
        alt: `${artwork._primaryTitle || artwork.objectType || "Object"} from the Victoria and Albert Museum`,
      };
    }
  }

  throw new Error("V&A records found, but none had a usable image.");
}

async function fetchRijksArtwork(): Promise<Artwork> {
  const type = randomItem(rijksTypes);
  const searchUrl = `${RIJKS_SEARCH_API}?imageAvailable=true&type=${encodeURIComponent(type)}`;
  const results = await getJson<RijksSearchResponse>(searchUrl);
  const objectIds = results.orderedItems?.map((item) => item.id).filter(isDefined) || [];

  if (!objectIds.length) {
    throw new Error("No Rijksmuseum records found.");
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const objectId = randomItem(objectIds);
    const artwork = await getJson<RijksArtwork>(objectId);
    const visualItemId = artwork.shows?.[0]?.id;

    if (!visualItemId) {
      continue;
    }

    const visualItem = await getJson<RijksVisualItem>(visualItemId);
    const digitalObjectId = visualItem.digitally_shown_by?.[0]?.id;

    if (!digitalObjectId) {
      continue;
    }

    const digitalObject = await getJson<RijksDigitalObject>(digitalObjectId);
    const imageUrl = digitalObject.access_point?.[0]?.id;

    if (imageUrl) {
      const title = getEnglishName(artwork.identified_by) || "Untitled";

      return {
        museum: "Rijksmuseum",
        title,
        artist: getRijksArtist(artwork),
        date: getRijksDate(artwork),
        imageUrl,
        recordUrl: artwork.subject_of?.[0]?.digitally_carried_by?.[0]?.access_point?.[0]?.id || objectId,
        alt: `${title} from the Rijksmuseum`,
      };
    }
  }

  throw new Error("Rijksmuseum records found, but none had a usable image.");
}

async function fetchManifestArtwork(manifestUrl: string, sourceName: string): Promise<Artwork> {
  const manifest = await getJson<Manifest>(manifestUrl);
  const artwork = randomItem(manifest.artworks);

  if (!artwork?.imageUrl) {
    throw new Error(`${sourceName} manifest did not contain a usable image.`);
  }

  return artwork;
}

async function fetchAitievArtwork(): Promise<Artwork> {
  return fetchManifestArtwork(AITIEV_MANIFEST, "Aitiev");
}

async function fetchTretyakovArtwork(): Promise<Artwork> {
  return fetchManifestArtwork(TRETYAKOV_MANIFEST, "Tretyakov");
}

export const sources: MuseumSource[] = [
  { id: "met", name: "The Met", fetchArtwork: fetchMetArtwork },
  { id: "aic", name: "Art Institute of Chicago", fetchArtwork: fetchAicArtwork },
  { id: "cma", name: "Cleveland Museum of Art", fetchArtwork: fetchCmaArtwork },
  { id: "vam", name: "Victoria and Albert Museum", fetchArtwork: fetchVamArtwork },
  { id: "rijks", name: "Rijksmuseum", fetchArtwork: fetchRijksArtwork },
  { id: "aitiev", name: "Gapar Aitiev Museum", fetchArtwork: fetchAitievArtwork },
  { id: "tretyakov", name: "Tretyakov Gallery", fetchArtwork: fetchTretyakovArtwork },
];

export function getSelectedSources(selectedMuseum: MuseumId): MuseumSource[] {
  if (selectedMuseum === "any") {
    return shuffle(sources);
  }

  return sources.filter((source) => source.id === selectedMuseum);
}

export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve();
    nextImage.onerror = reject;
    nextImage.src = url;
  });
}

export async function findRandomArtwork(selectedMuseum: MuseumId): Promise<Artwork> {
  const selectedSources = getSelectedSources(selectedMuseum);

  for (const source of selectedSources) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const artwork = await source.fetchArtwork();
        await preloadImage(artwork.imageUrl);
        return artwork;
      } catch (error) {
        console.warn(`${source.name} did not return an artwork on attempt ${attempt + 1}.`, error);
      }
    }
  }

  throw new Error("No museum returned a usable artwork.");
}
