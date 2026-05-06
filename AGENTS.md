# AGENTS.md

This repository contains a multilingual Next.js tool gallery. Follow the existing implementation patterns in `src/app/[lang]/tools`, keep edits scoped, and prefer local browser-side processing for user files.

## Tool Cover Artwork Rules

When creating or updating tool cover images for `project.js`, keep the visual style consistent with the existing PDF and utility tool covers:

1. Use a 1600 x 900 canvas with a light neutral background, one soft outer frame, and one white inner surface.
2. Keep the layout as a product cover, not a poster. The composition should read clearly at small card sizes.
3. Reserve the top-left area for:
   - a compact blue badge strip
   - one small accent dot
   - the tool title
   - one short subtitle line
4. Build the main visual from 2-3 large panels or objects that explain the tool action at a glance. Prefer document, image, spreadsheet, or UI-card metaphors over decorative illustration.
5. Use the same restrained palette family as existing covers:
   - base neutrals: `#F8FAFC`, `#E2E8F0`, `#FFFFFF`
   - primary blue accents: `#2563EB`, `#DBEAFE`, `#93C5FD`
   - optional success green or warning red only when the tool meaning needs it
6. Avoid dense paragraphs, marketing copy, and tiny labels. Any visible text inside the artwork should be very short and survive thumbnail scaling.
7. Prefer rounded rectangles, simple icon-like shapes, and strong visual comparison states such as before/after, input/output, or source/result.
8. The artwork should feel calm, utilitarian, and consistent across English and Chinese versions. Change only the visible language text, not the layout system.
9. Save new source assets in `public/` and wire CDN URLs from `src/app/config/project.js`.

## PDF Tool Cover Layout

For PDF-family tools specifically, use this default structure unless the tool needs a better metaphor:

1. Left panel: source document or problem state.
2. Center panel or symbol: transformation action.
3. Right panel: fixed/exported result.
4. Keep document shapes upright, large, and centered within each panel.
5. Make the transformation obvious from shape, rotation, layering, watermark, signature, numbering, or protection cues instead of long explanations.
