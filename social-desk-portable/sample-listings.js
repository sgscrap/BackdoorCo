/* ===========================================================
 * Voltride sample listings
 * Drops entries into window.voltrideDatabase for the Social
 * Media Asset Desk to consume. Each listing follows the same
 * shape as the workspace's internal database, with dirtbike
 * semantics mapped to the existing field names:
 *
 *   artist   -> make           (e.g. "Honda")
 *   release  -> model          (e.g. "CRF450R")
 *   region   -> location       (e.g. "Mid-Atlantic")
 *   subtext  -> editorial copy (year + price + description)
 *   badge    -> price / status (e.g. "$7,500" or "JUST IN")
 *   kicker   -> category line  (e.g. "FOR SALE | MID-ATLANTIC")
 *   artwork  -> image path
 *   theme    -> paper / dark / red / gold
 *   type     -> template key   (see mapping below)
 *   vinyl    -> show accessory disc
 *   status   -> in-stock / sold / archive
 *   year     -> bike year
 *   condition -> NEW / LIKE NEW / GOOD / FAIR
 *
 * Type key map (dirtbike -> workspace template):
 *   bike          -> single
 *   lineup        -> mixtape
 *   walkaround    -> video_promo
 *   featured-4    -> collage
 *   seller        -> artist
 *   sale          -> announcement
 *   mfr-month     -> brand_month
 *   mfr-week      -> brand_week
 *   tribute-build -> memorial
 *
 * To use: replace this file with your own listings, or merge
 * entries into window.voltrideDatabase before the workspace
 * reads it. Each id should be unique.
 * =========================================================== */
(function (window) {
  'use strict';

  var voltrideDatabase = {

    'honda-crf450r-2022': {
      artist: 'Honda',
      release: 'CRF450R',
      year: '2022',
      price: '$7,500',
      region: 'Mid-Atlantic',
      subtext: '2022 Honda CRF450R. Low hours, freshly serviced, race-ready out of the crate. Track-day favorite.',
      artwork: 'assets/sample-honda-crf450r.jpg',
      kicker: 'For Sale | Mid-Atlantic',
      badge: '$7,500',
      theme: 'paper',
      type: 'bike',
      condition: 'Like New',
      status: 'in-stock',
      vinyl: true,
      assetDeskFeatured: true
    },

    'yamaha-yz250f-2021': {
      artist: 'Yamaha',
      release: 'YZ250F',
      year: '2021',
      price: '$5,200',
      region: 'Pacific Northwest',
      subtext: '2021 Yamaha YZ250F. Fun 4-stroke trail weapon, well-maintained, fresh top end.',
      artwork: 'assets/sample-yamaha-yz250f.jpg',
      kicker: 'For Sale | Pacific Northwest',
      badge: '$5,200',
      theme: 'dark',
      type: 'bike',
      condition: 'Good',
      status: 'in-stock',
      vinyl: true,
      assetDeskFeatured: true
    },

    'ktm-350-exc-f-2023': {
      artist: 'KTM',
      release: '350 EXC-F',
      year: '2023',
      price: '$9,800',
      region: 'Northern California',
      subtext: '2023 KTM 350 EXC-F. Enduro-ready, top spec, low miles, tastefully upgraded suspension.',
      artwork: 'assets/sample-ktm-350excf.jpg',
      kicker: 'For Sale | Northern California',
      badge: '$9,800',
      theme: 'dark',
      type: 'bike',
      condition: 'Excellent',
      status: 'in-stock',
      vinyl: false,
      assetDeskFeatured: true
    },

    'kawasaki-kx450-2024': {
      artist: 'Kawasaki',
      release: 'KX450',
      year: '2024',
      price: '$8,900',
      region: 'Midwest',
      subtext: '2024 Kawasaki KX450. Showroom condition, factory warranty transfer available.',
      artwork: 'assets/sample-kawasaki-kx450.jpg',
      kicker: 'For Sale | Midwest',
      badge: '$8,900',
      theme: 'paper',
      type: 'bike',
      condition: 'Like New',
      status: 'in-stock',
      vinyl: true,
      assetDeskFeatured: true
    },

    'husqvarna-fc-350-2023': {
      artist: 'Husqvarna',
      release: 'FC 350',
      year: '2023',
      price: '$7,800',
      region: 'Mid-Atlantic',
      subtext: '2023 Husqvarna FC 350. Track-day favorite. Includes spare plastics and a decent tire collection.',
      artwork: 'assets/sample-husqvarna-fc350.jpg',
      kicker: 'For Sale | Mid-Atlantic',
      badge: '$7,800',
      theme: 'dark',
      type: 'bike',
      condition: 'Excellent',
      status: 'in-stock',
      vinyl: false,
      assetDeskFeatured: true
    },

    'suzuki-rm-z450-2020': {
      artist: 'Suzuki',
      release: 'RM-Z450',
      year: '2020',
      price: '$4,200',
      region: 'Pacific Southwest',
      subtext: '2020 Suzuki RM-Z450. Budget-friendly race bike, runs strong. Price drop.',
      artwork: 'assets/sample-suzuki-rmz450.jpg',
      kicker: 'Price Drop | Pacific Southwest',
      badge: '$4,200',
      theme: 'paper',
      type: 'bike',
      condition: 'Good',
      status: 'price-drop',
      vinyl: true,
      assetDeskFeatured: false
    },

    'beta-300-rr-2022': {
      artist: 'Beta',
      release: '300 RR',
      year: '2022',
      price: '$6,900',
      region: 'Pacific Northwest',
      subtext: '2022 Beta 300 RR. 2-stroke tight-woods weapon. Strong bottom end, fresh piston.',
      artwork: 'assets/sample-beta-300rr.jpg',
      kicker: 'For Sale | Pacific Northwest',
      badge: '$6,900',
      theme: 'dark',
      type: 'bike',
      condition: 'Good',
      status: 'in-stock',
      vinyl: false,
      assetDeskFeatured: false
    },

    'gasgas-mc-450f-2023': {
      artist: 'GasGas',
      release: 'MC 450F',
      year: '2023',
      price: '$8,500',
      region: 'Texas',
      subtext: '2023 GasGas MC 450F. Modern agile chassis, race-ready, just detailed.',
      artwork: 'assets/sample-gasgas-mc450f.jpg',
      kicker: 'For Sale | Texas',
      badge: '$8,500',
      theme: 'paper',
      type: 'bike',
      condition: 'Like New',
      status: 'in-stock',
      vinyl: true,
      assetDeskFeatured: false
    }

  };

  window.voltrideDatabase = voltrideDatabase;
})(window);
