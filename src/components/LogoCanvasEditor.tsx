import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookmarkCheck,
  CheckCircle2,
  Eye,
  FolderPlus,
  Grid3x3,
  Maximize2,
  PenTool,
  Plus,
  RotateCcw,
  Ruler,
  Scan,
  Scissors,
  SlidersHorizontal,
  Spline,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ColorPalette,
  FontPairing,
  LogoDocument,
  LogoLayer,
  PathLayer,
  SurfaceTextureConfig,
  TextLayer,
} from '../types/logo';
import {
  analyzeDocumentContrast,
  checkSafeZoneViolations,
} from '../utils/contrastChecker';
import { BooleanOpKind } from '../utils/booleanOps';
import { computeTextGlyphLayout } from '../utils/glyphLayout';
import {
  EditableNode,
  EditableSubpath,
  getSubpathsBounds,
  mapArtboardPointToLocal,
  mapLocalPointToArtboard,
  parseSvgPathToSubpaths,
  refitPathLayerAfterNodeEdit,
  serializeSubpathsToPathData,
} from '../utils/pathGeometry';
import { LogoSceneLayers } from './CanvasLayerRenderer';
import { FloatingContextToolbar } from './FloatingContextToolbar';

export type CanvasToolMode = 'select' | 'pen' | 'nodes' | 'per-letter';

interface SnapGuide {
  axis: 'x' | 'y';
  pos: number;
}

interface MarqueeBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface InteractionState {
  mode: 'drag' | 'resize' | 'rotate' | 'marquee';
  primaryLayerId?: string;
  handle?: string;
  startClientX: number;
  startClientY: number;
  initialLayersMap: Record<string, LogoLayer>;
  currentLayersMap: Record<string, LogoLayer>;
  marqueeStart?: { x: number; y: number };
}

interface LogoCanvasEditorProps {
  doc: LogoDocument;
  activePalette: ColorPalette;
  selectedLayerIds: string[];
  onSelectLayers: (ids: string[]) => void;
  onPreviewLayersChange: (layersMap: Record<string, LogoLayer>) => void;
  onCommitLayersChange: (
    beforeMap: Record<string, LogoLayer>,
    afterMap: Record<string, LogoLayer>
  ) => void;
  onUpdateTextLive: (layerId: string, text: string) => void;
  onUpdateLayer: (updated: LogoLayer) => void;
  onAlignSelectedLayers: (
    mode: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'
  ) => void;
  onBatchUpdateSelected: (patch: Partial<LogoLayer>) => void;
  onBooleanCombine?: (op: BooleanOpKind) => void;
  onCreateClippingMask?: () => void;
  onKnockoutSelected?: () => void;
  onUpdateSurfaceTexture?: (next: SurfaceTextureConfig) => void;
  editorNotice?: string | null;
  onApplyFontPairing: (pairing: FontPairing) => void;
  onReorderLayer: (id: string, dir: 'up' | 'down') => void;
  onConvertTextToPath: (layer: TextLayer) => Promise<void>;
  onUpdateDocBackground: (bg: string, transparent: boolean) => void;
  onResizeArtboard: (width: number, height: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onNudgeSelected: (dx: number, dy: number) => void;
  onSendToVisitingCard: () => void;
  onOpenWizard: () => void;
  onSaveProject?: () => void;
  onMagicRecolor?: () => void;
  onOpenVariations?: () => void;
  onFixTextContrast?: (layerId: string, suggestedHex: string) => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
  onToggleBackgroundLock?: () => void;
  activeProjectName?: string | null;
  autoSaveState?: 'saved' | 'saving';
  pages: Array<{ id: string; title: string }>;
  activePageIndex: number;
  onSwitchPage: (index: number) => void;
  onAddPage: () => void;
  onRemovePage: (index: number) => void;
  onOpenMockups?: () => void;
  canvasToolMode?: CanvasToolMode;
  onChangeToolMode?: (mode: CanvasToolMode) => void;
  penAttachTextId?: string | null;
  onTogglePenTool?: () => void;
  onStartPenForText?: (textLayerId: string) => void;
  onCreateLayer?: (layer: LogoLayer, attachToTextId?: string | null) => void;
}

export const LogoCanvasEditor: React.FC<LogoCanvasEditorProps> = ({
  doc,
  activePalette,
  selectedLayerIds,
  onSelectLayers,
  onPreviewLayersChange,
  onCommitLayersChange,
  onUpdateTextLive,
  onUpdateLayer,
  onAlignSelectedLayers,
  onBatchUpdateSelected,
  onBooleanCombine,
  onCreateClippingMask,
  onKnockoutSelected,
  onUpdateSurfaceTexture,
  editorNotice,
  onApplyFontPairing,
  onReorderLayer,
  onConvertTextToPath,
  onUpdateDocBackground,
  onResizeArtboard,
  canUndo: _canUndo,
  canRedo: _canRedo,
  onUndo,
  onRedo,
  onDeleteSelected,
  onDuplicateSelected,
  onNudgeSelected,
  onSendToVisitingCard,
  onOpenWizard,
  onSaveProject,
  onMagicRecolor,
  onOpenVariations,
  onFixTextContrast,
  onGroupSelected,
  onUngroupSelected,
  onToggleBackgroundLock,
  activeProjectName,
  autoSaveState = 'saved',
  pages,
  activePageIndex,
  onSwitchPage,
  onAddPage,
  onRemovePage,
  onOpenMockups,
  canvasToolMode = 'select',
  onChangeToolMode,
  penAttachTextId = null,
  onTogglePenTool,
  onStartPenForText,
  onCreateLayer,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [gridMode, setGridMode] = useState<'off' | 'square' | 'thirds' | 'golden'>('square');
  const [rulerUnit, setRulerUnit] = useState<'off' | 'px' | 'mm'>('px');
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [showBleed, setShowBleed] = useState<boolean>(false);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [marquee, setMarquee] = useState<MarqueeBox | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);
  const [rulerMetrics, setRulerMetrics] = useState<{
    originX: number;
    originY: number;
    viewW: number;
    viewH: number;
  }>({ originX: 40, originY: 40, viewW: 900, viewH: 700 });

  // Phase 20: Pen Tool draft, Phase 17 Node Editor state, and Per-Letter Edit state
  const [penDraft, setPenDraft] = useState<{
    nodes: EditableNode[];
    cursor: { x: number; y: number } | null;
  } | null>(null);
  const penHandleDragRef = useRef<{
    anchorX: number;
    anchorY: number;
    nodeIndex: number;
  } | null>(null);

  const [nodeEditorPaths, setNodeEditorPaths] = useState<EditableSubpath[][]>([]);
  const [selectedNode, setSelectedNode] = useState<{
    pathIdx: number;
    subIdx: number;
    nodeIdx: number;
  } | null>(null);
  const nodeDragRef = useRef<{
    pathIdx: number;
    subIdx: number;
    nodeIdx: number;
    part: 'anchor' | 'handleIn' | 'handleOut';
    beforeLayer: PathLayer;
    workingPaths: EditableSubpath[][];
    currentList: string[];
    moved: boolean;
  } | null>(null);

  const [perLetterTarget, setPerLetterTarget] = useState<{
    kind: 'letter' | 'gap';
    index: number;
  } | null>(null);
  const perLetterDragRef = useRef<{
    kind: 'letter' | 'gap';
    index: number;
    startClientX: number;
    startClientY: number;
    startVal: number;
    gapAngleRad: number;
    beforeLayer: TextLayer;
    currentLayer: TextLayer;
    moved: boolean;
  } | null>(null);

  const showGrid = gridMode !== 'off';

  const viewportRef = useRef<HTMLDivElement>(null);
  const artboardBoxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const svgRectRef = useRef<DOMRect | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ clientX: number; clientY: number; shiftKey: boolean } | null>(
    null
  );
  const lastMarqueeIdsRef = useRef<string>('');
  const userAdjustedZoomRef = useRef<boolean>(false);

  // Keep latest reactive values in a ref so window listeners bind once without thrashing
  const latestRef = useRef({
    doc,
    snapEnabled,
    showGrid,
    selectedLayerIds,
    editingTextId,
    canvasToolMode,
    penDraft,
    selectedNode,
    nodeEditorPaths,
    onSelectLayers,
    onPreviewLayersChange,
    onCommitLayersChange,
    onUpdateLayer,
    onUndo,
    onRedo,
    onDeleteSelected,
    onDuplicateSelected,
    onNudgeSelected,
    onGroupSelected,
    onUngroupSelected,
    onChangeToolMode,
  });
  latestRef.current = {
    doc,
    snapEnabled,
    showGrid,
    selectedLayerIds,
    editingTextId,
    canvasToolMode,
    penDraft,
    selectedNode,
    nodeEditorPaths,
    onSelectLayers,
    onPreviewLayersChange,
    onCommitLayersChange,
    onUpdateLayer,
    onUndo,
    onRedo,
    onDeleteSelected,
    onDuplicateSelected,
    onNudgeSelected,
    onGroupSelected,
    onUngroupSelected,
    onChangeToolMode,
  };

  const selectedSet = useMemo(() => new Set(selectedLayerIds), [selectedLayerIds]);
  const selectedLayers = useMemo(
    () => doc.layers.filter((l) => selectedSet.has(l.id) && l.visible),
    [doc.layers, selectedSet]
  );

  // Collective bounding box when multiple objects are selected
  const groupBounds = useMemo(() => {
    if (selectedLayers.length <= 1) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const l of selectedLayers) {
      minX = Math.min(minX, l.x);
      minY = Math.min(minY, l.y);
      maxX = Math.max(maxX, l.x + l.width);
      maxY = Math.max(maxY, l.y + l.height);
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedLayers]);

  const singleSelected = selectedLayers.length === 1 ? selectedLayers[0] : null;
  const singlePathLayer = singleSelected?.type === 'path' ? singleSelected : null;
  const singleTextLayer = singleSelected?.type === 'text' ? singleSelected : null;

  const perLetterLayout = useMemo(() => {
    if (canvasToolMode !== 'per-letter' || !singleTextLayer) return null;
    return computeTextGlyphLayout(singleTextLayer, doc.layers);
  }, [canvasToolMode, singleTextLayer, doc.layers]);

  // Clear Pen Tool draft when exiting pen mode
  useEffect(() => {
    if (canvasToolMode !== 'pen') {
      setPenDraft(null);
      penHandleDragRef.current = null;
    }
  }, [canvasToolMode]);

  // Sync parsed subpaths when entering Phase 17 Node Editor or switching selected path layer
  const nodePathSignature = singlePathLayer ? singlePathLayer.pathDataList.join('||') : '';
  useEffect(() => {
    if (canvasToolMode !== 'nodes' || !singlePathLayer) {
      setNodeEditorPaths([]);
      setSelectedNode(null);
      return;
    }
    if (nodeDragRef.current) return;
    setNodeEditorPaths(singlePathLayer.pathDataList.map((d) => parseSvgPathToSubpaths(d)));
  }, [canvasToolMode, singlePathLayer?.id, nodePathSignature]);

  // Initialize Per-Letter target when entering Per-Letter mode
  useEffect(() => {
    if (canvasToolMode !== 'per-letter' || !singleTextLayer) {
      setPerLetterTarget(null);
      return;
    }
    setPerLetterTarget((prev) => prev ?? { kind: 'letter', index: 0 });
  }, [canvasToolMode, singleTextLayer?.id]);

  const contrastReport = useMemo(
    () => analyzeDocumentContrast(doc, activePalette),
    [doc, activePalette]
  );

  const safeZoneReport = useMemo(
    () => (showSafeZone ? checkSafeZoneViolations(doc, 0.08) : null),
    [doc, showSafeZone]
  );

  const computeFitZoom = useCallback(
    (containerW: number, containerH?: number) => {
      const horizontalPad = containerW < 640 ? 32 : 84;
      const verticalPad = containerH && containerH < 600 ? 120 : 156;
      const availableW = Math.max(220, containerW - horizontalPad);
      const fitW = availableW / Math.max(1, doc.width);
      const fitH = containerH
        ? Math.max(200, containerH - verticalPad) / Math.max(1, doc.height)
        : 1;
      return Math.min(1, Math.max(0.25, +Math.min(fitW, fitH).toFixed(2)));
    },
    [doc.width, doc.height]
  );

  const handleFitZoom = useCallback(() => {
    userAdjustedZoomRef.current = false;
    const el = viewportRef.current;
    if (!el) {
      setZoom(1);
      return;
    }
    setZoom(computeFitZoom(el.clientWidth, el.clientHeight));
  }, [computeFitZoom]);

