"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GalleryCategory, PortfolioPhoto } from "./photo-types";

type View = "home" | "travel" | "events" | "sports";
type NavItem = View | "about" | "contact";
type Photo = PortfolioPhoto;

function archivedPhoto(
  category: GalleryCategory,
  order: number,
  photo: Omit<
    PortfolioPhoto,
    "id" | "category" | "featured" | "sortOrder" | "width" | "height"
  > & {
    featured?: boolean;
    width?: number;
    height?: number;
  },
): PortfolioPhoto {
  return {
    id: `archive-${category}-${order}`,
    category,
    featured: photo.featured ?? false,
    sortOrder: order,
    width: photo.width ?? 2000,
    height: photo.height ?? 1333,
    ...photo,
  };
}

const fallbackGalleries: Record<GalleryCategory, Photo[]> = {
  travel: [
    archivedPhoto("travel", 1, {
      src: "/photos/afterglow.jpg",
      title: "Afterglow",
      detail: "Puerto Rico · December 2025",
      alt: "Purple storm clouds glowing above a Puerto Rican town at sunset",
      featured: true,
      width: 1333,
      height: 2000,
    }),
    archivedPhoto("travel", 2, {
      src: "/photos/horses.jpg",
      title: "Wild Company",
      detail: "Vieques · December 2025",
      alt: "Three wild horses grazing beside dense tropical greenery in Vieques",
    }),
    archivedPhoto("travel", 3, {
      src: "/photos/ruin.jpg",
      title: "Salt & Brick",
      detail: "Vieques · December 2025",
      alt: "Weathered coastal building with exposed red brick under a blue sky",
    }),
    archivedPhoto("travel", 4, {
      src: "/photos/night-transit.jpg",
      title: "Night Transit",
      detail: "Massachusetts · April 2026",
      alt: "Abstract streaks of red, white, and violet light captured at night",
      featured: true,
    }),
    archivedPhoto("travel", 5, {
      src: "/photos/keeper.jpg",
      title: "Borrowed Shelter",
      detail: "Vieques · December 2025",
      alt: "Colorful hermit crab held gently in an open shell",
    }),
    archivedPhoto("travel", 6, {
      src: "/photos/echinacea.jpg",
      title: "Summer Study",
      detail: "Massachusetts · July 2026",
      alt: "Soft-focus pink coneflowers surrounded by muted green leaves",
    }),
  ],
  events: [
    archivedPhoto("events", 1, {
      src: "/photos/event-stage.jpg",
      title: "Overture",
      detail: "ACN · May 2026",
      alt: "Performers on a violet-lit stage beside a grand piano",
    }),
    archivedPhoto("events", 2, {
      src: "/photos/event-lions.jpg",
      title: "Lion Dance",
      detail: "Lunar New Year · March 2026",
      alt: "Red and yellow lion dancers performing for a gathered crowd",
      featured: true,
    }),
    archivedPhoto("events", 3, {
      src: "/photos/event-dance.jpg",
      title: "In Formation",
      detail: "ACN · May 2026",
      alt: "Dance ensemble performing together on a blue-lit theater stage",
      featured: true,
    }),
  ],
  sports: [
    archivedPhoto("sports", 1, {
      src: "/photos/sport-sky.jpg",
      title: "Sky Ball",
      detail: "Ultimate · April 2026",
      alt: "Two ultimate players jumping high for a flying disc",
      featured: true,
    }),
    archivedPhoto("sports", 2, {
      src: "/photos/sport-release.jpg",
      title: "The Release",
      detail: "Ultimate · May 2026",
      alt: "Ultimate player releasing a forehand throw during a game",
    }),
    archivedPhoto("sports", 3, {
      src: "/photos/sport-layout.jpg",
      title: "Full Stretch",
      detail: "Ultimate · May 2026",
      alt: "Ultimate player diving at full stretch while defenders watch",
      featured: true,
    }),
  ],
};

