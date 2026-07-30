const currentPage = document.body.dataset.page || "home";
const assetRoot = document.body.dataset.assetRoot || "./";
const manifestUrl = `${assetRoot}gallery-manifest.json`;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
const characterAnimations = {
  walk: { gif: "snoopy-flower-walk.gif", duration: 1920 },
  sleep: { gif: "snoopy-sleep.gif", duration: 1600 },
  snack: { gif: "snoopy-snack.gif", duration: 4000 },
  flowers: { gif: "snoopy-flowers.gif", duration: 3000 },
  woodstock: { gif: "woodstock-spin.gif", duration: 2000 },
};
const archiveCodes = {
  travel: "TRV",
  events: "EVT",
  sports: "SPT",
};
const launchSessionKey = "aj-shaw-launch-seen-v1";
const routeTransitionKey = "aj-shaw-route-transition-v1";
const launchFaces = ["editorial", "poster-display", "typewriter", "poster-script", "grotesque"];

let photographs = [];
let galleryGroups = [];
let openPhotographs = [];
let openIndex = 0;
let lastFocusedButton = null;
let navigationTimer = 0;
let routeNavigationLocked = false;
let keyboardNavigation = false;
let launchFaceTimer = 0;
let launchChangeTimer = 0;
let launchCloseTimer = 0;
let archiveManifest = null;
let livingArchiveFrame = 0;
let lightboxAssemblyTimer = 0;
let lightboxSwapTimer = 0;
let lightboxCloseTimer = 0;
let lightboxImageToken = 0;
let cameraFlashTimer = 0;
let lightboxInertElements = [];
const subsectionLayoutTimers = new WeakMap();
const subsectionLayoutFrames = new WeakMap();
const previewScrollPositions = new WeakMap();
const subsectionsById = new Map();

const navigation = document.querySelector("#primary-navigation");
const navigationLinks = [...document.querySelectorAll("[data-route]")];
const menuToggle = document.querySelector(".menu-toggle");
const routeCurtain = document.querySelector("#route-curtain");
const grid = document.querySelector("#photo-grid");
const status = document.querySelector("#gallery-status");
const heroMosaic = document.querySelector("#hero-mosaic");
const gallerySection = document.querySelector("[data-gallery-view]");
const lightbox = document.querySelector("#lightbox");
const lightboxFrame = lightbox?.querySelector(".lightbox-frame");
const lightboxImageContainer = lightbox?.querySelector(".lightbox-image");
const lightboxPhoto = document.querySelector("#lightbox-photo");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxDetail = document.querySelector("#lightbox-detail");
const lightboxCount = document.querySelector("#lightbox-count");
const closeButton = document.querySelector("#lightbox-close");
const backdropButton = document.querySelector(".lightbox-backdrop");
const launchDialog = document.querySelector("#launch-dialog");
const launchForm = launchDialog?.querySelector(".launch-panel");
const launchTitle = document.querySelector("#launch-title");

document.documentElement.classList.add("js");

function markLaunchSeen() {
  try {
    window.sessionStorage.setItem(launchSessionKey, "1");
  } catch {
    // Storage can be unavailable in strict privacy modes; closing must still work.
  }
}

function stopLaunchTypography() {
  window.clearInterval(launchFaceTimer);
  window.clearTimeout(launchChangeTimer);
  launchFaceTimer = 0;
  launchChangeTimer = 0;
  launchTitle?.classList.remove("is-changing");
}

function startLaunchTypography() {
  if (!launchDialog?.open || !launchTitle || reducedMotion.matches || launchFaceTimer) return;
  let faceIndex = Math.max(0, launchFaces.indexOf(launchTitle.dataset.face));
  launchFaceTimer = window.setInterval(() => {
    if (document.hidden || !launchDialog.open) return;
    launchTitle.classList.add("is-changing");
    window.clearTimeout(launchChangeTimer);
    launchChangeTimer = window.setTimeout(() => {
      faceIndex = (faceIndex + 1) % launchFaces.length;
      launchTitle.dataset.face = launchFaces[faceIndex];
      requestAnimationFrame(() => launchTitle.classList.remove("is-changing"));
    }, 120);
  }, 1320);
}

function dismissLaunch(result = "enter") {
  if (!launchDialog?.open || launchDialog.classList.contains("is-closing")) return;
  markLaunchSeen();
  stopLaunchTypography();
  launchDialog.classList.add("is-closing");
  launchDialog.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
  window.clearTimeout(launchCloseTimer);
  launchCloseTimer = window.setTimeout(() => {
    launchDialog.close(result);
  }, reducedMotion.matches ? 0 : 240);
}

function setupLaunchExperience() {
  if (!launchDialog || !launchForm || !launchTitle) return;
  launchTitle.dataset.face = "editorial";

  launchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    dismissLaunch(event.submitter?.value || "enter");
  });

  launchDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismissLaunch("skip");
  });

  launchDialog.addEventListener("close", () => {
    markLaunchSeen();
    stopLaunchTypography();
    launchDialog.classList.remove("is-closing");
    launchDialog.querySelectorAll("button").forEach((button) => {
      button.disabled = false;
    });
    const activeLink =
      navigationLinks.find((link) => link.getAttribute("aria-current") === "page") ||
      navigationLinks[0];
    activeLink?.focus({ preventScroll: true });
  });

  const prepareLaunchFaces = async () => {
    if (!launchDialog.open || reducedMotion.matches) return;
    if (document.fonts?.load) {
      await Promise.allSettled([
        document.fonts.load('700 1em "Cormorant Garamond"'),
        document.fonts.load('800 1em "AJ Geist"'),
        document.fonts.load('600 1em "AJ Geist Mono"'),
      ]);
    }
    startLaunchTypography();
  };
  prepareLaunchFaces();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLaunchTypography();
    } else {
      startLaunchTypography();
    }
  });

  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches) {
      stopLaunchTypography();
      launchTitle.dataset.face = "editorial";
    } else {
      startLaunchTypography();
    }
  });
}

