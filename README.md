# Museum Picture Machine

A tiny React + TypeScript website that shows a random artwork every time you
press the button. Images and artwork records come from
[The Metropolitan Museum of Art Collection API](https://metmuseum.github.io/),
[The Art Institute of Chicago API](https://api.artic.edu/docs/),
[Cleveland Museum of Art Open Access API](https://openaccess-api.clevelandart.org/),
[V&A Collections API](https://developers.vam.ac.uk/guide/v2/welcome.html), and
[Rijksmuseum Data Services](https://data.rijksmuseum.nl/docs/). It also includes
generated image manifests from the
[Gapar Aitiev Kyrgyz National Museum of Fine Arts](https://artmuseum.kg/en/galleries/paintings)
and
[Tretyakov Gallery works on Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Paintings_in_the_Tretyakov_Gallery).

## Run it

Install dependencies and start the Vite dev server:

```sh
npm install
npm run dev
```

Then open the local URL printed by Vite, usually `http://localhost:5173/`.

## Build it

```sh
npm run build
```

The production files are written to `dist/`. GitHub Pages builds this folder
automatically on every push to `main`.

## Update museum data

The Aitiev Museum does not expose an API, so its image source is generated at
build time from public gallery pages. Tretyakov's official collection pages are
disallowed for crawling in `robots.txt`, so the Tretyakov source is generated
from Wikimedia Commons instead.

Both scripts write JSON manifests into `public/data/`, where Vite serves them
as static assets:

```sh
node scripts/scrape-artmuseum-kg.mjs
node scripts/scrape-tretyakov-commons.mjs
```

Set `MAX_PAGES=170` to refresh the full Aitiev paintings gallery.
Set `MAX_ARTWORKS=200` to include more Tretyakov records from Commons.
