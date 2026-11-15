import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileCode2,
  Layers,
  LayoutGrid,
  Lock,
  Palette,
  Search,
  Shapes,
  Shuffle,
  Sparkles,
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
import { AiMagicPanel, TracedSymbolPayload } from './AiMagicPanel';

export type SidebarToolTab =
  | 'templates'
  | 'elements'
  | 'text'
  | 'brand'
  | 'ai'
  | 'uploads'
  | 'layers';

export interface UploadedSvgEntry {
  id: string;
  name: string;
  svgText: string;
  addedAt: string;
}

interface EditorLeftSidebarProps {
  doc: LogoDocument;
  activePalette: ColorPalette;
  activeStyle: LogoStylePreset;
  selectedLayerIds: string[];
  uploadedSvgs: UploadedSvgEntry[];
  onSelectLayers: (ids: string[]) => void;
  onAddIcon: (iconId: string) => void;
  onAddShape: (kind: ShapeKind) => void;
  onAddDivider: (kind: DividerKind) => void;
  onUploadCustomSvg: (svgText: string, fileName: string, recordUpload?: boolean) => void;
  onInsertTracedSymbol: (payload: TracedSymbolPayload) => void;
  onAddText: (preset: 'heading' | 'tagline' | 'curved') => void;
  onApplyFontPairing: (pairing: FontPairing) => void;
  onApplyFontToSelectedOrPrimary: (font: FontOption) => void;
  onApplyPalette: (palette: ColorPalette) => void;
  onMagicRecolor?: () => void;
  onOpenVariations?: () => void;
  onSwitchLayout: (archetype: LayoutArchetype) => void;
  onSwitchStyle: (style: LogoStylePreset) => void;
  onToggleLayerVisible: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onReorderLayer: (id: string, dir: 'up' | 'down') => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
}

const RAIL_ITEMS: Array<{
  id: SidebarToolTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'templates', label: 'Templates', icon: LayoutGrid },
  { id: 'elements', label: 'Elements', icon: Shapes },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'brand', label: 'Brand', icon: Palette },
  { id: 'ai', label: 'AI Magic', icon: Sparkles },
  { id: 'uploads', label: 'Uploads', icon: Upload },
  { id: 'layers', label: 'Layers', icon: Layers },
];