function withAssetRoot(src) {
  if (/^(?:https?:)?\/\//i.test(src) || src.startsWith("/")) return src;
  return `${assetRoot}${src.replace(/^\.\//, "")}`;
}

function normalizePhoto(photo, category, detail) {
  return {
    ...photo,
    category,
    detail: photo.detail || detail,
    src: withAssetRoot(photo.src),
  };
}

function applyManifest(manifest) {
  archiveManifest = manifest;
  const featured = Array.isArray(manifest?.featured) ? manifest.featured : [];
  const rawGroups = manifest?.galleries?.[currentPage];

  if (currentPage === "home") {
    photographs = featured.map((photo) =>
      normalizePhoto(photo, "featured", "Featured selection"),
    );
    galleryGroups = photographs.length
      ? [{ id: "featured", title: "Featured", photos: photographs }]
      : [];
    return;
  }

  galleryGroups = Array.isArray(rawGroups)
    ? rawGroups
        .filter((group) => Array.isArray(group.photos) && group.photos.length)
        .map((group) => ({
          ...group,
          photos: group.photos.map((photo) =>
            normalizePhoto(
              photo,
              currentPage,
              `${group.title} · ${currentPage} journal`,
            ),
          ),
        }))
    : [];
  photographs = galleryGroups.flatMap((group) => group.photos);
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

function closeMobileMenu() {
  if (!menuToggle || !navigation) return;
  menuToggle.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

function markRouteTransition() {
  try {
    window.sessionStorage.setItem(routeTransitionKey, "1");
  } catch {
    // The cream curtain still works when storage is unavailable.
  }
}

function clearRouteTransition() {
  try {
    window.sessionStorage.removeItem(routeTransitionKey);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}

function revealRouteCurtain() {
  window.clearTimeout(navigationTimer);
  navigationLinks.forEach((link) => link.classList.remove("is-pressed"));
  closeMobileMenu();
  document.body.classList.remove("route-transitioning");
  document.body.classList.add("route-ready");

  const shouldReveal =
    document.documentElement.dataset.routeArrival === "true" ||
    routeCurtain?.classList.contains("is-covering");
  if (!routeCurtain || !shouldReveal) {
    routeNavigationLocked = false;
    document.documentElement.removeAttribute("data-route-arrival");
    routeCurtain?.classList.remove("is-covering", "is-revealing");
    clearRouteTransition();
    return;
  }

  routeNavigationLocked = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      routeCurtain.classList.remove("is-covering");
      routeCurtain.classList.add("is-revealing");
      document.documentElement.removeAttribute("data-route-arrival");
      navigationTimer = window.setTimeout(() => {
        routeCurtain.classList.remove("is-revealing");
        routeNavigationLocked = false;
        clearRouteTransition();
      }, reducedMotion.matches ? 0 : 300);
    });
  });
}

function beginRouteNavigation(destination, pressedLink) {
  if (routeNavigationLocked) return;
  routeNavigationLocked = true;
  navigationLinks.forEach((link) => link.classList.remove("is-pressed"));
  pressedLink?.classList.add("is-pressed");
  closeMobileMenu();
  document.body.classList.add("route-transitioning");
  markRouteTransition();

  let didNavigate = false;
  const navigate = () => {
    if (didNavigate) return;
    didNavigate = true;
    window.clearTimeout(navigationTimer);
    window.location.assign(destination.href);
  };

  if (!routeCurtain || reducedMotion.matches) {
    navigate();
    return;
  }

  routeCurtain.classList.remove("is-revealing");
  routeCurtain.getBoundingClientRect();
  routeCurtain.classList.add("is-covering");
  routeCurtain.addEventListener(
    "transitionend",
    (event) => {
      if (event.target === routeCurtain && event.propertyName === "transform") navigate();
    },
    { once: true },
  );
  navigationTimer = window.setTimeout(navigate, 360);
}