  const syncRulerMetrics = useCallback(() => {
    const vp = viewportRef.current;
    const ab = artboardBoxRef.current;
    if (!vp || !ab) return;
    const vpRect = vp.getBoundingClientRect();
    const abRect = ab.getBoundingClientRect();
    setRulerMetrics({
      originX: abRect.left - vpRect.left,
      originY: abRect.top - vpRect.top,
      viewW: vp.clientWidth,
      viewH: vp.clientHeight,
    });
  }, []);

  // Responsive auto-fit on mobile/tablet viewports via ResizeObserver
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const applyResponsiveFit = () => {
      if (!userAdjustedZoomRef.current) {
        const fit = computeFitZoom(el.clientWidth, el.clientHeight);
        setZoom(fit);
      }
      requestAnimationFrame(syncRulerMetrics);
    };

    applyResponsiveFit();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      applyResponsiveFit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [computeFitZoom, syncRulerMetrics]);

  useEffect(() => {
    const id = requestAnimationFrame(syncRulerMetrics);
    return () => cancelAnimationFrame(id);
  }, [zoom, doc.width, doc.height, rulerUnit, syncRulerMetrics]);

  const clientToArtboard = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const rect = svgRectRef.current ?? svg?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const currentDoc = latestRef.current.doc;
    return {
      x: ((clientX - rect.left) / rect.width) * currentDoc.width,
      y: ((clientY - rect.top) / rect.height) * currentDoc.height,
    };
  };

  const computeGroupSnap = (
    movingBox: { x: number; y: number; width: number; height: number },
    excludedIds: Set<string>,
    dx: number,
    dy: number
  ): { snappedDx: number; snappedDy: number; guides: SnapGuide[] } => {
    const { doc: curDoc, snapEnabled: snapOn, showGrid: gridOn } = latestRef.current;
    let nx = movingBox.x + dx;
    let ny = movingBox.y + dy;
    const guides: SnapGuide[] = [];

    if (!snapOn) {
      return {
        snappedDx: Math.round(dx),
        snappedDy: Math.round(dy),
        guides,
      };
    }

    const threshold = 7;
    const xTargets: number[] = [curDoc.width / 2, 40, curDoc.width - 40];
    const yTargets: number[] = [curDoc.height / 2, 40, curDoc.height - 40];

    for (const other of curDoc.layers) {
      if (excludedIds.has(other.id) || !other.visible) continue;
      xTargets.push(other.x, other.x + other.width / 2, other.x + other.width);
      yTargets.push(other.y, other.y + other.height / 2, other.y + other.height);
    }

    const xCandidates = [
      { offset: 0, val: nx },
      { offset: movingBox.width / 2, val: nx + movingBox.width / 2 },
      { offset: movingBox.width, val: nx + movingBox.width },
    ];

    let snappedX = false;
    for (const cand of xCandidates) {
      if (snappedX) break;
      for (const target of xTargets) {
        if (Math.abs(cand.val - target) <= threshold) {
          nx = target - cand.offset;
          guides.push({ axis: 'x', pos: target });
          snappedX = true;
          break;
        }
      }
    }

    const yCandidates = [
      { offset: 0, val: ny },
      { offset: movingBox.height / 2, val: ny + movingBox.height / 2 },
      { offset: movingBox.height, val: ny + movingBox.height },
    ];

    let snappedY = false;
    for (const cand of yCandidates) {
      if (snappedY) break;
      for (const target of yTargets) {
        if (Math.abs(cand.val - target) <= threshold) {
          ny = target - cand.offset;
          guides.push({ axis: 'y', pos: target });
          snappedY = true;
          break;
        }
      }
    }

    if (!snappedX && gridOn) {
      const gx = Math.round(nx / 10) * 10;
      if (Math.abs(nx - gx) < 3) nx = gx;
    }
    if (!snappedY && gridOn) {
      const gy = Math.round(ny / 10) * 10;
      if (Math.abs(ny - gy) < 3) ny = gy;
    }

    return {
      snappedDx: Math.round(nx - movingBox.x),
      snappedDy: Math.round(ny - movingBox.y),
      guides,
    };
  };

  const isInteracting = interaction !== null;

  // Bind pointermove/pointerup/pointercancel ONLY once per drag gesture & throttle with rAF
  useEffect(() => {
    if (!isInteracting) return;

    const flushPointerMove = () => {
      rafIdRef.current = null;
      const pointer = pendingPointerRef.current;
      const st = interactionRef.current;
      if (!pointer || !st) return;

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svgRectRef.current ?? svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const {
        doc: curDoc,
        onSelectLayers: selectLayers,
        onPreviewLayersChange: previewLayers,
      } = latestRef.current;

      if (st.mode === 'marquee' && st.marqueeStart) {
        const pt = clientToArtboard(pointer.clientX, pointer.clientY);
        const box: MarqueeBox = {
          startX: st.marqueeStart.x,
          startY: st.marqueeStart.y,
          endX: pt.x,
          endY: pt.y,
        };
        setMarquee(box);

        const rx = Math.min(box.startX, box.endX);
        const ry = Math.min(box.startY, box.endY);
        const rw = Math.abs(box.endX - box.startX);
        const rh = Math.abs(box.endY - box.startY);

        if (rw > 4 || rh > 4) {
          const hits = curDoc.layers
            .filter(
              (l) =>
                l.visible &&
                !l.locked &&
                l.x < rx + rw &&
                l.x + l.width > rx &&
                l.y < ry + rh &&
                l.y + l.height > ry
            )
            .map((l) => l.id);
          const signature = hits.join(',');
          if (signature !== lastMarqueeIdsRef.current) {
            lastMarqueeIdsRef.current = signature;
            selectLayers(hits);
          }
        }
        return;
      }

      const scaleX = curDoc.width / rect.width;
      const scaleY = curDoc.height / rect.height;
      const dx = (pointer.clientX - st.startClientX) * scaleX;
      const dy = (pointer.clientY - st.startClientY) * scaleY;

      if (st.mode === 'drag') {
        const initialList = Object.values(st.initialLayersMap);
        if (initialList.length === 0) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const l of initialList) {
          minX = Math.min(minX, l.x);
          minY = Math.min(minY, l.y);
          maxX = Math.max(maxX, l.x + l.width);
          maxY = Math.max(maxY, l.y + l.height);
        }

        const excluded = new Set(Object.keys(st.initialLayersMap));
        const { snappedDx, snappedDy, guides } = computeGroupSnap(
          { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
          excluded,
          dx,
          dy
        );

        const nextMap: Record<string, LogoLayer> = {};
        for (const l of initialList) {
          nextMap[l.id] = {
            ...l,
            x: l.x + snappedDx,
            y: l.y + snappedDy,
          };
        }
        st.currentLayersMap = nextMap;
        setSnapGuides(guides);
        previewLayers(nextMap);
      } else if (st.mode === 'resize' && st.primaryLayerId && st.handle) {
        const base = st.initialLayersMap[st.primaryLayerId];
        if (!base) return;

        const minSize = 20;
        let { x, y, width, height } = base;
        const h = st.handle;

        if (h.includes('e')) width = Math.max(minSize, width + dx);
        if (h.includes('s')) height = Math.max(minSize, height + dy);
        if (h.includes('w')) {
          const nextW = Math.max(minSize, width - dx);
          x = x + (width - nextW);
          width = nextW;
        }
        if (h.includes('n')) {
          const nextH = Math.max(minSize, height - dy);
          y = y + (height - nextH);
          height = nextH;
        }

        const keepAspect =
          pointer.shiftKey ||
          ((base.type === 'icon' || base.type === 'custom-svg') && h.length === 2);

        if (keepAspect && base.height > 0) {
          const ratio = base.width / base.height;
          height = Math.max(minSize, Math.round(width / ratio));
        }

        const updated: LogoLayer = {
          ...base,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        };
        st.currentLayersMap = { [base.id]: updated };
        previewLayers(st.currentLayersMap);
      } else if (st.mode === 'rotate' && st.primaryLayerId) {
        const base = st.initialLayersMap[st.primaryLayerId];
        if (!base) return;
        const pt = clientToArtboard(pointer.clientX, pointer.clientY);
        const cx = base.x + base.width / 2;
        const cy = base.y + base.height / 2;
        let deg = (Math.atan2(pt.y - cy, pt.x - cx) * 180) / Math.PI + 90;
        if (pointer.shiftKey) deg = Math.round(deg / 15) * 15;
        else deg = Math.round(deg);

        const updated: LogoLayer = {
          ...base,
          rotation: ((deg % 360) + 360) % 360,
        };
        st.currentLayersMap = { [base.id]: updated };
        previewLayers(st.currentLayersMap);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      pendingPointerRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        shiftKey: e.shiftKey,
      };
      if (rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(flushPointerMove);
      }
    };

    const handlePointerFinish = () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        flushPointerMove();
      }
      pendingPointerRef.current = null;
      svgRectRef.current = null;
      lastMarqueeIdsRef.current = '';

      const st = interactionRef.current;
      if (st && st.mode !== 'marquee') {
        const hasChange = Object.keys(st.initialLayersMap).some((id) => {
          const a = st.initialLayersMap[id];
          const b = st.currentLayersMap[id];
          return (
            a &&
            b &&
            (a.x !== b.x ||
              a.y !== b.y ||
              a.width !== b.width ||
              a.height !== b.height ||
              a.rotation !== b.rotation)
          );
        });
        if (hasChange) {
          latestRef.current.onCommitLayersChange(st.initialLayersMap, st.currentLayersMap);
        }
      }
      interactionRef.current = null;
      setInteraction(null);
      setSnapGuides([]);
      setMarquee(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerFinish);
    window.addEventListener('pointercancel', handlePointerFinish);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerFinish);
      window.removeEventListener('pointercancel', handlePointerFinish);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      pendingPointerRef.current = null;
      svgRectRef.current = null;
    };
  }, [isInteracting]);

  // Keyboard shortcuts: bound once on mount via refs (zero listener churn)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
      const cur = latestRef.current;
      if (cur.editingTextId) return;

      if (e.key === 'Escape' && cur.canvasToolMode !== 'select') {
        e.preventDefault();
        setPenDraft(null);
        cur.onChangeToolMode?.('select');
        return;
      }

      if (cur.canvasToolMode === 'pen') {
        if (e.key === 'Enter' && cur.penDraft && cur.penDraft.nodes.length >= 2) {
          e.preventDefault();
          commitPenPathRef.current?.(cur.penDraft.nodes, false);
          return;
        }
        if ((e.key === 'Backspace' || e.key === 'Delete') && cur.penDraft) {
          e.preventDefault();
          setPenDraft((prev) =>
            prev && prev.nodes.length > 1
              ? { ...prev, nodes: prev.nodes.slice(0, -1) }
              : null
          );
          return;
        }
      }

      if (cur.canvasToolMode === 'nodes' && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (cur.selectedNode) {
          e.preventDefault();
          deleteSelectedNodeRef.current?.();
          return;
        }
      }

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) cur.onRedo();
        else cur.onUndo();
        return;
      }

      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        cur.onRedo();
        return;
      }

      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        cur.onDuplicateSelected();
        return;
      }

      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          cur.onUngroupSelected?.();
        } else {
          cur.onGroupSelected?.();
        }
        return;
      }

      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        cur.onSelectLayers(
          cur.doc.layers.filter((l) => l.visible && !l.locked).map((l) => l.id)
        );
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && cur.selectedLayerIds.length > 0) {
        e.preventDefault();
        cur.onDeleteSelected();
        return;
      }

      if (cur.selectedLayerIds.length > 0) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          cur.onNudgeSelected(-step, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          cur.onNudgeSelected(step, 0);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          cur.onNudgeSelected(0, -step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          cur.onNudgeSelected(0, step);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // =========================================================================
  // PHASE 20 & PHASE 17 HELPERS: PEN TOOL, NODE EDITOR, PER-LETTER EDIT
  // =========================================================================

  const commitPenPath = useCallback(
    (nodes: EditableNode[], closed: boolean) => {
      if (nodes.length < 2) {
        setPenDraft(null);
        return;
      }
      const pad = closed ? 8 : 14;
      const b = getSubpathsBounds([{ closed, nodes }]);
      const ox = b.minX - pad;
      const oy = b.minY - pad;
      const vw = Math.max(24, b.width + pad * 2);
      const vh = Math.max(24, b.height + pad * 2);
      const localD = serializeSubpathsToPathData([
        {
          closed,
          nodes: nodes.map((n) => ({
            x: n.x - ox,
            y: n.y - oy,
            handleIn: n.handleIn ? { x: n.handleIn.x - ox, y: n.handleIn.y - oy } : null,
            handleOut: n.handleOut ? { x: n.handleOut.x - ox, y: n.handleOut.y - oy } : null,
            smooth: n.smooth,
          })),
        },
      ]);

      const newLayer: PathLayer = {
        id: `pth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: penAttachTextId ? 'Text Path Curve' : closed ? 'Custom Vector Shape' : 'Bezier Curve',
        type: 'path',
        x: Math.round(ox),
        y: Math.round(oy),
        width: Math.round(vw),
        height: Math.round(vh),
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: closed ? activePalette.primary : 'transparent',
        stroke: closed ? 'none' : activePalette.primary,
        strokeWidth: closed ? 0 : 3.5,
        shadow: {
          enabled: false,
          color: 'rgba(17, 24, 39, 0.18)',
          blur: 10,
          offsetX: 0,
          offsetY: 6,
        },
        pathDataList: [localD],
        sourceViewBox: { width: vw, height: vh },
        isOpenPath: !closed,
      };

      setPenDraft(null);
      penHandleDragRef.current = null;
      onCreateLayer?.(newLayer, penAttachTextId);
    },
    [activePalette.primary, onCreateLayer, penAttachTextId]
  );

  const commitPenPathRef = useRef(commitPenPath);
  commitPenPathRef.current = commitPenPath;

  const startPenPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    cacheSvgRect();
    const pt = clientToArtboard(e.clientX, e.clientY);

    // Clicking first anchor closes loop when >= 2 points placed
    if (penDraft && penDraft.nodes.length >= 2) {
      const first = penDraft.nodes[0];
      if (Math.hypot(pt.x - first.x, pt.y - first.y) <= Math.max(8, 12 / zoom)) {
        commitPenPath(penDraft.nodes, true);
        return;
      }
    }

    const nextIdx = penDraft ? penDraft.nodes.length : 0;
    const newNode: EditableNode = {
      x: pt.x,
      y: pt.y,
      handleIn: null,
      handleOut: null,
      smooth: true,
    };

    setPenDraft((prev) => ({
      nodes: [...(prev?.nodes ?? []), newNode],
      cursor: pt,
    }));

    penHandleDragRef.current = {
      anchorX: pt.x,
      anchorY: pt.y,
      nodeIndex: nextIdx,
    };

    const onMove = (ev: PointerEvent) => {
      const active = penHandleDragRef.current;
      if (!active) return;
      const curPt = clientToArtboard(ev.clientX, ev.clientY);
      const dx = curPt.x - active.anchorX;
      const dy = curPt.y - active.anchorY;
      if (Math.hypot(dx, dy) < 2) return;
      setPenDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cursor: curPt,
          nodes: prev.nodes.map((n, idx) =>
            idx === active.nodeIndex
              ? {
                  ...n,
                  handleOut: { x: curPt.x, y: curPt.y },
                  handleIn: { x: active.anchorX - dx, y: active.anchorY - dy },
                  smooth: true,
                }
              : n
          ),
        };
      });
    };

    const onUp = () => {
      penHandleDragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const startNodeControlDrag = (
    e: React.PointerEvent,
    pathLayer: PathLayer,
    pathIdx: number,
    subIdx: number,
    nodeIdx: number,
    part: 'anchor' | 'handleIn' | 'handleOut'
  ) => {
    e.stopPropagation();
    if (pathLayer.locked) return;
    cacheSvgRect();
    setSelectedNode({ pathIdx, subIdx, nodeIdx });

    const clonePaths: EditableSubpath[][] = nodeEditorPaths.map((spList) =>
      spList.map((sp) => ({
        closed: sp.closed,
        nodes: sp.nodes.map((n) => ({
          ...n,
          handleIn: n.handleIn ? { ...n.handleIn } : null,
          handleOut: n.handleOut ? { ...n.handleOut } : null,
        })),
      }))
    );

    nodeDragRef.current = {
      pathIdx,
      subIdx,
      nodeIdx,
      part,
      beforeLayer: pathLayer,
      workingPaths: clonePaths,
      currentList: [...pathLayer.pathDataList],
      moved: false,
    };

    const onMove = (ev: PointerEvent) => {
      const drag = nodeDragRef.current;
      if (!drag) return;
      const artPt = clientToArtboard(ev.clientX, ev.clientY);
      const [lx, ly] = mapArtboardPointToLocal(artPt.x, artPt.y, drag.beforeLayer);
      const sx = Math.max(1, drag.beforeLayer.sourceViewBox.width) / Math.max(1, drag.beforeLayer.width);
      const sy = Math.max(1, drag.beforeLayer.sourceViewBox.height) / Math.max(1, drag.beforeLayer.height);
      const px = lx * sx;
      const py = ly * sy;

      const sp = drag.workingPaths[drag.pathIdx]?.[drag.subIdx];
      const node = sp?.nodes[drag.nodeIdx];
      if (!node) return;

      drag.moved = true;
      if (drag.part === 'anchor') {
        const dx = px - node.x;
        const dy = py - node.y;
        node.x = px;
        node.y = py;
        if (node.handleIn) {
          node.handleIn = { x: node.handleIn.x + dx, y: node.handleIn.y + dy };
        }
        if (node.handleOut) {
          node.handleOut = { x: node.handleOut.x + dx, y: node.handleOut.y + dy };
        }
      } else if (drag.part === 'handleIn') {
        node.handleIn = { x: px, y: py };
        if (node.smooth && !ev.altKey && node.handleOut) {
          const vx = node.x - px;
          const vy = node.y - py;
          const vLen = Math.hypot(vx, vy);
          const oppLen = Math.hypot(node.handleOut.x - node.x, node.handleOut.y - node.y);
          if (vLen > 0.01 && oppLen > 0.01) {
            node.handleOut = {
              x: node.x + (vx / vLen) * oppLen,
              y: node.y + (vy / vLen) * oppLen,
            };
          }
        }
      } else if (drag.part === 'handleOut') {
        node.handleOut = { x: px, y: py };
        if (node.smooth && !ev.altKey && node.handleIn) {
          const vx = node.x - px;
          const vy = node.y - py;
          const vLen = Math.hypot(vx, vy);
          const oppLen = Math.hypot(node.handleIn.x - node.x, node.handleIn.y - node.y);
          if (vLen > 0.01 && oppLen > 0.01) {
            node.handleIn = {
              x: node.x + (vx / vLen) * oppLen,
              y: node.y + (vy / vLen) * oppLen,
            };
          }
        }
      }

      const nextList = drag.workingPaths.map((spList) => serializeSubpathsToPathData(spList));
      drag.currentList = nextList;
      setNodeEditorPaths(
        drag.workingPaths.map((spList) =>
          spList.map((s) => ({
            closed: s.closed,
            nodes: s.nodes.map((n) => ({
              ...n,
              handleIn: n.handleIn ? { ...n.handleIn } : null,
              handleOut: n.handleOut ? { ...n.handleOut } : null,
            })),
          }))
        )
      );
      latestRef.current.onPreviewLayersChange({
        [drag.beforeLayer.id]: { ...drag.beforeLayer, pathDataList: nextList },
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const drag = nodeDragRef.current;
      nodeDragRef.current = null;
      svgRectRef.current = null;
      if (drag && drag.moved) {
        const refitted = refitPathLayerAfterNodeEdit(drag.beforeLayer, drag.currentList);
        latestRef.current.onCommitLayersChange(
          { [drag.beforeLayer.id]: drag.beforeLayer },
          { [refitted.id]: refitted }
        );
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const toggleNodeSmooth = (
    pathLayer: PathLayer,
    pathIdx: number,
    subIdx: number,
    nodeIdx: number
  ) => {
    const nextPaths = nodeEditorPaths.map((spList, pI) =>
      spList.map((sp, sI) => ({
        closed: sp.closed,
        nodes: sp.nodes.map((n, nI) => {
          if (pI !== pathIdx || sI !== subIdx || nI !== nodeIdx) return n;
          const nextSmooth = !n.smooth;
          let handleIn = n.handleIn;
          let handleOut = n.handleOut;
          if (nextSmooth) {
            if (handleIn && handleOut) {
              const vx = n.x - handleIn.x;
              const vy = n.y - handleIn.y;
              const len = Math.hypot(vx, vy) || 1;
              const outLen = Math.hypot(handleOut.x - n.x, handleOut.y - n.y) || 12;
              handleOut = { x: n.x + (vx / len) * outLen, y: n.y + (vy / len) * outLen };
            } else if (!handleIn && !handleOut) {
              handleIn = { x: n.x - 14, y: n.y };
              handleOut = { x: n.x + 14, y: n.y };
            }
          }
          return { ...n, smooth: nextSmooth, handleIn, handleOut };
        }),
      }))
    );
    const nextList = nextPaths.map((spList) => serializeSubpathsToPathData(spList));
    const refitted = refitPathLayerAfterNodeEdit(pathLayer, nextList);
    setNodeEditorPaths(nextPaths);
    onUpdateLayer(refitted);
  };

  const deleteSelectedNode = useCallback(() => {
    if (!singlePathLayer || !selectedNode) return;
    const { pathIdx, subIdx, nodeIdx } = selectedNode;
    const targetSub = nodeEditorPaths[pathIdx]?.[subIdx];
    if (!targetSub || targetSub.nodes.length <= 2) return;
    const nextPaths = nodeEditorPaths.map((spList, pI) =>
      spList.map((sp, sI) =>
        pI === pathIdx && sI === subIdx
          ? { ...sp, nodes: sp.nodes.filter((_, idx) => idx !== nodeIdx) }
          : sp
      )
    );
    const nextList = nextPaths.map((spList) => serializeSubpathsToPathData(spList));
    const refitted = refitPathLayerAfterNodeEdit(singlePathLayer, nextList);
    setNodeEditorPaths(nextPaths);
    setSelectedNode(null);
    onUpdateLayer(refitted);
  }, [nodeEditorPaths, onUpdateLayer, selectedNode, singlePathLayer]);

  const deleteSelectedNodeRef = useRef(deleteSelectedNode);
  deleteSelectedNodeRef.current = deleteSelectedNode;

  const startPerLetterDrag = (
    e: React.PointerEvent,
    layer: TextLayer,
    kind: 'letter' | 'gap',
    index: number,
    gapAngleDeg = 0
  ) => {
    e.stopPropagation();
    if (layer.locked) return;
    cacheSvgRect();
    setPerLetterTarget({ kind, index });

    const startVal =
      kind === 'letter'
        ? layer.letterTransforms?.[index]?.baselineShift ?? 0
        : layer.letterKerning?.[index] ?? 0;

    perLetterDragRef.current = {
      kind,
      index,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startVal,
      gapAngleRad: ((gapAngleDeg + (layer.rotation || 0)) * Math.PI) / 180,
      beforeLayer: layer,
      currentLayer: layer,
      moved: false,
    };

    const onMove = (ev: PointerEvent) => {
      const drag = perLetterDragRef.current;
      if (!drag) return;
      const rect = svgRectRef.current ?? svgRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const scale = latestRef.current.doc.width / rect.width;
      const dx = (ev.clientX - drag.startClientX) * scale;
      const dy = (ev.clientY - drag.startClientY) * scale;
      if (Math.hypot(dx, dy) > 1.5) drag.moved = true;

      let nextLayer: TextLayer;
      if (drag.kind === 'letter') {
        const nextShift = Math.max(-60, Math.min(60, Math.round(drag.startVal - dy)));
        const existing = drag.beforeLayer.letterTransforms?.[drag.index] ?? {};
        nextLayer = {
          ...drag.beforeLayer,
          letterTransforms: {
            ...(drag.beforeLayer.letterTransforms ?? {}),
            [drag.index]: { ...existing, baselineShift: nextShift },
          },
        };
      } else {
        const proj = dx * Math.cos(drag.gapAngleRad) + dy * Math.sin(drag.gapAngleRad);
        const nextKern = Math.max(-40, Math.min(80, Math.round(drag.startVal + proj)));
        nextLayer = {
          ...drag.beforeLayer,
          letterKerning: {
            ...(drag.beforeLayer.letterKerning ?? {}),
            [drag.index]: nextKern,
          },
        };
      }
      drag.currentLayer = nextLayer;
      latestRef.current.onPreviewLayersChange({ [nextLayer.id]: nextLayer });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const drag = perLetterDragRef.current;
      perLetterDragRef.current = null;
      svgRectRef.current = null;
      if (drag && drag.moved) {
        latestRef.current.onCommitLayersChange(
          { [drag.beforeLayer.id]: drag.beforeLayer },
          { [drag.currentLayer.id]: drag.currentLayer }
        );
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const cacheSvgRect = () => {
    svgRectRef.current = svgRef.current?.getBoundingClientRect() ?? null;
  };

  const startLayerDrag = (e: React.PointerEvent, layer: LogoLayer) => {
    e.stopPropagation();

    // Expand click to sibling group members unless holding Alt for deep-select
    const groupSiblingIds =
      layer.groupId && !e.altKey
        ? doc.layers
            .filter((item) => item.groupId === layer.groupId && item.visible)
            .map((item) => item.id)
        : [layer.id];

    let nextIds: string[];
    if (e.shiftKey) {
      const siblingSet = new Set(groupSiblingIds);
      const alreadyAllSelected = groupSiblingIds.every((id) => selectedSet.has(id));
      nextIds = alreadyAllSelected
        ? selectedLayerIds.filter((id) => !siblingSet.has(id))
        : Array.from(new Set([...selectedLayerIds, ...groupSiblingIds]));
      onSelectLayers(nextIds);
    } else if (selectedSet.has(layer.id)) {
      nextIds = selectedLayerIds;
    } else {
      nextIds = groupSiblingIds;
      onSelectLayers(nextIds);
    }

    if (layer.locked) return;

    const dragIds = nextIds.filter((id) => {
      const l = doc.layers.find((item) => item.id === id);
      return l && !l.locked;
    });
    if (dragIds.length === 0) return;

    const initialLayersMap: Record<string, LogoLayer> = {};
    for (const id of dragIds) {
      const found = doc.layers.find((item) => item.id === id);
      if (found) initialLayersMap[id] = found;
    }

    cacheSvgRect();
    const state: InteractionState = {
      mode: 'drag',
      primaryLayerId: layer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialLayersMap,
      currentLayersMap: initialLayersMap,
    };
    interactionRef.current = state;
    setInteraction(state);
  };

  const startMarqueeSelection = (e: React.PointerEvent) => {
    cacheSvgRect();
    lastMarqueeIdsRef.current = '';
    const pt = clientToArtboard(e.clientX, e.clientY);
    if (!e.shiftKey) {
      onSelectLayers([]);
    }
    setEditingTextId(null);
    const state: InteractionState = {
      mode: 'marquee',
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialLayersMap: {},
      currentLayersMap: {},
      marqueeStart: pt,
    };
    interactionRef.current = state;
    setInteraction(state);
  };

  const startResize = (e: React.PointerEvent, layer: LogoLayer, handle: string) => {
    e.stopPropagation();
    if (layer.locked) return;
    cacheSvgRect();
    const map = { [layer.id]: layer };
    const state: InteractionState = {
      mode: 'resize',
      primaryLayerId: layer.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialLayersMap: map,
      currentLayersMap: map,
    };
    interactionRef.current = state;
    setInteraction(state);
  };

  const startRotate = (e: React.PointerEvent, layer: LogoLayer) => {
    e.stopPropagation();
    if (layer.locked) return;
    cacheSvgRect();
    const map = { [layer.id]: layer };
    const state: InteractionState = {
      mode: 'rotate',
      primaryLayerId: layer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialLayersMap: map,
      currentLayersMap: map,
    };
    interactionRef.current = state;
    setInteraction(state);
  };

  const editingTextLayer = doc.layers.find(
    (l): l is TextLayer => l.id === editingTextId && l.type === 'text'
  );

  const scaledW = Math.round(doc.width * zoom);
  const scaledH = Math.round(doc.height * zoom);

  const cycleGridMode = useCallback(() => {
    setGridMode((m) =>
      m === 'off' ? 'square' : m === 'square' ? 'thirds' : m === 'thirds' ? 'golden' : 'off'
    );
  }, []);

  return (
    <div className="relative flex flex-1 flex-col min-w-0 bg-[#F1F3F6] dark:bg-[#0F1117] transition-colors">
      {/* Workspace Container with Edge Rulers + Scrollable Canvas Viewport + Floating Bars */}
      <div className="relative flex flex-1 min-h-[320px] sm:min-h-[420px] overflow-hidden">
        {/* Top-Left Ruler Corner Unit Toggle */}
        {rulerUnit !== 'off' && (
          <button
            type="button"
            onClick={() =>
              setRulerUnit((u) => (u === 'px' ? 'mm' : u === 'mm' ? 'off' : 'px'))
            }
            title="Switch ruler units (px / mm / off)"
            className="absolute top-0 left-0 z-20 flex h-[22px] w-[24px] items-center justify-center border-r border-b border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] font-mono-num text-[9px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
          >
            {rulerUnit}
          </button>
        )}

        {/* Top Horizontal Ruler */}
        {rulerUnit !== 'off' && (() => {
          const pxPerUnit = rulerUnit === 'mm' ? 96 / 25.4 : 1;
          const totalUnits = doc.width / pxPerUnit;
          const stepUnits =
            rulerUnit === 'mm'
              ? zoom < 0.55
                ? 50
                : zoom < 0.9
                  ? 20
                  : 10
              : zoom < 0.5
                ? 200
                : zoom < 0.85
                  ? 100
                  : 50;
          const minorSub = 5;
          const ticks: Array<{ px: number; label?: string; major: boolean }> = [];
          for (let u = 0; u <= totalUnits + stepUnits; u += stepUnits / minorSub) {
            const px = u * pxPerUnit;
            if (px > doc.width + 0.5) break;
            const isMajor = Math.abs(Math.round(u / stepUnits) * stepUnits - u) < 0.01;
            ticks.push({
              px,
              major: isMajor,
              label: isMajor ? `${Math.round(u)}` : undefined,
            });
          }
          const cursorScreenX =
            cursorCoords !== null ? rulerMetrics.originX + cursorCoords.x * zoom : null;

          return (
            <div
              className="pointer-events-none absolute top-0 left-[24px] right-0 z-10 h-[22px] overflow-hidden border-b border-[#E2E8F0] dark:border-[#2A2F3D] bg-white/90 dark:bg-[#181B23]/90 backdrop-blur-xs select-none"
              aria-hidden="true"
            >
              <svg width={Math.max(100, rulerMetrics.viewW)} height={22} className="block">
                {ticks.map((t, i) => {
                  const sx = rulerMetrics.originX - 24 + t.px * zoom;
                  if (sx < -20 || sx > rulerMetrics.viewW + 20) return null;
                  return (
                    <g key={i}>
                      <line
                        x1={sx}
                        y1={t.major ? 4 : 14}
                        x2={sx}
                        y2={22}
                        stroke="currentColor"
                        className={
                          t.major
                            ? 'text-slate-400 dark:text-slate-500'
                            : 'text-slate-300 dark:text-slate-700'
                        }
                        strokeWidth={1}
                      />
                      {t.label !== undefined && (
                        <text
                          x={sx + 3}
                          y={11}
                          fill="currentColor"
                          className="text-slate-500 dark:text-slate-400"
                          fontSize={8.5}
                          fontFamily="'JetBrains Mono', monospace"
                        >
                          {t.label}
                        </text>
                      )}
                    </g>
                  );
                })}
                {cursorScreenX !== null && (
                  <line
                    x1={cursorScreenX - 24}
                    y1={0}
                    x2={cursorScreenX - 24}
                    y2={22}
                    stroke="#6366F1"
                    strokeWidth={1.5}
                  />
                )}
              </svg>
            </div>
          );
        })()}

        {/* Left Vertical Ruler */}
        {rulerUnit !== 'off' && (() => {
          const pxPerUnit = rulerUnit === 'mm' ? 96 / 25.4 : 1;
          const totalUnits = doc.height / pxPerUnit;
          const stepUnits =
            rulerUnit === 'mm'
              ? zoom < 0.55
                ? 50
                : zoom < 0.9
                  ? 20
                  : 10
              : zoom < 0.5
                ? 200
                : zoom < 0.85
                  ? 100
                  : 50;
          const minorSub = 5;
          const ticks: Array<{ py: number; label?: string; major: boolean }> = [];
          for (let u = 0; u <= totalUnits + stepUnits; u += stepUnits / minorSub) {
            const py = u * pxPerUnit;
            if (py > doc.height + 0.5) break;
            const isMajor = Math.abs(Math.round(u / stepUnits) * stepUnits - u) < 0.01;
            ticks.push({
              py,
              major: isMajor,
              label: isMajor ? `${Math.round(u)}` : undefined,
            });
          }
          const cursorScreenY =
            cursorCoords !== null ? rulerMetrics.originY + cursorCoords.y * zoom : null;

          return (
            <div
              className="pointer-events-none absolute top-[22px] bottom-0 left-0 z-10 w-[24px] overflow-hidden border-r border-[#E2E8F0] dark:border-[#2A2F3D] bg-white/90 dark:bg-[#181B23]/90 backdrop-blur-xs select-none"
              aria-hidden="true"
            >
              <svg width={24} height={Math.max(100, rulerMetrics.viewH)} className="block">
                {ticks.map((t, i) => {
                  const sy = rulerMetrics.originY - 22 + t.py * zoom;
                  if (sy < -20 || sy > rulerMetrics.viewH + 20) return null;
                  return (
                    <g key={i}>
                      <line
                        x1={t.major ? 4 : 15}
                        y1={sy}
                        x2={24}
                        y2={sy}
                        stroke="currentColor"
                        className={
                          t.major
                            ? 'text-slate-400 dark:text-slate-500'
                            : 'text-slate-300 dark:text-slate-700'
                        }
                        strokeWidth={1}
                      />
                      {t.label !== undefined && (
                        <text
                          x={10}
                          y={sy - 3}
                          transform={`rotate(-90, 10, ${sy - 3})`}
                          fill="currentColor"
                          className="text-slate-500 dark:text-slate-400"
                          fontSize={8.5}
                          fontFamily="'JetBrains Mono', monospace"
                        >
                          {t.label}
                        </text>
                      )}
                    </g>
                  );
                })}
                {cursorScreenY !== null && (
                  <line
                    x1={0}
                    y1={cursorScreenY - 22}
                    x2={24}
                    y2={cursorScreenY - 22}
                    stroke="#6366F1"
                    strokeWidth={1.5}
                  />
                )}
              </svg>
            </div>
          );
        })()}

        {/* Scrollable Workspace Viewport */}
        <div
          ref={viewportRef}
          onScroll={syncRulerMetrics}
          onPointerMove={(e) => {
            if (rulerUnit === 'off') return;
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect || rect.width === 0 || rect.height === 0) return;
            const ax = ((e.clientX - rect.left) / rect.width) * doc.width;
            const ay = ((e.clientY - rect.top) / rect.height) * doc.height;
            setCursorCoords({ x: ax, y: ay });
          }}
          onPointerLeave={() => setCursorCoords(null)}
          className={`relative flex-1 overflow-auto ${
            rulerUnit !== 'off'
              ? 'pt-9 pl-9 pr-4 pb-16 sm:pt-10 sm:pl-10 sm:pr-7 sm:pb-16'
              : 'px-3.5 pt-4 pb-16 sm:px-6 lg:px-8'
          }`}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              onSelectLayers([]);
              setEditingTextId(null);
            }
          }}
        >
        {editorNotice && (
          <div className="pointer-events-none fixed top-16 left-1/2 z-40 -translate-x-1/2 rounded-full border border-indigo-200 dark:border-indigo-500/40 bg-white/95 dark:bg-[#181B23]/95 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-lg backdrop-blur">
            {editorNotice}
          </div>
        )}

        <div
          className="flex min-h-full w-full flex-col items-center justify-center"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              onSelectLayers([]);
              setEditingTextId(null);
            }
          }}
        >
          {/* Floating Contextual Action Bar — positioned 16px (mb-4) directly above the artboard */}
          <div className="sticky top-1 z-30 mb-4 max-w-full">
            <FloatingContextToolbar
              doc={doc}
              activePalette={activePalette}
              selectedLayers={selectedLayers}
              gridMode={gridMode}
              onCycleGridMode={cycleGridMode}
              onUpdateLayer={onUpdateLayer}
              onAlignSelectedLayers={onAlignSelectedLayers}
              onBatchUpdateSelected={onBatchUpdateSelected}
              onBooleanCombine={onBooleanCombine}
              onCreateClippingMask={onCreateClippingMask}
              onKnockoutSelected={onKnockoutSelected}
              onUpdateSurfaceTexture={onUpdateSurfaceTexture}
              onApplyFontPairing={onApplyFontPairing}
              onDuplicateSelected={onDuplicateSelected}
              onDeleteSelected={onDeleteSelected}
              onUpdateDocBackground={onUpdateDocBackground}
              onResizeArtboard={(w, h) => {
                userAdjustedZoomRef.current = false;
                onResizeArtboard(w, h);
              }}
              onReorderLayer={onReorderLayer}
              onConvertTextToPath={onConvertTextToPath}
              onMagicRecolor={onMagicRecolor}
              onOpenVariations={onOpenVariations}
              onOpenWizard={onOpenWizard}
              onSendToVisitingCard={onSendToVisitingCard}
              onGroupSelected={onGroupSelected}
              onUngroupSelected={onUngroupSelected}
              onToggleBackgroundLock={onToggleBackgroundLock}
              penMode={canvasToolMode === 'pen'}
              onTogglePenTool={onTogglePenTool}
              onStartPenForText={onStartPenForText}
              nodeEditMode={canvasToolMode === 'nodes'}
              onToggleNodeEditMode={() =>
                onChangeToolMode?.(canvasToolMode === 'nodes' ? 'select' : 'nodes')
              }
              perLetterMode={canvasToolMode === 'per-letter'}
              onTogglePerLetterMode={() =>
                onChangeToolMode?.(
                  canvasToolMode === 'per-letter' ? 'select' : 'per-letter'
                )
              }
            />
          </div>

        <div
          ref={artboardBoxRef}
          className="relative shrink-0 shadow-[0_14px_42px_rgba(15,23,42,0.14)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.58)] ring-1 ring-[#E2E8F0] dark:ring-[#2A2F3D]"
          style={{
            width: scaledW,
            height: scaledH,
            backgroundImage: doc.transparentBackground
              ? 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)'
              : undefined,
            backgroundSize: doc.transparentBackground ? '20px 20px' : undefined,
            backgroundPosition: doc.transparentBackground
              ? '0 0, 0 10px, 10px -10px, -10px 0'
              : undefined,
            backgroundColor: doc.transparentBackground ? '#ffffff' : doc.backgroundColor,
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${doc.width} ${doc.height}`}
            style={{ isolation: 'isolate' }}
            className={`h-full w-full select-none block touch-none ${
              canvasToolMode === 'pen' ? 'cursor-crosshair' : ''
            }`}
            onPointerDown={(e) => {
              if (canvasToolMode === 'pen') {
                startPenPointerDown(e);
                return;
              }
              if (
                e.target === e.currentTarget ||
                (e.target as Element).getAttribute('data-bg') === 'true'
              ) {
                if (canvasToolMode !== 'select') {
                  onChangeToolMode?.('select');
                }
                startMarqueeSelection(e);
              }
            }}
            onPointerMove={(e) => {
              if (canvasToolMode === 'pen' && penDraft) {
                const pt = clientToArtboard(e.clientX, e.clientY);
                setPenDraft((prev) => (prev ? { ...prev, cursor: pt } : prev));
              }
            }}
            onDoubleClick={(e) => {
              if (canvasToolMode === 'pen' && penDraft && penDraft.nodes.length >= 2) {
                e.stopPropagation();
                commitPenPath(penDraft.nodes, false);
              }
            }}
          >
            {!doc.transparentBackground && (
              <rect
                data-bg="true"
                x={0}
                y={0}
                width={doc.width}
                height={doc.height}
                fill={doc.backgroundColor}
              />
            )}

            {gridMode === 'square' && (
              <g pointerEvents="none" opacity={0.42}>
                <defs>
                  <pattern id="editor-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9CA3AF" strokeWidth="0.6" strokeOpacity="0.35" />
                  </pattern>
                </defs>
                <rect x={0} y={0} width={doc.width} height={doc.height} fill="url(#editor-grid-pattern)" />
                <line x1={doc.width / 2} y1={0} x2={doc.width / 2} y2={doc.height} stroke="#9CA3AF" strokeWidth="0.7" strokeDasharray="4 4" opacity={0.45} />
                <line x1={0} y1={doc.height / 2} x2={doc.width} y2={doc.height / 2} stroke="#9CA3AF" strokeWidth="0.7" strokeDasharray="4 4" opacity={0.45} />
              </g>
            )}

            {gridMode === 'thirds' && (() => {
              const x1 = doc.width / 3;
              const x2 = (doc.width * 2) / 3;
              const y1 = doc.height / 3;
              const y2 = (doc.height * 2) / 3;
              const pts = [
                [x1, y1],
                [x2, y1],
                [x1, y2],
                [x2, y2],
              ];
              return (
                <g pointerEvents="none">
                  {[x1, x2].map((vx, i) => (
                    <line
                      key={`tv-${i}`}
                      x1={vx}
                      y1={0}
                      x2={vx}
                      y2={doc.height}
                      stroke="#0284C7"
                      strokeWidth={1.1 / zoom}
                      strokeDasharray="5 4"
                      opacity={0.55}
                    />
                  ))}
                  {[y1, y2].map((hy, i) => (
                    <line
                      key={`th-${i}`}
                      x1={0}
                      y1={hy}
                      x2={doc.width}
                      y2={hy}
                      stroke="#0284C7"
                      strokeWidth={1.1 / zoom}
                      strokeDasharray="5 4"
                      opacity={0.55}
                    />
                  ))}
                  {pts.map(([px, py], i) => (
                    <circle
                      key={`tp-${i}`}
                      cx={px}
                      cy={py}
                      r={5 / zoom}
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth={1.5 / zoom}
                      opacity={0.75}
                    />
                  ))}
                </g>
              );
            })()}

            {gridMode === 'golden' && (() => {
              const phiMinor = 0.381966;
              const phiMajor = 0.618034;
              const gx1 = doc.width * phiMinor;
              const gx2 = doc.width * phiMajor;
              const gy1 = doc.height * phiMinor;
              const gy2 = doc.height * phiMajor;
              const cx = doc.width / 2;
              const cy = doc.height / 2;
              const coreR = Math.min(doc.width, doc.height) * 0.236;
              return (
                <g pointerEvents="none">
                  {[gx1, gx2].map((vx, i) => (
                    <line
                      key={`gv-${i}`}
                      x1={vx}
                      y1={0}
                      x2={vx}
                      y2={doc.height}
                      stroke="#D97706"
                      strokeWidth={1.15 / zoom}
                      strokeDasharray="6 3"
                      opacity={0.62}
                    />
                  ))}
                  {[gy1, gy2].map((hy, i) => (
                    <line
                      key={`gh-${i}`}
                      x1={0}
                      y1={hy}
                      x2={doc.width}
                      y2={hy}
                      stroke="#D97706"
                      strokeWidth={1.15 / zoom}
                      strokeDasharray="6 3"
                      opacity={0.62}
                    />
                  ))}
                  {/* Central Golden Circle & Diagonal Construction Lines */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={coreR}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth={1 / zoom}
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={coreR * 1.618}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth={1 / zoom}
                    strokeDasharray="5 4"
                    opacity={0.42}
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={doc.width}
                    y2={doc.height}
                    stroke="#D97706"
                    strokeWidth={0.8 / zoom}
                    opacity={0.28}
                  />
                  <line
                    x1={doc.width}
                    y1={0}
                    x2={0}
                    y2={doc.height}
                    stroke="#D97706"
                    strokeWidth={0.8 / zoom}
                    opacity={0.28}
                  />
                  <text
                    x={gx1 + 6}
                    y={18}
                    fill="#D97706"
                    fontSize={10}
                    fontWeight={700}
                    fontFamily="'JetBrains Mono', monospace"
                    opacity={0.85}
                  >
                    φ 0.382
                  </text>
                  <text
                    x={gx2 + 6}
                    y={18}
                    fill="#D97706"
                    fontSize={10}
                    fontWeight={700}
                    fontFamily="'JetBrains Mono', monospace"
                    opacity={0.85}
                  >
                    φ 0.618
                  </text>
                </g>
              );
            })()}

            {/* Render All Scene Layers with Knockout Masks, Blend Modes & Surface Textures */}
            <LogoSceneLayers
              doc={doc}
              docBg={doc.transparentBackground ? 'transparent' : doc.backgroundColor}
              idPrefix="canvas"
              wrapInteractiveLayer={(layer, node) => (
                <g
                  onPointerDown={(e) => {
                    if (canvasToolMode === 'pen') return;
                    startLayerDrag(e, layer);
                  }}
                  onDoubleClick={(e) => {
                    if (canvasToolMode === 'pen') return;
                    e.stopPropagation();
                    if (layer.type === 'text' && !layer.locked && canvasToolMode === 'select') {
                      setEditingTextId(layer.id);
                    } else if (layer.type === 'path' && !layer.locked) {
                      onSelectLayers([layer.id]);
                      onChangeToolMode?.('nodes');
                    }
                  }}
                  style={{
                    cursor:
                      canvasToolMode === 'pen'
                        ? 'crosshair'
                        : layer.locked
                          ? 'not-allowed'
                          : 'move',
                    touchAction: 'none',
                  }}
                >
                  {node}
                </g>
              )}
            />

            {/* Print Bleed Overlay (3mm ≈ 12px Trim Frame & Crop Marks) */}
            {showBleed && (() => {
              const bleed = 12; // ~3.175mm at 96dpi
              const bw = doc.width - bleed * 2;
              const bh = doc.height - bleed * 2;
              const mark = 16;
              return (
                <g pointerEvents="none">
                  <path
                    d={`M 0 0 H ${doc.width} V ${doc.height} H 0 Z M ${bleed} ${bleed} V ${bleed + bh} H ${bleed + bw} V ${bleed} Z`}
                    fill="#E11D48"
                    fillOpacity={0.08}
                    fillRule="evenodd"
                  />
                  <rect
                    x={bleed}
                    y={bleed}
                    width={bw}
                    height={bh}
                    fill="none"
                    stroke="#E11D48"
                    strokeWidth={1.4 / zoom}
                    strokeDasharray="5 3"
                  />
                  <path
                    d={`M ${bleed} 0 V ${mark} M 0 ${bleed} H ${mark}
                        M ${bleed + bw} 0 V ${mark} M ${doc.width} ${bleed} H ${doc.width - mark}
                        M ${bleed} ${doc.height} V ${doc.height - mark} M 0 ${bleed + bh} H ${mark}
                        M ${bleed + bw} ${doc.height} V ${doc.height - mark} M ${doc.width} ${bleed + bh} H ${doc.width - mark}`}
                    fill="none"
                    stroke="#E11D48"
                    strokeWidth={1.5 / zoom}
                  />
                  <rect
                    x={bleed + 8}
                    y={bleed + 6}
                    width={138}
                    height={20}
                    rx={4}
                    fill="#E11D48"
                    fillOpacity={0.92}
                  />
                  <text
                    x={bleed + 15}
                    y={bleed + 19}
                    fill="#FFFFFF"
                    fontSize={9.5}
                    fontWeight={700}
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    BLEED TRIM · 3MM (12PX)
                  </text>
                </g>
              );
            })()}

            {/* Toggleable Safe-Zone Margin Overlay */}
            {showSafeZone && safeZoneReport && (() => {
              const mx = safeZoneReport.marginX;
              const my = safeZoneReport.marginY;
              const sw = doc.width - mx * 2;
              const sh = doc.height - my * 2;
              const hasClips = safeZoneReport.violatingLayerIds.length > 0;
              const zoneColor = hasClips ? '#D97706' : '#0D9488';
              const tickLen = Math.max(12, Math.min(24, Math.round(doc.width * 0.025)));

              return (
                <g pointerEvents="none">
                  {/* Outer safe-margin shading band */}
                  <path
                    d={`M 0 0 H ${doc.width} V ${doc.height} H 0 Z M ${mx} ${my} V ${my + sh} H ${mx + sw} V ${my} Z`}
                    fill={zoneColor}
                    fillOpacity={0.07}
                    fillRule="evenodd"
                  />
                  {/* Safe margin dashed frame */}
                  <rect
                    x={mx}
                    y={my}
                    width={sw}
                    height={sh}
                    fill="none"
                    stroke={zoneColor}
                    strokeWidth={1.5 / zoom}
                    strokeDasharray="6 4"
                  />
                  {/* Corner registration brackets */}
                  <path
                    d={`M ${mx} ${my + tickLen} V ${my} H ${mx + tickLen}
                        M ${mx + sw - tickLen} ${my} H ${mx + sw} V ${my + tickLen}
                        M ${mx} ${my + sh - tickLen} V ${my + sh} H ${mx + tickLen}
                        M ${mx + sw - tickLen} ${my + sh} H ${mx + sw} V ${my + sh - tickLen}`}
                    fill="none"
                    stroke={zoneColor}
                    strokeWidth={2.2 / zoom}
                  />
                  {/* Label tag inside top-left safe margin */}
                  <rect
                    x={mx + 8}
                    y={my + 8}
                    width={hasClips ? 236 : 162}
                    height={22}
                    rx={4}
                    fill={zoneColor}
                    fillOpacity={0.92}
                  />
                  <text
                    x={mx + 16}
                    y={my + 22.5}
                    fill="#FFFFFF"
                    fontSize={10.5}
                    fontWeight={700}
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {hasClips
                      ? `SAFE ZONE · ${safeZoneReport.violatingLayerIds.length} LAYER CLIPPING`
                      : 'SAFE MARGIN (8% INSET)'}
                  </text>
                </g>
              );
            })()}

            {/* Smart Alignment Snap Guides */}
            {snapGuides.map((g, i) =>
              g.axis === 'x' ? (
                <line
                  key={`gx-${i}`}
                  x1={g.pos}
                  y1={0}
                  x2={g.pos}
                  y2={doc.height}
                  stroke="#E11D48"
                  strokeWidth={1.3 / zoom}
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
              ) : (
                <line
                  key={`gy-${i}`}
                  x1={0}
                  y1={g.pos}
                  x2={doc.width}
                  y2={g.pos}
                  stroke="#E11D48"
                  strokeWidth={1.3 / zoom}
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
              )
            )}

            {/* Marquee Selection Box */}
            {marquee && (
              <rect
                x={Math.min(marquee.startX, marquee.endX)}
                y={Math.min(marquee.startY, marquee.endY)}
                width={Math.abs(marquee.endX - marquee.startX)}
                height={Math.abs(marquee.endY - marquee.startY)}
                fill="rgba(99, 102, 241, 0.12)"
                stroke="#6366F1"
                strokeWidth={1.2 / zoom}
                strokeDasharray="4 2"
                pointerEvents="none"
              />
            )}

            {/* Multi-select outlines + Collective bounding box */}
            {selectedLayers.length > 1 &&
              selectedLayers.map((sl) => (
                <rect
                  key={`ms-${sl.id}`}
                  x={sl.x}
                  y={sl.y}
                  width={sl.width}
                  height={sl.height}
                  transform={
                    sl.rotation
                      ? `rotate(${sl.rotation}, ${sl.x + sl.width / 2}, ${sl.y + sl.height / 2})`
                      : undefined
                  }
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth={1 / zoom}
                  strokeOpacity={0.6}
                  pointerEvents="none"
                />
              ))}

            {groupBounds && (
              <rect
                x={groupBounds.x - 4}
                y={groupBounds.y - 4}
                width={groupBounds.width + 8}
                height={groupBounds.height + 8}
                fill="none"
                stroke="#6366F1"
                strokeWidth={1.5 / zoom}
                strokeDasharray="5 3"
                pointerEvents="none"
              />
            )}

            {/* Single-layer Selection Bounding Box, 8 Resize Handles & Rotate Handle */}
            {singleSelected && canvasToolMode === 'select' && (
              <g
                transform={`translate(${singleSelected.x}, ${singleSelected.y})${
                  singleSelected.rotation
                    ? ` rotate(${singleSelected.rotation}, ${singleSelected.width / 2}, ${singleSelected.height / 2})`
                    : ''
                }`}
              >
                <rect
                  x={0}
                  y={0}
                  width={singleSelected.width}
                  height={singleSelected.height}
                  fill="none"
                  stroke={singleSelected.locked ? '#D97706' : '#6366F1'}
                  strokeWidth={1.5 / zoom}
                  strokeDasharray={singleSelected.locked ? '5 3' : undefined}
                  pointerEvents="none"
                />

                {!singleSelected.locked && (
                  <>
                    <line
                      x1={singleSelected.width / 2}
                      y1={0}
                      x2={singleSelected.width / 2}
                      y2={-24 / zoom}
                      stroke="#6366F1"
                      strokeWidth={1.4 / zoom}
                      pointerEvents="none"
                    />
                    <circle
                      cx={singleSelected.width / 2}
                      cy={-24 / zoom}
                      r={14 / zoom}
                      fill="transparent"
                      style={{ cursor: 'grab', touchAction: 'none' }}
                      onPointerDown={(e) => startRotate(e, singleSelected)}
                    />
                    <circle
                      cx={singleSelected.width / 2}
                      cy={-24 / zoom}
                      r={6 / zoom}
                      fill="#FFFFFF"
                      stroke="#6366F1"
                      strokeWidth={1.8 / zoom}
                      pointerEvents="none"
                    />

                    {[
                      { id: 'nw', hx: 0, hy: 0, cursor: 'nwse-resize' },
                      { id: 'n', hx: singleSelected.width / 2, hy: 0, cursor: 'ns-resize' },
                      { id: 'ne', hx: singleSelected.width, hy: 0, cursor: 'nesw-resize' },
                      { id: 'e', hx: singleSelected.width, hy: singleSelected.height / 2, cursor: 'ew-resize' },
                      { id: 'se', hx: singleSelected.width, hy: singleSelected.height, cursor: 'nwse-resize' },
                      { id: 's', hx: singleSelected.width / 2, hy: singleSelected.height, cursor: 'ns-resize' },
                      { id: 'sw', hx: 0, hy: singleSelected.height, cursor: 'nesw-resize' },
                      { id: 'w', hx: 0, hy: singleSelected.height / 2, cursor: 'ew-resize' },
                    ].map((pt) => {
                      const hs = 9 / zoom;
                      const hitSize = Math.max(hs, 20 / zoom);
                      return (
                        <g key={pt.id}>
                          <rect
                            x={pt.hx - hitSize / 2}
                            y={pt.hy - hitSize / 2}
                            width={hitSize}
                            height={hitSize}
                            fill="transparent"
                            style={{ cursor: pt.cursor, touchAction: 'none' }}
                            onPointerDown={(e) => startResize(e, singleSelected, pt.id)}
                          />
                          <rect
                            x={pt.hx - hs / 2}
                            y={pt.hy - hs / 2}
                            width={hs}
                            height={hs}
                            rx={1.5 / zoom}
                            fill="#FFFFFF"
                            stroke="#6366F1"
                            strokeWidth={1.5 / zoom}
                            pointerEvents="none"
                          />
                        </g>
                      );
                    })}
                  </>
                )}
              </g>
            )}

            {/* ============================================================== */}
            {/* PEN TOOL LIVE SVG PREVIEW OVERLAY                              */}
            {/* ============================================================== */}
            {canvasToolMode === 'pen' && penDraft && penDraft.nodes.length > 0 && (() => {
              const committedD = serializeSubpathsToPathData([
                { closed: false, nodes: penDraft.nodes },
              ]);
              const lastNode = penDraft.nodes[penDraft.nodes.length - 1];
              const rubberD = penDraft.cursor
                ? lastNode.handleOut
                  ? `M ${lastNode.x.toFixed(1)} ${lastNode.y.toFixed(1)} C ${lastNode.handleOut.x.toFixed(1)} ${lastNode.handleOut.y.toFixed(1)}, ${penDraft.cursor.x.toFixed(1)} ${penDraft.cursor.y.toFixed(1)}, ${penDraft.cursor.x.toFixed(1)} ${penDraft.cursor.y.toFixed(1)}`
                  : `M ${lastNode.x.toFixed(1)} ${lastNode.y.toFixed(1)} L ${penDraft.cursor.x.toFixed(1)} ${penDraft.cursor.y.toFixed(1)}`
                : '';
              const nearStart =
                penDraft.nodes.length >= 2 &&
                penDraft.cursor !== null &&
                Math.hypot(
                  penDraft.cursor.x - penDraft.nodes[0].x,
                  penDraft.cursor.y - penDraft.nodes[0].y
                ) <= Math.max(8, 12 / zoom);

              return (
                <g pointerEvents="none">
                  {committedD && (
                    <path
                      d={committedD}
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth={2.2 / zoom}
                      strokeLinecap="round"
                    />
                  )}
                  {rubberD && (
                    <path
                      d={rubberD}
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth={1.4 / zoom}
                      strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                      opacity={0.75}
                    />
                  )}
                  {penDraft.nodes.map((n, idx) => (
                    <g key={`pen-pt-${idx}`}>
                      {n.handleIn && (
                        <>
                          <line
                            x1={n.x}
                            y1={n.y}
                            x2={n.handleIn.x}
                            y2={n.handleIn.y}
                            stroke="#818CF8"
                            strokeWidth={1 / zoom}
                          />
                          <circle
                            cx={n.handleIn.x}
                            cy={n.handleIn.y}
                            r={3.2 / zoom}
                            fill="#FFFFFF"
                            stroke="#6366F1"
                            strokeWidth={1.3 / zoom}
                          />
                        </>
                      )}
                      {n.handleOut && (
                        <>
                          <line
                            x1={n.x}
                            y1={n.y}
                            x2={n.handleOut.x}
                            y2={n.handleOut.y}
                            stroke="#818CF8"
                            strokeWidth={1 / zoom}
                          />
                          <circle
                            cx={n.handleOut.x}
                            cy={n.handleOut.y}
                            r={3.2 / zoom}
                            fill="#FFFFFF"
                            stroke="#6366F1"
                            strokeWidth={1.3 / zoom}
                          />
                        </>
                      )}
                      <rect
                        x={n.x - (idx === 0 && nearStart ? 5 : 3.5) / zoom}
                        y={n.y - (idx === 0 && nearStart ? 5 : 3.5) / zoom}
                        width={(idx === 0 && nearStart ? 10 : 7) / zoom}
                        height={(idx === 0 && nearStart ? 10 : 7) / zoom}
                        rx={1.2 / zoom}
                        fill={idx === 0 && nearStart ? '#10B981' : '#FFFFFF'}
                        stroke="#4F46E5"
                        strokeWidth={1.5 / zoom}
                      />
                    </g>
                  ))}
                </g>
              );
            })()}

            {/* ============================================================== */}
            {/* PHASE 17 VECTOR NODE EDITOR OVERLAY (SERIFS & BEZIER HANDLES)   */}
            {/* ============================================================== */}
            {canvasToolMode === 'nodes' && singlePathLayer && nodeEditorPaths.length > 0 && (() => {
              const sx = singlePathLayer.width / Math.max(1, singlePathLayer.sourceViewBox.width);
              const sy = singlePathLayer.height / Math.max(1, singlePathLayer.sourceViewBox.height);
              const toArt = (lx: number, ly: number) =>
                mapLocalPointToArtboard(lx * sx, ly * sy, singlePathLayer);

              return (
                <g>
                  <rect
                    x={singlePathLayer.x}
                    y={singlePathLayer.y}
                    width={singlePathLayer.width}
                    height={singlePathLayer.height}
                    transform={
                      singlePathLayer.rotation
                        ? `rotate(${singlePathLayer.rotation}, ${singlePathLayer.x + singlePathLayer.width / 2}, ${singlePathLayer.y + singlePathLayer.height / 2})`
                        : undefined
                    }
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth={1 / zoom}
                    strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                    opacity={0.45}
                    pointerEvents="none"
                  />

                  {nodeEditorPaths.map((spList, pIdx) =>
                    spList.map((sp, sIdx) => {
                      const outlinePts = sp.nodes.map((n) => toArt(n.x, n.y));
                      const wireD = serializeSubpathsToPathData([
                        {
                          closed: sp.closed,
                          nodes: sp.nodes.map((n) => {
                            const [ax, ay] = toArt(n.x, n.y);
                            const hi = n.handleIn ? toArt(n.handleIn.x, n.handleIn.y) : null;
                            const ho = n.handleOut ? toArt(n.handleOut.x, n.handleOut.y) : null;
                            return {
                              x: ax,
                              y: ay,
                              handleIn: hi ? { x: hi[0], y: hi[1] } : null,
                              handleOut: ho ? { x: ho[0], y: ho[1] } : null,
                            };
                          }),
                        },
                      ]);
                      void outlinePts;

                      return (
                        <g key={`ne-${pIdx}-${sIdx}`}>
                          <path
                            d={wireD}
                            fill="none"
                            stroke="#6366F1"
                            strokeWidth={1.1 / zoom}
                            opacity={0.75}
                            pointerEvents="none"
                          />

                          {sp.nodes.map((node, nIdx) => {
                            const [ax, ay] = toArt(node.x, node.y);
                            const isSel =
                              selectedNode?.pathIdx === pIdx &&
                              selectedNode?.subIdx === sIdx &&
                              selectedNode?.nodeIdx === nIdx;
                            const hi = node.handleIn ? toArt(node.handleIn.x, node.handleIn.y) : null;
                            const ho = node.handleOut ? toArt(node.handleOut.x, node.handleOut.y) : null;
                            const anchorSize = (isSel ? 8.5 : 6.5) / zoom;

                            return (
                              <g key={`node-${pIdx}-${sIdx}-${nIdx}`}>
                                {hi && (
                                  <>
                                    <line
                                      x1={ax}
                                      y1={ay}
                                      x2={hi[0]}
                                      y2={hi[1]}
                                      stroke="#818CF8"
                                      strokeWidth={1 / zoom}
                                      pointerEvents="none"
                                    />
                                    <circle
                                      cx={hi[0]}
                                      cy={hi[1]}
                                      r={7 / zoom}
                                      fill="transparent"
                                      style={{ cursor: 'pointer', touchAction: 'none' }}
                                      onPointerDown={(e) =>
                                        startNodeControlDrag(
                                          e,
                                          singlePathLayer,
                                          pIdx,
                                          sIdx,
                                          nIdx,
                                          'handleIn'
                                        )
                                      }
                                    />
                                    <circle
                                      cx={hi[0]}
                                      cy={hi[1]}
                                      r={3.2 / zoom}
                                      fill="#FFFFFF"
                                      stroke="#4F46E5"
                                      strokeWidth={1.3 / zoom}
                                      pointerEvents="none"
                                    />
                                  </>
                                )}
                                {ho && (
                                  <>
                                    <line
                                      x1={ax}
                                      y1={ay}
                                      x2={ho[0]}
                                      y2={ho[1]}
                                      stroke="#818CF8"
                                      strokeWidth={1 / zoom}
                                      pointerEvents="none"
                                    />
                                    <circle
                                      cx={ho[0]}
                                      cy={ho[1]}
                                      r={7 / zoom}
                                      fill="transparent"
                                      style={{ cursor: 'pointer', touchAction: 'none' }}
                                      onPointerDown={(e) =>
                                        startNodeControlDrag(
                                          e,
                                          singlePathLayer,
                                          pIdx,
                                          sIdx,
                                          nIdx,
                                          'handleOut'
                                        )
                                      }
                                    />
                                    <circle
                                      cx={ho[0]}
                                      cy={ho[1]}
                                      r={3.2 / zoom}
                                      fill="#FFFFFF"
                                      stroke="#4F46E5"
                                      strokeWidth={1.3 / zoom}
                                      pointerEvents="none"
                                    />
                                  </>
                                )}

                                <rect
                                  x={ax - Math.max(anchorSize, 13 / zoom) / 2}
                                  y={ay - Math.max(anchorSize, 13 / zoom) / 2}
                                  width={Math.max(anchorSize, 13 / zoom)}
                                  height={Math.max(anchorSize, 13 / zoom)}
                                  fill="transparent"
                                  style={{ cursor: 'move', touchAction: 'none' }}
                                  onPointerDown={(e) =>
                                    startNodeControlDrag(
                                      e,
                                      singlePathLayer,
                                      pIdx,
                                      sIdx,
                                      nIdx,
                                      'anchor'
                                    )
                                  }
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    toggleNodeSmooth(singlePathLayer, pIdx, sIdx, nIdx);
                                  }}
                                />
                                <rect
                                  x={ax - anchorSize / 2}
                                  y={ay - anchorSize / 2}
                                  width={anchorSize}
                                  height={anchorSize}
                                  rx={node.smooth ? anchorSize / 2 : 1 / zoom}
                                  fill={isSel ? '#4F46E5' : '#FFFFFF'}
                                  stroke={isSel ? '#FFFFFF' : '#4F46E5'}
                                  strokeWidth={1.4 / zoom}
                                  pointerEvents="none"
                                />
                              </g>
                            );
                          })}
                        </g>
                      );
                    })
                  )}
                </g>
              );
            })()}

            {/* ============================================================== */}
            {/* PER-LETTER KERNING & TRANSFORM INTERACTIVE OVERLAY             */}
            {/* ============================================================== */}
            {canvasToolMode === 'per-letter' &&
              singleTextLayer &&
              perLetterLayout && (() => {
                const layer = singleTextLayer;
                const layerTransform = [
                  `translate(${layer.x}, ${layer.y})`,
                  layer.rotation
                    ? `rotate(${layer.rotation}, ${layer.width / 2}, ${layer.height / 2})`
                    : '',
                  layer.flipX ? `translate(${layer.width}, 0) scale(-1, 1)` : '',
                  layer.flipY ? `translate(0, ${layer.height}) scale(1, -1)` : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <g transform={layerTransform}>
                    {perLetterLayout.pathD && (
                      <path
                        d={perLetterLayout.pathD}
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth={1 / zoom}
                        strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                        opacity={0.5}
                        pointerEvents="none"
                      />
                    )}

                    {/* Clickable/draggable letter bounding boxes */}
                    {perLetterLayout.glyphs.map((g) => {
                      if (!g.char.trim()) return null;
                      const isSel =
                        perLetterTarget?.kind === 'letter' &&
                        perLetterTarget.index === g.index;
                      const bw = Math.max(10, g.adv);
                      const bh = Math.max(14, g.fontSize * g.scale * 0.9);
                      return (
                        <g
                          key={`pl-ch-${g.index}`}
                          transform={`translate(${g.x}, ${g.y}) rotate(${g.angleDeg})`}
                          style={{ cursor: 'ns-resize', touchAction: 'none' }}
                          onPointerDown={(e) =>
                            startPerLetterDrag(e, layer, 'letter', g.index, g.angleDeg)
                          }
                        >
                          <rect
                            x={-bw / 2}
                            y={-bh * 0.78}
                            width={bw}
                            height={bh}
                            rx={3 / zoom}
                            fill={
                              isSel ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.03)'
                            }
                            stroke={isSel ? '#4F46E5' : '#818CF8'}
                            strokeWidth={(isSel ? 1.8 : 0.9) / zoom}
                            strokeDasharray={isSel ? undefined : `${2.5 / zoom} ${2 / zoom}`}
                          />
                        </g>
                      );
                    })}

                    {/* Clickable/draggable kerning gaps between characters */}
                    {perLetterLayout.glyphs.map((g) => {
                      if (!g.hasGapAfter) return null;
                      const isGapSel =
                        perLetterTarget?.kind === 'gap' &&
                        perLetterTarget.index === g.index;
                      const rGap = (isGapSel ? 6 : 4.5) / zoom;
                      return (
                        <g
                          key={`pl-gap-${g.index}`}
                          transform={`translate(${g.gapX}, ${g.gapY}) rotate(${g.gapAngleDeg})`}
                          style={{ cursor: 'ew-resize', touchAction: 'none' }}
                          onPointerDown={(e) =>
                            startPerLetterDrag(e, layer, 'gap', g.index, g.gapAngleDeg)
                          }
                        >
                          <line
                            x1={0}
                            y1={-g.fontSize * 0.72}
                            x2={0}
                            y2={4}
                            stroke={isGapSel ? '#D97706' : '#6366F1'}
                            strokeWidth={(isGapSel ? 1.6 : 0.9) / zoom}
                            strokeDasharray={`${2.5 / zoom} ${2 / zoom}`}
                            opacity={isGapSel ? 0.95 : 0.55}
                            pointerEvents="none"
                          />
                          <circle
                            cx={0}
                            cy={4}
                            r={Math.max(rGap, 9 / zoom)}
                            fill="transparent"
                          />
                          <polygon
                            points={`0,${4 - rGap} ${rGap},4 0,${4 + rGap} ${-rGap},4`}
                            fill={isGapSel ? '#F59E0B' : '#FFFFFF'}
                            stroke={isGapSel ? '#B45309' : '#6366F1'}
                            strokeWidth={1.3 / zoom}
                            pointerEvents="none"
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })()}
          </svg>

          {/* Double-click Inline Text Edit Overlay */}
          {editingTextLayer && (
            <div
              className="absolute z-20"
              style={{
                left: `${(editingTextLayer.x / doc.width) * 100}%`,
                top: `${(editingTextLayer.y / doc.height) * 100}%`,
                width: `${(editingTextLayer.width / doc.width) * 100}%`,
                height: `${(editingTextLayer.height / doc.height) * 100}%`,
              }}
            >
              <input
                type="text"
                autoFocus
                value={editingTextLayer.text}
                onChange={(e) => onUpdateTextLive(editingTextLayer.id, e.target.value)}
                onBlur={() => setEditingTextId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    setEditingTextId(null);
                  }
                }}
                className="h-full w-full rounded border-2 border-indigo-500 bg-white/95 px-2 text-center font-bold text-[#141413] shadow-md focus:outline-none"
                style={{
                  fontFamily: editingTextLayer.fontFamily,
                  fontSize: `${Math.max(14, editingTextLayer.fontSize * zoom * 0.65)}px`,
                }}
              />
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* FLOATING TOOL HUDs (PEN TOOL / NODE EDITOR / PER-LETTER)       */}
        {/* ============================================================== */}
        {canvasToolMode === 'pen' && (
          <div className="sticky bottom-14 z-30 mt-3 flex flex-wrap items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/40 bg-white/95 dark:bg-[#181B23]/95 px-3.5 py-1.5 text-xs shadow-xl backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
              <PenTool className="h-3.5 w-3.5" />
              {penAttachTextId
                ? 'Pen Tool (Click & drag to draw Bezier curve for text)'
                : 'Pen Tool (Click points, drag for Bezier curves)'}
            </span>
            <span className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
              {penDraft?.nodes.length ?? 0} pts
            </span>
            {penDraft && penDraft.nodes.length >= 2 && (
              <button
                type="button"
                onClick={() => commitPenPath(penDraft.nodes, false)}
                className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 cursor-pointer"
              >
                Finish Curve
              </button>
            )}
            {penDraft && penDraft.nodes.length >= 3 && (
              <button
                type="button"
                onClick={() => commitPenPath(penDraft.nodes, true)}
                className="rounded-full border border-indigo-300 dark:border-indigo-500/40 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 cursor-pointer"
              >
                Close Shape
              </button>
            )}
            {penDraft && penDraft.nodes.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setPenDraft((prev) =>
                    prev && prev.nodes.length > 1
                      ? { ...prev, nodes: prev.nodes.slice(0, -1) }
                      : null
                  )
                }
                className="rounded-full border border-[#E2E8F0] dark:border-[#2A2F3D] px-2.5 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-[#252A38] cursor-pointer"
              >
                Undo Pt
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPenDraft(null);
                onChangeToolMode?.('select');
              }}
              className="rounded-full border border-[#E2E8F0] dark:border-[#2A2F3D] px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252A38] cursor-pointer"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

        {canvasToolMode === 'nodes' && singlePathLayer && (
          <div className="sticky bottom-14 z-30 mt-3 flex flex-wrap items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/40 bg-white/95 dark:bg-[#181B23]/95 px-3.5 py-1.5 text-xs shadow-xl backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
              <Spline className="h-3.5 w-3.5" />
              Node Editor · Drag anchors &amp; handles to sculpt letter serifs
            </span>
            {selectedNode && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    toggleNodeSmooth(
                      singlePathLayer,
                      selectedNode.pathIdx,
                      selectedNode.subIdx,
                      selectedNode.nodeIdx
                    )
                  }
                  className="rounded-full border border-[#E2E8F0] dark:border-[#2A2F3D] px-2.5 py-1 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-[#252A38] cursor-pointer"
                >
                  Smooth / Corner
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedNode}
                  className="rounded-full border border-red-200 dark:border-red-900/50 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                >
                  Delete Node
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onChangeToolMode?.('select')}
              className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 cursor-pointer"
            >
              Done (Esc)
            </button>
          </div>
        )}

        {canvasToolMode === 'per-letter' && singleTextLayer && perLetterTarget && (() => {
          const rawDisplay = singleTextLayer.uppercase
            ? singleTextLayer.text.toUpperCase()
            : singleTextLayer.text;
          const tMap = singleTextLayer.letterTransforms ?? {};
          const kMap = singleTextLayer.letterKerning ?? {};

          if (perLetterTarget.kind === 'letter') {
            const idx = perLetterTarget.index;
            const ch = Array.from(rawDisplay)[idx] ?? '?';
            const tr = tMap[idx] ?? {};
            const scaleVal = tr.scale ?? 1;
            const rotVal = tr.rotation ?? 0;
            const shiftVal = tr.baselineShift ?? 0;

            const patchLetter = (patch: {
              scale?: number;
              rotation?: number;
              baselineShift?: number;
            }) => {
              onUpdateLayer({
                ...singleTextLayer,
                letterTransforms: {
                  ...tMap,
                  [idx]: { ...tr, ...patch },
                },
              });
            };

            return (
              <div className="sticky bottom-14 z-30 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-200 dark:border-indigo-500/40 bg-white/95 dark:bg-[#181B23]/95 px-3.5 py-2 text-xs shadow-xl backdrop-blur-md">
                <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Letter &ldquo;{ch}&rdquo; (#{idx + 1})
                </span>

                <label className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Scale</span>
                  <input
                    type="range"
                    min={0.4}
                    max={2.4}
                    step={0.05}
                    value={scaleVal}
                    onChange={(e) => patchLetter({ scale: Number(e.target.value) })}
                    className="w-20 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-mono-num w-9 text-[11px] font-semibold">
                    {scaleVal.toFixed(2)}x
                  </span>
                </label>

                <label className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Rotate</span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={rotVal}
                    onChange={(e) => patchLetter({ rotation: Number(e.target.value) })}
                    className="w-20 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-mono-num w-9 text-[11px] font-semibold">
                    {rotVal}°
                  </span>
                </label>

                <label className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Baseline</span>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    step={1}
                    value={shiftVal}
                    onChange={(e) => patchLetter({ baselineShift: Number(e.target.value) })}
                    className="w-20 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-mono-num w-9 text-[11px] font-semibold">
                    {shiftVal}px
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const nextT = { ...tMap };
                    delete nextT[idx];
                    onUpdateLayer({ ...singleTextLayer, letterTransforms: nextT });
                  }}
                  className="rounded-full border border-[#E2E8F0] dark:border-[#2A2F3D] px-2.5 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-[#252A38] cursor-pointer"
                >
                  Reset Letter
                </button>

                <button
                  type="button"
                  onClick={() => onChangeToolMode?.('select')}
                  className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Done (Esc)
                </button>
              </div>
            );
          }

          // Gap / Pair Kerning selected
          const gIdx = perLetterTarget.index;
          const charsArr = Array.from(rawDisplay);
          const leftCh = charsArr[gIdx] ?? '';
          const rightCh = charsArr[gIdx + 1] ?? '';
          const kernVal = kMap[gIdx] ?? 0;

          return (
            <div className="sticky bottom-14 z-30 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-white/95 dark:bg-[#181B23]/95 px-3.5 py-2 text-xs shadow-xl backdrop-blur-md">
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Pair Kerning &ldquo;{leftCh} ↔ {rightCh}&rdquo;
              </span>

              <label className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Kern</span>
                <input
                  type="range"
                  min={-40}
                  max={80}
                  step={1}
                  value={kernVal}
                  onChange={(e) =>
                    onUpdateLayer({
                      ...singleTextLayer,
                      letterKerning: { ...kMap, [gIdx]: Number(e.target.value) },
                    })
                  }
                  className="w-28 accent-amber-500 cursor-pointer"
                />
                <span className="font-mono-num w-10 text-[11px] font-semibold">
                  {kernVal}px
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  const nextK = { ...kMap };
                  delete nextK[gIdx];
                  onUpdateLayer({ ...singleTextLayer, letterKerning: nextK });
                }}
                className="rounded-full border border-[#E2E8F0] dark:border-[#2A2F3D] px-2.5 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-[#252A38] cursor-pointer"
              >
                Reset Pair
              </button>

              <button
                type="button"
                onClick={() => onChangeToolMode?.('select')}
                className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 cursor-pointer"
              >
                Done (Esc)
              </button>
            </div>
          );
        })()}
        </div>
        </div>

        {/* Bottom-Left Floating Workspace Controls Pill (Pages, Rulers, Grid, Snap, Bleed, Safe Zone, WCAG) */}
        <div
          className={`absolute bottom-3.5 ${
            rulerUnit !== 'off' ? 'left-9' : 'left-3.5'
          } z-30 flex items-center gap-1.5 rounded-full border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white/92 dark:bg-[#181B23]/92 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-md max-w-[calc(100%-260px)] sm:max-w-[calc(100%-360px)] overflow-x-auto`}
        >
          {/* Multi-Page Switcher */}
          {pages.map((p, idx) => {
            const active = idx === activePageIndex;
            return (
              <div
                key={p.id}
                className={`inline-flex items-center gap-1 rounded-full border pl-2.5 pr-1.5 py-0.5 text-[11px] font-semibold transition-all shrink-0 ${
                  active
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500/60 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSwitchPage(idx)}
                  className="cursor-pointer whitespace-nowrap"
                >
                  Page {idx + 1}
                </button>
                {pages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemovePage(idx)}
                    title={`Delete Page ${idx + 1}`}
                    className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAddPage}
            title="Duplicate current artboard as a new page"
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-500 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden xl:inline">Page</span>
          </button>

          {onSaveProject && (
            <button
              type="button"
              onClick={onSaveProject}
              title={
                activeProjectName
                  ? `Auto-saving "${activeProjectName}" (Click to save a snapshot copy)`
                  : 'Save logo to My Projects'
              }
              className="hidden xl:inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-500 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {activeProjectName ? (
                <BookmarkCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <FolderPlus className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>
                {autoSaveState === 'saving'
                  ? 'Saving...'
                  : activeProjectName
                    ? 'Copy'
                    : 'Save'}
              </span>
            </button>
          )}

          <span className="hidden md:inline h-4 w-px bg-[#E2E8F0] dark:bg-[#2A2F3D] shrink-0" aria-hidden="true" />

          {cursorCoords && rulerUnit !== 'off' && (
            <span className="hidden 2xl:inline-flex items-center font-mono-num text-[10.5px] text-slate-500 dark:text-slate-400 px-1 whitespace-nowrap shrink-0">
              {rulerUnit === 'mm'
                ? `${((cursorCoords.x * 25.4) / 96).toFixed(1)}, ${((cursorCoords.y * 25.4) / 96).toFixed(1)} mm`
                : `${Math.round(cursorCoords.x)}, ${Math.round(cursorCoords.y)} px`}
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              setRulerUnit((u) => (u === 'px' ? 'mm' : u === 'mm' ? 'off' : 'px'))
            }
            title="Toggle Workspace Rulers (px / mm / Off)"
            className={`hidden md:inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium active:scale-95 transition-all cursor-pointer shrink-0 ${
              rulerUnit !== 'off'
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Ruler className="h-3 w-3" />
            <span className="font-mono-num uppercase">
              {rulerUnit === 'off' ? 'Ruler' : rulerUnit}
            </span>
          </button>

          <button
            type="button"
            onClick={cycleGridMode}
            title="Cycle Grid Overlay: Off → Square Grid → Rule of Thirds → Golden Ratio (φ)"
            className={`hidden md:inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium active:scale-95 transition-all cursor-pointer shrink-0 ${
              gridMode !== 'off'
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Grid3x3 className="h-3 w-3" />
            <span className="whitespace-nowrap">
              {gridMode === 'off'
                ? 'Grid Off'
                : gridMode === 'square'
                  ? 'Grid'
                  : gridMode === 'thirds'
                    ? '3rds'
                    : 'φ Golden'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSnapEnabled((v) => !v)}
            title="Toggle Smart Snap Guides"
            className={`hidden lg:inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-medium active:scale-95 transition-all cursor-pointer shrink-0 ${
              snapEnabled
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-600 dark:text-slate-300'
            }`}
          >
            Snap
          </button>

          <button
            type="button"
            onClick={() => setShowBleed((v) => !v)}
            title="Toggle 3mm (12px) Print Bleed Trim Guides"
            className={`hidden xl:inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium active:scale-95 transition-all cursor-pointer shrink-0 ${
              showBleed
                ? 'border-rose-600 bg-rose-600 text-white'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Scissors className="h-3 w-3" />
            <span>Bleed</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSafeZone((v) => !v)}
            title="Toggle 8% safe-margin overlay"
            className={`hidden xl:inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium active:scale-95 transition-all cursor-pointer shrink-0 ${
              showSafeZone
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#0F1117] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Scan className="h-3 w-3" />
            <span>Safe</span>
          </button>

          {contrastReport.checkedCount > 0 && (
            <div
              className={`hidden lg:inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap shrink-0 ${
                contrastReport.hasCritical
                  ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                  : contrastReport.hasWarning
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                    : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
              }`}
              title={
                contrastReport.hasWarning
                  ? `"${contrastReport.worstLayerName}" contrast is ${contrastReport.worstRatio.toFixed(
                      2
                    )}:1 against ${contrastReport.worstBgHex} (WCAG AA recommends ≥ 4.5:1)`
                  : `All text layers meet WCAG contrast (${contrastReport.worstRatio.toFixed(2)}:1)`
              }
            >
              {contrastReport.hasWarning ? (
                <AlertTriangle className="h-3 w-3 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3 w-3 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => {
                  if (contrastReport.worstLayerId) {
                    onSelectLayers([contrastReport.worstLayerId]);
                  }
                }}
                className="cursor-pointer hover:underline"
              >
                {contrastReport.hasWarning
                  ? `${contrastReport.worstRatio.toFixed(1)}:1`
                  : `WCAG ${contrastReport.worstRatio.toFixed(1)}:1`}
              </button>
              {contrastReport.hasWarning &&
                contrastReport.worstLayerId &&
                contrastReport.suggestedFixHex &&
                onFixTextContrast && (
                  <button
                    type="button"
                    onClick={() =>
                      onFixTextContrast(
                        contrastReport.worstLayerId!,
                        contrastReport.suggestedFixHex!
                      )
                    }
                    className="rounded bg-white/90 dark:bg-slate-900 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-900 dark:text-white ring-1 ring-black/15 cursor-pointer"
                  >
                    Fix
                  </button>
                )}
            </div>
          )}

          {selectedLayerIds.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectLayers([])}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] px-2 py-0.5 text-[10.5px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252A38] active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              Deselect
            </button>
          )}
        </div>

        {/* Bottom-Right Floating Status Pill (Zoom 25%–400%, Fit to Screen & Mockup Quick-Toggle) */}
        <div className="absolute bottom-3.5 right-3.5 z-30 inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white/92 dark:bg-[#181B23]/92 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              userAdjustedZoomRef.current = true;
              setZoom((z) => Math.max(0.25, +(z - 0.15).toFixed(2)));
            }}
            className="rounded-lg p-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#252A38] active:scale-95 transition-all cursor-pointer"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => {
              userAdjustedZoomRef.current = true;
              setZoom(Number(e.target.value));
            }}
            aria-label="Canvas zoom slider (25% to 400%)"
            className="hidden sm:block w-24 accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
          />
          <span className="font-mono-num w-10 text-center text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => {
              userAdjustedZoomRef.current = true;
              setZoom((z) => Math.min(4, +(z + 0.15).toFixed(2)));
            }}
            className="rounded-lg p-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#252A38] active:scale-95 transition-all cursor-pointer"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleFitZoom}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-500 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Fit artboard to screen"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Fit</span>
          </button>

          {onOpenMockups && (
            <>
              <span className="h-4 w-px bg-[#E2E8F0] dark:bg-[#2A2F3D]" aria-hidden="true" />
              <button
                type="button"
                role="switch"
                aria-checked={false}
                onClick={onOpenMockups}
                title="Switch to Real-World Mockup Preview"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Eye className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Mockups</span>
                <span className="inline-flex h-3.5 w-6 items-center rounded-full bg-slate-200 dark:bg-[#2A2F3D] p-0.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white dark:bg-slate-400 shadow-xs" />
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