export const EditorLeftSidebar: React.FC<EditorLeftSidebarProps> = ({
  doc,
  activePalette,
  activeStyle,
  selectedLayerIds,
  uploadedSvgs,
  onSelectLayers,
  onAddIcon,
  onAddShape,
  onAddDivider,
  onUploadCustomSvg,
  onInsertTracedSymbol,
  onAddText,
  onApplyFontPairing,
  onApplyFontToSelectedOrPrimary,
  onApplyPalette,
  onMagicRecolor,
  onOpenVariations,
  onSwitchLayout,
  onSwitchStyle,
  onToggleLayerVisible,
  onToggleLayerLock,
  onReorderLayer,
  onDuplicateLayer,
  onDeleteLayer,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarToolTab>('elements');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [templateQuery, setTemplateQuery] = useState<string>('');
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
  const [paletteQuery, setPaletteQuery] = useState<string>('');
  const [uploadQuery, setUploadQuery] = useState<string>('');
  const [layerQuery, setLayerQuery] = useState<string>('');
  const [isDragOverUpload, setIsDragOverUpload] = useState<boolean>(false);
  const svgUploadRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (activeTab === 'text') {
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
          if (!cancelled) setIconifyResults(res);
        })
        .catch(() => {
          if (!cancelled) {
            setIconifyError('Unable to reach Iconify right now. Try Studio Marks or upload SVG.');
          }
        })
        .finally(() => {
          if (!cancelled) setIconifyLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, iconSource, iconifyQuery, iconifyCollection]);

  const handleRailClick = (tabId: SidebarToolTab) => {
    if (activeTab === tabId) {
      setDrawerOpen((open) => !open);
    } else {
      setActiveTab(tabId);
      setDrawerOpen(true);
    }
  };

  const handlePickIconifyIcon = async (item: IconifySearchResult) => {
    if (addingIconifyId) return;
    setAddingIconifyId(item.id);
    setIconifyError(null);
    try {
      const svgXml = await fetchIconifySvg(item.id);
      onUploadCustomSvg(svgXml, item.name, false);
    } catch {
      setIconifyError(`Failed to load "${item.id}" SVG.`);
    } finally {
      setAddingIconifyId(null);
    }
  };

  const readSvgFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadCustomSvg(reader.result, file.name, true);
      }
    };
    reader.readAsText(file);
  };

  const handleSvgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    readSvgFile(file);
  };

  const filteredLayouts = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return LAYOUT_ARCHETYPES;
    return LAYOUT_ARCHETYPES.filter((a) => a.label.toLowerCase().includes(q));
  }, [templateQuery]);

  const filteredStyles = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return STYLE_PRESETS;
    return STYLE_PRESETS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.note.toLowerCase().includes(q)
    );
  }, [templateQuery]);

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

  const filteredPalettes = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return COLOR_PALETTES;
    return COLOR_PALETTES.filter((p) => p.name.toLowerCase().includes(q));
  }, [paletteQuery]);

  const filteredUploads = useMemo(() => {
    const q = uploadQuery.trim().toLowerCase();
    if (!q) return uploadedSvgs;
    return uploadedSvgs.filter((u) => u.name.toLowerCase().includes(q));
  }, [uploadedSvgs, uploadQuery]);

  const layersTopFirst: LogoLayer[] = useMemo(() => {
    const q = layerQuery.trim().toLowerCase();
    const reversed = [...doc.layers].reverse();
    if (!q) return reversed;
    return reversed.filter(
      (l) => l.name.toLowerCase().includes(q) || l.type.toLowerCase().includes(q)
    );
  }, [doc.layers, layerQuery]);

  const activeRailMeta = RAIL_ITEMS.find((r) => r.id === activeTab)!;

  return (
    <aside className="flex flex-col lg:flex-row shrink-0 select-none">
      {/* Sleek 64px Dark/Slate Left Icon Rail */}
      <nav
        aria-label="Studio tools"
        className="flex flex-row lg:flex-col items-center gap-1 bg-[#0F172A] dark:bg-[#11131D] border-b lg:border-b-0 lg:border-r border-[#1E293B] dark:border-[#2A2D3D] px-1.5 py-1.5 lg:py-3 lg:w-16 shrink-0 overflow-x-auto"
      >
        {RAIL_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id && drawerOpen;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleRailClick(id)}
              title={label}
              className={`group flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 lg:py-2.5 flex-1 lg:flex-initial min-w-[60px] lg:w-12 text-[10px] font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/15'
                  : 'text-slate-400 hover:bg-white/6 hover:text-slate-100'
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-transform ${
                  isActive ? 'scale-105 text-emerald-400' : 'group-hover:scale-105'
                }`}
              />
              <span className="truncate leading-none">{label}</span>
            </button>
          );
        })}

        {/* Expand drawer quick button on desktop when collapsed */}
        {!drawerOpen && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            title="Expand tool drawer"
            className="hidden lg:flex mt-auto h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </nav>

      {/* Smooth 300px Collapsible Drawer */}
      <div
        className={`overflow-hidden bg-white dark:bg-[#161822] border-b lg:border-b-0 border-[#E2E8F0] dark:border-[#2A2D3D] transition-all duration-200 ease-out ${
          drawerOpen
            ? 'w-full lg:w-[300px] lg:border-r opacity-100'
            : 'h-0 lg:h-auto lg:w-0 opacity-0 pointer-events-none border-none'
        }`}
      >
        <div className="flex h-full w-full lg:w-[300px] flex-col max-h-[380px] sm:max-h-[430px] lg:max-h-[calc(100vh-57px)]">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#2A2D3D] px-3.5 py-2.5 shrink-0">
            <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {activeRailMeta.label}
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              title="Collapse drawer"
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* ============================================================== */}
            {/* 1. TEMPLATES TAB (Instant Layouts & Style Presets)             */}
            {/* ============================================================== */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={templateQuery}
                    onChange={(e) => setTemplateQuery(e.target.value)}
                    placeholder="Search layouts & logo styles..."
                    className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Lockup Templates
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {filteredLayouts.map((arch) => (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => onSwitchLayout(arch.id)}
                        className="group flex flex-col items-start gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] p-2.5 text-left shadow-sm hover:border-emerald-600 dark:hover:border-emerald-500 transition-colors cursor-pointer"
                      >
                        <div className="flex h-10 w-full items-center justify-center rounded-lg bg-slate-50 dark:bg-[#141620] px-2">
                          {arch.id === 'icon-left' && (
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-md"
                                style={{ backgroundColor: activePalette.primary }}
                              />
                              <div className="space-y-1">
                                <span className="block h-1.5 w-10 rounded-full bg-slate-700 dark:bg-slate-300" />
                                <span className="block h-1 w-7 rounded-full bg-slate-400" />
                              </div>
                            </div>
                          )}
                          {arch.id === 'stacked' && (
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className="h-3.5 w-3.5 rounded-full"
                                style={{ backgroundColor: activePalette.primary }}
                              />
                              <span className="block h-1.5 w-11 rounded-full bg-slate-700 dark:bg-slate-300" />
                            </div>
                          )}
                          {arch.id === 'badge' && (
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2"
                              style={{ borderColor: activePalette.primary }}
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: activePalette.accent }}
                              />
                            </div>
                          )}
                          {arch.id === 'wordmark' && (
                            <span className="text-[10px] font-bold tracking-widest text-slate-800 dark:text-slate-200">
                              BRAND
                            </span>
                          )}
                          {arch.id === 'monogram-crest' && (
                            <div
                              className="flex h-7 w-6 items-center justify-center rounded-b-lg border-2 text-[9px] font-bold"
                              style={{
                                borderColor: activePalette.primary,
                                color: activePalette.primary,
                              }}
                            >
                              M
                            </div>
                          )}
                          {arch.id === 'split-emblem' && (
                            <div className="flex items-center gap-1.5">
                              <span className="h-1.5 w-4 rounded-full bg-slate-700 dark:bg-slate-300" />
                              <span
                                className="h-3.5 w-3.5 rotate-45 rounded-xs"
                                style={{ backgroundColor: activePalette.accent }}
                              />
                              <span className="h-1.5 w-4 rounded-full bg-slate-700 dark:bg-slate-300" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate w-full">
                          {arch.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-3.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Style Presets
                  </h3>
                  <div className="mt-2 space-y-2">
                    {filteredStyles.map((st) => {
                      const active = activeStyle === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => onSwitchStyle(st.id)}
                          className={`flex w-full flex-col rounded-xl border p-2.5 text-left shadow-sm transition-colors cursor-pointer ${
                            active
                              ? 'border-[#1B4332] bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white'
                              : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] text-slate-900 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-500'
                          }`}
                        >
                          <span className="text-xs font-semibold">{st.label}</span>
                          <span
                            className={`text-[10.5px] ${
                              active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {st.note}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 2. ELEMENTS TAB (Icons, Shapes & Badges, Dividers)             */}
            {/* ============================================================== */}
            {activeTab === 'elements' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-100 dark:bg-[#1E202B] p-0.5">
                  <button
                    type="button"
                    onClick={() => setIconSource('studio')}
                    className={`rounded-lg py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      iconSource === 'studio'
                        ? 'bg-white dark:bg-[#2A2D3D] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Studio Marks
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconSource('iconify')}
                    className={`rounded-lg py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      iconSource === 'iconify'
                        ? 'bg-white dark:bg-[#2A2D3D] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Lucide &amp; Iconify
                  </button>
                </div>

                {iconSource === 'studio' ? (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={iconQuery}
                        onChange={(e) => setIconQuery(e.target.value)}
                        placeholder="Search leaf, circuit, crown, shield..."
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <select
                      value={iconCategory}
                      onChange={(e) => setIconCategory(e.target.value)}
                      aria-label="Filter icon category"
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="All">All Vector Categories ({VECTOR_ICONS.length})</option>
                      <option value="Nature & Eco">Nature &amp; Eco</option>
                      <option value="Tech & Circuit">Tech &amp; Circuit</option>
                      <option value="Geometric">Geometric</option>
                      <option value="Emblems & Heraldry">Emblems &amp; Heraldry</option>
                      <option value="Architecture">Architecture</option>
                      <option value="Commerce & Craft">Commerce &amp; Craft</option>
                    </select>

                    <div className="grid grid-cols-3 gap-2">
                      {filteredIcons.map((icon) => (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => onAddIcon(icon.id)}
                          title={`Add ${icon.name}`}
                          className="group flex flex-col items-center gap-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] p-2.5 text-center shadow-sm hover:border-emerald-600 dark:hover:border-emerald-500 transition-colors cursor-pointer"
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
                          <span className="w-full truncate text-[10px] font-medium text-slate-600 dark:text-slate-300">
                            {icon.name.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={iconifyQuery}
                        onChange={(e) => setIconifyQuery(e.target.value)}
                        placeholder="Search 200k+ icons (crown, lion, leaf)..."
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <select
                      value={iconifyCollection}
                      onChange={(e) => setIconifyCollection(e.target.value)}
                      aria-label="Filter Iconify collection"
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100"
                    >
                      {ICONIFY_COLLECTIONS.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-wrap gap-1">
                      {['crown', 'leaf', 'shield', 'rocket', 'compass', 'diamond'].map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setIconifyQuery(term)}
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize cursor-pointer ${
                            iconifyQuery.toLowerCase() === term
                              ? 'border-[#1B4332] bg-[#1B4332] text-white'
                              : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {term}
                        </button>
                      ))}
                    </div>

                    {iconifyError && (
                      <p className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-[11px] text-red-700 dark:text-red-300">
                        {iconifyError}
                      </p>
                    )}

                    {iconifyLoading ? (
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="h-16 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-100 dark:bg-[#1E202B] animate-pulse"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {iconifyResults.map((item) => {
                          const isAdding = addingIconifyId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={Boolean(addingIconifyId)}
                              onClick={() => void handlePickIconifyIcon(item)}
                              title={`Insert ${item.id} as editable vector paths`}
                              className="group flex flex-col items-center gap-1 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] p-2.5 text-center shadow-sm hover:border-emerald-600 transition-colors cursor-pointer"
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
                              <span className="w-full truncate text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                {isAdding ? 'Adding...' : item.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                <div className="border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-3.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Shapes &amp; Badges ({SHAPE_OPTIONS.length})
                  </h3>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {SHAPE_OPTIONS.map((s) => {
                      const isOutline = s.kind === 'ring' || s.kind === 'frame';
                      return (
                        <button
                          key={s.kind}
                          type="button"
                          onClick={() => onAddShape(s.kind)}
                          title={`Add ${s.label}`}
                          className="flex flex-col items-center gap-1 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] px-1.5 py-2 text-[10px] font-medium text-slate-800 dark:text-slate-200 shadow-sm hover:border-emerald-600 cursor-pointer"
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

                <div className="border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-3.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Dividers &amp; Rules
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {DIVIDER_OPTIONS.map((d) => (
                      <button
                        key={d.kind}
                        type="button"
                        onClick={() => onAddDivider(d.kind)}
                        className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] px-2.5 py-2 text-[11px] font-medium text-slate-800 dark:text-slate-200 shadow-sm hover:border-emerald-600 cursor-pointer truncate"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 3. TEXT TAB (Wordmarks, Curved Arc, Pairings, Google Fonts)    */}
            {/* ============================================================== */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onAddText('heading')}
                    className="w-full rounded-full bg-gradient-to-r from-[#1B4332] via-[#245942] to-[#2D6A4F] px-4 py-2.5 text-center text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all cursor-pointer"
                  >
                    + Add Brand Wordmark
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onAddText('tagline')}
                      className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm hover:border-emerald-600 cursor-pointer"
                    >
                      + Tagline
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddText('curved')}
                      className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm hover:border-emerald-600 cursor-pointer"
                    >
                      + Curved Arc
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-3.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Font Pairings
                  </h3>
                  <div className="mt-2 space-y-2">
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
                        className="flex w-full flex-col rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] p-2.5 text-left shadow-sm hover:border-emerald-600 cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {pair.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {pair.note}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#E2E8F0] dark:border-[#2A2D3D] pt-3.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Google Fonts ({FONT_OPTIONS.length})
                  </h3>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={fontQuery}
                      onChange={(e) => setFontQuery(e.target.value)}
                      placeholder="Search Outfit, Sora, Cinzel..."
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
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
                        className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] px-3 py-2 text-left shadow-sm hover:border-emerald-600 cursor-pointer"
                      >
                        <span
                          className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                          style={{ fontFamily: f.cssFamily }}
                        >
                          {f.name}
                        </span>
                        <span className="text-[10px] text-slate-400">{f.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 4. BRAND TAB (Triad, Magic Recolor, 4 Variations, Palettes)    */}
            {/* ============================================================== */}
            {activeTab === 'brand' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] p-3 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {activePalette.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {[activePalette.primary, activePalette.accent, activePalette.secondary].map(
                        (hex, idx) => (
                          <span
                            key={idx}
                            className="h-4 w-4 rounded-full border border-black/15 dark:border-white/20"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        )
                      )}
                    </div>
                  </div>
                  {onMagicRecolor && (
                    <button
                      type="button"
                      onClick={onMagicRecolor}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#1B4332] via-[#245942] to-[#2D6A4F] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all cursor-pointer"
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                      1-Click Magic Recolor
                    </button>
                  )}
                  {onOpenVariations && (
                    <button
                      type="button"
                      onClick={onOpenVariations}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#161822] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#252836] transition-colors cursor-pointer"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Generate 4 Logo Variations
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={paletteQuery}
                    onChange={(e) => setPaletteQuery(e.target.value)}
                    placeholder="Search brand color palettes..."
                    className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  {filteredPalettes.map((pal) => {
                    const active = pal.id === activePalette.id;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => onApplyPalette(pal)}
                        className={`flex w-full flex-col gap-2 rounded-xl border p-2.5 text-left shadow-sm transition-colors cursor-pointer ${
                          active
                            ? 'border-emerald-600 bg-white dark:bg-[#1E202B] ring-1 ring-emerald-600'
                            : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] hover:border-slate-400 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
                          <span>{pal.name}</span>
                          {active && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[pal.background, pal.primary, pal.accent, pal.secondary, pal.text].map(
                            (hex, i) => (
                              <span
                                key={i}
                                className="h-5 flex-1 rounded-md border border-black/15 dark:border-white/15"
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

            {/* ============================================================== */}
            {/* 5. AI MAGIC TAB                                                */}
            {/* ============================================================== */}
            {activeTab === 'ai' && (
              <AiMagicPanel
                variant="sidebar"
                activePalette={activePalette}
                onInsertTracedSymbol={onInsertTracedSymbol}
              />
            )}

            {/* ============================================================== */}
            {/* 6. UPLOADS TAB (SVG Dropzone + Uploaded Vector Gallery)        */}
            {/* ============================================================== */}
            {activeTab === 'uploads' && (
              <div className="space-y-4">
                <input
                  ref={svgUploadRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleSvgFileChange}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverUpload(true);
                  }}
                  onDragLeave={() => setIsDragOverUpload(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverUpload(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && (file.name.endsWith('.svg') || file.type === 'image/svg+xml')) {
                      readSvgFile(file);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-center transition-colors ${
                    isDragOverUpload
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'border-[#CBD5E1] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B]'
                  }`}
                >
                  <Upload className="h-6 w-6 text-[#1B4332] dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Drop SVG vector artwork
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                      Parsed into recolorable multi-part layers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => svgUploadRef.current?.click()}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Choose .SVG File
                  </button>
                </div>

                {uploadedSvgs.length > 0 && (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={uploadQuery}
                        onChange={(e) => setUploadQuery(e.target.value)}
                        placeholder="Search uploaded SVGs..."
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {filteredUploads.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onUploadCustomSvg(item.svgText, item.name, false)}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] p-2.5 text-center shadow-sm hover:border-emerald-600 cursor-pointer"
                        >
                          <FileCode2 className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                          <span className="w-full truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">
                            {item.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {uploadedSvgs.length === 0 && (
                  <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    Uploaded SVG files appear here as reusable vector cards during your session. Need to vectorize a PNG/JPG? Open the AI Magic tab.
                  </p>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* 7. LAYERS TAB (Search + Z-Order + Visibility + Lock)           */}
            {/* ============================================================== */}
            {activeTab === 'layers' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={layerQuery}
                    onChange={(e) => setLayerQuery(e.target.value)}
                    placeholder={`Search ${doc.layers.length} layers...`}
                    className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  {layersTopFirst.map((layer) => {
                    const isSelected = selectedLayerIds.includes(layer.id);
                    return (
                      <div
                        key={layer.id}
                        className={`flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-2 text-xs shadow-sm transition-colors ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                            : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] hover:border-slate-400 dark:hover:border-slate-500'
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
                          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {layer.name}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">
                            {layer.type}
                            {layer.clipMask?.enabled ? ' · Masked' : ''}
                            {layer.flipX || layer.flipY ? ' · Flipped' : ''}
                          </p>
                        </button>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onReorderLayer(layer.id, 'up')}
                            className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                            title="Bring forward"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onReorderLayer(layer.id, 'down')}
                            className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                            title="Send backward"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleLayerVisible(layer.id)}
                            className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                            title={layer.visible ? 'Hide layer' : 'Show layer'}
                          >
                            {layer.visible ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleLayerLock(layer.id)}
                            className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                            title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                          >
                            {layer.locked ? (
                              <Lock className="h-3.5 w-3.5 text-amber-600" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateLayer(layer.id)}
                            className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
                            title="Duplicate layer"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteLayer(layer.id)}
                            className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
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
        </div>
      </div>
    </aside>
  );
};