function setupNavigation() {
  setActiveNavigation();
  revealRouteCurtain();
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) revealRouteCurtain();
  });
  window.addEventListener("pagehide", () => {
    if (!routeCurtain) return;
    routeCurtain.classList.remove("is-revealing");
    routeCurtain.classList.add("is-covering");
  });

  document.addEventListener("click", (event) => {
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

    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (
      !link ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    ) {
      return;
    }

    const destination = new URL(link.href, window.location.href);
    const isSameDocument =
      destination.origin === window.location.origin &&
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search;
    if (destination.origin !== window.location.origin || isSameDocument) {
      if (destination.href === window.location.href) closeMobileMenu();
      return;
    }

    event.preventDefault();
    if (routeNavigationLocked) return;
    beginRouteNavigation(destination, navigationLinks.includes(link) ? link : null);
  });

  menuToggle?.addEventListener("click", () => {
    const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    navigation?.classList.toggle("is-open", willOpen);
    document.body.classList.toggle("menu-open", willOpen);
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

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !navigation?.classList.contains("is-open")) return;
    event.preventDefault();
    closeMobileMenu();
    menuToggle?.focus();
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
  const hasHomePreviews = document.querySelector(".route-cards, [data-category-preview]");
  if (!grid && !heroMosaic && !hasHomePreviews) return;

  if (window.__AJ_PHOTO_MANIFEST__) {
    applyManifest(window.__AJ_PHOTO_MANIFEST__);
    renderHero();
    renderGallery();
    return;
  }

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    applyManifest(await response.json());
    renderHero();
    renderGallery();
  } catch {
    if (status) {
      status.textContent = "The contact sheet could not be developed. Please try again.";
    }
  }
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
  figure.style.setProperty("--photo-ratio", `${photo.width} / ${photo.height}`);
  figure.classList.toggle("photo-card-portrait", ratio < 0.82);
  figure.classList.toggle("photo-card-wide", ratio > 1.45);
}

function homeSequencePhotos() {
  const sequence = [...photographs];
  const usedSources = new Set(sequence.map((photo) => photo.src));

  ["travel", "events", "sports"].forEach((category) => {
    const groups = archiveManifest?.galleries?.[category];
    if (!Array.isArray(groups)) return;
    for (const group of groups) {
      const candidate = group.photos?.find(
        (photo) => photo?.src && !usedSources.has(withAssetRoot(photo.src)),
      );
      if (!candidate) continue;
      const normalized = normalizePhoto(
        candidate,
        category,
        `${group.title} · ${category} journal`,
      );
      sequence.push(normalized);
      usedSources.add(normalized.src);
      break;
    }
  });

  return sequence.slice(0, 6);
}

