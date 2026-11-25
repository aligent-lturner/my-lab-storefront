# Requirements: Reassurance panel — slots vs. block

## Request
Could the reassurance panel be done with drop-in slots and configuration alone? Identify anything substituted/replaced that a slot would cover, and show the lighter version.

## Project state (fallback analysis — Dropins AI tools unavailable)
- `@dropins/storefront-cart` 3.4.1
- Reassurance panel: standalone content block `blocks/reassurance-panel/` (+ UE model). **Not referenced by `commerce-cart`, `commerce-mini-cart`, or any drop-in container/slot.**
- `commerce-cart` config keys (README): hide-heading, max-items, hide-attributes, enable-item-quantity-update, enable-item-remove, enable-estimate-shipping, start-shopping-url, checkout-url, enable-updating-product, undo-remove-item. None render authored content.

## Verified slots (from `scripts/__dropins__/storefront-cart/containers/*.d.ts`)
| Container | Slots | Fit for a reassurance panel |
|---|---|---|
| OrderSummary | EstimateShipping, Coupons, GiftCards | Poor — feature-specific; already used by `commerce-cart` (EstimateShipping is conditionally replaced) |
| CartSummaryList | Heading, EmptyCart, Footer, RowTotalFooter, Thumbnail, ProductAttributes, CartSummaryFooter, CartItem, UndoBanner, ConfirmDeleteBanner, … | `Footer` is per line item (`ctx.item` in commerce-cart) → would repeat per product. `CartSummaryFooter` context not yet verified. |
| MiniCart | ProductList, ProductListFooter, PreCheckoutSection, … | `PreCheckoutSection` is plausible for a mini-cart placement; context not yet verified. |

## Findings
1. Nothing was substituted for a slot — the block touches no drop-in.
2. Configuration alone: **not possible** — no cart config renders arbitrary content.
3. Slots alone: possible only by adding code to `commerce-cart.js` (or mini-cart), with content hardcoded or pulled from placeholders. Loses author editing/UE model, and edits a boilerplate-owned block (upgrade merge cost).
4. Lightest option: author the existing `reassurance-panel` block in the cart page document below `commerce-cart` — zero code change.

## Open questions
1. Is there a cart diff I haven't seen (e.g. on `agent/cart-delivery-estimate`) that places the panel inside the cart?
2. Where must it appear: below the whole cart, inside the order-summary column, or in the mini-cart?
3. Must authors keep editing the content (block), or is fixed/placeholder text acceptable (slot)?

## Phase 1: Complete ✅
Date: 2026-11-24
