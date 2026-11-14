import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Lock,
  Palette,
  Search,
  Shapes,
  Trash2,
  Type,
  Unlock,
  Upload,
} from 'lucide-react';
import {
  COLOR_PALETTES,
  DIVIDER_OPTIONS,
  FONT_OPTIONS,
  FONT_PAIRINGS,
  LAYOUT_ARCHETYPES,
  SHAPE_OPTIONS,
  STYLE_PRESETS,
  VECTOR_ICONS,
} from '../data/logoLibrary';
import {
  ColorPalette,
  DividerKind,
  FontOption,
  FontPairing,
  LayoutArchetype,
  LogoDocument,
  LogoLayer,
  LogoStylePreset,
  ShapeKind,
} from '../types/logo';
import { batchLoadGoogleFonts, ensureFontOptionLoaded } from '../utils/googleFonts';
import {
  ICONIFY_COLLECTIONS,
  IconifySearchResult,
  fetchIconifySvg,
  getIconifyPreviewUrl,
  searchIconifyIcons,
} from '../utils/iconifyApi';
import { buildShapePath } from './CanvasLayerRenderer';

type SidebarToolTab = 'elements' | 'typography' | 'layouts' | 'palette' | 'layers';

interface EditorLeftSidebarProps {
  doc: LogoDocument;
  activePalette: ColorPalette;
  activeStyle: LogoStylePreset;
  selectedLayerIds: string[];
  onSelectLayers: (ids: string[]) => void;
  onAddIcon: (iconId: string) => void;
  onAddShape: (kind: ShapeKind) => void;
  onAddDivider: (kind: DividerKind) => void;
  onUploadCustomSvg: (svgText: string, fileName: string) => void;
  onAddText: (preset: 'heading' | 'tagline' | 'curved') => void;
  onApplyFontPairing: (pairing: FontPairing) => void;
  onApplyFontToSelectedOrPrimary: (font: FontOption) => void;
  onApplyPalette: (palette: ColorPalette) => void;
  onSwitchLayout: (archetype: LayoutArchetype) => void;
  onSwitchStyle: (style: LogoStylePreset) => void;
  onToggleLayerVisible: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onReorderLayer: (id: string, dir: 'up' | 'down') => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
}

