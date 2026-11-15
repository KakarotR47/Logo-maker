import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Folder,
  FolderMinus,
  FolderPlus,
  GripVertical,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Search,
  Trash2,
  Unlock,
} from 'lucide-react';
import { LayerGroup, LogoDocument, LogoLayer } from '../types/logo';

interface RightLayersDrawerProps {
  doc: LogoDocument;
  selectedLayerIds: string[];
  onSelectLayers: (ids: string[]) => void;
  onReorderLayerToIndex: (layerId: string, targetIndex: number) => void;
  onRenameLayer: (layerId: string, nextName: string) => void;
  onGroupSelected: () => void;
  onUngroupSelected: (explicitGroupId?: string) => void;
  onRenameGroup: (groupId: string, nextName: string) => void;
  onToggleGroupCollapsed: (groupId: string) => void;
  onToggleGroupVisible: (groupId: string) => void;
  onToggleGroupLock: (groupId: string) => void;
  onToggleLayerVisible: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onToggleBackgroundLock: () => void;
  onUpdateDocBackground: (bg: string, transparent: boolean) => void;
}

type StackRenderItem =
  | {
      kind: 'group';
      group: LayerGroup;
      /** Layers top-first within the group */
      items: Array<{ layer: LogoLayer; docIndex: number }>;
      /** Highest doc index of any child in this group */
      topDocIndex: number;
      /** Lowest doc index of any child in this group */
      bottomDocIndex: number;
    }
  | {
      kind: 'layer';
      layer: LogoLayer;
      docIndex: number;
    };

