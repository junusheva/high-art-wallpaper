const picture = document.querySelector("#random-picture");
const button = document.querySelector("#randomize");
const caption = document.querySelector("#caption");

const niceWords = [
  "moss",
  "orbit",
  "marble",
  "lantern",
  "river",
  "velvet",
  "cactus",
  "pepper",
  "harbor",
  "comet",
];

function makeSeed() {
  const word = niceWords[Math.floor(Math.random() * niceWords.length)];
  const number = Math.floor(Math.random() * 10_000);
  return `${word}-${number}`;
}

function showRandomPicture() {
  const seed = makeSeed();
  const nextImage = new Image();
  const nextUrl = `https://picsum.photos/seed/${seed}/1200/800`;

  picture.classList.add("is-loading");
  button.disabled = true;
  button.textContent = "Finding one...";

  nextImage.onload = () => {
    picture.src = nextUrl;
    caption.textContent = `Current seed: ${seed}`;
    picture.classList.remove("is-loading");
    button.disabled = false;
    button.textContent = "Show me another";
  };

  nextImage.onerror = () => {
    caption.textContent = "The picture gremlin missed. Try again.";
    picture.classList.remove("is-loading");
    button.disabled = false;
    button.textContent = "Show me another";
  };

  nextImage.src = nextUrl;
}

button.addEventListener("click", showRandomPicture);
