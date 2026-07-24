# Loops and sample packs: domain contract

This document defines the frontend contract before an API is introduced. The current Angular pages consume typed mock data with these same domain shapes.

## Boundaries

- `models/catalog/*-api.model.ts` contains the expected backend DTOs in snake_case.
- `models/catalog/loop.model.ts` and `sample-pack.model.ts` contain normalized, UI-safe domain models in camelCase.
- Components only accept domain models. Future HTTP services and adapters own DTO-to-domain conversion.
- Pages depend on the `CATALOG_REPOSITORY` port, currently backed by `MockCatalogRepository`; an HTTP repository can replace that provider without changing page or presentational components.
- List responses use `CatalogPageDto<T>` at the transport boundary and `CatalogPage<T>` inside the app.
- Prices are always integer minor units plus currency. Free items use `amount_minor: 0`; price strings are never stored.
- Durations and sizes are numeric (`duration_seconds`, `total_size_bytes`) and formatted only for display.

## List projections

### Loop list/grid

The loop catalog needs identity and routing (`id`, `slug`), title treatment (`title`, `title_accent`), producer summary, artwork, genre/type, BPM/key, moods, formats, duration, price, preview/waveform data, engagement counts, and publish time. It deliberately does not need download URLs or a full producer profile.

### Sample-pack list/grid

The pack catalog needs identity and routing, title treatment, producer summary, artwork, genre/type, moods, formats, file count, total byte size, price, engagement counts, and publish time. Individual sample files, reviews, license details, and full description are detail-only fields.

## Sample-pack detail projection

The detail response extends the list projection with:

- description, BPM range, and demo URL;
- license capabilities and terms URL;
- typed sample-file previews with BPM/key/duration/waveform data;
- producer profile statistics and bio;
- aggregate rating distribution and review records;
- related pack summaries.

Authenticated download URLs should not be embedded in the detail payload. A later download endpoint should mint short-lived URLs after entitlement checks.

## Intended API surface (not implemented yet)

- `GET /catalog/loops`
- `GET /catalog/sample-packs`
- `GET /catalog/sample-packs/:slug`
- `POST /catalog/loops/:id/preview-events`
- `POST /catalog/sample-files/:id/preview-events`
- `POST /catalog/items/:id/wishlist`
- `POST /catalog/items/:id/cart`
- `POST /catalog/sample-files/:id/download`

Filtering and sorting request fields map directly to `LoopCatalogQuery` and `SamplePackCatalogQuery`. The later API layer should expose repository methods returning domain models, leaving page components unchanged.