export const RightLayersDrawer: React.FC<RightLayersDrawerProps> = ({
  doc,
  selectedLayerIds,
  onSelectLayers,
  onReorderLayerToIndex,
  onRenameLayer,
  onGroupSelected,
  onUngroupSelected,
  onRenameGroup,
  onToggleGroupCollapsed,
  onToggleGroupVisible,
  onToggleGroupLock,
  onToggleLayerVisible,
  onToggleLayerLock,
  onDuplicateLayer,
  onDeleteLayer,
  onToggleBackgroundLock,
  onUpdateDocBackground,
}) => {
  const [open, setOpen] = useState<boolean>(true);
  const [query, setQuery] = useState<string>('');
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ layerId: string; pos: 'before' | 'after' } | null>(
    null
  );

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>('');

  const selectedSet = useMemo(() => new Set(selectedLayerIds), [selectedLayerIds]);
  const groupsMap = useMemo(() => {
    const map = new Map<string, LayerGroup>();
    (doc.groups ?? []).forEach((g) => map.set(g.id, g));
    return map;
  }, [doc.groups]);

  const canGroup = selectedLayerIds.length >= 2;
  const canUngroup = useMemo(
    () => doc.layers.some((l) => selectedSet.has(l.id) && Boolean(l.groupId)),
    [doc.layers, selectedSet]
  );

  // Build top-first hierarchy grouping consecutive/clustered layers sharing the same groupId
  const stackItems = useMemo<StackRenderItem[]>(() => {
    const q = query.trim().toLowerCase();
    const reversed: Array<{ layer: LogoLayer; docIndex: number }> = [];
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const layer = doc.layers[i];
      if (q) {
        const gName = layer.groupId ? groupsMap.get(layer.groupId)?.name ?? '' : '';
        const matches =
          layer.name.toLowerCase().includes(q) ||
          layer.type.toLowerCase().includes(q) ||
          gName.toLowerCase().includes(q);
        if (!matches) continue;
      }
      reversed.push({ layer, docIndex: i });
    }

    const result: StackRenderItem[] = [];
    const seenGroups = new Set<string>();

    for (const entry of reversed) {
      const gid = entry.layer.groupId;
      if (!gid) {
        result.push({ kind: 'layer', layer: entry.layer, docIndex: entry.docIndex });
        continue;
      }

      if (seenGroups.has(gid)) {
        // Attach to already-created group block if same group appears split
        const existing = result.find(
          (item): item is Extract<StackRenderItem, { kind: 'group' }> =>
            item.kind === 'group' && item.group.id === gid
        );
        if (existing) {
          existing.items.push(entry);
          existing.topDocIndex = Math.max(existing.topDocIndex, entry.docIndex);
          existing.bottomDocIndex = Math.min(existing.bottomDocIndex, entry.docIndex);
        }
        continue;
      }

      seenGroups.add(gid);
      const groupMeta = groupsMap.get(gid) ?? { id: gid, name: 'Layer Group', collapsed: false };
      result.push({
        kind: 'group',
        group: groupMeta,
        items: [entry],
        topDocIndex: entry.docIndex,
        bottomDocIndex: entry.docIndex,
      });
    }

    return result;
  }, [doc.layers, groupsMap, query]);

  const commitLayerRename = (layerId: string) => {
    const trimmed = draftName.trim();
    if (trimmed) {
      onRenameLayer(layerId, trimmed);
    }
    setEditingLayerId(null);
  };

  const commitGroupRename = (groupId: string) => {
    const trimmed = draftName.trim();
    if (trimmed) {
      onRenameGroup(groupId, trimmed);
    }
    setEditingGroupId(null);
  };

  const handleDropOnRow = (targetDocIndex: number, dropPos: 'before' | 'after') => {
    if (!dragLayerId) return;
    const fromIdx = doc.layers.findIndex((l) => l.id === dragLayerId);
    if (fromIdx === -1) return;

    // Top-first list: 'before' a row visually means HIGHER z-index (above it in stack);
    // 'after' visually means LOWER z-index (below it in stack).
    let desiredIndex = dropPos === 'before' ? targetDocIndex + 1 : targetDocIndex;
    if (fromIdx < desiredIndex) {
      desiredIndex -= 1;
    }
    desiredIndex = Math.max(0, Math.min(doc.layers.length - 1, desiredIndex));
    if (desiredIndex !== fromIdx) {
      onReorderLayerToIndex(dragLayerId, desiredIndex);
    }
    setDragLayerId(null);
    setDropHint(null);
  };

  const renderLayerRow = (layer: LogoLayer, docIndex: number, nested: boolean) => {
    const isSelected = selectedSet.has(layer.id);
    const isEditing = editingLayerId === layer.id;
    const hintBefore = dropHint?.layerId === layer.id && dropHint.pos === 'before';
    const hintAfter = dropHint?.layerId === layer.id && dropHint.pos === 'after';

    return (
      <div
        key={layer.id}
        draggable={!isEditing}
        onDragStart={(e) => {
          setDragLayerId(layer.id);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', layer.id);
        }}
        onDragOver={(e) => {
          if (!dragLayerId || dragLayerId === layer.id) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
          setDropHint({ layerId: layer.id, pos });
        }}
        onDragLeave={() => {
          if (dropHint?.layerId === layer.id) {
            setDropHint(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          const pos = dropHint?.layerId === layer.id ? dropHint.pos : 'before';
          handleDropOnRow(docIndex, pos);
        }}
        onDragEnd={() => {
          setDragLayerId(null);
          setDropHint(null);
        }}
        className={`relative group flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
          nested ? 'ml-3' : ''
        } ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15'
            : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#1E222D] hover:border-indigo-300 dark:hover:border-indigo-500/50'
        } ${dragLayerId === layer.id ? 'opacity-45' : ''}`}
      >
        {hintBefore && (
          <span className="pointer-events-none absolute -top-1 left-1 right-1 h-0.5 rounded-full bg-indigo-500" />
        )}
        {hintAfter && (
          <span className="pointer-events-none absolute -bottom-1 left-1 right-1 h-0.5 rounded-full bg-indigo-500" />
        )}

        <span
          className="cursor-grab text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
          title="Drag to reorder z-index"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>

        {isEditing ? (
          <input
            type="text"
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => commitLayerRename(layer.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitLayerRename(layer.id);
              if (e.key === 'Escape') setEditingLayerId(null);
            }}
            className="min-w-0 flex-1 rounded border border-indigo-500 bg-white dark:bg-[#0F1117] px-1.5 py-0.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        ) : (
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
            onDoubleClick={() => {
              setDraftName(layer.name);
              setEditingLayerId(layer.id);
            }}
            className="min-w-0 flex-1 text-left cursor-pointer"
          >
            <p
              className={`truncate font-semibold leading-tight ${
                layer.visible
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-400 dark:text-slate-500 line-through'
              }`}
            >
              {layer.name}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              {layer.type}
              {layer.clipMask?.enabled ? ' · Mask' : ''}
            </p>
          </button>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setDraftName(layer.name);
                setEditingLayerId(layer.id);
              }}
              title="Rename layer"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleLayerVisible(layer.id)}
            title={layer.visible ? 'Hide layer' : 'Show layer'}
            className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
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
            title={layer.locked ? 'Unlock layer' : 'Lock layer'}
            className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
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
            title="Duplicate layer"
            className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 focus:opacity-100 rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252836] cursor-pointer"
          >
            <Copy className="h-3 w-3" />
          </button>
          {!layer.locked && (
            <button
              type="button"
              onClick={() => onDeleteLayer(layer.id)}
              title="Delete layer"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded p-1 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!open) {
    return (
      <div className="hidden lg:flex flex-col items-center border-l border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-1.5 py-3 shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Open Right Layers & Grouping Drawer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252A38] active:scale-95 transition-all cursor-pointer"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
        <span
          className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
          style={{ writingMode: 'vertical-rl' }}
        >
          Layers ({doc.layers.length})
        </span>
      </div>
    );
  }

  return (
    <aside className="flex w-full lg:w-[276px] flex-col border-t lg:border-t-0 lg:border-l border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] shrink-0 max-h-[340px] lg:max-h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#2A2F3D] px-3.5 py-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Layers
          </span>
          <span className="font-mono-num text-[11px] font-semibold text-slate-400">
            {doc.layers.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Collapse Layers Drawer"
          className="hidden lg:inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252A38] hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Collapse Layers Drawer"
          className="lg:hidden inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252A38] cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4 rotate-90" />
        </button>
      </div>

      {/* Group / Ungroup Bar + Search */}
      <div className="border-b border-[#E2E8F0] dark:border-[#2A2F3D] px-3 py-2 space-y-2 shrink-0">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={!canGroup}
            onClick={onGroupSelected}
            title="Group selected layers (Ctrl+G / Cmd+G)"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            <FolderPlus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Group</span>
          </button>
          <button
            type="button"
            disabled={!canUngroup}
            onClick={() => onUngroupSelected()}
            title="Ungroup selected group (Ctrl+Shift+G)"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-amber-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            <FolderMinus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Ungroup</span>
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter layers & groups..."
            className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] pl-8 pr-2.5 py-1 text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Layers & Groups Stack */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {stackItems.length === 0 ? (
          <p className="py-8 text-center text-[11px] text-slate-400">
            {doc.layers.length === 0
              ? 'No canvas layers yet. Add icons, shapes, or text from the left rail.'
              : 'No layers match this filter.'}
          </p>
        ) : (
          stackItems.map((entry) => {
            if (entry.kind === 'layer') {
              return renderLayerRow(entry.layer, entry.docIndex, false);
            }

            const { group, items } = entry;
            const childIds = items.map((c) => c.layer.id);
            const allSelected = childIds.every((id) => selectedSet.has(id));
            const allHidden = items.every((c) => !c.layer.visible);
            const allLocked = items.every((c) => c.layer.locked);
            const isEditingG = editingGroupId === group.id;

            return (
              <div
                key={group.id}
                className="rounded-xl border border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50/70 dark:bg-[#0F1117]/80 p-1.5 space-y-1.5"
              >
                <div className="flex items-center gap-1 px-1 py-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onToggleGroupCollapsed(group.id)}
                    aria-label={group.collapsed ? 'Expand group' : 'Collapse group'}
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-[#252A38] cursor-pointer"
                  >
                    {group.collapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <Folder className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />

                  {isEditingG ? (
                    <input
                      type="text"
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={() => commitGroupRename(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitGroupRename(group.id);
                        if (e.key === 'Escape') setEditingGroupId(null);
                      }}
                      className="min-w-0 flex-1 rounded border border-indigo-500 bg-white dark:bg-[#181B23] px-1.5 py-0.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectLayers(childIds)}
                      onDoubleClick={() => {
                        setDraftName(group.name);
                        setEditingGroupId(group.id);
                      }}
                      className={`min-w-0 flex-1 text-left truncate font-semibold cursor-pointer ${
                        allSelected
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {group.name}{' '}
                      <span className="font-mono-num text-[10px] font-normal text-slate-400">
                        ({items.length})
                      </span>
                    </button>
                  )}

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(group.name);
                        setEditingGroupId(group.id);
                      }}
                      title="Rename group"
                      className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleGroupVisible(group.id)}
                      title={allHidden ? 'Show group' : 'Hide group'}
                      className="rounded p-1 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-[#252A38] cursor-pointer"
                    >
                      {allHidden ? (
                        <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleGroupLock(group.id)}
                      title={allLocked ? 'Unlock group' : 'Lock group'}
                      className="rounded p-1 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-[#252A38] cursor-pointer"
                    >
                      {allLocked ? (
                        <Lock className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUngroupSelected(group.id)}
                      title="Ungroup"
                      className="rounded p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
                    >
                      <FolderMinus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {!group.collapsed && (
                  <div className="space-y-1">
                    {items.map((child) => renderLayerRow(child.layer, child.docIndex, true))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pinned Background Layer Row with Dedicated Background Lock */}
      <div className="border-t border-[#E2E8F0] dark:border-[#2A2F3D] bg-slate-50 dark:bg-[#0F1117] px-3 py-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-6 w-6 rounded-md border border-black/15 dark:border-white/20 shrink-0"
              style={{
                backgroundImage: doc.transparentBackground
                  ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                  : undefined,
                backgroundSize: doc.transparentBackground ? '8px 8px' : undefined,
                backgroundPosition: doc.transparentBackground
                  ? '0 0, 0 4px, 4px -4px, -4px 0'
                  : undefined,
                backgroundColor: doc.transparentBackground ? '#ffffff' : doc.backgroundColor,
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-100">
                Background Canvas
              </p>
              <p className="font-mono-num truncate text-[10px] text-slate-500 dark:text-slate-400">
                {doc.transparentBackground ? 'Transparent' : doc.backgroundColor.toUpperCase()}
                {doc.backgroundLocked ? ' · Locked' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={Boolean(doc.backgroundLocked)}
              onClick={() =>
                onUpdateDocBackground(doc.backgroundColor, !doc.transparentBackground)
              }
              title={
                doc.backgroundLocked
                  ? 'Unlock background to toggle transparency'
                  : doc.transparentBackground
                    ? 'Use solid background fill'
                    : 'Set transparent background'
              }
              className="rounded-lg border border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] px-1.5 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-400 active:scale-95 transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              {doc.transparentBackground ? 'Solid' : 'Alpha'}
            </button>

            <button
              type="button"
              onClick={onToggleBackgroundLock}
              title={doc.backgroundLocked ? 'Unlock background canvas' : 'Lock background canvas'}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10.5px] font-semibold active:scale-95 transition-all cursor-pointer ${
                doc.backgroundLocked
                  ? 'border-amber-500/70 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                  : 'border-[#E2E8F0] dark:border-[#2A2F3D] bg-white dark:bg-[#181B23] text-slate-600 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              {doc.backgroundLocked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
              <span>{doc.backgroundLocked ? 'Locked' : 'Lock'}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
