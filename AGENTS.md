<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# IslaSource Seafoods — admin

## Required workflow
- Use the installed **Ponytail** skill for all coding, refactoring, dependency choices, and reviews. Read its current `SKILL.md`; reuse existing code/dependencies and prefer native features over unnecessary libraries.
- Use the installed **Superpowers** skills relevant to the task: `using-superpowers`, `brainstorming` when scope is unclear, `systematic-debugging`, `dispatching-parallel-agents` for isolated tasks, and `verification-before-completion`. Discover current installed skill paths rather than hardcoding plugin versions.
- User instructions take precedence. Explicitly requested prototypes may use simulated authentication and data; label these honestly and do not claim production security.
- Preserve existing user changes. Run the app's lint/build checks and relevant interaction checks before claiming completion.

## Scope and architecture
- The brand is **IslaSource Seafoods**, a seafood sourcing and resale business based in Bantayan Island. Use the brand consistently in the workspace, quotation previews, and SEO defaults. Preserve existing demo data when updating old branding.
- This is a standalone Next.js admin app. `../frontend` is the public guest storefront; `../api` is Laravel. Keep the three-folder architecture.
- Only admin requires authentication. Future API authentication is **Sanctum bearer tokens**, without cookie/session-based login. Never put provider secrets in this app or `NEXT_PUBLIC_*` variables.
- Prototype auth is an explicitly labeled demo gate, not real authorization. Production access control belongs in Laravel policies in addition to UI route handling.
- Manage RFQs, supplier sourcing, quote revisions, accepted orders, payments, products, suppliers, and SEO settings. Supplier accounts and marketplace commissions are out of scope.
- Supplier costs, markup, and internal notes are admin-only. Customer quotation previews show only agreed selling prices and customer-facing terms.
- Use integer centavos for money. Distinguish markup from margin and show cost, markup, delivery, total, deposit, and balance clearly.
- PayMongo QR Ph is the planned provider. Prototype payment actions are simulated; production payment confirmation must come from verified, idempotently processed API webhooks.

## Next.js/component practice
- Use App Router and TypeScript; read `node_modules/next/dist/docs/` for this installed Next.js version.
- Use Server Components by default and focused Client Components for interactive behavior. Keep layouts and route files small.
- Reuse app shell, sidebar/navigation, page headers, buttons, badges, stat cards, form fields, data tables, dialogs, and empty states where repetition exists.
- Keep primitives in `components/ui`, feature components in `components`, and types/fixtures/calculations in `lib`; do not build a single monolithic dashboard component.
- Prefer `next/link`, `next/image`, native forms and controls, typed data, and existing dependencies. Do not create a new shared package across the three folders for hypothetical reuse.
- Ensure keyboard support, input labels, focus visibility, responsive mobile navigation, and feedback for saves/errors. Buttons and navigation must have meaningful behavior.
- Set all admin routes to `noindex, nofollow`.
- Product/category/page editing must support `slug`, `meta_title`, `meta_description`, OG fields and indexability, with a search-result preview. Distinguish content description from meta description.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
