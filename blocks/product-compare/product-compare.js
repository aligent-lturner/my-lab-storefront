import { search } from '@dropins/storefront-product-discovery/api.js';
import { Image, PriceRange, provider as UI } from '@dropins/tools/components.js';
import { readBlockConfig } from '../../scripts/aem.js';
import { getProductLink } from '../../scripts/commerce.js';

// Sets the Catalog Service endpoint used by search()
import '../../scripts/initializers/search.js';

const MAX_SKUS = 3;
const IMAGE_WIDTH = 300;
const EMPTY_VALUE = '—';

// search() emits search/loading, search/result and search/error on the event
// bus. A dedicated scope namespaces them (e.g. "product-compare/search/result")
// so the Product List Page block and SearchResults container on the same page
// — which listen on the unscoped events — don't react to this fetch.
const SEARCH_SCOPE = 'product-compare';

/**
 * Splits an authored comma-separated value into a trimmed, de-blanked list.
 * readBlockConfig returns a string for a single paragraph, or an array of
 * strings when the author puts each value in its own paragraph — handle both.
 * @param {string|string[]|undefined} raw
 * @returns {string[]}
 */
function parseList(raw) {
  const values = Array.isArray(raw) ? raw : [raw ?? ''];
  return values
    .flatMap((value) => String(value).split(','))
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Fetches products for the given SKUs and reports which ones weren't found.
 * @param {string[]} skus
 * @returns {Promise<Map<string, object>>} lower-cased SKU → product
 */
async function fetchProducts(skus) {
  const { items = [] } = await search(
    {
      phrase: '',
      filter: [{ attribute: 'sku', in: skus }],
      pageSize: skus.length,
    },
    { scope: SEARCH_SCOPE },
  );
  // Case-insensitive — authors may not match the catalog's casing.
  return new Map(items.map((item) => [item.sku.toLowerCase(), item]));
}

/**
 * Resolves final min/max price for simple (price) and complex (priceRange)
 * products. PriceRange takes plain numbers, not the ProductViewPrice objects.
 */
function getPriceProps(product) {
  const simple = product.price?.final?.amount;
  const min = product.priceRange?.minimum?.final?.amount ?? simple;
  const max = product.priceRange?.maximum?.final?.amount ?? simple;
  if (min?.value == null) return null;
  return {
    currency: min.currency,
    minimumAmount: min.value,
    maximumAmount: max?.value ?? min.value,
  };
}

/**
 * Finds an attribute by authored name, matching either the attribute code
 * (e.g. "material") or its storefront label (e.g. "Material").
 */
function findAttribute(product, authoredName) {
  const key = authoredName.toLowerCase();
  return product.attributes?.find(
    (attr) => attr.name?.toLowerCase() === key || attr.label?.toLowerCase() === key,
  );
}

function formatAttributeValue(value) {
  if (value == null || value === '') return EMPTY_VALUE;
  if (Array.isArray(value)) return value.length ? value.join(', ') : EMPTY_VALUE;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  // Structured attributes (e.g. ac_inventory) have no meaningful text form
  if (typeof value === 'object') return EMPTY_VALUE;
  return String(value);
}

function createCell(tag, text, className) {
  const cell = document.createElement(tag);
  if (className) cell.className = className;
  if (text != null) cell.textContent = text;
  return cell;
}

function createNotFoundCell(sku) {
  const cell = createCell('td', null, 'product-compare__not-found');
  cell.textContent = `Product not found (${sku})`;
  return cell;
}

/**
 * Builds the comparison table. One column per authored SKU (in authored
 * order), one row per attribute. Missing SKUs get a "not found" cell spanning
 * all body rows in their column.
 */
function buildTable(skus, productsBySku, attributeNames) {
  const columns = skus.map((sku) => ({ sku, product: productsBySku.get(sku.toLowerCase()) }));
  const renders = [];

  const table = document.createElement('table');
  table.className = 'product-compare__table';

  // Header row: product names (linked) as column headers
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const corner = createCell('td', null, 'product-compare__corner');
  headRow.append(corner);
  columns.forEach(({ sku, product }) => {
    const th = createCell('th', null, 'product-compare__product-heading');
    th.scope = 'col';
    if (product) {
      const link = document.createElement('a');
      link.href = getProductLink(product.urlKey, product.sku);
      link.textContent = product.name;
      th.append(link);
    } else {
      th.textContent = sku;
    }
    headRow.append(th);
  });
  thead.append(headRow);

  const rows = [
    {
      label: 'Image',
      render: (product, cell) => {
        const url = product.images?.[0]?.url;
        if (!url) {
          cell.textContent = EMPTY_VALUE;
          return;
        }
        renders.push(UI.render(Image, {
          src: url,
          alt: product.name,
          loading: 'lazy',
          width: IMAGE_WIDTH,
          height: IMAGE_WIDTH,
          params: { width: IMAGE_WIDTH },
        })(cell));
      },
    },
    { label: 'Name', render: (product, cell) => { cell.textContent = product.name; } },
    {
      label: 'Price',
      render: (product, cell) => {
        const priceProps = getPriceProps(product);
        if (!priceProps) {
          cell.textContent = EMPTY_VALUE;
          return;
        }
        renders.push(UI.render(PriceRange, priceProps)(cell));
      },
    },
    ...attributeNames.map((name) => ({
      label: name,
      render: (product, cell) => {
        const attr = findAttribute(product, name);
        cell.textContent = formatAttributeValue(attr?.value);
      },
    })),
  ];

  const tbody = document.createElement('tbody');
  rows.forEach(({ label, render }, rowIndex) => {
    const tr = document.createElement('tr');
    const th = createCell('th', label);
    th.scope = 'row';
    tr.append(th);

    columns.forEach(({ sku, product }) => {
      if (product) {
        const td = document.createElement('td');
        render(product, td);
        tr.append(td);
      } else if (rowIndex === 0) {
        // One cell spanning the whole column, rather than one per row
        const td = createNotFoundCell(sku);
        td.rowSpan = rows.length;
        tr.append(td);
      }
    });
    tbody.append(tr);
  });

  table.append(thead, tbody);
  return { table, renders };
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const parsedSkus = parseList(config.skus);
  const attributeNames = parseList(config.attributes);

  if (parsedSkus.length > MAX_SKUS) {
    // eslint-disable-next-line no-console
    console.warn(
      `product-compare: ${parsedSkus.length} SKUs authored, only the first ${MAX_SKUS} will be compared.`,
      parsedSkus,
    );
  }
  const skus = parsedSkus.slice(0, MAX_SKUS);

  block.textContent = '';

  const showMessage = (text) => {
    const message = createCell('p', text, 'product-compare__message');
    block.append(message);
  };

  if (!skus.length) {
    showMessage('No products configured for comparison.');
    return;
  }

  let productsBySku;
  try {
    productsBySku = await fetchProducts(skus);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('product-compare: product search failed', error);
    showMessage('Unable to load products for comparison.');
    return;
  }

  const missingSkus = skus.filter((sku) => !productsBySku.has(sku.toLowerCase()));
  if (missingSkus.length) {
    // eslint-disable-next-line no-console
    console.warn('product-compare: no matching product for SKUs', missingSkus);
  }

  const { table, renders } = buildTable(skus, productsBySku, attributeNames);

  // Horizontal scroll container so the table never overflows on mobile
  const wrapper = document.createElement('div');
  wrapper.className = 'product-compare__scroll';
  wrapper.tabIndex = 0;
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', 'Product comparison');
  wrapper.append(table);
  block.append(wrapper);

  await Promise.all(renders);
}
