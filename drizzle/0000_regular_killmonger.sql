CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text,
	`src` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`alt` text NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO `photos`
  (`id`, `storage_key`, `src`, `category`, `title`, `detail`, `alt`, `featured`, `sort_order`, `width`, `height`)
VALUES
  ('archive-travel-1', NULL, '/photos/afterglow.jpg', 'travel', 'Afterglow', 'Puerto Rico · December 2025', 'Purple storm clouds glowing above a Puerto Rican town at sunset', 1, 1, 1333, 2000),
  ('archive-travel-2', NULL, '/photos/horses.jpg', 'travel', 'Wild Company', 'Vieques · December 2025', 'Three wild horses grazing beside dense tropical greenery in Vieques', 0, 2, 2000, 1333),
  ('archive-travel-3', NULL, '/photos/ruin.jpg', 'travel', 'Salt & Brick', 'Vieques · December 2025', 'Weathered coastal building with exposed red brick under a blue sky', 0, 3, 2000, 1333),
  ('archive-travel-4', NULL, '/photos/night-transit.jpg', 'travel', 'Night Transit', 'Massachusetts · April 2026', 'Abstract streaks of red, white, and violet light captured at night', 1, 4, 2000, 1333),
  ('archive-travel-5', NULL, '/photos/keeper.jpg', 'travel', 'Borrowed Shelter', 'Vieques · December 2025', 'Colorful hermit crab held gently in an open shell', 0, 5, 2000, 1333),
  ('archive-travel-6', NULL, '/photos/echinacea.jpg', 'travel', 'Summer Study', 'Massachusetts · July 2026', 'Soft-focus pink coneflowers surrounded by muted green leaves', 0, 6, 2000, 1333),
  ('archive-events-1', NULL, '/photos/event-stage.jpg', 'events', 'Overture', 'ACN · May 2026', 'Performers on a violet-lit stage beside a grand piano', 0, 1, 2000, 1333),
  ('archive-events-2', NULL, '/photos/event-lions.jpg', 'events', 'Lion Dance', 'Lunar New Year · March 2026', 'Red and yellow lion dancers performing for a gathered crowd', 1, 2, 2000, 1333),
  ('archive-events-3', NULL, '/photos/event-dance.jpg', 'events', 'In Formation', 'ACN · May 2026', 'Dance ensemble performing together on a blue-lit theater stage', 1, 3, 2000, 1333),
  ('archive-sports-1', NULL, '/photos/sport-sky.jpg', 'sports', 'Sky Ball', 'Ultimate · April 2026', 'Two ultimate players jumping high for a flying disc', 1, 1, 2000, 1333),
  ('archive-sports-2', NULL, '/photos/sport-release.jpg', 'sports', 'The Release', 'Ultimate · May 2026', 'Ultimate player releasing a forehand throw during a game', 0, 2, 2000, 1333),
  ('archive-sports-3', NULL, '/photos/sport-layout.jpg', 'sports', 'Full Stretch', 'Ultimate · May 2026', 'Ultimate player diving at full stretch while defenders watch', 1, 3, 2000, 1333);
