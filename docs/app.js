const repositoryContentsUrl =
  "https://api.github.com/repos/ajshaw0327-sketch/aj-shaw-photography/contents/docs?ref=main";

const photographDetails = {
  "travel-providence.jpg": {
    title: "Providence Light",
    detail: "Providence · Travel journal",
    alt: "Warm afternoon light falling across the rooftops and skyline of Providence",
  },
  "travel-wave.jpg": {
    title: "Breakwater",
    detail: "Atlantic coast · Travel journal",
    alt: "Ocean waves breaking around a dark rocky outcrop",
  },
  "travel-lightning.jpg": {
    title: "Night Weather",
    detail: "On the road · Travel journal",
    alt: "A dark stormy sky illuminated by a narrow opening in the clouds",
  },
  "travel-movie.jpg": {
    title: "Avon Afternoon",
    detail: "Providence · Travel journal",
    alt: "People walking beneath the vintage Avon Cinema marquee on a city street",
  },
  "travel-sign.jpg": {
    title: "A Sign in the Green",
    detail: "Roadside study · Travel journal",
    alt: "Parking and trash-free-zone signs surrounded by dense green foliage",
  },
  "travel-chair.jpg": {
    title: "Weather Break",
    detail: "Coastline · Travel journal",
    alt: "A faint rainbow arcing above a quiet beach and pale blue water",
  },
  "events-dragon-child.jpg": {
    title: "Inside the Dragon",
    detail: "Lunar New Year · Event journal",
    alt: "A child in a red coat smiling through the mouth of a colorful dragon costume",
  },
  "events-protest.jpg": {
    title: "The Gathering",
    detail: "Public demonstration · Event journal",
    alt: "A large crowd carrying handmade signs during a city demonstration",
  },
  "events-protest-sign.jpg": {
    title: "A Sign in the Crowd",
    detail: "Public demonstration · Event journal",
    alt: "A handmade protest sign held above a crowd with city towers in the background",
  },
  "events-beads.jpg": {
    title: "Beads of Tradition",
    detail: "Community celebration · Event journal",
    alt: "A child in a red coat arranging colorful beads on a patterned table",
  },
  "events-table.jpg": {
    title: "Shared at the Table",
    detail: "Community celebration · Event journal",
    alt: "A smiling volunteer greeting a child at a decorated activity table",
  },
  "sports-catch.jpg": {
    title: "Eyes Up",
    detail: "Ultimate · Sports journal",
    alt: "An ultimate player tracking a flying disc while teammates wait downfield",
  },
  "sports-chuck.jpg": {
    title: "Across the Field",
    detail: "Ultimate · Sports journal",
    alt: "An ultimate player launching a long throw as a defender closes in",
  },
};

const photographDimensions = {
  "travel-providence.jpg": [2400, 1600],
  "travel-wave.jpg": [2400, 1600],
  "travel-lightning.jpg": [2400, 1600],
  "travel-movie.jpg": [2400, 1600],
  "travel-sign.jpg": [1600, 2400],
  "travel-chair.jpg": [2400, 1600],
  "events-dragon-child.jpg": [1600, 2400],
  "events-protest.jpg": [2400, 1599],
  "events-protest-sign.jpg": [2400, 1600],
  "events-beads.jpg": [2400, 1600],
  "events-table.jpg": [2400, 1600],
  "sports-catch.jpg": [2400, 1562],
  "sports-chuck.jpg": [2400, 1600],
};

const fallbackFiles = Object.keys(photographDetails);
const categories = ["travel", "events", "sports"];
const retiredFiles = new Set([
  "travel-afterglow.jpg",
  "travel-echinacea.jpg",
  "travel-horses.jpg",
  "travel-keeper.jpg",
  "travel-night-transit.jpg",
  "travel-ruin.jpg",
  "events-stage.jpg",
  "events-lions.jpg",
  "events-dance.jpg",
  "sports-sky.jpg",
  "sports-release.jpg",
  "sports-layout.jpg",
]);
const currentPage = document.body.dataset.page || "home";
const assetRoot = document.body.dataset.assetRoot || "./";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
const characterAnimations = {
  walk: { gif: "snoopy-flower-walk.gif", duration: 1920 },
  sleep: { gif: "snoopy-sleep.gif", duration: 1600 },
  snack: { gif: "snoopy-snack.gif", duration: 4000 },
  flowers: { gif: "snoopy-flowers.gif", duration: 3000 },
  woodstock: { gif: "woodstock-spin.gif", duration: 2000 },
};

let photographs = [];
let openPhotographs = [];
let openIndex = 0;
let lastFocusedButton = null;
let navigationTimer = 0;
let resizeFrame = 0;
let keyboardNavigation = false;

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
  const [width, height] = photographDimensions[filename] || [];
  const generatedTitle = titleFromFilename(filename);
  return {
    filename,
    src: `${assetRoot}${encodeURI(filename)}`,
    category,
    title: known?.title || generatedTitle,
    detail: known?.detail || `${category.charAt(0).toUpperCase()}${category.slice(1)} journal`,
    alt: known?.alt || `${generatedTitle}, a photograph in AJ Shaw’s ${category} portfolio`,
    width,
    height,
  };
}

