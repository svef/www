# Event screens

Full-screen pages shown on a display at an SVEF event — a looping film with a
bar along the bottom naming the event and its sponsors. They are not part of the
site: nothing links to them, they carry no chrome, and they are kept out of
search by an `X-Robots-Tag` header set for `/skjar/*` in `next.config.ts`.

They live in `public/` as plain static files on purpose. A screen has to survive
an evening unattended on someone's laptop with no build step, no CMS round trip
and nothing to go stale, and a static file is the version of that with the
fewest moving parts.

**One file per event**, named after it — `svef-x-aranja.html`. A past event's
screen stays; it costs nothing and is the starting point for the next one.

The folder is public and so is this repository, so the URL is obscure rather
than secret. Nothing here should be anything that matters if it is found.

## Making the next one

Copy the newest file, point `<video>` at the new film, and swap the title and
the sponsor logos. The knobs for the bar's type and logo sizes are the custom
properties at the top of the stylesheet; the comments there say what each does
and why the video is `object-fit: cover`.

Type is **Archivo**, the site's own face, loaded from Google Fonts. The original
screens were set in Roc Grotesk, which is licensed — do not commit that font, or
any other licensed font, to this repository.
