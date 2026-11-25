import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// Rendered icon box size in CSS pixels; keep in sync with --reassurance-icon-size.
const ICON_SIZE = 48;

/**
 * Builds a fixed-size icon element from an authored picture or :icon: span.
 * Explicit width/height reserve the space before the image loads (no CLS).
 * @param {Element} source picture, img or span.icon found in the row
 * @returns {HTMLElement|null}
 */
function buildIcon(source) {
  if (!source) return null;
  const img = source.tagName === 'IMG' ? source : source.querySelector('img');
  if (!img) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'reassurance-panel-icon';

  let icon;
  // SVGs (incl. decorated :icon: spans) don't need responsive renditions.
  if (source.matches('span.icon') || /\.svg(\?|$)/i.test(img.getAttribute('src') || '')) {
    icon = img;
  } else {
    icon = createOptimizedPicture(img.src, img.alt, false, [{ width: String(ICON_SIZE * 2) }]);
  }

  const iconImg = icon.tagName === 'IMG' ? icon : icon.querySelector('img');
  // Keep the Universal Editor anchor (data-aue-prop="image") on the rendered img.
  if (source !== iconImg) moveInstrumentation(source, iconImg);
  if (img !== iconImg) moveInstrumentation(img, iconImg);
  iconImg.width = ICON_SIZE;
  iconImg.height = ICON_SIZE;
  iconImg.loading = 'lazy';
  // Icons are decorative; the heading carries the meaning.
  iconImg.alt = '';

  wrapper.append(icon);
  return wrapper;
}

/**
 * Collects the text-bearing elements of a row, in order. Each entry is the
 * element holding the text plus its enclosing cell, so instrumentation on
 * either can be moved onto the rendered element.
 * Supports separate cells (icon | heading | text) or one cell with a heading
 * and a paragraph.
 * @param {Element} row
 * @returns {{ el: Element, cell: Element, text: string, isHeading: boolean }[]}
 */
function collectTextParts(row) {
  return [...row.children].flatMap((cell) => {
    const parts = [...cell.querySelectorAll('h1, h2, h3, h4, h5, h6, p')];
    const els = parts.length ? parts : [cell];
    return els.map((el) => ({
      el,
      cell,
      text: el.textContent.trim(),
      isHeading: /^H[1-6]$/.test(el.tagName),
    }));
  }).filter((part) => part.text);
}

/**
 * Creates an element for a text part and carries over UE instrumentation from
 * both the source element and its cell (UE may instrument either).
 * @param {string} tag
 * @param {string} className
 * @param {{ el: Element, cell: Element, text: string }} part
 * @returns {HTMLElement}
 */
function buildTextElement(tag, className, part) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = part.text;
  moveInstrumentation(part.cell, node);
  moveInstrumentation(part.el, node);
  return node;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'reassurance-panel-list';

  [...block.children].forEach((row) => {
    const parts = collectTextParts(row);
    const headingPart = parts.find((p) => p.isHeading) || parts[0];
    const textPart = parts.find((p) => p !== headingPart);
    const iconSource = row.querySelector('picture, span.icon, img');

    // Skip rows with no text. In the editor, keep them so a freshly added
    // item stays selectable while the author fills it in.
    const instrumented = row.hasAttribute('data-aue-resource');
    if (!headingPart && !instrumented) return;

    const item = document.createElement('li');
    item.className = 'reassurance-panel-item';
    moveInstrumentation(row, item);

    const icon = buildIcon(iconSource);
    if (icon) item.append(icon);

    const body = document.createElement('div');
    body.className = 'reassurance-panel-body';
    if (headingPart) body.append(buildTextElement('h3', 'reassurance-panel-heading', headingPart));
    if (textPart) body.append(buildTextElement('p', 'reassurance-panel-text', textPart));

    item.append(body);
    list.append(item);
  });

  block.replaceChildren(list);
}
