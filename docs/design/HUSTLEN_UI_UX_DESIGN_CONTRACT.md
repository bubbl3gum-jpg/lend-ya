# Hustlen’ — Mandatory UI/UX Design Contract

**Authority:** product-owner instruction, 26 October 2026. Applies to Batch 11A and every subsequent public and Admin UI implementation. This supersedes generic “modern”, “minimal”, “SaaS dashboard” or “luxury” styling instructions. Written contract is authoritative where original approved reference artwork is unavailable. Product-owner visual approval is required before wider marketplace rollout; a working theme toggle is not visual acceptance.

## Identity: Balanced Agricultural Luxury

A premium vintage agricultural catalogue brought to life through contemporary interactive technology. Heritage must shape structure, not be an antique skin over a SaaS dashboard. Draw on historic seed and agricultural catalogues, botanical engravings, heritage publishing, craftsmanship and carefully composed luxury print publications. Retain a functional responsive contemporary marketplace.

## Material and texture

Visibly present, restrained paper grain, parchment variation, printed-ink character, occasional etched linework, archival rules and quiet material transitions. Centralize reusable tokens, overlays or optimized assets. Keep dense controls and functional surfaces clean. No fake marble, exaggerated distressed edges, dirty-paper grunge, generic gold gradients, excessive shadows or unrelated scattered effects.

## Typography and composition

Characterful refined serifs for major editorial headings; legible supporting fonts for navigation, descriptions, controls, forms, tables and operational information. Strong hierarchy, controlled spacing, balanced asymmetry, fine dividers, meaningful archival labels/numbering, intentionally placed illustrations and descriptive content. Avoid overcrowding with display typography.

## Color, surface and depth

Warm archival paper, agricultural greens, rich ink and restrained complementary accents in light mode. Deep charcoal/forest surfaces and warm muted foregrounds reinterpret the same identity in dark mode. Use layered tones, fine borders, subtle lighting and controlled highlights/small shadows. No glossy gold, flashy gradients, glassmorphism or large floating SaaS panels. Preserve functional status colors and recognizable Taipei MRT line distinctions.

## Components and layout

Prefer editorial section headers, product/listing panels, ruled groups, catalogue records, restrained illustration, paper content surfaces, readable form sections and purposeful contextual navigation. Do not repeat generic rounded cards everywhere. Account Settings is part of the publication-inspired experience. Admin may be denser but inherits the same typography, material, color and interaction principles.

## Interaction

Gentle reveals where useful, responsive hover/focus, small transitions, tactile buttons and delicate surface changes. No excessive parallax, large entrance animation, moving ornament, slow navigation or obstructive interactions. Respect `prefers-reduced-motion`. Motion supports clarity, not decoration.

## Usability and accessibility

Forms, prices/dates, booking/rental information, security settings, Support conversations, Admin records and errors/warnings remain readable. Decoration must preserve contrast, density, touch operation, responsive behavior, keyboard access and clear focus in both themes.

## Implementation and scope

Audit global CSS, Tailwind tokens, shared components and account screens before UI changes. Establish reusable color/surface tokens, theme mappings, typography roles, texture rules, border/radius/shadow scales, spacing/editorial conventions, motion, component states and accessibility conventions. Apply to the approved account/shared-shell vertical slice first. Future batches inherit this system; no unrelated functional rewrites or claim of full marketplace redesign.

## Required visual review

Capture real application Account Settings in both themes, mobile account navigation, shared shell in both themes, representative interactive states and textured editorial content. Explain structure, typography, texture and agricultural heritage beyond color replacement.

Review explicitly:

1. Premium agricultural catalogue rather than a SaaS dashboard?
2. Texture present and controlled?
3. Forms and controls readable and usable?
4. Same identity retained in dark mode?
5. Consistent typography and material system?
6. Subtle responsive interactions?
7. Accessible and functional across screen sizes?

## Roadmap alignment

This is Stage 9 — Account Settings & User Experience in [the canonical 14-stage roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md). Preserve all original stages, their ordering/objectives, candidate versus production distinctions and unfinished Stage 6, 7 and 8 requirements. Engineering batch numbers do not replace product stages.
