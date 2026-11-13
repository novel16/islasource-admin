# Bantayan Seafoods admin prototype

Standalone Next.js 16.4.6 / React 19 admin workspace. It uses local sample data and browser storage; it does not call Laravel or a payment provider. DM Sans and DM Serif Display are supplied locally. No remote font request is required to build.

```powershell
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001/login and choose **Enter demo workspace**. The demo gate records a sessionStorage boolean and collects no credentials. It is a UI demonstration, not authentication or production access control. Logout clears that flag. Saved edits use localStorage and survive navigation/reloads in this browser.

## Routes and actions

| Route                                | Demo behavior                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                             | Explicit demo notice and workspace entry                                                                                                             |
| `/`                                  | Overview, request activity, attention links, latest requests                                                                                         |
| `/rfqs` and `/rfqs/[id]`             | Search/filter requests, compare/select supplier offers, add private notes, open/prepare quote                                                        |
| `/quotations` and `/quotations/[id]` | Search/filter quotes, calculate draft pricing, private breakdown, customer preview, simulate sending and acceptance, create draft revisions          |
| `/orders` and `/orders/[id]`         | Search/filter orders, demo payment ledger, processing/packed/dispatched/completed progress, timeline                                                 |
| `/products` and `/products/[id]`     | Search/filter catalog, add via `/products/new`, edit content/specifications and SEO, image selection, live search/social preview, save to local list |
| `/suppliers`                         | Private searchable directory with native add/edit dialogs                                                                                            |
| `/settings`                          | Save business details, validity in days and deposit defaults; restore settings or reset all sample records                                           |

The sidebar, global workspace search, notification links and mobile navigation are interactive. All admin routes inherit `noindex, nofollow` metadata. Product indexability fields describe a future storefront product only; the admin remains noindex.

## Replay the main journey

1. Enter the demo and open `RFQ-2026-001` for Maia Reyes.
2. Select Isla North Seafoods at ₱500/kg. The 5kg draft updates to the selected offer; sent/accepted quotations stay unchanged.
3. Open `QT-2026-001`: ₱2,500 cost + ₱200 handling + 20% markup (₱540) = ₱3,240 subtotal. Add ₱350 delivery for **₱3,590 total**, with **₱1,795 deposit** and **₱1,795 balance**.
4. Open the customer preview: it contains selling amounts, delivery and terms. Supplier costs, markup and internal notes are absent.
5. Simulate sending, then simulate customer acceptance to create a sample order. Sent/accepted quotes are read-only; **Create revision** creates a separate draft.
6. Record a demo payment and progress the order through packing, dispatch and completion. No real funds or messages move.
7. Edit a product’s name, slug and SEO, save, and return to the list to see persisted changes. Try supplier add/edit and workspace settings.
8. In Settings, **Reset demo workspace** restores the original browser-local sample records while keeping demo login active.

## Verification

```powershell
node --test tests/quote.test.mjs
npm run lint
npm run build
```

The built-in Node test checks the exact reference quotation, fractional quantity rounding, balanced deposit/remainder, and invalid/negative/nonfinite inputs. Node 22.18+ or 24 supports the TypeScript import used by this framework-free test. Node may print a harmless module-detection warning for the imported `.ts` file.

## Production boundary

No live backend, real credentials, authentication cookies, messaging, PayMongo API calls or payment QR codes are implemented. Laravel will provide API validation and policies. Planned authentication is Sanctum bearer tokens, not cookie/session login. Live payments must be confirmed by verified, idempotent API webhooks. The current sample fixtures, storage gate and manual demo ledger are unsuitable for production data.

Money is represented as integer centavos, with markup consistently applied to supplier cost plus handling before delivery. Quantity and pricing inputs are validated. Quote validity defaults are copied into new drafts; changing Settings does not alter saved quotation terms. The demo is intentionally browser-local and independent of the public storefront. See `public/ASSET-CREDITS.md` for supplied asset sources.