function randomPhotoSelection(photos, count = 3) {
  const shuffled = [...photos];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function renderHero() {
  if (!heroMosaic) {
    renderCategoryPreviews();
    return;
  }
  const selected = homeSequencePhotos();

  heroMosaic.replaceChildren();
  selected.forEach((photo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `living-print living-print-${index + 1}`;
    button.setAttribute("aria-label", `Open ${photo.title} in the photo viewer`);
    button.style.setProperty("--print-delay", `${index * 70}ms`);
    if (photo.width && photo.height) {
      button.style.setProperty("--print-ratio", `${photo.width} / ${photo.height}`);
      button.classList.toggle("living-print-portrait", photo.height > photo.width);
    }

    const windowElement = document.createElement("span");
    windowElement.className = "living-print-window";
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

    const metadata = document.createElement("span");
    metadata.className = "living-print-meta";
    const reference = document.createElement("small");
    reference.textContent = `${archiveCodes[photo.category] || "AJ"}-${String(index + 1).padStart(2, "0")}`;
    const title = document.createElement("strong");
    title.textContent = photo.title;
    const detail = document.createElement("span");
    detail.textContent = photo.detail;
    metadata.append(reference, title, detail);

    windowElement.append(image);
    button.append(windowElement, metadata);
    button.addEventListener("click", () => openLightbox(selected, index, button));
    heroMosaic.append(button);
  });

  renderCategoryPreviews();
  setupLivingHero();
  setupRevealAnimations(heroMosaic);
}

function renderCategoryPreviews() {
  if (currentPage !== "home" || !archiveManifest?.galleries) return;
  document.querySelectorAll(".route-cards a").forEach((link) => {
    const route = link.getAttribute("href")?.replace(/\.html.*$/, "");
    const groups = archiveManifest.galleries?.[route];
    if (!Array.isArray(groups)) return;
    const previewPhotos = groups
      .flatMap((group) => (Array.isArray(group.photos) ? group.photos : []))
      .slice(0, 3);
    if (!previewPhotos.length) return;

    const preview = document.createElement("span");
    preview.className = "route-preview";
    preview.setAttribute("aria-hidden", "true");
    previewPhotos.forEach((photo, index) => {
      const image = document.createElement("img");
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      if (photo.width && photo.height) {
        image.width = photo.width;
        image.height = photo.height;
      }
      image.src = withAssetRoot(photo.src);
      image.style.setProperty("--preview-index", index);
      preview.append(image);
    });
    link.append(preview);
  });

  document.querySelectorAll("[data-category-preview]").forEach((portal) => {
    const category = portal.dataset.categoryPreview;
    const groups = archiveManifest.galleries?.[category];
    const preview = portal.querySelector(".category-portal-preview");
    if (!Array.isArray(groups) || !preview) return;
    const previewPhotos = randomPhotoSelection(
      groups.flatMap((group) => (Array.isArray(group.photos) ? group.photos : [])),
    );
    preview.replaceChildren();
    previewPhotos.forEach((photo, index) => {
      const image = document.createElement("img");
      image.alt = "";
      image.loading = index === 0 ? "eager" : "lazy";
      image.decoding = "async";
      if (photo.width && photo.height) {
        image.width = photo.width;
        image.height = photo.height;
      }
      image.src = withAssetRoot(photo.src);
      image.style.setProperty("--portal-index", index);
      preview.append(image);
    });
  });
}

function setupLivingHero() {
  const interactiveArea = heroMosaic?.closest(".living-contact-stage");
  if (!interactiveArea || interactiveArea.dataset.livingArchiveReady) return;
  interactiveArea.dataset.livingArchiveReady = "true";

  const updateFrames = (normalizedX, normalizedY) => {
    livingArchiveFrame = 0;
    interactiveArea.style.setProperty("--orbit-x", `${(normalizedX * 10).toFixed(2)}px`);
    interactiveArea.style.setProperty("--orbit-y", `${(normalizedY * 7).toFixed(2)}px`);
    [...heroMosaic.querySelectorAll(".living-print")].forEach((frame, index) => {
      const depth = [8, -6, 5, -4, 7, -5][index] || 3;
      frame.style.setProperty("--sheet-drift-x", `${(normalizedX * depth).toFixed(2)}px`);
      frame.style.setProperty("--sheet-drift-y", `${(normalizedY * depth * 0.7).toFixed(2)}px`);
      frame.style.setProperty("--sheet-drift-rotate", `${(normalizedX * depth * 0.06).toFixed(2)}deg`);
    });
  };

  const resetFrames = () => {
    cancelAnimationFrame(livingArchiveFrame);
    livingArchiveFrame = 0;
    updateFrames(0, 0);
  };

  interactiveArea.addEventListener("pointermove", (event) => {
    if (!canHover.matches || reducedMotion.matches || event.pointerType === "touch") {
      resetFrames();
      return;
    }
    const bounds = interactiveArea.getBoundingClientRect();
    const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;
    cancelAnimationFrame(livingArchiveFrame);
    livingArchiveFrame = requestAnimationFrame(() =>
      updateFrames(normalizedX, normalizedY),
    );
  });
  interactiveArea.addEventListener("pointerleave", resetFrames);
  reducedMotion.addEventListener?.("change", resetFrames);
  canHover.addEventListener?.("change", resetFrames);
}

function setupPhotoCardInteractions(scope) {
  if (!scope || scope.dataset.photoInteractionsReady) return;
  scope.dataset.photoInteractionsReady = "true";

  let activeButton = null;
  let activeFigure = null;
  let activeBounds = null;
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const resetTilt = () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    activeFigure?.classList.remove("is-pointer-active");
    activeFigure?.style.setProperty("--tilt-x", "0deg");
    activeFigure?.style.setProperty("--tilt-y", "0deg");
    activeFigure?.style.setProperty("--label-x", "0px");
    activeButton = null;
    activeFigure = null;
    activeBounds = null;
  };

  const renderTilt = () => {
    pointerFrame = 0;
    if (!activeFigure || !activeBounds) return;
    const x = (pointerX - activeBounds.left) / activeBounds.width - 0.5;
    const y = (pointerY - activeBounds.top) / activeBounds.height - 0.5;
    activeFigure.style.setProperty("--tilt-x", `${(-y * 2.1).toFixed(2)}deg`);
    activeFigure.style.setProperty("--tilt-y", `${(x * 2.4).toFixed(2)}deg`);
    activeFigure.style.setProperty("--label-x", `${(x * 3).toFixed(2)}px`);
  };

  scope.addEventListener("pointerover", (event) => {
    if (!canHover.matches || reducedMotion.matches || event.pointerType === "touch") return;
    const button =
      event.target instanceof Element ? event.target.closest(".photo-card button") : null;
    if (!button || !scope.contains(button) || button === activeButton) return;
    resetTilt();
    activeButton = button;
    activeFigure = button.closest(".photo-card");
    activeBounds = button.getBoundingClientRect();
    activeFigure?.classList.add("is-pointer-active");
  });

  scope.addEventListener("pointermove", (event) => {
    if (
      !activeFigure ||
      !canHover.matches ||
      reducedMotion.matches ||
      event.pointerType === "touch"
    ) {
      resetTilt();
      return;
    }
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(renderTilt);
  });

  scope.addEventListener("pointerout", (event) => {
    if (!activeButton) return;
    const next =
      event.relatedTarget instanceof Element
        ? event.relatedTarget.closest(".photo-card button")
        : null;
    if (next === activeButton) return;
    resetTilt();
  });
  scope.addEventListener("focusout", resetTilt);
  reducedMotion.addEventListener?.("change", resetTilt);
  canHover.addEventListener?.("change", resetTilt);
}