const viewCopy: Record<Exclude<View, "home">, { label: string; note: string }> = {
  travel: {
    label: "Travel & Street",
    note: "Field notes from coastlines, city streets, and the quiet spaces between destinations.",
  },
  events: {
    label: "Events",
    note: "Tradition, performance, and the unscripted energy that gathers around a shared occasion.",
  },
  sports: {
    label: "Sports",
    note: "Anticipation, instinct, and the split-second geometry of competition.",
  },
};

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [activeNav, setActiveNav] = useState<NavItem>("home");
  const [galleries, setGalleries] =
    useState<Record<GalleryCategory, Photo[]>>(fallbackGalleries);
  const [lightbox, setLightbox] = useState<{
    photos: Photo[];
    index: number;
  } | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const featured = useMemo(() => {
    const allPhotos = [
      ...galleries.travel,
      ...galleries.events,
      ...galleries.sports,
    ];
    const selected = allPhotos.filter((photo) => photo.featured);
    return (selected.length ? selected : allPhotos).slice(0, 12);
  }, [galleries]);
  const heroPhotos = useMemo(() => {
    const preferred = [featured[0], featured[1], featured[3]].filter(
      (photo): photo is Photo => Boolean(photo),
    );
    if (preferred.length >= 3) return preferred.slice(0, 3);
    return [
      ...preferred,
      ...galleries.travel,
      ...galleries.events,
      ...galleries.sports,
    ]
      .filter(
        (photo, index, collection) =>
          collection.findIndex((candidate) => candidate.id === photo.id) === index,
      )
      .slice(0, 3);
  }, [featured, galleries]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/photos")
      .then(async (response) => {
        if (!response.ok) throw new Error("Photo archive is unavailable.");
        return (await response.json()) as { photos?: Photo[] };
      })
      .then(({ photos }) => {
        if (cancelled || !photos) return;
        setGalleries({
          travel: photos.filter((photo) => photo.category === "travel"),
          events: photos.filter((photo) => photo.category === "events"),
          sports: photos.filter((photo) => photo.category === "sports"),
        });
      })
      .catch(() => {
        // The bundled archive keeps the portfolio usable during local previews.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setGalleryView = (nextView: View) => {
    setView(nextView);
    setActiveNav(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const visitSection = (section: "about" | "contact") => {
    setActiveNav(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
  };

  const openLightbox = (
    photos: Photo[],
    index: number,
    trigger: HTMLButtonElement,
  ) => {
    lastTrigger.current = trigger;
    setLightbox({ photos, index });
  };

  const closeLightbox = () => {
    setLightbox(null);
    window.requestAnimationFrame(() => lastTrigger.current?.focus());
  };

  const moveLightbox = (direction: -1 | 1) => {
    setLightbox((current) => {
      if (!current) return null;
      return {
        ...current,
        index:
          (current.index + direction + current.photos.length) %
          current.photos.length,
      };
    });
  };

  useEffect(() => {
    if (!lightbox) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightbox]);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.12 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [view]);

  const shownPhotos = view === "home" ? featured : galleries[view];

  return (
    <main>
      <header className="site-header">
        <button
          className="wordmark"
          type="button"
          onClick={() => setGalleryView("home")}
          aria-label="AJ Shaw, go to home"
        >
          AJ Shaw
          <span>Photography</span>
        </button>
        <nav aria-label="Primary navigation">
          {(["home", "travel", "events", "sports"] as View[]).map((item) => (
            <button
              type="button"
              key={item}
              className="nav-label"
              aria-current={activeNav === item ? "page" : undefined}
              onClick={() => setGalleryView(item)}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            className="nav-label"
            aria-current={activeNav === "about" ? "page" : undefined}
            onClick={() => visitSection("about")}
          >
            About
          </button>
          <button
            type="button"
            className="nav-label"
            aria-current={activeNav === "contact" ? "page" : undefined}
            onClick={() => visitSection("contact")}
          >
            Contact
          </button>
        </nav>
      </header>

      {view === "home" ? (
        <>
          <section className="studio-hero" aria-labelledby="hero-title">
            <div className="issue-line">
              <span>AJ Shaw / Field journal</span>
              <span>Massachusetts · 2026</span>
              <span>Fujifilm X‑T50</span>
            </div>
            <div className="studio-hero-layout">
              <div className="studio-hero-copy">
                <p className="kicker">Travel · Events · Sport</p>
                <h1 id="hero-title">
                  Small moments,
                  <em>kept with intention.</em>
                </h1>
                <p className="dek">
                  Documentary-minded photographs of new places, shared
                  traditions, and the energy of play—made with a Fujifilm X‑T50
                  and an eye for honest color.
                </p>
                <div className="hero-actions">
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={() => setGalleryView("travel")}
                  >
                    Browse the archive <span aria-hidden="true">↗</span>
                  </button>
                  <span className="camera-note">
                    <strong>Current camera</strong>
                    Fujifilm X‑T50
                  </span>
                </div>
              </div>
              <div className="hero-mosaic reveal">
                {heroPhotos.map((photo, index) => (
                  <button
                    type="button"
                    className={`hero-frame hero-frame-${index + 1}`}
                    key={photo.src}
                    onClick={(event) =>
                      openLightbox(heroPhotos, index, event.currentTarget)
                    }
                    aria-label={`Open ${photo.title} in the photo viewer`}
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                    />
                    <span>
                      0{index + 1} / {photo.title}
                    </span>
                  </button>
                ))}
                <div className="mosaic-label" aria-hidden="true">
                  Contact<br />No. 01
                </div>
              </div>
            </div>
            <div className="hero-ticker" aria-label="Portfolio themes">
              <span>Places in passing</span>
              <span>People in motion</span>
              <span>Light as it happened</span>
              <span>Shot on Fujifilm X‑T50</span>
            </div>
          </section>

          <section className="featured-section" aria-labelledby="featured-title">
            <div className="section-title-row">
              <div>
                <p className="kicker">A mixed-format edit / selected frames</p>
                <h2 id="featured-title">Recent work</h2>
              </div>
              <p>
                Portrait, landscape, and wide frames arranged as one continuous
                editorial sequence.
              </p>
            </div>
            <PhotoGrid
              photos={shownPhotos}
              mode="featured"
              onOpen={openLightbox}
            />
          </section>

          <section className="postcard-strip" aria-label="Portfolio categories">
            {(["travel", "events", "sports"] as const).map((item, index) => (
              <button
                type="button"
                key={item}
                onClick={() => setGalleryView(item)}
              >
                <span>0{index + 1}</span>
                <strong>{viewCopy[item].label}</strong>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </section>
        </>
      ) : (
        <section className="archive-page" aria-labelledby="archive-title">
          <div className="archive-heading">
            <div>
              <p className="kicker">AJ Shaw / photographic archive</p>
              <h1 id="archive-title">{viewCopy[view].label}</h1>
            </div>
            <p>{viewCopy[view].note}</p>
            <span className="archive-count">
              {String(shownPhotos.length).padStart(2, "0")} frames
            </span>
          </div>
          <PhotoGrid
            photos={shownPhotos}
            mode="archive"
            onOpen={openLightbox}
          />
          <div className="archive-switcher">
            {(["travel", "events", "sports"] as const).map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={view === item}
                onClick={() => setGalleryView(item)}
              >
                {viewCopy[item].label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="about-section" id="about">
        <div className="about-photo reveal">
          <img
            src="/photos/aj-portrait.jpg"
            alt="AJ Shaw standing on a rocky coastline in Vieques with a camera bag"
          />
          <span className="tape" aria-hidden="true" />
          <p>Vieques, 2025 / photo from the road</p>
        </div>
        <div className="about-copy">
          <p className="kicker">Behind the camera</p>
          <h2>Hi, I’m AJ.</h2>
          <p className="about-lead">
            I make photographs that hold onto the atmosphere of a place—the
            noise around a celebration, the pause before a throw, or the last
            light over a city.
          </p>
          <p>
            My approach is observant and story-first. I work with natural color,
            honest gestures, and quick composition to make images that feel
            personal without losing the energy of the moment.
          </p>
          <div className="hand-note">Keep looking. Stay curious. — AJ</div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div>
          <p className="kicker">Bookings / collaborations</p>
          <h2>Let’s make something worth remembering.</h2>
        </div>
        <div className="contact-card">
          <p>
            Available for events, sports coverage, editorial stories, and
            select creative projects in Massachusetts and beyond.
          </p>
          <a
            className="button button-light"
            href="mailto:hello@ajshaw.photo?subject=Photography%20inquiry"
          >
            Start an inquiry <span aria-hidden="true">↗</span>
          </a>
          <small>Typical reply time: 1–2 days</small>
        </div>
      </section>

      <footer>
        <p>© 2026 AJ Shaw Photography</p>
        <div>
          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">
            Instagram ↗
          </a>
          <a href="https://vsco.co/" target="_blank" rel="noreferrer">
            VSCO ↗
          </a>
          <a href="/manage">Photo manager</a>
        </div>
        <button type="button" onClick={() => setGalleryView("home")}>
          Back to cover ↑
        </button>
      </footer>

      {lightbox && (
        <div
          className="lightbox"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
        >
          <div
            className={`lightbox-frame ${
              lightbox.photos[lightbox.index].height >
              lightbox.photos[lightbox.index].width
                ? "lightbox-frame-portrait"
                : "lightbox-frame-landscape"
            }`}
          >
            <div className="lightbox-topline">
              <span>
                Frame {lightbox.index + 1} / {lightbox.photos.length}
              </span>
              <button
                className="lightbox-close"
                type="button"
                onClick={closeLightbox}
                autoFocus
              >
                Close ×
              </button>
            </div>
            <div className="lightbox-image">
              <img
                src={lightbox.photos[lightbox.index].src}
                alt={lightbox.photos[lightbox.index].alt}
                width={lightbox.photos[lightbox.index].width}
                height={lightbox.photos[lightbox.index].height}
              />
            </div>
            <div className="lightbox-caption" aria-live="polite">
              <button
                type="button"
                onClick={() => moveLightbox(-1)}
                aria-label="View previous photograph"
              >
                ← Previous
              </button>
              <div>
                <h2 id="lightbox-title">
                  {lightbox.photos[lightbox.index].title}
                </h2>
                <p>{lightbox.photos[lightbox.index].detail}</p>
              </div>
              <button
                type="button"
                onClick={() => moveLightbox(1)}
                aria-label="View next photograph"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function PhotoGrid({
  photos,
  mode,
  onOpen,
}: {
  photos: Photo[];
  mode: "featured" | "archive";
  onOpen: (
    photos: Photo[],
    index: number,
    trigger: HTMLButtonElement,
  ) => void;
}) {
  return (
    <div className={`photo-grid photo-grid-${mode}`}>
      {photos.map((photo, index) => (
        <figure
          className={`photo-card reveal ${
            photo.height > photo.width ? "photo-card-portrait" : ""
          } photo-card-size-${(index % 6) + 1}`}
          key={`${photo.src}-${index}`}
        >
          <button
            type="button"
            onClick={(event) => onOpen(photos, index, event.currentTarget)}
            aria-label={`Open ${photo.title} in the photo viewer`}
          >
            <span className="frame-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="photo-window">
              <img
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                loading="lazy"
              />
              <span className="open-mark" aria-hidden="true">
                View ↗
              </span>
            </span>
          </button>
          <figcaption>
            <strong>{photo.title}</strong>
            <span>{photo.detail}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
