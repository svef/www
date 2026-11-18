# Vendored third-party bundles

## `award3d.js`

The Icelandic Web Awards trophy in 3D. It is the designer's prebuilt bundle from the
redesign export (`assets/js/award3d.js`, loaded there as `?v=20261026`). It holds
[three.js](https://threejs.org) (MIT, copyright 2010-2024 three.js Authors; the licence
notice is kept at the end of the file) and the procedural trophy, and exposes
`window.SVEFAward.mount(el)`. It is procedural and loads no external assets.

It is **not built from source in this repository** and `three` is not a dependency. To
update it, replace the file with a newer export build and re-check the trophy in the footer.

It is only ever loaded by `src/components/Trophy/`, on the client, when the trophy nears
the viewport, and never under `prefers-reduced-motion`.