function renderPhotoCards(container, selected, startIndex = 0) {
  selected.forEach((photo, localIndex) => {
    const index = startIndex + localIndex;
    const figure = document.createElement("figure");
    figure.className = `photo-card photo-card-size-${(index % 6) + 1}`;
    applyReservedPhotoLayout(figure, photo);
    figure.style.setProperty("--card-rotate", `${[-0.3, 0.22, -0.12, 0.28][index % 4]}deg`);
    figure.style.setProperty("--card-delay", `${Math.min(localIndex, 8) * 45}ms`);
    figure.style.setProperty("--section-card-delay", `${Math.min(localIndex, 10) * 36}ms`);

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Open ${photo.title}, ${photo.detail}, photographed on Fujifilm X-T50, in the photo viewer`,
    );
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

    const metadata = document.createElement("span");
    metadata.className = "photo-metadata";
    metadata.setAttribute("aria-hidden", "true");
    const metadataLocation = document.createElement("span");
    metadataLocation.className = "photo-meta-location";
    metadataLocation.textContent = photo.detail?.split("·")[0]?.trim() || "AJ archive";
    const metadataCamera = document.createElement("span");
    metadataCamera.className = "photo-meta-camera";
    metadataCamera.textContent = "Fujifilm X-T50";
    const metadataFrame = document.createElement("span");
    metadataFrame.className = "photo-meta-frame";
    metadataFrame.textContent = `${archiveCodes[photo.category] || "AJ"}-${String(index + 1).padStart(2, "0")}`;
    metadata.append(metadataLocation, metadataCamera, metadataFrame);

    const caption = document.createElement("figcaption");
    const captionTitle = document.createElement("strong");
    captionTitle.textContent = photo.title;
    const captionDetail = document.createElement("span");
    captionDetail.textContent = photo.detail;

    const surface = document.createElement("span");
    surface.className = "photo-surface";

    button.addEventListener("click", () => openLightbox(selected, localIndex, button));

    windowElement.append(image, metadata, openMark);
    surface.append(indexLabel, windowElement);
    button.append(surface);
    caption.append(captionTitle, captionDetail);
    figure.append(button, caption);
    container.append(figure);
  });
}

function gallerySubsectionId(group, usedIds) {
  const rawId = String(group.id || group.title || "section")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const baseId = `gallery-${rawId || "section"}`;
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function decodedLocationHash() {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return window.location.hash.slice(1);
  }
}

function setSubsectionExpanded(
  subsection,
  expanded,
  { animate = true, updateHash = false } = {},
) {
  const toggle = subsection?.querySelector(".gallery-subsection-toggle");
  const panel = subsection?.querySelector(".gallery-subsection-panel");
  const panelInner = panel?.querySelector(".gallery-subsection-panel-inner");
  const strip = panel?.querySelector(".photo-grid");
  const actionLabel = toggle?.querySelector(".gallery-subsection-action-label");
  if (!toggle || !panel || !panelInner || !strip) return;

  window.clearTimeout(subsectionLayoutTimers.get(panel));
  window.cancelAnimationFrame(subsectionLayoutFrames.get(panel));
  subsectionLayoutTimers.delete(panel);
  subsectionLayoutFrames.delete(panel);
  panel.classList.remove("is-opening");
  panel.classList.remove("is-layout-transitioning");

  const wasExpanded = subsection.classList.contains("is-expanded");
  if (wasExpanded === expanded && toggle.getAttribute("aria-expanded") === String(expanded)) {
    syncSubsectionPreviewControls(subsection);
    return;
  }

  const startHeight = panel.getBoundingClientRect().height;
  if (expanded) previewScrollPositions.set(strip, strip.scrollLeft);

  toggle.setAttribute("aria-expanded", String(expanded));
  if (actionLabel) actionLabel.textContent = expanded ? "Close collection" : "Expand collection";
  panel.setAttribute("aria-hidden", "false");
  panel.inert = false;
  panel.hidden = false;
  subsection.classList.toggle("is-expanded", expanded);
  syncSubsectionPreviewControls(subsection);

  if (expanded) {
    panel.classList.add("is-opening");
    panel.querySelectorAll(".photo-card").forEach((card) => {
      card.classList.add("is-revealed");
    });
  } else {
    requestAnimationFrame(() => {
      strip.scrollLeft = previewScrollPositions.get(strip) || 0;
      syncSubsectionPreviewControls(subsection);
    });
  }

  if (animate && !reducedMotion.matches && startHeight > 0) {
    panel.style.height = `${startHeight}px`;
    panel.classList.add("is-layout-transitioning");
    const targetHeight = panelInner.getBoundingClientRect().height;
    const layoutFrame = requestAnimationFrame(() => {
      panel.style.height = `${targetHeight}px`;
      subsectionLayoutFrames.delete(panel);
    });
    subsectionLayoutFrames.set(panel, layoutFrame);
    const layoutTimer = window.setTimeout(() => {
      panel.style.removeProperty("height");
      panel.classList.remove("is-layout-transitioning", "is-opening");
      subsectionLayoutTimers.delete(panel);
      syncSubsectionPreviewControls(subsection);
    }, 440);
    subsectionLayoutTimers.set(panel, layoutTimer);
  } else {
    panel.style.removeProperty("height");
    panel.classList.remove("is-layout-transitioning", "is-opening");
  }

  if (!updateHash) return;
  const nextUrl = new URL(window.location.href);
  if (expanded) {
    nextUrl.hash = subsection.id;
  } else if (decodedLocationHash() === subsection.id) {
    nextUrl.hash = "";
  }
  window.history.replaceState(window.history.state, "", nextUrl);
}

function syncSubsectionPreviewControls(subsection) {
  const strip = subsection?.querySelector(".photo-grid");
  const tools = subsection?.querySelector(".gallery-preview-tools");
  const hint = subsection?.querySelector(".gallery-scroll-hint");
  const previous = subsection?.querySelector("[data-preview-direction='previous']");
  const next = subsection?.querySelector("[data-preview-direction='next']");
  if (!strip || !tools || !hint || !previous || !next) return;

  const expanded = subsection.classList.contains("is-expanded");
  const hasOverflow = !expanded && strip.scrollWidth > strip.clientWidth + 4;
  const atStart = strip.scrollLeft <= 3;
  const atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 3;

  tools.hidden = !hasOverflow;
  hint.hidden = !hasOverflow;
  previous.disabled = atStart;
  next.disabled = atEnd;
  subsection.classList.toggle("has-preview-overflow", hasOverflow);
  subsection.classList.toggle("is-preview-start", atStart);
  subsection.classList.toggle("is-preview-end", atEnd);
}

function setupSubsectionPreview(subsection) {
  const strip = subsection.querySelector(".photo-grid");
  const previous = subsection.querySelector("[data-preview-direction='previous']");
  const next = subsection.querySelector("[data-preview-direction='next']");
  if (!strip || !previous || !next) return;

  let scrollFrame = 0;
  const scrollTo = (left) => {
    strip.scrollTo({
      left,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  };
  const scrollBy = (direction) => {
    const current = strip.scrollLeft;
    const positions = [...strip.children]
      .filter((card) => card.classList.contains("photo-card"))
      .map((card) => card.offsetLeft - strip.offsetLeft);
    const target = direction > 0
      ? positions.find((position) => position > current + 8)
      : positions.reverse().find((position) => position < current - 8);
    scrollTo(target ?? (direction > 0 ? strip.scrollWidth : 0));
  };

  previous.addEventListener("click", () => scrollBy(-1));
  next.addEventListener("click", () => scrollBy(1));
  strip.addEventListener("scroll", () => {
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => syncSubsectionPreviewControls(subsection));
  }, { passive: true });
  strip.addEventListener("keydown", (event) => {
    if (subsection.classList.contains("is-expanded")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollBy(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollBy(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      scrollTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      scrollTo(strip.scrollWidth);
    }
  });
  strip.addEventListener("wheel", (event) => {
    if (
      subsection.classList.contains("is-expanded") ||
      !event.shiftKey ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX)
    ) return;
    event.preventDefault();
    strip.scrollLeft += event.deltaY;
  }, { passive: false });

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => syncSubsectionPreviewControls(subsection));
    observer.observe(strip);
  } else {
    window.addEventListener("resize", () => syncSubsectionPreviewControls(subsection), {
      passive: true,
    });
  }
  requestAnimationFrame(() => syncSubsectionPreviewControls(subsection));
}

function openHashedSubsection({ scroll = false, animate = true } = {}) {
  const target = subsectionsById.get(decodedLocationHash());
  if (!target) return false;
  setSubsectionExpanded(target, true, { animate, updateHash: false });
  if (scroll) {
    requestAnimationFrame(() => {
      target.scrollIntoView({
        block: "start",
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
    });
  }
  return true;
}

function scrollToStaticPageAnchor() {
  const hash = decodedLocationHash();
  if (!hash || subsectionsById.has(hash)) return false;
  const target = document.getElementById(hash);
  if (!target) return false;
  requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start", behavior: "auto" });
  });
  return true;
}

function cleanLegacyContactRedirect() {
  if (currentPage !== "about") return;
  const currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.get("from") !== "contact") return;
  currentUrl.searchParams.delete("from");
  window.history.replaceState(window.history.state, "", currentUrl);
}

function renderGallery() {
  if (!grid || !gallerySection) return;
  grid.replaceChildren();
  subsectionsById.clear();

  if (currentPage === "home") {
    const contactSheet = document.createElement("div");
    contactSheet.className = "photo-grid";
    renderPhotoCards(contactSheet, photographs);
    grid.append(contactSheet);
  } else {
    let photoOffset = 0;
    const usedIds = new Set();
    const requestedHash = decodedLocationHash();
    let requestedSubsection = null;

    galleryGroups.forEach((group, groupIndex) => {
      const subsection = document.createElement("article");
      subsection.className = "gallery-subsection";
      subsection.style.setProperty("--subsection-delay", `${Math.min(groupIndex, 6) * 60}ms`);
      subsection.id = gallerySubsectionId(group, usedIds);
      subsectionsById.set(subsection.id, subsection);
      if (subsection.id === requestedHash) requestedSubsection = subsection;

      const heading = document.createElement("h2");
      heading.className = "gallery-subsection-heading";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "gallery-subsection-toggle";
      toggle.id = `${subsection.id}-toggle`;
      toggle.setAttribute("aria-controls", `${subsection.id}-panel`);
      const titleGroup = document.createElement("div");
      titleGroup.className = "gallery-subsection-title";
      const stamp = document.createElement("span");
      stamp.className = "gallery-subsection-stamp";
      stamp.setAttribute("aria-hidden", "true");
      stamp.textContent = `${archiveCodes[currentPage] || "AJ"}-${String(groupIndex + 1).padStart(2, "0")}`;
      const title = document.createElement("span");
      title.className = "gallery-subsection-name";
      title.textContent = group.title;

      const meta = document.createElement("span");
      meta.className = "gallery-subsection-meta";
      const count = document.createElement("span");
      count.className = "gallery-subsection-count";
      count.textContent = `${String(group.photos.length).padStart(2, "0")} frames`;
      const actionLabel = document.createElement("span");
      actionLabel.className = "gallery-subsection-action-label";
      actionLabel.textContent = "Expand collection";
      const indicator = document.createElement("span");
      indicator.className = "gallery-subsection-indicator";
      indicator.setAttribute("aria-hidden", "true");

      titleGroup.append(stamp, title);
      meta.append(count, actionLabel, indicator);
      toggle.append(titleGroup, meta);
      heading.append(toggle);

      const contactSheet = document.createElement("div");
      contactSheet.className = "photo-grid";
      contactSheet.id = `${subsection.id}-strip`;
      contactSheet.tabIndex = 0;
      contactSheet.setAttribute("role", "group");
      contactSheet.setAttribute(
        "aria-label",
        `${group.title} preview, ${group.photos.length} photographs. Use the left and right arrow keys to browse.`,
      );
      renderPhotoCards(contactSheet, group.photos, photoOffset);
      photoOffset += group.photos.length;

      const previewTools = document.createElement("div");
      previewTools.className = "gallery-preview-tools";
      previewTools.hidden = true;
      const scrollHint = document.createElement("span");
      scrollHint.className = "gallery-scroll-hint";
      scrollHint.hidden = true;
      scrollHint.setAttribute("aria-hidden", "true");
      scrollHint.textContent = "Swipe the contact strip";
      const previewControls = document.createElement("span");
      previewControls.className = "gallery-scroll-controls";
      const previous = document.createElement("button");
      previous.type = "button";
      previous.dataset.previewDirection = "previous";
      previous.setAttribute("aria-label", `View previous photographs in ${group.title}`);
      previous.innerHTML = "<span aria-hidden=\"true\">←</span>";
      const next = document.createElement("button");
      next.type = "button";
      next.dataset.previewDirection = "next";
      next.setAttribute("aria-label", `View next photographs in ${group.title}`);
      next.innerHTML = "<span aria-hidden=\"true\">→</span>";
      previewControls.append(previous, next);
      previewTools.append(scrollHint, previewControls);

      const panelInner = document.createElement("div");
      panelInner.className = "gallery-subsection-panel-inner";
      panelInner.append(previewTools, contactSheet);
      const panel = document.createElement("div");
      panel.className = "gallery-subsection-panel";
      panel.id = `${subsection.id}-panel`;
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", toggle.id);
      panel.append(panelInner);

      toggle.addEventListener("click", () => {
        const willExpand = toggle.getAttribute("aria-expanded") !== "true";
        setSubsectionExpanded(subsection, willExpand, {
          animate: true,
          updateHash: true,
        });
      });

      subsection.append(heading, panel);
      grid.append(subsection);
      setupSubsectionPreview(subsection);
    });

    subsectionsById.forEach((subsection) => {
      setSubsectionExpanded(subsection, subsection === requestedSubsection, {
        animate: false,
        updateHash: false,
      });
    });

    if (requestedSubsection) {
      requestAnimationFrame(() => {
        requestedSubsection.scrollIntoView({ block: "start", behavior: "auto" });
      });
    }
  }

  if (status) {
    status.textContent = photographs.length
      ? `${String(photographs.length).padStart(2, "0")} photographs`
      : "No photographs in this section yet.";
  }
  requestAnimationFrame(() => grid.classList.add("is-ready"));
  setupRevealAnimations(grid);
  setupPhotoCardInteractions(grid);

  if (currentPage !== "home") {
    const unfoldArchive = () => {
      requestAnimationFrame(() => grid.classList.add("is-unfolded"));
    };
    if (launchDialog?.open) {
      launchDialog.addEventListener("close", unfoldArchive, { once: true });
    } else {
      unfoldArchive();
    }
  }
}

function setupRevealAnimations(scope = document) {
  const selector =
    ".issue-line, .hero-copy, .hero-mosaic-wrap, .hero-ticker, .section-heading, " +
    ".portfolio-label, .gallery-subsection-heading, .photo-card, .route-cards a, .approach-strip article, " +
    ".contact-notes article, .contact-postcard, .contact-stamp, .about-layout > *, .camera-notes, " +
    ".about-contact-bridge, .contact-pocket, .connect-invitation, .site-footer, " +
    ".home-cover-copy, .home-cover-index, .living-contact-heading, .living-print, .sheet-focus-note, " +
    ".category-portals-heading, .category-portal, .archive-closing-copy, .archive-closing-index, " +
    ".profile-portrait, .profile-introduction, .profile-date-stamp, .chapter-heading, " +
    ".story-passages, .story-editorial blockquote, .story-detail-print, .story-annotations, " +
    ".field-note, .field-recipe, .booking-heading, .booking-envelope";
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

function ensureLightboxObjectLabels() {
  if (!lightboxFrame || !lightboxImageContainer) return null;
  let labels = lightboxFrame.querySelector(".lightbox-object-labels");
  if (labels) return labels;

  labels = document.createElement("div");
  labels.className = "lightbox-object-labels";
  labels.setAttribute("aria-hidden", "true");
  ["reference", "place", "camera", "category"].forEach((field, index) => {
    const label = document.createElement("span");
    label.dataset.objectField = field;
    label.style.setProperty("--object-delay", `${index * 45}ms`);
    labels.append(label);
  });
  lightboxImageContainer.after(labels);
  return labels;
}

function assembleLightboxObjectLabels(photo) {
  const labels = ensureLightboxObjectLabels();
  if (!labels || !lightboxFrame) return;
  const place = photo.detail?.split("·")[0]?.trim() || "AJ archive";
  const category = photo.category === "featured" ? "Featured edit" : `${photo.category} archive`;
  const values = {
    reference: `AJ-${String(openIndex + 1).padStart(2, "0")} / ${String(openPhotographs.length).padStart(2, "0")}`,
    place,
    camera: "Fujifilm X-T50",
    category,
  };
  labels.querySelectorAll("[data-object-field]").forEach((label) => {
    label.textContent = values[label.dataset.objectField] || "";
  });

  cancelAnimationFrame(lightboxAssemblyTimer);
  lightboxFrame.classList.remove("is-assembled");
  if (reducedMotion.matches) {
    lightboxFrame.classList.add("is-assembled");
    return;
  }
  lightboxAssemblyTimer = requestAnimationFrame(() => {
    lightboxFrame.classList.add("is-assembled");
    lightboxAssemblyTimer = 0;
  });
}

function triggerCameraFlash() {
  if (reducedMotion.matches) return;
  window.clearTimeout(cameraFlashTimer);
  document.body.classList.remove("archive-camera-flash");
  void document.body.offsetHeight;
  document.body.classList.add("archive-camera-flash");
  cameraFlashTimer = window.setTimeout(
    () => document.body.classList.remove("archive-camera-flash"),
    360,
  );
}

function openLightbox(photos, index, trigger) {
  if (!lightbox || !closeButton) return;
  window.clearTimeout(lightboxCloseTimer);
  lightboxCloseTimer = 0;
  openPhotographs = photos;
  openIndex = index;
  lastFocusedButton = trigger;
  updateLightbox();
  if (photos[index]?.category === "featured") triggerCameraFlash();
  lightbox.hidden = false;
  if (!lightboxInertElements.length) {
    lightboxInertElements = [
      ...document.querySelectorAll("body > header, body > main, body > footer, body > dialog"),
    ].filter((element) => !element.inert);
    lightboxInertElements.forEach((element) => {
      element.inert = true;
    });
  }
  requestAnimationFrame(() => lightbox.classList.add("is-open"));
  document.body.classList.add("lightbox-open");
  closeButton.focus();
}

function closeLightbox() {
  if (!lightbox || lightbox.hidden) return;
  window.clearTimeout(lightboxSwapTimer);
  cancelAnimationFrame(lightboxAssemblyTimer);
  lightboxSwapTimer = 0;
  lightboxAssemblyTimer = 0;
  lightboxFrame?.classList.remove("is-developing", "is-assembled");
  lightbox.classList.remove("is-open");
  document.body.classList.remove("lightbox-open");
  const restoreFocus = lastFocusedButton;
  window.clearTimeout(lightboxCloseTimer);
  lightboxCloseTimer = window.setTimeout(() => {
    lightbox.hidden = true;
    lightboxInertElements.forEach((element) => {
      element.inert = false;
    });
    lightboxInertElements = [];
    if (restoreFocus?.closest("[inert]")) {
      restoreFocus.closest(".gallery-subsection")?.querySelector(".gallery-subsection-toggle")?.focus();
    } else {
      restoreFocus?.focus();
    }
    lightboxCloseTimer = 0;
  }, reducedMotion.matches ? 0 : 170);
}

function moveLightbox(direction) {
  if (!openPhotographs.length) return;
  openIndex = (openIndex + direction + openPhotographs.length) % openPhotographs.length;
  lightboxFrame?.classList.add("is-developing");
  window.clearTimeout(lightboxSwapTimer);
  lightboxSwapTimer = window.setTimeout(() => {
    updateLightbox();
    lightboxFrame?.classList.remove("is-developing");
    lightboxSwapTimer = 0;
  }, reducedMotion.matches ? 0 : 90);
}

function updateLightbox() {
  const photo = openPhotographs[openIndex];
  if (!photo || !lightboxPhoto) return;
  const imageToken = ++lightboxImageToken;
  const updatePortraitState = () => {
    if (imageToken !== lightboxImageToken) return;
    lightboxFrame?.classList.toggle(
      "lightbox-frame-portrait",
      lightboxPhoto.naturalHeight > lightboxPhoto.naturalWidth,
    );
  };
  lightboxPhoto.onload = updatePortraitState;
  lightboxPhoto.alt = photo.alt;
  lightboxTitle.textContent = photo.title;
  lightboxDetail.textContent = photo.detail;
  lightboxCount.textContent = `Frame ${openIndex + 1} / ${openPhotographs.length}`;
  assembleLightboxObjectLabels(photo);
  if (photo.width && photo.height) {
    lightboxFrame?.classList.toggle(
      "lightbox-frame-portrait",
      photo.height > photo.width,
    );
  }
  lightboxPhoto.src = photo.src;
  if (lightboxPhoto.complete && lightboxPhoto.naturalWidth) {
    queueMicrotask(updatePortraitState);
  }
}

function setupLightbox() {
  if (!lightbox || !lightboxFrame) return;
  closeButton?.addEventListener("click", closeLightbox);
  backdropButton?.addEventListener("click", closeLightbox);
  document.querySelector("#lightbox-previous")?.addEventListener("click", () => moveLightbox(-1));
  document.querySelector("#lightbox-next")?.addEventListener("click", () => moveLightbox(1));

  document.addEventListener("keydown", (event) => {
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

setupLaunchExperience();
cleanLegacyContactRedirect();
setupNavigation();
setupCharacterAnimations();
setupLightbox();
setupRevealAnimations();
loadPhotographs();
window.addEventListener("hashchange", () => {
  if (!openHashedSubsection({ scroll: true, animate: true })) {
    scrollToStaticPageAnchor();
  }
});
if (document.readyState === "complete") {
  scrollToStaticPageAnchor();
} else {
  window.addEventListener("load", scrollToStaticPageAnchor, { once: true });
}
requestAnimationFrame(() => document.body.classList.add("route-ready"));
