import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CreditCard,
  Grid3x3,
  Maximize2,
  Redo2,
  RotateCcw,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ColorPalette, LogoDocument, LogoLayer, TextLayer } from '../types/logo';
import { CanvasLayerNode } from './CanvasLayerRenderer';

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
}

export const LogoCanvasEditor: React.FC<LogoCanvasEditorProps> = ({
  doc,
  activePalette,
  selectedLayerIds,
  onSelectLayers,
  onPreviewLayersChange,
  onCommitLayersChange,
  onUpdateTextLive,
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
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [marquee, setMarquee] = useState<MarqueeBox | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const interactionRef = useRef<InteractionState | null>(null);

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

  const singleSelected =
    selectedLayers.length === 1 ? selectedLayers[0] : null;

  const clientToArtboard = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * doc.width,
      y: ((clientY - rect.top) / rect.height) * doc.height,
    };
  };

  const computeGroupSnap = (
    movingBox: { x: number; y: number; width: number; height: number },
    excludedIds: Set<string>,
    dx: number,
    dy: number
  ): { snappedDx: number; snappedDy: number; guides: SnapGuide[] } => {
    let nx = movingBox.x + dx;
    let ny = movingBox.y + dy;
    const guides: SnapGuide[] = [];

    if (!snapEnabled) {
      return {
        snappedDx: Math.round(dx),
        snappedDy: Math.round(dy),
        guides,
      };
    }

    const threshold = 7;
    const xTargets: number[] = [doc.width / 2, 40, doc.width - 40];
    const yTargets: number[] = [doc.height / 2, 40, doc.height - 40];

    for (const other of doc.layers) {
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

    if (!snappedX && showGrid) {
      const gx = Math.round(nx / 10) * 10;
      if (Math.abs(nx - gx) < 3) nx = gx;
    }
    if (!snappedY && showGrid) {
      const gy = Math.round(ny / 10) * 10;
      if (Math.abs(ny - gy) < 3) ny = gy;
    }

    return {
      snappedDx: Math.round(nx - movingBox.x),
      snappedDy: Math.round(ny - movingBox.y),
      guides,
    };
  };

  useEffect(() => {
    if (!interaction) return;

    const handlePointerMove = (e: PointerEvent) => {
      const st = interactionRef.current;
      if (!st) return;

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      if (st.mode === 'marquee' && st.marqueeStart) {
        const pt = clientToArtboard(e.clientX, e.clientY);
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
          const hits = doc.layers
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
          onSelectLayers(hits);
        }
        return;
      }

      const scaleX = doc.width / rect.width;
      const scaleY = doc.height / rect.height;
      const dx = (e.clientX - st.startClientX) * scaleX;
      const dy = (e.clientY - st.startClientY) * scaleY;

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
        onPreviewLayersChange(nextMap);
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
          e.shiftKey ||
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
        onPreviewLayersChange(st.currentLayersMap);
      } else if (st.mode === 'rotate' && st.primaryLayerId) {
        const base = st.initialLayersMap[st.primaryLayerId];
        if (!base) return;
        const pt = clientToArtboard(e.clientX, e.clientY);
        const cx = base.x + base.width / 2;
        const cy = base.y + base.height / 2;
        let deg = (Math.atan2(pt.y - cy, pt.x - cx) * 180) / Math.PI + 90;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        else deg = Math.round(deg);

        const updated: LogoLayer = {
          ...base,
          rotation: ((deg % 360) + 360) % 360,
        };
        st.currentLayersMap = { [base.id]: updated };
        onPreviewLayersChange(st.currentLayersMap);
      }
    };

    const handlePointerUp = () => {
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
          onCommitLayersChange(st.initialLayersMap, st.currentLayersMap);
        }
      }
      interactionRef.current = null;
      setInteraction(null);
      setSnapGuides([]);
      setMarquee(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [interaction, doc.width, doc.height, doc.layers, snapEnabled, showGrid]);

  // Keyboard shortcuts: Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y, Ctrl+D, Ctrl+A, Delete, Arrows
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
      if (editingTextId) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }

      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
        return;
      }

      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onDuplicateSelected();
        return;
      }

      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        onSelectLayers(doc.layers.filter((l) => l.visible && !l.locked).map((l) => l.id));
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerIds.length > 0) {
        e.preventDefault();
        onDeleteSelected();
        return;
      }

      if (selectedLayerIds.length > 0) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onNudgeSelected(-step, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onNudgeSelected(step, 0);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          onNudgeSelected(0, -step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onNudgeSelected(0, step);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    editingTextId,
    selectedLayerIds,
    doc.layers,
    onUndo,
    onRedo,
    onDeleteSelected,
    onDuplicateSelected,
    onNudgeSelected,
    onSelectLayers,
  ]);

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
  const bgSwatches = ['#FFFFFF', '#F4F1DE', '#141413', activePalette.primary];

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-[#ECEAE4]">
      {/* Canvas Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCD9D0] bg-[#FAF9F6] px-4 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl/Cmd+Z)"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#F2F0EA] disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl/Cmd+Shift+Z)"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#F2F0EA] disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Redo2 className="h-3.5 w-3.5" />
            Redo
          </button>

          <span className="mx-1 h-4 w-px bg-[#DCD9D0]" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showGrid
                ? 'border-[#141413] bg-[#141413] text-white'
                : 'border-[#DCD9D0] bg-white text-[#3F3E39] hover:bg-[#F2F0EA]'
            }`}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Grid
          </button>

          <button
            type="button"
            onClick={() => setSnapEnabled((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              snapEnabled
                ? 'border-[#1B4332] bg-[#1B4332] text-white'
                : 'border-[#DCD9D0] bg-white text-[#3F3E39] hover:bg-[#F2F0EA]'
            }`}
          >
            Snap Guides
          </button>

          <span className="mx-1 h-4 w-px bg-[#DCD9D0]" aria-hidden="true" />

          {/* Artboard Background Color Switcher right in Top Toolbar */}
          <div className="flex items-center gap-1.5 rounded-md border border-[#DCD9D0] bg-white px-2 py-1">
            <span className="text-[11px] font-medium text-[#5C5951]">Canvas:</span>
            {bgSwatches.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onUpdateDocBackground(hex, false)}
                className={`h-4 w-4 rounded-sm border cursor-pointer ${
                  !doc.transparentBackground &&
                  doc.backgroundColor.toLowerCase() === hex.toLowerCase()
                    ? 'ring-2 ring-[#2563EB] ring-offset-1 border-black/30'
                    : 'border-black/20'
                }`}
                style={{ backgroundColor: hex }}
                title={`Background ${hex}`}
              />
            ))}
            <input
              type="color"
              value={doc.backgroundColor}
              onChange={(e) => onUpdateDocBackground(e.target.value, false)}
              aria-label="Custom artboard background color"
              className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
            />
            <button
              type="button"
              onClick={() =>
                onUpdateDocBackground(doc.backgroundColor, !doc.transparentBackground)
              }
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer ${
                doc.transparentBackground
                  ? 'bg-[#141413] text-white'
                  : 'bg-[#F2F0EA] text-[#3F3E39] hover:bg-[#E4E1D7]'
              }`}
              title="Toggle transparent canvas"
            >
              Clear
            </button>
          </div>

          <select
            value={`${doc.width}x${doc.height}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              onResizeArtboard(w, h);
            }}
            aria-label="Artboard size preset"
            className="rounded-md border border-[#DCD9D0] bg-white px-2 py-1.5 text-[11px] font-medium text-[#141413] cursor-pointer"
          >
            <option value="800x600">Logo 800×600</option>
            <option value="800x800">Square 800×800</option>
            <option value="1050x600">Card 1050×600</option>
          </select>
        </div>

        {/* Right Toolbar: Logo Wizard + Send to Card + Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenWizard}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#DCD9D0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141413] hover:border-[#141413] hover:bg-[#F2F0EA] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Logo Wizard
          </button>

          <button
            type="button"
            onClick={onSendToVisitingCard}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#1B4332] bg-[#1B4332]/10 px-2.5 py-1.5 text-xs font-semibold text-[#1B4332] hover:bg-[#1B4332] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Put Logo on Card
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
              className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#141413] hover:bg-[#F2F0EA] cursor-pointer"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono-num w-11 text-center text-xs font-semibold text-[#141413]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}
              className="rounded-md border border-[#DCD9D0] bg-white p-1.5 text-[#141413] hover:bg-[#F2F0EA] cursor-pointer"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="inline-flex items-center gap-1 rounded-md border border-[#DCD9D0] bg-white px-2 py-1.5 text-[11px] font-medium text-[#3F3E39] hover:bg-[#F2F0EA] cursor-pointer whitespace-nowrap shrink-0"
              title="Reset zoom to 100%"
            >
              <Maximize2 className="h-3 w-3" />
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Workspace Viewport */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-auto p-6 sm:p-10"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            onSelectLayers([]);
            setEditingTextId(null);
          }
        }}
      >
        <div
          className="relative shrink-0 shadow-[0_12px_40px_rgba(17,24,39,0.12)] ring-1 ring-black/10 transition-[width,height] duration-150"
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
            className="h-full w-full select-none block"
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
                style={{ cursor: layer.locked ? 'not-allowed' : 'move' }}
              >
                <CanvasLayerNode
                  layer={layer}
                  docBg={doc.transparentBackground ? 'transparent' : doc.backgroundColor}
                  idPrefix="canvas"
                />
              </g>
            ))}

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
                      r={6 / zoom}
                      fill="#FFFFFF"
                      stroke="#2563EB"
                      strokeWidth={1.8 / zoom}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => startRotate(e, singleSelected)}
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
                      return (
                        <rect
                          key={pt.id}
                          x={pt.hx - hs / 2}
                          y={pt.hy - hs / 2}
                          width={hs}
                          height={hs}
                          rx={1.5 / zoom}
                          fill="#FFFFFF"
                          stroke="#2563EB"
                          strokeWidth={1.5 / zoom}
                          style={{ cursor: pt.cursor }}
                          onPointerDown={(e) => startResize(e, singleSelected, pt.id)}
                        />
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

      {/* Helpful Canvas Hint Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCD9D0] bg-[#FAF9F6] px-4 py-1.5 text-[11px] text-[#5C5951]">
        <span>
          Drag empty canvas for multi-select · Shift+Click layers · Ctrl+D duplicate · Ctrl+Z undo · Del delete
        </span>
        <div className="flex items-center gap-3 font-mono-num">
          <span>
            {selectedLayerIds.length > 1
              ? `${selectedLayerIds.length} selected`
              : `${doc.width} × ${doc.height} px`}
          </span>
          {selectedLayerIds.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectLayers([])}
              className="inline-flex items-center gap-1 text-[#141413] hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Deselect
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
