# Erlen Slides: Scientific presentations

An open-source, browser-based scientific presentation editor. Spanish interface; no account required. Includes LaTeX equations, chemical reactions and structures, editable charts with error bars and logarithmic axes, tables, presenter tools, local recovery, and JSON/PDF/PPTX/Beamer/HTML export workflows.

![Editor](images/editor.png)

Download the ready-to-use web archive from [Releases](https://github.com/jorgegonzalezsevilla/erlen-slides/releases), or run `npm ci`, `npm run build`, `npm test`, and `npm start` with Node.js 22+. Open `http://127.0.0.1:8130`.

The standalone offline HTML supports core editing. The optional RDKit/Kekule/3Dmol/Plotly tools need the full archive served through HTTP, which may be entirely local. Crossref and Zotero Web are optional network actions. There is no bundled production account, telemetry configuration, billing or real-time collaboration.

Twelve [worked examples](../examples/README.md) provide 72 editable slides, JSON projects and Beamer sources. All numerical data are illustrative, not observations or reported scientific discoveries. Beamer compilation and pixel-identical rendering in every PowerPoint version are not certified.

License: **AGPL-3.0-only**, with separately licensed third-party components. See [notices](../THIRD_PARTY_NOTICES.md). Citation metadata are in [CITATION.cff](../CITATION.cff). A Zenodo DOI will be added only after a confirmed deposit.
