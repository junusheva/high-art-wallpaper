# Museum Picture Machine

A tiny static website that shows a random picture every time you press the
button. Images and artwork records come from
[The Metropolitan Museum of Art Collection API](https://metmuseum.github.io/)
[The Art Institute of Chicago API](https://api.artic.edu/docs/),
[Cleveland Museum of Art Open Access API](https://openaccess-api.clevelandart.org/),
[V&A Collections API](https://developers.vam.ac.uk/guide/v2/welcome.html), and
[Rijksmuseum Data Services](https://data.rijksmuseum.nl/docs/). It also includes
generated image manifests from the
[Gapar Aitiev Kyrgyz National Museum of Fine Arts](https://artmuseum.kg/en/galleries/paintings),
[Tretyakov Gallery works on Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Paintings_in_the_Tretyakov_Gallery),
so there is no
backend or API-key setup step.

## Update scraped museum data

The Aitiev Museum does not expose an API, so its image source is generated at
build time from public gallery pages. Tretyakov's official collection pages are
disallowed for crawling in `robots.txt`, so the Tretyakov source is generated
from Wikimedia Commons instead. Both scripts create JSON and JavaScript manifest
files so the site works on GitHub Pages and from a local `file://` preview:

```sh
node scripts/scrape-artmuseum-kg.mjs
node scripts/scrape-tretyakov-commons.mjs
```

Set `MAX_PAGES=170` to refresh the full paintings gallery.
Set `MAX_ARTWORKS=200` to include more Tretyakov records from Commons.

## Run it

Open `index.html` in a browser, or serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
