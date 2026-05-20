export type MuseumId = "any" | "met" | "aic" | "cma" | "vam" | "rijks" | "aitiev" | "tretyakov";

export type Artwork = {
  museum: string;
  title: string;
  artist: string;
  date?: string;
  imageUrl: string;
  recordUrl: string;
  alt: string;
};

export type MuseumSource = {
  id: Exclude<MuseumId, "any">;
  name: string;
  fetchArtwork: () => Promise<Artwork>;
};

export type Manifest = {
  artworks: Artwork[];
};