export const EditorLeftSidebar: React.FC<EditorLeftSidebarProps> = ({
  doc,
  activePalette,
  activeStyle,
  selectedLayerIds,
  onSelectLayers,
  onAddIcon,
  onAddShape,
  onAddDivider,
  onUploadCustomSvg,
  onAddText,
  onApplyFontPairing,
  onApplyFontToSelectedOrPrimary,
  onApplyPalette,
  onSwitchLayout,
  onSwitchStyle,
  onToggleLayerVisible,
  onToggleLayerLock,
  onReorderLayer,
  onDuplicateLayer,
  onDeleteLayer,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarToolTab>('elements');
  const [iconSource, setIconSource] = useState<'studio' | 'iconify'>('studio');
  const [iconQuery, setIconQuery] = useState<string>('');
  const [iconCategory, setIconCategory] = useState<string>('All');
  const [iconifyQuery, setIconifyQuery] = useState<string>('crown');
  const [iconifyCollection, setIconifyCollection] = useState<string>('all');
  const [iconifyResults, setIconifyResults] = useState<IconifySearchResult[]>([]);
  const [iconifyLoading, setIconifyLoading] = useState<boolean>(false);
  const [iconifyError, setIconifyError] = useState<string | null>(null);
  const [addingIconifyId, setAddingIconifyId] = useState<string | null>(null);
  const [fontQuery, setFontQuery] = useState<string>('');
  const svgUploadRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (activeTab === 'typography') {
      batchLoadGoogleFonts(FONT_OPTIONS);
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (activeTab !== 'elements' || iconSource !== 'iconify') return;
    const q = iconifyQuery.trim();
    if (!q) {
      setIconifyResults([]);
      setIconifyError(null);
      return;
    }

    let cancelled = false;
    setIconifyLoading(true);
    setIconifyError(null);

    const timer = window.setTimeout(() => {
      searchIconifyIcons(q, iconifyCollection, 30)
        .then((res) => {
          if (!cancelled) {
            setIconifyResults(res);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIconifyError('Unable to reach Iconify right now. Try Studio Marks or upload SVG.');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIconifyLoading(false);
          }
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, iconSource, iconifyQuery, iconifyCollection]);

  const handlePickIconifyIcon = async (item: IconifySearchResult) => {
    if (addingIconifyId) return;
    setAddingIconifyId(item.id);
    setIconifyError(null);
    try {
      const svgXml = await fetchIconifySvg(item.id);
      onUploadCustomSvg(svgXml, item.name);
    } catch {
      setIconifyError(`Failed to load "${item.id}" SVG.`);
    } finally {
      setAddingIconifyId(null);
    }
  };

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    return VECTOR_ICONS.filter((ic) => {
      const catOk = iconCategory === 'All' || ic.category === iconCategory;
      if (!catOk) return false;
      if (!q) return true;
      return (
        ic.name.toLowerCase().includes(q) ||
        ic.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [iconQuery, iconCategory]);

  const filteredFonts = useMemo(() => {
    const q = fontQuery.trim().toLowerCase();
    if (!q) return FONT_OPTIONS;
    return FONT_OPTIONS.filter(
      (f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
    );
  }, [fontQuery]);

  const handleSvgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadCustomSvg(reader.result, file.name);
      }
    };
    reader.readAsText(file);
  };

  // Top-most rendered layer should appear at the top of the Layers panel
  const layersTopFirst: LogoLayer[] = [...doc.layers].reverse();

  return (
    <aside className="flex flex-col lg:flex-row w-full lg:w-[310px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#DCD9D0] bg-[#FAF9F6]">
      {/* Icon Rail: Horizontal bar on mobile/tablet, vertical rail on desktop */}
      <nav
        aria-label="Editor tools"
        className="flex flex-row lg:flex-col items-center gap-1 border-b lg:border-b-0 lg:border-r border-[#EAE7DF] bg-[#F3F1EB] p-1.5 overflow-x-auto shrink-0"
      >
        {(
          [
            { id: 'elements', label: 'Vectors', icon: Shapes },
            { id: 'typography', label: 'Type', icon: Type },
            { id: 'layouts', label: 'Layouts', icon: LayoutGrid },
            { id: 'palette', label: 'Colors', icon: Palette },
            { id: 'layers', label: 'Layers', icon: Layers },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 lg:py-2.5 flex-1 lg:flex-initial min-w-[58px] lg:w-14 text-[10px] font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#141413] text-white'
                  : 'text-[#55524B] hover:bg-[#E7E4DC] hover:text-[#141413]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Tool Drawer */}
      <div className="flex-1 overflow-y-auto p-3.5 max-h-[380px] sm:max-h-[440px] lg:max-h-[calc(100vh-110px)]">
        {/* TAB 1: VECTORS, SHAPES, DIVIDERS, CUSTOM SVG UPLOAD */}
        {activeTab === 'elements' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                  Vector Icons
                </h2>
                <input
                  ref={svgUploadRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleSvgFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => svgUploadRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-md border border-[#141413] bg-white px-2 py-1 text-[11px] font-semibold text-[#141413] hover:bg-[#141413] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Upload className="h-3 w-3" />
                  Upload SVG
                </button>
              </div>

              {/* Source Toggle: Curated Multi-Part Studio Marks vs Searchable Iconify API */}
              <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-lg border border-[#DCD9D0] bg-[#EFECE4] p-0.5">
                <button
                  type="button"
                  onClick={() => setIconSource('studio')}
                  className={`rounded-md py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    iconSource === 'studio'
                      ? 'bg-[#141413] text-white'
                      : 'text-[#4A4740] hover:text-[#141413]'
                  }`}
                >
                  Studio Marks
                </button>
                <button
                  type="button"
                  onClick={() => setIconSource('iconify')}
                  className={`rounded-md py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    iconSource === 'iconify'
                      ? 'bg-[#141413] text-white'
                      : 'text-[#4A4740] hover:text-[#141413]'
                  }`}
                >
                  Lucide &amp; Iconify
                </button>
              </div>

              {iconSource === 'studio' ? (
                <>
                  <div className="relative mt-2.5">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7A756B]" />
                    <input
                      type="text"
                      value={iconQuery}
                      onChange={(e) => setIconQuery(e.target.value)}
                      placeholder="Search leaf, circuit, crown, shield..."
                      className="w-full rounded-lg border border-[#DCD9D0] bg-white pl-8 pr-3 py-1.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                    />
                  </div>

                  <select
                    value={iconCategory}
                    onChange={(e) => setIconCategory(e.target.value)}
                    aria-label="Filter icon category"
                    className="mt-2 w-full rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#141413] focus:border-[#141413] focus:outline-none"
                  >
                    <option value="All">All Vector Categories ({VECTOR_ICONS.length})</option>
                    <option value="Nature & Eco">Nature &amp; Eco</option>
                    <option value="Tech & Circuit">Tech &amp; Circuit</option>
                    <option value="Geometric">Geometric</option>
                    <option value="Emblems & Heraldry">Emblems &amp; Heraldry</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Commerce & Craft">Commerce &amp; Craft</option>
                  </select>

                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {filteredIcons.map((icon) => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => onAddIcon(icon.id)}
                        title={`Add ${icon.name}`}
                        className="group flex flex-col items-center gap-1 rounded-lg border border-[#E2DFD7] bg-white p-2 text-center hover:border-[#141413] transition-colors cursor-pointer"
                      >
                        <svg viewBox="0 0 100 100" className="h-8 w-8">
                          {icon.paths.map((p, idx) => {
                            const col =
                              p.role === 'primary'
                                ? activePalette.primary
                                : p.role === 'accent'
                                  ? activePalette.accent
                                  : p.role === 'secondary'
                                    ? activePalette.secondary
                                    : '#FFFFFF';
                            return p.strokeOnly ? (
                              <path
                                key={idx}
                                d={p.d}
                                fill="none"
                                stroke={col}
                                strokeWidth={p.strokeWidth ?? 5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ) : (
                              <path key={idx} d={p.d} fill={col} />
                            );
                          })}
                        </svg>
                        <span className="w-full truncate text-[10px] font-medium text-[#4A4740]">
                          {icon.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mt-2.5">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7A756B]" />
                    <input
                      type="text"
                      value={iconifyQuery}
                      onChange={(e) => setIconifyQuery(e.target.value)}
                      placeholder="Search 200k+ SVG icons (e.g. crown, lion, leaf)..."
                      className="w-full rounded-lg border border-[#DCD9D0] bg-white pl-8 pr-3 py-1.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    <select
                      value={iconifyCollection}
                      onChange={(e) => setIconifyCollection(e.target.value)}
                      aria-label="Filter Iconify collection"
                      className="w-full rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#141413] focus:border-[#141413] focus:outline-none"
                    >
                      {ICONIFY_COLLECTIONS.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {['crown', 'leaf', 'shield', 'rocket', 'compass', 'diamond'].map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setIconifyQuery(term)}
                        className={`rounded border px-2 py-0.5 text-[10px] font-medium capitalize cursor-pointer ${
                          iconifyQuery.toLowerCase() === term
                            ? 'border-[#141413] bg-[#141413] text-white'
                            : 'border-[#DCD9D0] bg-white text-[#4A4740] hover:border-[#141413]'
                        }`}
                      >
                        {term}
                      </button>
                    ))}
                  </div>

                  {iconifyError && (
                    <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
                      {iconifyError}
                    </p>
                  )}

                  {iconifyLoading ? (
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="h-16 rounded-lg border border-[#E2DFD7] bg-[#F1EFE9] animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      {iconifyResults.map((item) => {
                        const isAdding = addingIconifyId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={Boolean(addingIconifyId)}
                            onClick={() => void handlePickIconifyIcon(item)}
                            title={`Insert ${item.id} as editable vector paths`}
                            className={`group flex flex-col items-center gap-1 rounded-lg border bg-white p-2 text-center transition-colors cursor-pointer ${
                              isAdding
                                ? 'border-[#141413] bg-[#F3F1EB]'
                                : 'border-[#E2DFD7] hover:border-[#141413]'
                            }`}
                          >
                            <img
                              src={getIconifyPreviewUrl(
                                item.id,
                                item.prefix === 'flat-color-icons'
                                  ? '#141413'
                                  : activePalette.primary
                              )}
                              alt={item.name}
                              loading="lazy"
                              className="h-7 w-7 object-contain"
                            />
                            <span className="w-full truncate text-[10px] font-medium text-[#4A4740]">
                              {isAdding ? 'Loading...' : item.name}
                            </span>
                          </button>
                        );
                      })}
                      {!iconifyLoading && iconifyResults.length === 0 && iconifyQuery.trim() && (
                        <p className="col-span-3 py-4 text-center text-[11px] text-[#7A756B]">
                          No icons found for &ldquo;{iconifyQuery}&rdquo;. Try another keyword.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-[#E6E3DA] pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                  Shapes &amp; Badges ({SHAPE_OPTIONS.length})
                </h3>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {SHAPE_OPTIONS.map((s) => {
                  const isOutline = s.kind === 'ring' || s.kind === 'frame';
                  return (
                    <button
                      key={s.kind}
                      type="button"
                      onClick={() => onAddShape(s.kind)}
                      title={`Add ${s.label}`}
                      className="flex flex-col items-center gap-1 rounded-md border border-[#E2DFD7] bg-white px-1.5 py-2 text-[10px] font-medium text-[#141413] hover:border-[#141413] cursor-pointer"
                    >
                      <svg viewBox="0 0 40 40" className="h-6 w-6">
                        <path
                          d={buildShapePath(s.kind, 40, 40, 8)}
                          fill={isOutline ? 'none' : activePalette.secondary}
                          stroke={activePalette.primary}
                          strokeWidth={isOutline ? 2.8 : 1.4}
                        />
                        {s.kind === 'crest-double' && (
                          <path
                            d={buildShapePath('shield', 28, 28, 6)}
                            transform="translate(6, 6)"
                            fill="none"
                            stroke={activePalette.primary}
                            strokeWidth={1.2}
                            opacity={0.7}
                          />
                        )}
                      </svg>
                      <span className="w-full truncate text-center">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#E6E3DA] pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                Dividers &amp; Rules
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {DIVIDER_OPTIONS.map((d) => (
                  <button
                    key={d.kind}
                    type="button"
                    onClick={() => onAddDivider(d.kind)}
                    className="rounded-md border border-[#E2DFD7] bg-white px-2 py-1.5 text-[11px] font-medium text-[#141413] hover:border-[#141413] cursor-pointer truncate"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TYPOGRAPHY & FONT PAIRINGS */}
        {activeTab === 'typography' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                Add Text Layer
              </h2>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => onAddText('heading')}
                  className="rounded-lg bg-[#141413] px-3 py-2 text-left text-xs font-semibold text-white hover:bg-[#2A2926] cursor-pointer"
                >
                  + Add Brand Wordmark
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAddText('tagline')}
                    className="rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F2F0EA] cursor-pointer"
                  >
                    + Tagline
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddText('curved')}
                    className="rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F2F0EA] cursor-pointer"
                  >
                    + Curved Arc
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-[#E6E3DA] pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                Curated Font Pairings
              </h3>
              <div className="mt-2 space-y-1.5">
                {FONT_PAIRINGS.map((pair) => (
                  <button
                    key={pair.id}
                    type="button"
                    onClick={() => {
                      const pf = FONT_OPTIONS.find((f) => f.id === pair.primaryFontId);
                      const sf = FONT_OPTIONS.find((f) => f.id === pair.secondaryFontId);
                      if (pf) void ensureFontOptionLoaded(pf);
                      if (sf) void ensureFontOptionLoaded(sf);
                      onApplyFontPairing(pair);
                    }}
                    className="flex w-full flex-col rounded-lg border border-[#E2DFD7] bg-white p-2.5 text-left hover:border-[#141413] cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-[#141413]">{pair.name}</span>
                    <span className="text-[11px] text-[#6B675E]">{pair.note}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E6E3DA] pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                Google Fonts Library ({FONT_OPTIONS.length})
              </h3>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7A756B]" />
                <input
                  type="text"
                  value={fontQuery}
                  onChange={(e) => setFontQuery(e.target.value)}
                  placeholder="Search Outfit, Sora, Cinzel, Great Vibes..."
                  className="w-full rounded-lg border border-[#DCD9D0] bg-white pl-8 pr-3 py-1.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>
              <div className="mt-2 space-y-1.5">
                {filteredFonts.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      void ensureFontOptionLoaded(f);
                      onApplyFontToSelectedOrPrimary(f);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-[#E2DFD7] bg-white px-3 py-2 text-left hover:border-[#141413] cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-[#141413]" style={{ fontFamily: f.cssFamily }}>
                      {f.name}
                    </span>
                    <span className="text-[10px] text-[#7A756B]">{f.category}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INSTANT LAYOUT VARIATIONS & STYLE SWITCHER */}
        {activeTab === 'layouts' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                Instant Layout Variations
              </h2>
              <p className="mt-0.5 text-[11px] text-[#6B675E]">
                Re-compose your current brand name &amp; mark into a new lockup structure.
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {LAYOUT_ARCHETYPES.map((arch) => (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => onSwitchLayout(arch.id)}
                    className="rounded-lg border border-[#DCD9D0] bg-white px-2.5 py-2.5 text-left text-xs font-semibold text-[#141413] hover:border-[#141413] hover:bg-[#F3F1EB] cursor-pointer"
                  >
                    {arch.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E6E3DA] pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                Style Presets
              </h3>
              <div className="mt-2 space-y-1.5">
                {STYLE_PRESETS.map((st) => {
                  const active = activeStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSwitchStyle(st.id)}
                      className={`flex w-full flex-col rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-[#141413] bg-[#141413] text-white'
                          : 'border-[#E2DFD7] bg-white text-[#141413] hover:border-[#141413]'
                      }`}
                    >
                      <span className="text-xs font-semibold">{st.label}</span>
                      <span className={`text-[10.5px] ${active ? 'text-white/75' : 'text-[#6B675E]'}`}>
                        {st.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BRAND COLOR PALETTES */}
        {activeTab === 'palette' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                Color Palettes
              </h2>
              <p className="mt-0.5 text-[11px] text-[#6B675E]">
                One click recolors background, marks, accents, and typography harmoniously.
              </p>
            </div>

            <div className="space-y-2">
              {COLOR_PALETTES.map((pal) => {
                const active = pal.id === activePalette.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => onApplyPalette(pal)}
                    className={`flex w-full flex-col gap-2 rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#141413] bg-white ring-1 ring-[#141413]'
                        : 'border-[#E2DFD7] bg-white hover:border-[#B5B0A4]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#141413]">
                      <span>{pal.name}</span>
                      {active && <span className="text-[10px] text-[#1B4332]">Active</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[pal.background, pal.primary, pal.accent, pal.secondary, pal.text].map(
                        (hex, i) => (
                          <span
                            key={i}
                            className="h-5 flex-1 rounded border border-black/15"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        )
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: LAYER STACK (Z-ORDER, VISIBILITY, LOCK, DUPLICATE, DELETE) */}
        {activeTab === 'layers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5951]">
                Layer Stack ({doc.layers.length})
              </h2>
              <span className="text-[10px] text-[#7A756B]">Shift+Click multi</span>
            </div>

            <div className="space-y-1.5">
              {layersTopFirst.map((layer) => {
                const isSelected = selectedLayerIds.includes(layer.id);
                return (
                  <div
                    key={layer.id}
                    className={`flex items-center justify-between gap-1.5 rounded-lg border px-2 py-2 text-xs transition-colors ${
                      isSelected
                        ? 'border-[#141413] bg-white ring-1 ring-[#141413]'
                        : 'border-[#E2DFD7] bg-white hover:border-[#B5B0A4]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        if (e.shiftKey || e.metaKey || e.ctrlKey) {
                          if (isSelected) {
                            onSelectLayers(selectedLayerIds.filter((id) => id !== layer.id));
                          } else {
                            onSelectLayers([...selectedLayerIds, layer.id]);
                          }
                        } else {
                          onSelectLayers([layer.id]);
                        }
                      }}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <p className="truncate font-semibold text-[#141413]">{layer.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-[#7A756B]">
                        {layer.type}
                      </p>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onReorderLayer(layer.id, 'up')}
                        className="rounded p-1 text-[#5C5951] hover:bg-[#EFECE4] cursor-pointer"
                        title="Bring forward"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReorderLayer(layer.id, 'down')}
                        className="rounded p-1 text-[#5C5951] hover:bg-[#EFECE4] cursor-pointer"
                        title="Send backward"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleLayerVisible(layer.id)}
                        className="rounded p-1 text-[#5C5951] hover:bg-[#EFECE4] cursor-pointer"
                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                      >
                        {layer.visible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-amber-700" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleLayerLock(layer.id)}
                        className="rounded p-1 text-[#5C5951] hover:bg-[#EFECE4] cursor-pointer"
                        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                      >
                        {layer.locked ? (
                          <Lock className="h-3.5 w-3.5 text-amber-700" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateLayer(layer.id)}
                        className="rounded p-1 text-[#5C5951] hover:bg-[#EFECE4] cursor-pointer"
                        title="Duplicate layer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteLayer(layer.id)}
                        className="rounded p-1 text-[#5C5951] hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        title="Delete layer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
