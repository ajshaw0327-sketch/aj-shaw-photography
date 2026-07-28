const repositoryContentsUrl =
  "https://api.github.com/repos/ajshaw0327-sketch/aj-shaw-photography/contents/docs?ref=main";

const photographDetails = {
  "travel-afterglow.jpg": {
    title: "Afterglow",
    detail: "Puerto Rico · December 2025",
    alt: "Purple storm clouds glowing above a Puerto Rican town at sunset",
  },
  "travel-horses.jpg": {
    title: "Wild Company",
    detail: "Vieques · December 2025",
    alt: "Three wild horses grazing beside dense tropical greenery in Vieques",
  },
  "travel-ruin.jpg": {
    title: "Salt & Brick",
    detail: "Vieques · December 2025",
    alt: "Weathered coastal building with exposed red brick under a blue sky",
  },
  "travel-night-transit.jpg": {
    title: "Night Transit",
    detail: "Massachusetts · April 2026",
    alt: "Abstract streaks of red, white, and violet light captured at night",
  },
  "travel-keeper.jpg": {
    title: "Borrowed Shelter",
    detail: "Vieques · December 2025",
    alt: "Colorful hermit crab held gently in an open shell",
  },
  "travel-echinacea.jpg": {
    title: "Summer Study",
    detail: "Massachusetts · July 2026",
    alt: "Soft-focus pink coneflowers surrounded by muted green leaves",
  },
  "events-stage.jpg": {
    title: "Overture",
    detail: "ACN · May 2026",
    alt: "Performers on a violet-lit stage beside a grand piano",
  },
  "events-lions.jpg": {
    title: "Lion Dance",
    detail: "Lunar New Year · March 2026",
    alt: "Red and yellow lion dancers performing for a gathered crowd",
  },
  "events-dance.jpg": {
    title: "In Formation",
    detail: "ACN · May 2026",
    alt: "Dance ensemble performing together on a blue-lit theater stage",
  },
  "sports-sky.jpg": {
    title: "Sky Ball",
    detail: "Ultimate · April 2026",
    alt: "Two ultimate players jumping high for a flying disc",
  },
  "sports-release.jpg": {
    title: "The Release",
    detail: "Ultimate · May 2026",
    alt: "Ultimate player releasing a forehand throw during a game",
  },
  "sports-layout.jpg": {
    title: "Full Stretch",
    detail: "Ultimate · May 2026",
    alt: "Ultimate player diving at full stretch while defenders watch",
  },
};

const fallbackFiles = Object.keys(photographDetails);
const categories = ["travel", "events", "sports"];
const copy = {
  home: {
    title: "Recent work",
    kicker: "Mixed-format edit / selected frames",
    note: "Portrait, landscape, and wide frames arranged as one continuous editorial sequence.",
  },
  travel: {
    title: "Travel & Street",
    kicker: "Places in passing",
    note: "Field notes from coastlines, city streets, and the quiet spaces between destinations.",
  },
  events: {
    title: "Events",
    kicker: "People gathering",
    note: "Tradition, performance, and the unscripted energy around a shared occasion.",
  },
  sports: {
    title: "Sports",
    kicker: "Instinct and motion",
    note: "Anticipation, energy, and the split-second geometry of competition.",
  },
};

let photographs = [];
let currentView = "home";
let openPhotographs = [];
let openIndex = 0;
let lastFocusedButton = null;

const grid = document.querySelector("#photo-grid");
const status = document.querySelector("#gallery-status");
const title = document.querySelector("#gallery-title");
const kicker = document.querySelector("#gallery-kicker");
const note = document.querySelector("#gallery-note");
const heroMosaic = document.querySelector("#hero-mosaic");
const lightbox = document.querySelector("#lightbox");
const lightboxFrame = lightbox.querySelector(".lightbox-frame");
const lightboxPhoto = document.querySelector("#lightbox-photo");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxDetail = document.querySelector("#lightbox-detail");
const lightboxCount = document.querySelector("#lightbox-count");
const closeButton = document.querySelector("#lightbox-close");

function categoryFromFilename(filename) {
  return categories.find((category) => filename.startsWith(`${category}-`));
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.(jpe?g|png|webp)$/i, "")
    .replace(/^(travel|events|sports)-/, "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function photoFromFilename(filename) {
  const category = categoryFromFilename(filename);
  if (!category) return null;
  const known = photographDetails[filename];
  const generatedTitle = titleFromFilename(filename);
  return {
    filename,
    src: encodeURI(filename),
    category,
    title: known?.title || generatedTitle,
    detail: known?.detail || category.charAt(0).toUpperCase() + category.slice(1),
    alt: known?.alt || `${generatedTitle}, a photograph in AJ Shaw’s ${category} portfolio`,
  };
}

