# sPrint

> Lightweight automation layer for exporting PDF derivatives from Revit models published in BIM 360 / ACC.

## What's Built (v1)

- **Autodesk OAuth 2.0 authentication** — Login/logout flow with token refresh via APS (Autodesk Platform Services)
- **Hub / Project / Folder browser** — Hierarchical tree navigation of BIM 360 and ACC project structures
- **Revit file search** — Server-sent events (SSE) streaming search with real-time progress
- **PDF derivative fetching** — Reads model manifests to extract available PDF sheet derivatives
- **Sheet selection with view set grouping** — Toggle individual sheets or entire view sets at once
- **Multi-model PDF export** — Merge into a single PDF or download as ZIP, supporting multiple Revit files simultaneously
- **PDF Document Viewer** — Fullscreen in-browser preview of individual PDF sheets before exporting (proxied via server endpoint)
- **Responsive dashboard** — Two-panel desktop layout with slideover on mobile
- **Theme customization** — Dark mode default, Nuxt UI theming

## Architecture

- **Framework**: Nuxt 4 + Vue 3 (Composition API)
- **UI**: Nuxt UI v4 (Tailwind CSS)
- **Server**: Nitro server routes proxying Autodesk Platform Services APIs
- **PDF processing**: `pdf-lib` for merging, `archiver` for ZIP output
- **Auth**: Cookie-based APS OAuth 2.0 token storage

## TODO / Roadmap (sPrint 2.0)

- Standalone app packaging
- Analytics and telemetry
- Proactive workflow suggestions
- Markups support (known limitation — requires tokens)
- Collabed Models support (known limitation)
- Scheduled / automated printing
- Print configuration control
- Character recognition improvements
