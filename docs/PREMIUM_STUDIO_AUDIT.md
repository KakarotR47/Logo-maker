# Premium Branding Studio — Product Audit & Roadmap

This audit describes the repository as inspected on the `premium-brand-studio-overhaul` branch. It is a source review, not a claim that the application has been built, browser-tested, or deployed.

## Product direction

Evolve Forma Studio into a coherent brand-production workspace: discover a brand direction, create editable vector identity assets, apply them consistently to stationery and business cards, review realistic mockups, and deliver production-ready files. Every tool must have a clear input, output, and successful completion state.

## Existing capabilities worth preserving

- React + TypeScript studio with a layered SVG-oriented logo editor, selection, transforms, snapping, guides, alignment, grouping, boolean operations, clipping masks, text-to-path conversion, undo/redo, and multiple artboards/pages.
- Brand brief, concept directions, palettes, font pairings, template library, logo variations, monogram tools, and AI-assisted concept/symbol workflows.
- Brand kits, mockup previews, client presentation/share flow, project dashboard, and export package utilities.
- A substantial Visiting Card Atelier with front/back previews, card design/theme/border/corner choices, typography controls, contact and service content, decorative seals, QR code generation, logo synchronization, saved presets, PNG export, and vCard download.

These are real foundations; the product should integrate and polish them rather than replace them with a superficial feature list.

## Confirmed product risks from source inspection

### P0 — AI trust and reliability
- `server.ts` requests `gemini-4-hydrogen` for concept suggestions, remixes, and brand brainstorming. This model identifier should be validated against currently supported Gemini models; an unsupported model would make those real-AI paths fail.
- The app has fallback/demo generation paths in the client. Results need explicit provenance labels such as **AI-generated** and **Studio-generated**, and must never imply an AI request succeeded when it did not.
- AI routes accept user-supplied prompt and image payloads. Add input size/type validation, request timeouts, per-user/IP rate limiting, usage accounting, and safer error logging before public launch.
- Keep API keys server-side. Never ship provider keys to the browser.

### P0 — Monetization is currently a prototype
- `App.tsx` initializes `planTier` to `pro`.
- `ExportModal.tsx` also defaults its internal plan tier to `pro`.
- `PLAN_ENTITLEMENTS` is client-side configuration, and checkout is currently represented by optional configured checkout URLs.
- Client-side plan state is not authorization. A user can alter browser state. Real paid entitlements must be verified server-side against a billing provider webhook and an authenticated account.

Do not launch with a fake paywall or claim paid subscriptions are active until the complete server-side flow exists.

### P0 — Persistence and project safety
- `projectStorage.ts` stores projects and the active session in browser `localStorage`.
- This supports local drafts but not secure accounts, cross-device sync, cloud recovery, collaboration, or dependable backup.
- Add versioned project schemas, migrations, exportable backups, quota/error recovery, and (when accounts are introduced) server-side project storage with access controls.
- Multi-page logo documents should be persisted as a complete project, not silently reduced to only the active artboard.

### P1 — Visiting Card Atelier should become a first-class print product
- Preserve the existing detailed card design controls and live front/back presentation.
- Replace the current pre-filled sample business/contact details with a clean onboarding sample and an explicit “use sample data” option. Do not make one business's details look like a new customer's details.
- Add card-specific brand profiles and reusable contact/business data, front/back content validation, safe-area and bleed previews, trim/bleed export, CMYK/spot-foil guidance, font embedding/outline checks, and a print specification report.
- Add export presets for common physical card sizes and regional printer requirements. Let users choose dimensions and units; do not assume every printer uses one size.
- Validate QR payloads and provide a scan test/preview. Do not claim that decorative foil gradients are actual foil production data.
- Add a print-ready PDF workflow and a clear distinction between screen preview, raster proof, and vector/press-ready output.

### P1 — Design quality and workflow
- Create a consistent navigation model across Logo Editor, Brand System, Business Cards, Stationery, Mockups, and Deliverables.
- Add contextual onboarding, useful empty states, keyboard shortcuts, autosave recovery, version history, and clear unsaved/error states.
- Provide a Brand Consistency Inspector: logo variants, minimum size, clear space, contrast, palette usage, typography pairing, and misuse checks.
- Add asset management for logo variants, icon/favicons, social avatars/banners, letterhead, envelopes, email signatures, presentation covers, and brand guideline documents.
- Add robust file import validation and safe SVG sanitization before rendering or exporting user-supplied SVG.

## Premium feature tiers — proposed, not yet implemented

### Core
- Professional editable vector logo workspace
- Essential typography, palette, shapes, templates, and standard PNG exports
- Local projects and basic card design

### Pro
- Transparent and high-resolution exports, SVG/PDF deliverables, complete brand kits
- Expanded premium templates, typography and mockup scenes
- Multi-format business cards, print-ready proofs, brand guideline exports
- Version history, reusable brand assets, and expanded AI usage

### Studio / Agency
- Authenticated cloud workspace, multiple brands and client workspaces
- Shared libraries, review links, comments, approvals, version comparisons
- Team roles, client handoff, reusable templates, bulk asset exports
- Centralized billing, usage limits, audit trail, and priority processing

Entitlements must be enforced by the server and clearly disclose limits. Pricing should be decided only after provider costs, storage costs, support, and target market are understood.

## Delivery sequence

1. **Stabilize:** validate all model identifiers and API calls; label fallbacks; add request validation, rate limiting, and actionable errors; run TypeScript/build checks.
2. **Trustworthy documents:** fix project/page persistence, schema versioning, backup/restore, SVG sanitization, export validation, and accessibility.
3. **Business card production:** clean onboarding defaults; reliable front/back editing; size presets; bleed/safe areas; print PDF and proof checks; QR validation; brand sync.
4. **Brand system:** consistency checker, full asset library, stationery/social collateral, and guidelines.
5. **Accounts and cloud:** authentication, secure project database, asset storage, restore, and collaboration.
6. **Real premium billing:** checkout, verified webhooks, server-side entitlements, usage metering, cancellation/refund handling, and customer portal.
7. **Launch readiness:** automated tests, browser QA at desktop/tablet/mobile sizes, performance, security review, backups, monitoring, and deployment documentation.

## Acceptance criteria

- Every visible control performs a real action or is removed/disabled with a clear explanation.
- AI and fallback results are distinguishable; failed AI calls never masquerade as success.
- No user can unlock paid features by changing frontend state.
- A project can be exported and restored without losing pages or assets.
- Business-card exports match the selected physical dimensions and include explicit bleed/safe-area settings.
- QR codes scan correctly; contact data and spelling are validated.
- Build, lint/typecheck, unit tests, and critical browser workflows pass before release.

## Scope and safety

Work on this branch only until reviewed. Do not overwrite the default branch. Do not add authentication, paid billing, cloud storage, or AI provider integrations as visual-only placeholders. Any service requiring credentials or an account must have a real configuration and verification path before it is described as working.