function buildPhotographs(files) {
  return files
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

function setupCharacterAnimations() {
  const characters = [...document.querySelectorAll("[data-character]")];
  if (!characters.length) return;
  const playTimers = new WeakMap();

  const stopCharacter = (character) => {
    window.clearTimeout(playTimers.get(character));
    playTimers.delete(character);
    character.classList.remove("is-playing");
    character.setAttribute("aria-pressed", "false");
  };

  const playCharacter = (character, playOnce = false) => {
    if (reducedMotion.matches || character.classList.contains("is-playing")) return;
    const animation = characterAnimations[character.dataset.character];
    if (!animation) return;
    character.classList.add("is-playing");
    character.setAttribute("aria-pressed", "true");
    if (playOnce) {
      const timer = window.setTimeout(
        () => stopCharacter(character),
        animation.duration + 80,
      );
      playTimers.set(character, timer);
    }
  };

  document.addEventListener("keydown", () => {
    keyboardNavigation = true;
  });
  document.addEventListener(
    "pointerdown",
    () => {
      keyboardNavigation = false;
    },
    { capture: true },
  );

  characters.forEach((character) => {
    character.setAttribute("aria-pressed", "false");
    character.addEventListener("pointerenter", (event) => {
      if (canHover.matches && event.pointerType !== "touch") playCharacter(character);
    });
    character.addEventListener("pointerleave", (event) => {
      if (canHover.matches && event.pointerType !== "touch") stopCharacter(character);
    });
    character.addEventListener("pointerup", (event) => {
      if (event.pointerType === "touch") playCharacter(character, true);
    });
    character.addEventListener("focus", () => {
      if (keyboardNavigation) playCharacter(character);
    });
    character.addEventListener("blur", () => stopCharacter(character));
    character.addEventListener("click", () => {
      if (!canHover.matches) playCharacter(character, true);
    });
    character.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      playCharacter(character);
    });
  });

  const preload = () => {
    if (reducedMotion.matches) return;
    Object.values(characterAnimations).forEach(({ gif }) => {
      const image = new Image();
      image.decoding = "async";
      image.src = `${assetRoot}${gif}`;
    });
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 1800 });
  } else {
    window.setTimeout(preload, 700);
  }

  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches) characters.forEach(stopCharacter);
  });
}

async function loadPhotographs() {
  if (!grid && !heroMosaic) return;

  // Render the bundled photo list immediately. Remote discovery is an enhancement,
  // never a gate that keeps the page short or temporarily unscrollable.
  photographs = buildPhotographs(fallbackFiles);
  renderHero();
  renderGallery();

  const isLocalPreview = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  try {
    if (isLocalPreview) return;
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
            categoryFromFilename(entry.name) &&
            !retiredFiles.has(entry.name),
        )
        .map((entry) => entry.name);
      const currentFiles = photographs.map((photo) => photo.filename);
      const hasChanged =
        discovered.length &&
        (discovered.length !== currentFiles.length ||
          discovered.some((filename) => !currentFiles.includes(filename)));
      if (hasChanged) {
        photographs = buildPhotographs(discovered);
        renderHero();
        renderGallery();
      }
    }
  } catch {
    // The bundled list keeps the portfolio available if GitHub's API is busy.
  }
}

function photosForView(view) {
  if (view === "home") {
    return categories.flatMap((category) =>
      photographs.filter((photo) => photo.category === category).slice(0, 2),
    );
  }
  return photographs.filter((photo) => photo.category === view);
}

function prepareProgressiveImage(image, frame) {
  const markLoaded = () => {
    frame.classList.remove("is-loading", "is-error");
    frame.classList.add("is-loaded");
  };
  const markError = () => {
    frame.classList.remove("is-loading", "is-loaded");
    frame.classList.add("is-error");
  };

  frame.classList.add("is-loading");
  image.addEventListener("load", markLoaded, { once: true });
  image.addEventListener("error", markError, { once: true });
  if (image.complete) {
    queueMicrotask(() => {
      if (!image.complete) return;
      if (image.naturalWidth) markLoaded();
    });
  }
}

function applyReservedPhotoLayout(figure, photo) {
  if (!photo.width || !photo.height) return;
  const ratio = photo.width / photo.height;
  figure.classList.toggle("photo-card-portrait", ratio < 0.82);
  figure.classList.toggle("photo-card-wide", ratio > 1.45);
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
    image.alt = photo.alt;
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";
    if (index === 0) image.fetchPriority = "high";
    if (photo.width && photo.height) {
      image.width = photo.width;
      image.height = photo.height;
    }
    prepareProgressiveImage(image, button);
    image.src = photo.src;

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
    applyReservedPhotoLayout(figure, photo);
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
    image.alt = photo.alt;
    image.loading = index < 2 ? "eager" : "lazy";
    image.decoding = "async";
    if (index === 0) image.fetchPriority = "high";
    if (photo.width && photo.height) {
      image.width = photo.width;
      image.height = photo.height;
    }
    prepareProgressiveImage(image, windowElement);
    image.src = photo.src;

    const openMark = document.createElement("span");
    openMark.className = "open-mark";
    openMark.setAttribute("aria-hidden", "true");
    openMark.textContent = "View ↗";

    const caption = document.createElement("figcaption");
    const captionTitle = document.createElement("strong");
    captionTitle.textContent = photo.title;
    const captionDetail = document.createElement("span");
    captionDetail.textContent = photo.detail;

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
    ".portfolio-label, .photo-card, .route-cards a, .approach-strip article, " +
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
setupCharacterAnimations();
setupLightbox();
setupRevealAnimations();
loadPhotographs();
requestAnimationFrame(() => document.body.classList.add("route-ready"));
