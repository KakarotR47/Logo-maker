import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookmarkCheck,
  CheckCircle2,
  FolderPlus,
  Grid3x3,
  Maximize2,
  Plus,
  RotateCcw,
  Scan,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ColorPalette,
  FontPairing,
  LogoDocument,
  LogoLayer,
  TextLayer,
} from '../types/logo';
import {
  analyzeDocumentContrast,
  checkSafeZoneViolations,
} from '../utils/contrastChecker';
import { BooleanOpKind } from '../utils/booleanOps';
import { CanvasLayerNode } from './CanvasLayerRenderer';
import { FloatingContextToolbar } from './FloatingContextToolbar';

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
  activeProjectName?: string | null;
  autoSaveState?: 'saved' | 'saving';
  pages: Array<{ id: string; title: string }>;
  activePageIndex: number;
  onSwitchPage: (index: number) => void;
  onAddPage: () => void;
  onRemovePage: (index: number) => void;
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
  editorNotice,
  onApplyFontPairing,
  onReorderLayer,
  onConvertTextToPath,
  onUpdateDocBackground,
  onResizeArtboard,
  canUndo,
  canRedo,
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
  activeProjectName,
  autoSaveState = 'saved',
  pages,
  activePageIndex,
  onSwitchPage,
  onAddPage,
  onRemovePage,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [marquee, setMarquee] = useState<MarqueeBox | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
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
    onSelectLayers,
    onPreviewLayersChange,
    onCommitLayersChange,
    onUndo,
    onRedo,
    onDeleteSelected,
    onDuplicateSelected,
    onNudgeSelected,
  });
  latestRef.current = {
    doc,
    snapEnabled,
    showGrid,
    selectedLayerIds,
    editingTextId,
    onSelectLayers,
    onPreviewLayersChange,
    onCommitLayersChange,
    onUndo,
    onRedo,
    onDeleteSelected,
    onDuplicateSelected,
    onNudgeSelected,
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

  const contrastReport = useMemo(
    () => analyzeDocumentContrast(doc, activePalette),
    [doc, activePalette]
  );

  const safeZoneReport = useMemo(
    () => (showSafeZone ? checkSafeZoneViolations(doc, 0.08) : null),
    [doc, showSafeZone]
  );

  const computeFitZoom = useCallback(
    (containerW: number) => {
      const horizontalPad = containerW < 640 ? 28 : 72;
      const availableW = Math.max(220, containerW - horizontalPad);
      return Math.min(1, Math.max(0.28, +(availableW / Math.max(1, doc.width)).toFixed(2)));
    },
    [doc.width]
  );

  const handleFitZoom = useCallback(() => {
    userAdjustedZoomRef.current = false;
    const el = viewportRef.current;
    if (!el) {
      setZoom(1);
      return;
    }
    setZoom(computeFitZoom(el.clientWidth));
  }, [computeFitZoom]);

  // Responsive auto-fit on mobile/tablet viewports via ResizeObserver
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const applyResponsiveFit = () => {
      if (userAdjustedZoomRef.current) return;
      const fit = computeFitZoom(el.clientWidth);
      setZoom(fit);
    };

    applyResponsiveFit();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      applyResponsiveFit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [computeFitZoom]);

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

  const cacheSvgRect = () => {
    svgRectRef.current = svgRef.current?.getBoundingClientRect() ?? null;
  };

  const startLayerDrag = (e: React.PointerEvent, layer: LogoLayer) => {
    e.stopPropagation();

    let nextIds: string[];
    if (e.shiftKey) {
      nextIds = selectedSet.has(layer.id)
        ? selectedLayerIds.filter((id) => id !== layer.id)
        : [...selectedLayerIds, layer.id];
      onSelectLayers(nextIds);
    } else if (selectedSet.has(layer.id)) {
      nextIds = selectedLayerIds;
    } else {
      nextIds = [layer.id];
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

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-[#F1F5F9] dark:bg-[#0B0D14] transition-colors">
      {/* Floating Contextual Top Bar right above the Artboard */}
      <div className="px-3 sm:px-5 pt-3 pb-1 shrink-0 z-30">
        <FloatingContextToolbar
          doc={doc}
          activePalette={activePalette}
          selectedLayers={selectedLayers}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          onUpdateLayer={onUpdateLayer}
          onAlignSelectedLayers={onAlignSelectedLayers}
          onBatchUpdateSelected={onBatchUpdateSelected}
          onBooleanCombine={onBooleanCombine}
          onCreateClippingMask={onCreateClippingMask}
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
        />
      </div>

      {/* Scrollable Workspace Viewport */}
      <div
        ref={viewportRef}
        className="relative flex flex-1 items-center justify-center overflow-auto p-3.5 sm:p-6 lg:p-8 min-h-[280px] sm:min-h-[380px]"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            onSelectLayers([]);
            setEditingTextId(null);
          }
        }}
      >
        {editorNotice && (
          <div className="pointer-events-none absolute top-3 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-300 bg-amber-50/95 px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-md backdrop-blur dark:border-amber-700 dark:bg-amber-950/90 dark:text-amber-200">
            {editorNotice}
          </div>
        )}
        <div
          className="relative shrink-0 shadow-[0_14px_42px_rgba(15,23,42,0.14)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.55)] ring-1 ring-[#E2E8F0] dark:ring-[#2A2D3D]"
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
            className="h-full w-full select-none block touch-none"
            onPointerDown={(e) => {
              if (
                e.target === e.currentTarget ||
                (e.target as Element).getAttribute('data-bg') === 'true'
              ) {
                startMarqueeSelection(e);
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

            {showGrid && (
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

            {/* Render All Scene Layers */}
            {doc.layers.map((layer) => (
              <g
                key={layer.id}
                onPointerDown={(e) => startLayerDrag(e, layer)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (layer.type === 'text' && !layer.locked) {
                    setEditingTextId(layer.id);
                  }
                }}
                style={{ cursor: layer.locked ? 'not-allowed' : 'move', touchAction: 'none' }}
              >
                <CanvasLayerNode
                  layer={layer}
                  docBg={doc.transparentBackground ? 'transparent' : doc.backgroundColor}
                  idPrefix="canvas"
                />
              </g>
            ))}

            {/* Toggleable Safe-Zone & Bleed Margin Overlay */}
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
                fill="rgba(37, 99, 235, 0.1)"
                stroke="#2563EB"
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
                  stroke="#2563EB"
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
                stroke="#2563EB"
                strokeWidth={1.5 / zoom}
                strokeDasharray="5 3"
                pointerEvents="none"
              />
            )}

            {/* Single-layer Selection Bounding Box, 8 Resize Handles & Rotate Handle */}
            {singleSelected && (
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
                  stroke={singleSelected.locked ? '#D97706' : '#2563EB'}
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
                      stroke="#2563EB"
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
                      stroke="#2563EB"
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
                            stroke="#2563EB"
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
                className="h-full w-full rounded border-2 border-[#2563EB] bg-white/95 px-2 text-center font-bold text-[#141413] shadow-md focus:outline-none"
                style={{
                  fontFamily: editingTextLayer.fontFamily,
                  fontSize: `${Math.max(14, editingTextLayer.fontSize * zoom * 0.65)}px`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Zoom & Page-Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#161822] px-3 sm:px-4 py-2 text-xs">
        {/* Left: Multi-Page Switcher & Project Snapshot */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          {pages.map((p, idx) => {
            const active = idx === activePageIndex;
            return (
              <div
                key={p.id}
                className={`inline-flex items-center gap-1 rounded-full border pl-2.5 pr-1.5 py-1 text-[11px] font-semibold transition-colors shrink-0 ${
                  active
                    ? 'border-[#1B4332] bg-[#1B4332]/10 text-[#1B4332] dark:border-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] text-slate-600 dark:text-slate-300 hover:border-slate-400'
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
            className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-600 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">Add Page</span>
          </button>

          {onSaveProject && (
            <button
              type="button"
              onClick={onSaveProject}
              title={
                activeProjectName
                  ? `Auto-saving "${activeProjectName}" (Click to save a new snapshot copy)`
                  : 'Save logo to My Projects'
              }
              className="hidden md:inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] dark:border-[#2A2D3D] bg-slate-50 dark:bg-[#1E202B] px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-600 cursor-pointer whitespace-nowrap shrink-0"
            >
              {activeProjectName ? (
                <BookmarkCheck className="h-3 w-3 text-[#1B4332] dark:text-emerald-400" />
              ) : (
                <FolderPlus className="h-3 w-3 text-[#1B4332] dark:text-emerald-400" />
              )}
              <span>
                {autoSaveState === 'saving'
                  ? 'Saving...'
                  : activeProjectName
                    ? 'Save Copy'
                    : 'Save Project'}
              </span>
            </button>
          )}
        </div>

        {/* Center/Right: Grid, Snap, Safe Zone, Contrast Status, and Zoom Slider */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
              showGrid
                ? 'border-slate-900 bg-slate-900 text-white dark:border-emerald-500 dark:bg-emerald-600'
                : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Grid3x3 className="h-3 w-3" />
            <span className="hidden sm:inline">Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setSnapEnabled((v) => !v)}
            className={`inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
              snapEnabled
                ? 'border-[#1B4332] bg-[#1B4332] text-white dark:border-emerald-500 dark:bg-emerald-600'
                : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] text-slate-600 dark:text-slate-300'
            }`}
          >
            Snap
          </button>

          <button
            type="button"
            onClick={() => setShowSafeZone((v) => !v)}
            title="Toggle 8% safe-margin overlay"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
              showSafeZone
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Scan className="h-3 w-3" />
            <span className="hidden md:inline">Safe Zone</span>
          </button>

          {contrastReport.checkedCount > 0 && (
            <div
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10.5px] font-semibold whitespace-nowrap shrink-0 ${
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
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] px-2 py-1 text-[10.5px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Deselect
            </button>
          )}

          <span className="hidden sm:inline h-4 w-px bg-[#E2E8F0] dark:bg-[#2A2D3D]" aria-hidden="true" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                userAdjustedZoomRef.current = true;
                setZoom((z) => Math.max(0.28, +(z - 0.12).toFixed(2)));
              }}
              className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] p-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min={0.28}
              max={2.2}
              step={0.04}
              value={zoom}
              onChange={(e) => {
                userAdjustedZoomRef.current = true;
                setZoom(Number(e.target.value));
              }}
              aria-label="Canvas zoom slider"
              className="hidden sm:block w-20 accent-[#1B4332] dark:accent-emerald-500 cursor-pointer"
            />
            <span className="font-mono-num w-10 text-center text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => {
                userAdjustedZoomRef.current = true;
                setZoom((z) => Math.min(2.2, +(z + 0.12).toFixed(2)));
              }}
              className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] p-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitZoom}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] dark:border-[#2A2D3D] bg-white dark:bg-[#1E202B] px-2 py-1 text-[10.5px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer whitespace-nowrap shrink-0"
              title="Fit artboard to viewport"
            >
              <Maximize2 className="h-3 w-3" />
              Fit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
