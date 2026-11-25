# Reassurance Panel

Content block that shows short trust messages (e.g. returns, warranty, support), each with an icon, a heading and one line of text.

## Authoring

| Reassurance Panel |  |  |
|---|---|---|
| *icon image* | Free 30-day returns | Changed your mind? Send it back free of charge. |
| :heart: | 2-year warranty | Every product is covered against manufacturing defects. |
| *icon image* | Expert support | Talk to our team 7 days a week. |

- One row per item. Three items is the intended layout, but any number renders.
- Icon cell: an image, or an `:icon-name:` from `/icons`. Optional — rows without an icon render text only.
- Heading and text may also be authored in a single cell as a heading followed by a paragraph.
- Rows with no text are skipped.

## Universal Editor

Model fragment: `_reassurance-panel.json`, merged into the root `component-*.json` files by `npm run build:json` (also run by the pre-commit hook when any `_*.json` file is staged).

- **Reassurance Panel** (`reassurance-panel`) is a container whose filter only allows **Reassurance Item** children.
- **Reassurance Item** (`reassurance-panel-item`) fields: `image` (Icon, asset reference), `heading` (text), `text` (text).
- Three items is the intended layout, but filters can't limit the number of children, so authors add three items themselves and the block renders however many there are.
- `decorate()` calls `moveInstrumentation()` so the editor's `data-aue-*` anchors move from the authored row, image and text cells to the rendered `li`, `img`, `h3` and `p`. Empty items are kept while editing so they stay selectable.

## Behaviour

- Mobile/tablet (< 900px): items stack vertically. Desktop (≥ 900px): three equal columns in a row.
- Icons render in a fixed 48×48 box with explicit `width`/`height`, so the layout does not shift while images load. Size is controlled by `--reassurance-icon-size`.
- Icons are treated as decorative (`alt=""`); the heading carries the meaning.
- Headings render as `h3`.
- No drop-ins, events or external calls.
