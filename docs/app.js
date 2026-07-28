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
const currentPage = document.body.dataset.page || "home";
const assetRoot = document.body.dataset.assetRoot || "./";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let photographs = [];
let openPhotographs = [];
let openIndex = 0;
let lastFocusedButton = null;
let navigationTimer = 0;
let resizeFrame = 0;

const navigation = document.querySelector("#primary-navigation");
const navigationLinks = [...document.querySelectorAll("[data-route]")];
const navigationMarker = navigation?.querySelector(".nav-marker");
const menuToggle = document.querySelector(".menu-toggle");
const grid = document.querySelector("#photo-grid");
const status = document.querySelector("#gallery-status");
const heroMosaic = document.querySelector("#hero-mosaic");
const gallerySection = document.querySelector("[data-gallery-view]");
const lightbox = document.querySelector("#lightbox");
const lightboxFrame = lightbox?.querySelector(".lightbox-frame");
const lightboxPhoto = document.querySelector("#lightbox-photo");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxDetail = document.querySelector("#lightbox-detail");
const lightboxCount = document.querySelector("#lightbox-count");
const closeButton = document.querySelector("#lightbox-close");
const backdropButton = document.querySelector(".lightbox-backdrop");

document.documentElement.classList.add("js");

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
    src: `${assetRoot}${encodeURI(filename)}`,
    category,
    title: known?.title || generatedTitle,
    detail: known?.detail || `${category.charAt(0).toUpperCase()}${category.slice(1)} journal`,
    alt: known?.alt || `${generatedTitle}, a photograph in AJ Shaw’s ${category} portfolio`,
  };
}

function setActiveNavigation() {
  navigationLinks.forEach((link) => {
    if (link.dataset.route === currentPage) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function positionNavigationMarker(link, animate = true) {
  if (!navigation || !navigationMarker || !link) return;
  navigationMarker.classList.toggle("no-transition", !animate || reducedMotion.matches);
  navigationMarker.style.setProperty("--marker-x", `${link.offsetLeft}px`);
  navigationMarker.style.setProperty("--marker-y", `${link.offsetTop}px`);
  navigationMarker.style.setProperty("--marker-width", `${link.offsetWidth}px`);
  navigationMarker.style.setProperty("--marker-height", `${link.offsetHeight}px`);
  navigationMarker.classList.add("is-positioned");
  if (!animate || reducedMotion.matches) {
    requestAnimationFrame(() => navigationMarker.classList.remove("no-transition"));
  }
}

function closeMobileMenu() {
  if (!menuToggle || !navigation) return;
  menuToggle.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

function setupNavigation() {
  const activeLink = navigationLinks.find((link) => link.dataset.route === currentPage);
  setActiveNavigation();

  const settleMarker = () => positionNavigationMarker(activeLink, false);
  requestAnimationFrame(settleMarker);
  document.fonts?.ready.then(settleMarker);
  window.addEventListener("pageshow", settleMarker);
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const selected =
        navigationLinks.find((link) => link.getAttribute("aria-current") === "page") || activeLink;
      positionNavigationMarker(selected, false);
    });
  });

  navigationLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (destination.href === window.location.href) {
        closeMobileMenu();
        return;
      }

      event.preventDefault();
      window.clearTimeout(navigationTimer);
      navigationMarker?.classList.add("is-moving");
      positionNavigationMarker(link, true);
      link.classList.add("is-pressed");
      document.body.classList.add("route-leaving");
      closeMobileMenu();

      navigationTimer = window.setTimeout(
        () => window.location.assign(destination.href),
        reducedMotion.matches ? 0 : 190,
      );
    });
  });

  menuToggle?.addEventListener("click", () => {
    const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    navigation?.classList.toggle("is-open", willOpen);
    document.body.classList.toggle("menu-open", willOpen);
    if (willOpen) requestAnimationFrame(settleMarker);
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      navigation?.classList.contains("is-open") &&
      !navigation.contains(event.target) &&
      !menuToggle?.contains(event.target)
    ) {
      closeMobileMenu();
    }
  });
}

async function loadPhotographs() {
  if (!grid && !heroMosaic) return;
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
    .sort((a, b) => {
      const knownA = fallbackFiles.indexOf(a.filename);
      const knownB = fallbackFiles.indexOf(b.filename);
      if (knownA >= 0 && knownB >= 0) return knownA - knownB;
      if (knownA >= 0) return -1;
      if (knownB >= 0) return 1;
      return a.filename.localeCompare(b.filename);
    });

  renderHero();
  renderGallery();
}

function photosForView(view) {
  if (view === "home") {
    return categories.flatMap((category) =>
      photographs.filter((photo) => photo.category === category).slice(0, 2),
    );
  }
  return photographs.filter((photo) => photo.category === view);
}

function renderHero() {
  if (!heroMosaic) return;
  const selected = categories
    .map((category) => photographs.find((photo) => photo.category === category))
    .filter(Boolean);

  heroMosaic.replaceChildren();
  selected.forEach((photo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `hero-frame hero-frame-${index + 1}`;
    button.setAttribute("aria-label", `Open ${photo.title} in the photo viewer`);

    const image = document.createElement("img");
    image.src = photo.src;
    image.alt = photo.alt;

    const label = document.createElement("span");
    label.textContent = `0${index + 1} / ${photo.title}`;

    button.append(image, label);
    button.addEventListener("click", () => openLightbox(selected, index, button));
    heroMosaic.append(button);
  });
}

