# Museum Picture Machine

A tiny static website that shows a random picture every time you press the
button. Images and artwork records come from
[The Metropolitan Museum of Art Collection API](https://metmuseum.github.io/)
[The Art Institute of Chicago API](https://api.artic.edu/docs/),
[Cleveland Museum of Art Open Access API](https://openaccess-api.clevelandart.org/),
[V&A Collections API](https://developers.vam.ac.uk/guide/v2/welcome.html), and
[Rijksmuseum Data Services](https://data.rijksmuseum.nl/docs/), so there is no
backend or API-key setup step.

## Run it

Open `index.html` in a browser, or serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
