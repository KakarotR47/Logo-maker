export type UpdateChangeKind = 'added' | 'upgraded' | 'fixed';

export interface UpdateLogEntry {
  kind: UpdateChangeKind;
  area: string;
  title: string;
  details: string;
  filesEdited?: string[];
}

export interface BuildReleaseNote {
  id: string;
  buildLabel: string;
  title: string;
  dateLabel: string;
  summary: string;
  changes: UpdateLogEntry[];
}

export const STUDIO_UPDATE_LOG: BuildReleaseNote[] = [
  {
    id: 'build-20',
    buildLabel: 'Build 20',
    title: 'Phase 21: Compositing, Masks & Surface Textures',
    dateLabel: 'November 2026',
    summary:
      'Added full SVG Canvas Blend Modes, non-destructive Alpha & Inverted Knockout/Cutout Masks that punch true transparent holes through underlying layers, and a reversible Finish & Texture studio for Vintage Grit, Halftone Dots, Brushed Metal, and Paper Grain.',
    changes: [
      {
        kind: 'added',
        area: 'Canvas Blend Modes',
        title: '8 Live Compositing Modes (Multiply, Screen, Overlay, Color Burn & More)',
        details:
          'Added Blend Mode dropdown controls on single and multi-selected layers (Normal, Multiply, Screen, Overlay, Darken, Lighten, Color Burn, Difference) with isolated SVG artboard stacking for clean browser & export rendering.',
        filesEdited: ['src/types/logo.ts', 'src/components/CanvasLayerRenderer.tsx', 'src/components/FloatingContextToolbar.tsx'],
      },
      {
        kind: 'added',
        area: 'Knockout & Cutout Masks',
        title: 'Non-Destructive Alpha Knockouts & Inverted Clip Masks',
        details:
          'Select any shape or text layer above another element and click Knockout / Cutout (single or multi-select) to punch a true transparent hole through the layer underneath, or invert any Clip Mask into a hole.',
        filesEdited: ['src/utils/surfaceTextures.ts', 'src/components/CanvasLayerRenderer.tsx', 'src/components/RightLayersDrawer.tsx', 'src/App.tsx'],
      },
      {
        kind: 'added',
        area: 'Finish & Texture Panel',
        title: 'Non-Destructive Distress, Halftone, Brushed Metal & Paper Grain',
        details:
          'Added a Finish left-rail tab and Artboard Finish & Texture popover with deterministic vector distress masks, halftone dot screens, directional brushed metal sheen, and cotton paper grain that export cleanly to SVG, PNG & PDF.',
        filesEdited: ['src/utils/surfaceTextures.ts', 'src/components/FinishTexturePanel.tsx', 'src/components/EditorLeftSidebar.tsx', 'src/utils/svgExport.ts'],
      },
    ],
  },
  {
    id: 'build-19',
    buildLabel: 'Build 19',
    title: 'Phase 20: Pro OpenType Typography & Text-on-Path',
    dateLabel: 'November 2026',
    summary:
      'Added full custom Text-on-Path attachment (including Pen-tool Bezier curves and canvas circles), interactive Per-Letter Edit mode for independent kerning/scale/rotation/baseline shifts, and 1-click Convert to Outlines connected to a Phase 17 Vector Node Editor.',
    changes: [
      {
        kind: 'added',
        area: 'Text on Custom Path',
        title: 'Attach Text to Circles, Waves & Pen-Tool Bezier Curves',
        details:
          'Draw freeform cubic Bezier curves with the Pen Tool or pick any canvas circle/shape/divider, then adjust Start Offset (0–100%), Baseline Shift (-60..60px), and Flip Side live.',
        filesEdited: ['src/types/logo.ts', 'src/utils/pathGeometry.ts', 'src/utils/glyphLayout.ts', 'src/components/CanvasLayerRenderer.tsx'],
      },
      {
        kind: 'added',
        area: 'Per-Letter Edit Mode',
        title: 'Individual Character Kerning, Scale, Rotation & Baseline Shift',
        details:
          'Click gaps between any two letters to adjust pair kerning or click any individual glyph on straight or curved text to scale, rotate, or shift its vertical baseline independently.',
        filesEdited: ['src/utils/glyphLayout.ts', 'src/components/LogoCanvasEditor.tsx', 'src/components/TextEffectsStudio.tsx'],
      },
      {
        kind: 'added',
        area: 'Vector Outlines & Node Editor',
        title: 'Convert to Outlines + Phase 17 Bezier Serif Node Editor',
        details:
          'Convert any text layer (including curved text-on-path & per-letter transforms) into real opentype.js vector outlines and pull/stretch individual letter serifs and cubic Bezier handles.',
        filesEdited: ['src/utils/textToPath.ts', 'src/components/LogoCanvasEditor.tsx', 'src/components/FloatingContextToolbar.tsx', 'src/App.tsx'],
      },
    ],
  },
  {
    id: 'build-18',
    buildLabel: 'Build 18',
    title: 'Phase 14: Pro AI Magic Studio',
    dateLabel: 'November 2026',
    summary:
      'Expanded the AI Magic drawer into a 4-tool studio connected to Gemini backend endpoints and client vector processing: Multi-Color Image-to-Clean-SVG Vectorizer, 6 Logo Remixes, Brand Name & Slogan Generator, and Magic Eraser Background Remover.',
    changes: [
      {
        kind: 'added',
        area: 'Image-to-Clean-SVG',
        title: 'Multi-Color Vectorizer & Gemini Sketch Cleanup (/api/ai/clean-sketch)',
        details:
          'Upload rough sketches, PNGs, or JPGs to strip backgrounds automatically and trace up to 6 quantized flat colors into individually editable SVG paths, with 1-click Gemini AI sketch cleanup.',
        filesEdited: ['server.ts', 'src/utils/vectorTrace.ts', 'src/components/AiMagicPanel.tsx'],
      },
      {
        kind: 'added',
        area: 'AI Logo Remix',
        title: 'Generate 6 Remixes Preserving Brand & Mark (/api/ai/remix-concepts)',
        details:
          'Generates 6 live layout, font pairing, and color harmony remixes from the active canvas logo while preserving your brand name, tagline, and active symbol or custom SVG mark.',
        filesEdited: ['server.ts', 'src/utils/aiApi.ts', 'src/utils/logoGenerator.ts'],
      },
      {
        kind: 'added',
        area: 'Brand AI & Magic Eraser',
        title: 'Brand Name/Slogan/Psychology Generator & 1-Click Background Remover',
        details:
          'Added 1-click brand name, tagline, and color psychology generation (/api/ai/brand-brainstorm) plus a Magic Eraser with border flood-fill alpha removal, Gemini complex BG isolation, transparent PNG download, and SVG conversion.',
        filesEdited: ['server.ts', 'src/components/AiMagicPanel.tsx', 'src/components/EditorLeftSidebar.tsx', 'src/App.tsx'],
      },
    ],
  },
  {
    id: 'build-17',
    buildLabel: 'Build 17',
    title: 'Phase 11: Flagship SaaS Studio UI/UX Overhaul',
    dateLabel: 'November 2026',
    summary:
      'Redesigned the studio workspace with a Canva Pro & Figma 4-zone layout, dual Light (#F1F3F6) / Dark (#0F1117) themes, Indigo-to-Violet gradient CTAs, contextual toolbar upgrades, and floating zoom/page status pills.',
    changes: [
      {
        kind: 'upgraded',
        area: '4-Zone Studio Layout',
        title: '56px Top Glass Header, 68px Icon Rail & 320px Collapsible Drawer',
        details:
          'Added an editable inline project title and Save status badge in the 56px top glass header, 68px icon rail with smooth 320px drawer collapse/expand, sticky drawer search inputs, and rounded-xl studio cards.',
        filesEdited: ['src/App.tsx', 'src/components/EditorLeftSidebar.tsx', 'src/index.css'],
      },
      {
        kind: 'upgraded',
        area: 'Contextual & Status Toolbars',
        title: 'Frosted Floating Context Bar & Bottom-Right Zoom/Mockups Pill',
        details:
          'Positioned the frosted floating action bar 16px above the artboard with Letter Spacing popover, inline SVG multi-color path swatches, 1000×1000 / 2000×2000 presets, Grid toggle, Bring Forward/Send Backward buttons, plus a 25%–400% Zoom slider, Fit to Screen, and Mockup Preview switch.',
        filesEdited: ['src/components/FloatingContextToolbar.tsx', 'src/components/LogoCanvasEditor.tsx'],
      },
      {
        kind: 'upgraded',
        area: 'Dual Studio Theme',
        title: 'Canva Clean Light & Adobe Sleek Dark Surfaces with Indigo Accents',
        details:
          'Harmonized workspace backgrounds (#F1F3F6 / #0F1117), elevated panels (#FFFFFF / #181B23), crisp borders (#E2E8F0 / #2A2F3D), Indigo active states, rounded-lg active:scale-95 micro-interactions, and thin custom scrollbars across all drawers.',
        filesEdited: ['src/components/RightLayersDrawer.tsx', 'src/components/GradientPatternPicker.tsx', 'src/components/TextEffectsStudio.tsx', 'src/components/AiMagicPanel.tsx', 'src/components/MonogramPanel.tsx'],
      },
    ],
  },
  {
    id: 'build-16',
    buildLabel: 'Build 16',
    title: 'Automated Brand Guidelines Book & Client Presentation',
    dateLabel: 'November 2026',
    summary:
      'Added a 6-page automated Brand Guidelines PDF generator and a read-only shareable Client Presentation view with light/dark showcases, 3D mockups, and client approval sign-off.',
    changes: [
      {
        kind: 'added',
        area: 'Brand Guidelines PDF',
        title: 'Multi-Page Brand Book Export (6 A4 Landscape Pages)',
        details:
          'Added a Download Brand Guidelines PDF workflow generating a Cover Page, Primary & Reversed Lockups, 1x Clear Space & Minimum Size specifications, Color Palette (HEX/RGB/CMYK), Typography Hierarchy, and Visual Do’s & Don’ts.',
        filesEdited: ['src/utils/brandBookPdf.ts', 'src/utils/colorSpecs.ts', 'src/components/ExportModal.tsx'],
      },
      {
        kind: 'added',
        area: 'Client Presentation',
        title: 'Shareable Read-Only Client Preview Link & 3D Mockups',
        details:
          'Added a Share action in the header, Export modal, and Mockups view generating a portable ?client= URL showcasing Light/Dark surfaces, 3D perspective business cards, 3D packaging box, digital UI, approval feedback, and PDF download.',
        filesEdited: ['src/utils/clientShare.ts', 'src/components/ShareClientModal.tsx', 'src/components/ClientPreviewView.tsx', 'src/App.tsx'],
      },
    ],
  },
  {
    id: 'build-15',
    buildLabel: 'Build 15',
    title: 'Pro Template Library & Precision Controls',
    dateLabel: 'November 2026',
    summary:
      'Added a JSON-driven 49-template categorized logo library, a collapsible right-side Layers & Grouping drawer with z-index drag reordering, and workspace rulers with bleed & golden-ratio overlays.',
    changes: [
      {
        kind: 'added',
        area: 'Template Engine',
        title: '49 JSON-Driven Studio Templates Across 7 Industries',
        details:
          'Built a rich JSON catalog spanning Tech / AI, Luxury Fashion, Gaming / Esports, Cafe / Restaurant, Real Estate, Minimalist Startup, and Beauty / Wellness with industry filter tabs, live search, and optional brand name substitution.',
        filesEdited: ['src/data/proTemplates.json', 'src/utils/templateLibrary.ts', 'src/components/TemplateLibraryModal.tsx', 'src/components/EditorLeftSidebar.tsx'],
      },
      {
        kind: 'added',
        area: 'Layers & Grouping',
        title: 'Collapsible Right Layers Drawer, Drag Z-Index, Inline Rename & Grouping (Ctrl+G)',
        details:
          'Added a collapsible right-side Layers inspector supporting HTML5 drag-to-reorder stacking, Group/Ungroup shortcuts (Ctrl/Cmd+G & Ctrl/Cmd+Shift+G), inline layer/group renaming, collapsible groups, and background canvas lock.',
        filesEdited: ['src/components/RightLayersDrawer.tsx', 'src/types/logo.ts', 'src/App.tsx'],
      },
      {
        kind: 'upgraded',
        area: 'Precision Workspace',
        title: 'px/mm Edge Rulers, Print Bleed Trim & Rule-of-Thirds / Golden Ratio Grids',
        details:
          'Added live pixel/millimeter rulers along top and left workspace edges with cursor tracking, 3mm (12px) print bleed trim crop marks, Rule-of-Thirds guides, and Golden Ratio (φ 0.382 / 0.618) compositional overlays.',
        filesEdited: ['src/components/LogoCanvasEditor.tsx', 'src/components/FloatingContextToolbar.tsx'],
      },
    ],
  },
  {
    id: 'build-13',
    buildLabel: 'Build 13',
    title: 'Pro Typography Effects Studio & Smart Monogram Maker',
    dateLabel: 'November 2026',
    summary:
      'Expanded the Text Effects studio with visual Canva-style effect cards, multi-shape text warping, a 24-layout Monogram Maker tab, and this interactive Update Log.',
    changes: [
      {
        kind: 'added',
        area: 'Text Styles',
        title: '6 Visual Typography Effect Presets',
        details:
          'Added 1-click Canva-style preview cards and live SVG renderers for Hollow/Outline, Splice (Offset Shadow), Neon Glow, 3D Extrude Block, Glitch, and Metallic Foil with intensity, offset, angle, and color tuning.',
        filesEdited: ['src/types/logo.ts', 'src/components/CanvasLayerRenderer.tsx', 'src/components/TextEffectsStudio.tsx'],
      },
      {
        kind: 'upgraded',
        area: 'Text Warp & Shapes',
        title: 'Arc Up, Arc Down, Circle Ring, Wave & Perspective Slant',
        details:
          'Upgraded curved typography with visual warp cards, sinusoidal Wave SVG paths, full Circle Ring wrapping, Perspective Slant & Tilt sliders, and opentype vector outlining compatibility.',
        filesEdited: ['src/components/CanvasLayerRenderer.tsx', 'src/utils/textToPath.ts', 'src/components/FloatingContextToolbar.tsx'],
      },
      {
        kind: 'added',
        area: 'Monogram Maker',
        title: 'Dedicated Monogram Tab with 24+ Initials Layouts',
        details:
          'Added a Monogram tool tab on the editor rail that turns 2 or 3 initials into 24 interlocking, crest, shield, laurel wreath, and geometric seal layouts in Serif, Geometric Sans, Display, or Script fonts.',
        filesEdited: ['src/utils/monogramGenerator.ts', 'src/components/MonogramPanel.tsx', 'src/components/EditorLeftSidebar.tsx'],
      },
      {
        kind: 'added',
        area: 'Release Tracking',
        title: 'In-App Update Log & Build Changelog',
        details:
          'Added an accessible Update Log viewer from the studio header and landing footer to inspect what changed across builds and which modules were edited.',
        filesEdited: ['src/data/updateLog.ts', 'src/components/UpdateLogModal.tsx', 'src/App.tsx'],
      },
    ],
  },
  {
    id: 'build-12',
    buildLabel: 'Build 12',
    title: 'Pro Vector Manipulation & Advanced Gradients',
    dateLabel: 'Previous Build',
    summary:
      'Upgraded the canvas vector engine with boolean shape operations, a multi-stop gradient and pattern builder, 1-click flips, clipping masks, and corner radius controls.',
    changes: [
      {
        kind: 'added',
        area: 'Boolean Operations',
        title: 'Combine Shapes (Unite, Subtract, Intersect, Exclude)',
        details:
          'Integrated polygon-clipping geometric boolean operations on 2+ selected vector shapes, icons, paths, or custom SVGs, preserving transforms and outputting compound paths with evenodd fill rules.',
        filesEdited: ['src/utils/booleanOps.ts', 'src/components/FloatingContextToolbar.tsx', 'src/App.tsx'],
      },
      {
        kind: 'upgraded',
        area: 'Color & Fill',
        title: 'Multi-Stop Gradient & Pattern Builder',
        details:
          'Replaced basic color controls with Solid, Linear, Radial, and Pattern tabs featuring 2–6 draggable stops, 360° angle dial (15° Shift snap), radial focal pad, 12 Metallic/Luxury/Neon/Brand presets, and 7 SVG pattern fills.',
        filesEdited: ['src/components/GradientPatternPicker.tsx', 'src/components/CanvasLayerRenderer.tsx'],
      },
      {
        kind: 'added',
        area: 'Flip, Mask & Crop',
        title: 'Horizontal/Vertical Flips, Clipping Masks & Corner Radius',
        details:
          'Exposed direct 1-click Flip H/V buttons for all layers, layer-to-layer and preset shape clipping masks (clipping gradients or patterns inside text/shapes), and live corner-radius rounding for rectangles and badges.',
        filesEdited: ['src/components/CanvasLayerRenderer.tsx', 'src/utils/booleanOps.ts', 'src/components/FloatingContextToolbar.tsx'],
      },
      {
        kind: 'fixed',
        area: 'Export & Contrast',
        title: 'userSpaceOnUse Gradients, Clean Hit-Target Stripping & WCAG Checks',
        details:
          'Switched SVG gradients to userSpaceOnUse for reliable rendering across textPath and dividers, ensured transparent hit-target rects are stripped on export, and updated WCAG contrast checks for multi-stop and pattern fills.',
        filesEdited: ['src/utils/svgExport.ts', 'src/utils/contrastChecker.ts', 'src/utils/brandTools.ts'],
      },
    ],
  },
  {
    id: 'build-11',
    buildLabel: 'Build 11 & Earlier',
    title: 'Core Vector Logo Maker & Brand Identity Studio',
    dateLabel: 'Foundation Releases',
    summary:
      'Core scene-graph canvas, 12-concept brand brief generator, AI vectorization, Iconify integration, Print PDFs, Brand Kits, Mockups, and Visiting Card Atelier.',
    changes: [
      {
        kind: 'added',
        area: 'Studio Engine',
        title: 'SVG Scene-Graph Canvas, Smart Guides & Multi-Format Export',
        details:
          'Interactive drag/resize/rotate/marquee selection, safe-zone bleed overlays, Google Fonts dynamic loading, opentype.js text-to-path outlining, and 1000–4000px PNG, SVG, Print PDF, and Favicon ZIP exports.',
        filesEdited: ['src/components/LogoCanvasEditor.tsx', 'src/utils/svgExport.ts', 'src/utils/textToPath.ts'],
      },
      {
        kind: 'added',
        area: 'Brand Suite',
        title: 'AI Vector Trace, Mockups, Brand Kit & Visiting Cards',
        details:
          'Server-side AI symbol tracing, 200k+ Iconify vector search, live mockup previews, saved brand kits, and print-ready visiting card designer.',
        filesEdited: ['server.ts', 'src/components/MockupPreviewView.tsx', 'src/components/BrandKitView.tsx'],
      },
    ],
  },
];
