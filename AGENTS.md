# Working on Erlen Slides

This is the standalone scientific presentation editor, licensed AGPL-3.0-only. Read README.md and docs/desarrollo.md before editing. Preserve a complete local editor without subscriptions.

Do not bring production credentials, cloud configuration, private research, other suite editors or unrelated operational documents into this public repository. Keep original and third-party license notices.

Preserve JSON v1 compatibility, blank new slides, explicit save failures, and immutable scientific source data. Examples must label illustrative data and must not invent research claims or citations. Read src/js/_orden.txt before changing module dependencies.

Run npm run build and relevant tests. When examples change, regenerate with npm run examples. Inspect rendered results for visual changes. JSDOM geometry is simulated; do not report it as browser validation.

Publicación: un tag `v<versión>` lanza `.github/workflows/release.yml` (workflow «Publish release»), que crea la release y avisa a erlen-suite (docs/actualizacion-automatica.md del portal). Requiere el secreto `ERLEN_SUITE_TOKEN`.
