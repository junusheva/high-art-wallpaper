import { useState } from "react";
import { findRandomArtwork, sources } from "./museums";
import { pictureSources } from "./sources";
import type { Artwork, MuseumId } from "./types";

const initialArtwork: Artwork = {
  museum: "Cleveland Museum of Art",
  title: "Nathaniel Hurd",
  artist: "John Singleton Copley",
  date: "c. 1765",
  imageUrl: "https://openaccess-cdn.clevelandart.org/1915.534/1915.534_web.jpg",
  recordUrl: "https://clevelandart.org/art/1915.534",
  alt: "Portrait miniature of Nathaniel Hurd from the Cleveland Museum of Art",
};

function formatCredit(artwork: Artwork): string {
  return [artwork.title, artwork.artist, artwork.date].filter(Boolean).join(" | ");
}

function App() {
  const [selectedMuseum, setSelectedMuseum] = useState<MuseumId>("any");
  const [artwork, setArtwork] = useState<Artwork>(initialArtwork);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function showRandomPicture() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextArtwork = await findRandomArtwork(selectedMuseum);
      setArtwork(nextArtwork);
    } catch (error) {
      setErrorMessage("The museum gremlin misplaced the image. Try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Open APIs + museum websites</p>
        <h1 id="page-title">Museum Picture Machine</h1>
        <p className="intro">
          Press the button and the page pulls a fresh artwork from open museum collections. A small
          art portal, basically. No velvet rope.
        </p>

        <div className="museum-picker">
          <label htmlFor="museum-select">Choose a museum</label>
          <select
            id="museum-select"
            name="museum"
            value={selectedMuseum}
            disabled={isLoading}
            onChange={(event) => setSelectedMuseum(event.target.value as MuseumId)}
          >
            <option value="any">Any museum</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>

        <div className="actions">
          <button id="randomize" type="button" disabled={isLoading} onClick={showRandomPicture}>
            {isLoading ? "Walking the galleries..." : "Find random art"}
          </button>
          <a href="#picture-card">See current picture</a>
        </div>
      </section>

      <section id="picture-card" className="picture-card" aria-live="polite">
        <p id="museum-name" className="museum-name">
          {artwork.museum}
        </p>
        <div className="picture-frame">
          <img
            id="random-picture"
            className={isLoading ? "is-loading" : undefined}
            src={artwork.imageUrl}
            alt={artwork.alt}
          />
        </div>
        <div className="caption-row">
          <p id="caption">{errorMessage || formatCredit(artwork)}</p>
          <a id="artwork-link" href={artwork.recordUrl} target="_blank" rel="noreferrer noopener">
            View record
          </a>
        </div>
      </section>

      <section className="sources-panel" aria-labelledby="sources-title">
        <p className="eyebrow">Picture sources</p>
        <h2 id="sources-title">Where the images come from</h2>
        <ul className="source-list">
          {pictureSources.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noreferrer noopener">
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
