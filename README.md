# IslaSource Seafoods admin

Standalone Next.js 16.4.6 / React 19 admin workspace with Laravel Sanctum bearer authentication and an API-backed product catalog. Other business screens still use local sample data and browser storage. DM Sans and DM Serif Display are supplied locally; no remote font request is required to build.

```powershell
npm install
npm run dev
```

Start Laravel at http://127.0.0.1:8000 and create your admin with `php artisan admin:create` from the API folder. Open http://localhost:3001/login and sign in using that account. The old demo entry has been removed.

`NEXT_PUBLIC_API_URL` defaults to `http://127.0.0.1:8000/api/v1`; a matching `.env.example` is supplied. To use another API endpoint, put the value in `.env.local` and restart development or rebuild production. The API's `ADMIN_APP_URL` must match the browser origin exactly (default `http://localhost:3001`). Dev and production-start scripts default to port 3001.

Tokens and expiry use tab-scoped sessionStorage. Refresh verifies the saved token at `/admin/auth/me` before rendering the workspace; returning to the tab rechecks access. Invalid/expired tokens require sign-in, and logout revokes the current token and clears local auth even if the server is unreachable. A failed server logout is explained on the sign-in page. Blocked storage falls back to memory until reload. Requests use `Authorization: Bearer`, `credentials: omit`, no-store and no redirects. There are no authentication cookies, persisted passwords or localStorage tokens.

The authenticated API user supplies the sidebar name and avatar. `useAuth().request<T>()` attaches the current bearer token for future protected API features and invalidates the session on 401. Permission-only 403 errors do not log out an otherwise valid session. Internal login return destinations are validated; external redirect targets are rejected.

Products save to Laravel and survive browser changes. Sample RFQs, quotations, orders, suppliers and settings still use localStorage. Their old product fixtures are retained for those sample relationships and are not imported into the database. The real catalog starts empty until an admin adds products. Contact and search-preview domains ending in `.example` are prototype placeholders.

## Product catalog

The product list uses server-side search, category/publication filters and 15-row pagination. Add/edit forms persist descriptions/specifications, unit/minimum quantity, availability notes, publication/indexability, slug, meta title/description, OG title/description/image, image alt and optional canonical URL. Save feedback and inline validation reflect API responses. There are no fixed-price or guaranteed-stock inputs.

Primary and sharing images accept JPG/PNG/WebP up to 5 MB. The API validates actual file content and stores generated filenames on its public disk; run `php artisan storage:link` from the API once. Supplied photos remain available. Uploaded images resolve only against the configured API origin and its products upload directory; they are served directly with `next/image` unoptimized so loopback API images do not pass through the optimization proxy. Both services should use HTTPS in production.

Archive is recoverable, keeps slug reservations and does not delete shared images. Use **Archived products** in the list to restore records. Editing a slug retains prior names for later public redirect resolution; another product cannot claim them. Storefront wiring remains a separate step, so saving Published does not update the current public prototype yet.

Unassociated uploads are retained if an edit is canceled. No automatic upload cleanup or destructive file deletion job is installed in this phase.

## Routes and actions

| Route                                | Demo behavior                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                             | Real Laravel admin sign-in, field validation feedback, pending state and auth errors                                                                 |
| `/`                                  | Overview, request activity, attention links, latest requests                                                                                         |
| `/rfqs` and `/rfqs/[id]`             | Search/filter requests, compare/select supplier offers, add private notes, open/prepare quote                                                        |
| `/quotations` and `/quotations/[id]` | Search/filter quotes, calculate draft pricing, private breakdown, customer preview, simulate sending and acceptance, create draft revisions          |
| `/orders` and `/orders/[id]`         | Search/filter orders, demo payment ledger, processing/packed/dispatched/completed progress, timeline                                                 |
| `/products` and `/products/[id]`     | API catalog search/filter/page, add/edit with image uploads and SEO previews, archive/restore                                                       |
| `/suppliers`                         | Private searchable directory with native add/edit dialogs                                                                                            |
| `/settings`                          | Save business details, validity in days and deposit defaults; restore settings or reset all sample records                                           |

The sidebar, global workspace search, notification links and mobile navigation are interactive. All admin routes inherit `noindex, nofollow` metadata. Product indexability fields describe a future storefront product only; the admin remains noindex.

## Replay the main journey

1. Sign in and open `RFQ-2026-001` for Maia Reyes.
2. Select Isla North Seafoods at ₱500/kg. The 5kg draft updates to the selected offer; sent/accepted quotations stay unchanged.
3. Open `QT-2026-001`: ₱2,500 cost + ₱200 handling + 20% markup (₱540) = ₱3,240 subtotal. Add ₱350 delivery for **₱3,590 total**, with **₱1,795 deposit** and **₱1,795 balance**.
4. Open the customer preview: it contains selling amounts, delivery and terms. Supplier costs, markup and internal notes are absent.
5. Simulate sending, then simulate customer acceptance to create a sample order. Sent/accepted quotes are read-only; **Create revision** creates a separate draft.
6. Record a demo payment and progress the order through packing, dispatch and completion. No real funds or messages move.
7. Add/edit a real catalog product’s name, slug, images and SEO, save, and return to the API-backed list to see persisted changes. Sample supplier/settings edits remain browser-local.
8. In Settings, **Reset demo workspace** restores the original browser-local sample records while keeping your API sign-in active.

## Verification

```powershell
npm test
npm run lint
npm run build
```

Built-in Node tests cover auth requests, restoration, expiry, revocation/local cleanup, stale responses, storage failures and safe return URLs, plus quotation calculations and branding migration. Product checks cover request payloads, validation feedback, archive/restore, multipart uploads, safe image URLs, slug/category search matches and modal cancellation. Node 22.18+ or 24 supports the TypeScript imports; Node may print a harmless module-detection warning. No test framework or auth dependency was added.

## Production boundary

Authentication and products use the live Laravel API. RFQs, quotations, orders, suppliers, settings and the manual payment ledger remain sample features; their writes do not reach Laravel yet. Client route handling is an interface boundary; Laravel authentication and policies protect each real API resource. Live messaging, PayMongo payments and their verified/idempotent webhooks remain separate phases.

Money is represented as integer centavos, with markup consistently applied to supplier cost plus handling before delivery. Quantity and pricing inputs are validated. Quote validity defaults are copied into new drafts; changing Settings does not alter saved quotation terms. The demo is intentionally browser-local and independent of the public storefront. See `public/ASSET-CREDITS.md` for supplied asset sources.