async function loadPhotographs() {
  let files = fallbackFiles;
  try {
    const response = await fetch(repositoryContentsUrl, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (response.ok) {
      const entries = await response.json();
      const discovered = entries
        .filter(
          (entry) =>
            entry.type === "file" &&
            /\.(jpe?g|png|webp)$/i.test(entry.name) &&
            categoryFromFilename(entry.name),
        )
        .map((entry) => entry.name);
      if (discovered.length) files = discovered;
    }
  } catch {
    // The bundled list keeps the portfolio available if GitHub's API is busy.
  }

  photographs = files
    .map(photoFromFilename)
    .filter(Boolean)
    .sort((a, b) => a.filename.localeCompare(b.filename));
  renderHero();
  renderGallery();
}

function photosForView(view) {
  if (view === "home") {
    return categories
      .flatMap((category) => photographs.filter((photo) => photo.category === category).slice(0, 2))
      .slice(0, 9);
  }
  return photographs.filter((photo) => photo.category === view);
}

function renderHero() {
  const selected = photosForView("home").slice(0, 3);
  heroMosaic.innerHTML = "";
  selected.forEach((photo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `hero-frame hero-frame-${index + 1}`;
    button.setAttribute("aria-label", `Open ${photo.title} in the photo viewer`);
    button.innerHTML = `
      <img src="${photo.src}" alt="${photo.alt}" />
      <span>0${index + 1} / ${photo.title}</span>
    `;
    button.addEventListener("click", () => openLightbox(selected, index, button));
    heroMosaic.append(button);
  });
}

function renderGallery() {
  const selected = photosForView(currentView);
  title.textContent = copy[currentView].title;
  kicker.textContent = copy[currentView].kicker;
  note.textContent = copy[currentView].note;
  grid.innerHTML = "";

  document.querySelectorAll("[data-view]").forEach((control) => {
    if (control.matches(".gallery-tabs button")) {
      control.setAttribute("aria-pressed", String(control.dataset.view === currentView));
    }
  });

  selected.forEach((photo, index) => {
    const figure = document.createElement("figure");
    figure.className = `photo-card photo-card-size-${(index % 6) + 1}`;
    figure.innerHTML = `
      <button type="button" aria-label="Open ${photo.title} in the photo viewer">
        <span class="frame-index">${String(index + 1).padStart(2, "0")}</span>
        <span class="photo-window">
          <img src="${photo.src}" alt="${photo.alt}" loading="lazy" />
          <span class="open-mark" aria-hidden="true">View ↗</span>
        </span>
      </button>
      <figcaption>
        <strong>${photo.title}</strong>
        <span>${photo.detail}</span>
      </figcaption>
    `;
    const image = figure.querySelector("img");
    image.addEventListener("load", () => {
      figure.classList.toggle("photo-card-portrait", image.naturalHeight > image.naturalWidth);
    });
    const button = figure.querySelector("button");
    button.addEventListener("click", () => openLightbox(selected, index, button));
    grid.append(figure);
  });

  status.textContent = selected.length
    ? `${String(selected.length).padStart(2, "0")} photographs`
    : "No photographs in this section yet.";
}

function selectView(view) {
  currentView = view;
  renderGallery();
  document.querySelector(".gallery-section").scrollIntoView({ behavior: "smooth" });
}

function openLightbox(photos, index, trigger) {
  openPhotographs = photos;
  openIndex = index;
  lastFocusedButton = trigger;
  updateLightbox();
  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  closeButton.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  lastFocusedButton?.focus();
}

function moveLightbox(direction) {
  openIndex = (openIndex + direction + openPhotographs.length) % openPhotographs.length;
  updateLightbox();
}

function updateLightbox() {
  const photo = openPhotographs[openIndex];
  lightboxPhoto.src = photo.src;
  lightboxPhoto.alt = photo.alt;
  lightboxTitle.textContent = photo.title;
  lightboxDetail.textContent = photo.detail;
  lightboxCount.textContent = `Frame ${openIndex + 1} / ${openPhotographs.length}`;
  lightboxPhoto.onload = () => {
    lightboxFrame.classList.toggle(
      "lightbox-frame-portrait",
      lightboxPhoto.naturalHeight > lightboxPhoto.naturalWidth,
    );
  };
}

document.querySelectorAll("[data-view]").forEach((control) => {
  control.addEventListener("click", () => selectView(control.dataset.view));
});
closeButton.addEventListener("click", closeLightbox);
document.querySelector("#lightbox-previous").addEventListener("click", () => moveLightbox(-1));
document.querySelector("#lightbox-next").addEventListener("click", () => moveLightbox(1));
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (lightbox.hidden) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
});

loadPhotographs();
