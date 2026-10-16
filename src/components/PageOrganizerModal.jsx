import { useState, useEffect, useRef } from "react";
import {
  X,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Eye,
  Trash2,
  Plus,
  Check,
  CheckCircle2,
  FileText,
  Maximize2,
  Layers,
  Move,
  Download,
  Loader2
} from "lucide-react";
import { formatFileSize } from "../lib/requirementsStorage";

/**
 * Rotates a base64 or loaded image by 90 degrees clockwise using HTML5 Canvas.
 * @param {string} dataUrl - Image data URL or image source
 * @returns {Promise<string>} Rotated JPEG data URL
 */
async function rotateImageDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);

        canvas.width = img.height;
        canvas.height = img.width;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch (err) {
        console.warn("Canvas rotation failed:", err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * PageOrganizerModal
 * Large visual organizer modal for multi-page documents (Agency Agreement, Valid ID, etc.).
 * Allows:
 * 1. Viewing all pages in large cards with clear sequence labels (Page 1, Page 2, Front, Back).
 * 2. Visual Drag-and-Drop reordering with clear drop highlights.
 * 3. Quick Move Left / Move Right directional arrows.
 * 4. High-resolution live inspector with zoom controls.
 * 5. 90-degree image rotation to fix sideways camera uploads.
 * 6. Quick upload of additional pages.
 */
export default function PageOrganizerModal({
  isOpen,
  onClose,
  slot,
  items = [],
  agentName,
  onReorder,
  onUploadMore,
  onDelete,
  onRotateItem,
  onPreviewPdf
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotatingId, setRotatingId] = useState(null);
  const [notice, setNotice] = useState(null);
  const fileInputRef = useRef(null);

  // Default selection to first item
  useEffect(() => {
    if (items.length > 0 && (!selectedId || !items.some((it) => it.id === selectedId))) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  // Reset zoom when selecting a different page
  useEffect(() => {
    setZoomLevel(1);
  }, [selectedId]);

  if (!isOpen || !slot) return null;

  const selectedItem = items.find((it) => it.id === selectedId) || items[0] || null;
  const isSelectedImage = selectedItem?.type?.startsWith("image/") ||
    selectedItem?.dataUrl?.startsWith("data:image/") ||
    selectedItem?.dataUrl?.startsWith("http");

  // Show temporary feedback toast inside modal
  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  // Drag handlers
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    setSelectedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const dragIdx = items.findIndex((it) => it.id === draggedId);
    const targetIdx = items.findIndex((it) => it.id === targetId);

    if (dragIdx === -1 || targetIdx === -1) {
      setDraggedId(null);
      return;
    }

    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    const updated = reordered.map((item, idx) => ({
      ...item,
      subOrder: idx + 1
    }));

    onReorder(updated);
    setDraggedId(null);
    setSelectedId(moved.id);
    showNotice(`Moved to Page ${targetIdx + 1}`);
  };

  const handleMoveIndex = (currentIndex, direction) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((item, idx) => ({
      ...item,
      subOrder: idx + 1
    }));

    onReorder(updated);
    setSelectedId(moved.id);
    showNotice(`Moved to Page ${targetIndex + 1}`);
  };

  const handleRotate = async (item) => {
    if (!item?.dataUrl || rotatingId) return;
    setRotatingId(item.id);
    try {
      const rotatedDataUrl = await rotateImageDataUrl(item.dataUrl);
      if (onRotateItem) {
        await onRotateItem(item.id, { ...item, dataUrl: rotatedDataUrl });
      }
      showNotice("Rotated 90° clockwise");
    } catch (err) {
      console.error("Rotation failed:", err);
    } finally {
      setRotatingId(null);
    }
  };

  const getPageLabel = (idx) => {
    if (slot.id === "valid_id") {
      if (idx === 0) return "Front Side";
      if (idx === 1) return "Back Side";
      return `ID Card #${idx + 1}`;
    }
    return `Page ${idx + 1}`;
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col h-[92vh] max-h-[950px] w-full max-w-7xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-950">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  {slot.title} — Page Organizer
                </h3>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                  {items.length} {items.length === 1 ? "Page" : "Pages"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Drag cards to reorder sequence · Click card to inspect high-resolution details
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Hidden file input for adding more pictures */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={(e) => {
                if (onUploadMore) onUploadMore(e, slot);
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white transition shadow-sm"
              title="Upload additional pages to this category"
            >
              <Plus size={14} className="text-emerald-400" />
              <span>Add More Pictures</span>
            </button>

            {onPreviewPdf && (
              <button
                type="button"
                onClick={onPreviewPdf}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-3.5 py-2 text-xs font-extrabold text-white transition shadow-sm shadow-emerald-950"
                title="Preview compiled PDF in this sequence"
              >
                <Eye size={14} />
                <span>Preview PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close organizer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Floating Notice Banner */}
        {notice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-500/90 text-slate-950 px-4 py-1.5 text-xs font-extrabold shadow-lg animate-in fade-in slide-in-from-top-2">
            <Check size={14} />
            <span>{notice}</span>
          </div>
        )}

        {/* Modal Main Body (Split View: Reorder Grid + High-Res Inspector) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Column: Interactive Reorder Grid (7 cols) */}
          <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden bg-slate-900/60">
            {/* Guide Bar */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Move size={12} className="text-emerald-400" />
                <span>Drag any card to change position, or use ← / → buttons</span>
              </span>
              <span className="text-slate-500">Auto-saved to database</span>
            </div>

            {/* Scrollable Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center gap-3">
                  <FileText size={40} className="text-slate-600" />
                  <p className="text-sm font-bold text-slate-400">No documents uploaded yet in this category</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                  >
                    <Plus size={14} />
                    <span>Upload Documents Now</span>
                  </button>
                </div>
              ) : (
                items.map((item, idx) => {
                  const isImage = item.type?.startsWith("image/") ||
                    item.dataUrl?.startsWith("data:image/") ||
                    item.dataUrl?.startsWith("http");
                  const isSelected = selectedId === item.id;
                  const isDragged = draggedId === item.id;
                  const isDragOver = dragOverId === item.id;
                  const pageLabel = getPageLabel(idx);

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDrop={(e) => handleDrop(e, item.id)}
                      onClick={() => setSelectedId(item.id)}
                      className={`group relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-150 cursor-pointer ${
                        isDragOver
                          ? "border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-950 scale-[1.01]"
                          : isDragged
                          ? "opacity-30 border-dashed border-emerald-500/50 bg-slate-950/80"
                          : isSelected
                          ? "border-emerald-500 bg-slate-800/90 shadow-md ring-1 ring-emerald-500/50"
                          : "border-slate-800 bg-slate-950/50 hover:bg-slate-800/60 hover:border-slate-700"
                      }`}
                    >
                      {/* Left: Drag Handle, Sequence Badge & Thumbnail */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Drag Handle */}
                        <div
                          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition shrink-0"
                          title="Drag to reorder"
                        >
                          <GripVertical size={16} />
                        </div>

                        {/* Page Sequence Number Badge */}
                        <div className="flex flex-col items-center justify-center h-12 w-14 rounded-xl bg-slate-900 border border-slate-700/80 px-1 text-center shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            SEQ
                          </span>
                          <span className="text-sm font-black text-emerald-400 leading-tight">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Thumbnail Preview */}
                        {isImage && item.dataUrl ? (
                          <div className="relative h-16 w-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 shrink-0 group-hover:border-slate-500 transition">
                            <img
                              src={item.dataUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-500 rounded-xl pointer-events-none" />
                            )}
                          </div>
                        ) : (
                          <div className="h-16 w-20 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0">
                            <FileText size={22} />
                            <span className="text-[9px] font-bold uppercase mt-1">PDF</span>
                          </div>
                        )}

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                              {pageLabel}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-teal-400 flex items-center gap-0.5">
                                <Check size={11} /> Viewing
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs font-bold text-slate-200 truncate max-w-[220px]" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatFileSize(item.size)}
                          </p>
                        </div>
                      </div>

                      {/* Right: Tools & Actions Toolbar */}
                      <div
                        className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Move Left / Up */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveIndex(idx, -1)}
                          className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-20 disabled:hover:bg-slate-800 transition"
                          title="Move earlier (Page -1)"
                        >
                          <ArrowLeft size={14} />
                        </button>

                        {/* Move Right / Down */}
                        <button
                          type="button"
                          disabled={idx === items.length - 1}
                          onClick={() => handleMoveIndex(idx, 1)}
                          className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-20 disabled:hover:bg-slate-800 transition"
                          title="Move later (Page +1)"
                        >
                          <ArrowRight size={14} />
                        </button>

                        {/* Rotate 90 deg */}
                        {isImage && (
                          <button
                            type="button"
                            disabled={rotatingId === item.id}
                            onClick={() => handleRotate(item)}
                            className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 disabled:opacity-40 transition"
                            title="Rotate 90° Clockwise"
                          >
                            {rotatingId === item.id ? (
                              <Loader2 size={14} className="animate-spin text-emerald-400" />
                            ) : (
                              <RotateCw size={14} />
                            )}
                          </button>
                        )}

                        {/* Select to view */}
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={`p-1.5 rounded-xl border transition ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-600 text-white"
                              : "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          }`}
                          title="View in large inspector"
                        >
                          <Maximize2 size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete ${item.name}? This will remove it from the document sequence.`)) {
                              onDelete(item.id, item.storagePath);
                              showNotice("Document removed");
                            }
                          }}
                          className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition"
                          title="Delete page"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live High-Resolution Inspector (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-950/80 overflow-hidden">
            {/* Inspector Header */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Document Inspector
                </span>
                {selectedItem && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {getPageLabel(items.findIndex((it) => it.id === selectedItem.id))}
                  </span>
                )}
              </div>

              {/* Zoom Controls */}
              {isSelectedImage && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                    title="Zoom Out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 min-w-10 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                    title="Zoom In"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Inspector Content */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/95 relative custom-scrollbar">
              {selectedItem ? (
                isSelectedImage && selectedItem.dataUrl ? (
                  <div
                    className="transition-transform duration-150 flex items-center justify-center max-w-full max-h-full"
                    style={{ transform: `scale(${zoomLevel})` }}
                  >
                    <img
                      src={selectedItem.dataUrl}
                      alt={selectedItem.name}
                      className="max-h-[62vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                    <FileText size={48} className="text-slate-500" />
                    <div>
                      <p className="text-sm font-bold text-slate-200">{selectedItem.name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        PDF/Document preview is available in the compiled PDF viewer
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-xs text-slate-500 font-medium">
                  Select a page on the left to inspect
                </div>
              )}
            </div>

            {/* Inspector Footer Details */}
            {selectedItem && (
              <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-200 truncate max-w-xs">{selectedItem.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {formatFileSize(selectedItem.size)} · IndexedDB & Cloud Storage
                  </p>
                </div>
                {isSelectedImage && selectedItem.dataUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={rotatingId === selectedItem.id}
                      onClick={() => handleRotate(selectedItem)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition"
                    >
                      {rotatingId === selectedItem.id ? (
                        <Loader2 size={13} className="animate-spin text-emerald-400" />
                      ) : (
                        <RotateCw size={13} className="text-emerald-400" />
                      )}
                      <span>Rotate</span>
                    </button>
                    <a
                      href={selectedItem.dataUrl}
                      download={selectedItem.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition"
                      title="Download image"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span>
              All sequence adjustments and image rotations are directly synchronized with your compiled PDF export.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold transition shadow-md shadow-emerald-950"
          >
            Done Organizing
          </button>
        </div>
      </div>
    </div>
  );
}