function renderGallery() {
  if (!grid || !gallerySection) return;
  const view = gallerySection.dataset.galleryView || currentPage;
  const selected = photosForView(view);
  grid.replaceChildren();

  selected.forEach((photo, index) => {
    const figure = document.createElement("figure");
    figure.className = `photo-card photo-card-size-${(index % 6) + 1}`;
    figure.style.setProperty("--card-rotate", `${[-0.3, 0.22, -0.12, 0.28][index % 4]}deg`);
    figure.style.setProperty("--card-delay", `${Math.min(index, 8) * 45}ms`);

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Open ${photo.title} in the photo viewer`);

    const indexLabel = document.createElement("span");
    indexLabel.className = "frame-index";
    indexLabel.textContent = String(index + 1).padStart(2, "0");

    const windowElement = document.createElement("span");
    windowElement.className = "photo-window";

    const image = document.createElement("img");
    image.src = photo.src;
    image.alt = photo.alt;
    image.loading = index < 3 ? "eager" : "lazy";

    const openMark = document.createElement("span");
    openMark.className = "open-mark";
    openMark.setAttribute("aria-hidden", "true");
    openMark.textContent = "View ↗";

    const caption = document.createElement("figcaption");
    const captionTitle = document.createElement("strong");
    captionTitle.textContent = photo.title;
    const captionDetail = document.createElement("span");
    captionDetail.textContent = photo.detail;

    image.addEventListener("load", () => {
      const ratio = image.naturalWidth / image.naturalHeight;
      figure.classList.toggle("photo-card-portrait", ratio < 0.82);
      figure.classList.toggle("photo-card-wide", ratio > 1.45);
    });
    button.addEventListener("click", () => openLightbox(selected, index, button));

    windowElement.append(image, openMark);
    button.append(indexLabel, windowElement);
    caption.append(captionTitle, captionDetail);
    figure.append(button, caption);
    grid.append(figure);
  });

  if (status) {
    status.textContent = selected.length
      ? `${String(selected.length).padStart(2, "0")} photographs`
      : "No photographs in this section yet.";
  }
  requestAnimationFrame(() => grid.classList.add("is-ready"));
  setupRevealAnimations(grid);
}

function setupRevealAnimations(scope = document) {
  const selector =
    ".issue-line, .hero-copy, .hero-mosaic-wrap, .hero-ticker, .section-heading, " +
    ".portfolio-heading, .photo-card, .route-cards a, .approach-strip article, " +
    ".contact-notes article, .contact-postcard, .contact-stamp, .about-layout > *, .site-footer";
  const elements = [...scope.querySelectorAll(selector)].filter(
    (element) => !element.classList.contains("reveal"),
  );

  elements.forEach((element, index) => {
    element.classList.add("reveal", `reveal-${(index % 4) + 1}`);
  });

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -7% 0px", threshold: 0.08 },
  );
  elements.forEach((element) => observer.observe(element));
}

function openLightbox(photos, index, trigger) {
  if (!lightbox || !closeButton) return;
  openPhotographs = photos;
  openIndex = index;
  lastFocusedButton = trigger;
  updateLightbox();
  lightbox.hidden = false;
  requestAnimationFrame(() => lightbox.classList.add("is-open"));
  document.body.classList.add("lightbox-open");
  closeButton.focus();
}

function closeLightbox() {
  if (!lightbox || lightbox.hidden) return;
  lightbox.classList.remove("is-open");
  document.body.classList.remove("lightbox-open");
  const restoreFocus = lastFocusedButton;
  window.setTimeout(() => {
    lightbox.hidden = true;
    restoreFocus?.focus();
  }, reducedMotion.matches ? 0 : 170);
}

function moveLightbox(direction) {
  if (!openPhotographs.length) return;
  openIndex = (openIndex + direction + openPhotographs.length) % openPhotographs.length;
  lightboxFrame?.classList.add("is-developing");
  window.setTimeout(() => {
    updateLightbox();
    lightboxFrame?.classList.remove("is-developing");
  }, reducedMotion.matches ? 0 : 90);
}

function updateLightbox() {
  const photo = openPhotographs[openIndex];
  if (!photo || !lightboxPhoto) return;
  lightboxPhoto.src = photo.src;
  lightboxPhoto.alt = photo.alt;
  lightboxTitle.textContent = photo.title;
  lightboxDetail.textContent = photo.detail;
  lightboxCount.textContent = `Frame ${openIndex + 1} / ${openPhotographs.length}`;
  lightboxPhoto.onload = () => {
    lightboxFrame?.classList.toggle(
      "lightbox-frame-portrait",
      lightboxPhoto.naturalHeight > lightboxPhoto.naturalWidth,
    );
  };
}

function setupLightbox() {
  if (!lightbox || !lightboxFrame) return;
  closeButton?.addEventListener("click", closeLightbox);
  backdropButton?.addEventListener("click", closeLightbox);
  document.querySelector("#lightbox-previous")?.addEventListener("click", () => moveLightbox(-1));
  document.querySelector("#lightbox-next")?.addEventListener("click", () => moveLightbox(1));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navigation?.classList.contains("is-open")) {
      closeMobileMenu();
      menuToggle?.focus();
      return;
    }
    if (lightbox.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveLightbox(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveLightbox(1);
    } else if (event.key === "Tab") {
      const focusable = [...lightboxFrame.querySelectorAll("button:not([disabled])")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}

setupNavigation();
setupLightbox();
setupRevealAnimations();
loadPhotographs();
requestAnimationFrame(() => document.body.classList.add("route-ready"));
