// src/app/edit-fill/page.js
'use client';
import { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import {
  Type, CheckSquare, X as CrossIcon, PenTool, Image as ImageIcon,
  CalendarDays, MousePointer2, Upload, Download, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RefreshCw,
} from 'lucide-react';
import PdfPageCanvas from '../components/Pdfpagecanvas';
import { buildFilledPdf } from '../components/pdfUtils';

// Served as a static file from /public - see setup step below. This avoids relying on
// the bundler to resolve pdfjs-dist's worker path, which behaves inconsistently across
// webpack vs Turbopack and across Next.js versions.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const TOOLS = [
  { id: 'select', label: 'Select / Move', icon: MousePointer2 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'check', label: 'Checkmark', icon: CheckSquare },
  { id: 'cross', label: 'Cross', icon: CrossIcon },
  { id: 'draw', label: 'Draw / Sign', icon: PenTool },
  { id: 'image', label: 'Image Stamp', icon: ImageIcon },
  { id: 'date', label: 'Date', icon: CalendarDays },
];

export default function EditFillPage() {
  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [originalBytes, setOriginalBytes] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [activeTool, setActiveTool] = useState('select');
  const [fieldValues, setFieldValues] = useState({});
  const [freeAnnotations, setFreeAnnotations] = useState([]);
  const [flattenOnExport, setFlattenOnExport] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState(null);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    const buf = await selectedFile.arrayBuffer();
    setOriginalBytes(buf.slice(0)); // pristine copy pdf-lib will use for final export
    const loadingTask = pdfjsLib.getDocument({ data: buf.slice(0) });
    const doc = await loadingTask.promise;
    setFile(selectedFile);
    setPdfDoc(doc);
    setNumPages(doc.numPages);
    setPageIndex(0);
    setFieldValues({});
    setFreeAnnotations([]);
    setActiveTool('select');
  }, []);

  function handleFieldChange(fieldName, fieldType, value) {
  setFieldValues((prev) => ({
    ...prev,
    [fieldName]: {
      ...prev[fieldName], // 👈 This spreads and preserves existing keys like fontSizePt
      fieldType,
      value,
    },
  }));
}

  function handleFontSizeChange(fieldName, fontSizePt) {
    setFieldValues((prev) => ({
      ...prev,
      [fieldName]: {
        fieldType: 'Tx',
        value: '',
        ...prev[fieldName],
        fontSizePt,
      },
    }));
  }

  function handleAddAnnotation(partial) {
    const id = crypto.randomUUID();
    setFreeAnnotations((prev) => [...prev, { id, ...partial }]);
    return id;
  }

  function handleUpdateAnnotation(id, changes) {
    setFreeAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...changes } : a)));
  }

  function handleDeleteAnnotation(id) {
    setFreeAnnotations((prev) => prev.filter((a) => a.id !== id));
  }

  function handleToolClick(toolId) {
    if (toolId === 'image') {
      imageInputRef.current?.click();
      return;
    }
    setActiveTool(toolId);
  }

  function handleImageFileChosen(e) {
    const imgFile = e.target.files?.[0];
    if (!imgFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImageDataUrl(reader.result);
      setActiveTool('image');
    };
    reader.readAsDataURL(imgFile);
    e.target.value = '';
  }

  async function handleDownload() {
    if (!originalBytes) return;
    setIsExporting(true);
    try {
      const bytes = await buildFilledPdf({
        originalBytes,
        fieldValues,
        freeAnnotations,
        flatten: flattenOnExport,
      });
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filled_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Could not build the filled PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  }

  function resetState() {
    setFile(null);
    setPdfDoc(null);
    setOriginalBytes(null);
    setNumPages(0);
    setPageIndex(0);
    setFieldValues({});
    setFreeAnnotations([]);
    setActiveTool('select');
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-xl text-blue-600 mb-3">
            <PenTool className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Edit & Fill PDF</h1>
          <p className="text-gray-500 mt-2">
            Fill real form fields, tick checkboxes, sign, stamp, and annotate any PDF.
          </p>
        </div>

        {!file ? (
          <div
            className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-16 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Click to upload a PDF</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-100 mb-4">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                const isActive = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleToolClick(t.id)}
                    title={t.label}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleImageFileChosen}
              />

              <div className="flex-1" />

              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-500 w-12 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale((s) => Math.min(3, s + 0.1))}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <button
                onClick={resetState}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Change File
              </button>
            </div>

            {/* Hint for the active tool */}
            {activeTool === 'image' && !pendingImageDataUrl && (
              <p className="text-xs text-amber-600 mb-3">Choose an image file, then click on the page to place it.</p>
            )}
            {activeTool !== 'select' && activeTool !== 'image' && (
              <p className="text-xs text-gray-400 mb-3">
                Click on the page to place a {TOOLS.find((t) => t.id === activeTool)?.label.toLowerCase()}. Switch to
                "Select / Move" to drag, resize, or delete it.
              </p>
            )}

            {/* Page navigation */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pageIndex + 1} of {numPages}
              </span>
              <button
                onClick={() => setPageIndex((p) => Math.min(numPages - 1, p + 1))}
                disabled={pageIndex === numPages - 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Canvas */}
            <div className="overflow-auto bg-gray-100 rounded-xl p-6 flex justify-center">
              <PdfPageCanvas
                pdfDoc={pdfDoc}
                pageIndex={pageIndex}
                scale={scale}
                activeTool={activeTool}
                fieldValues={fieldValues}
                onFieldChange={handleFieldChange}
                onFontSizeChange={handleFontSizeChange}
                freeAnnotations={freeAnnotations.filter((a) => a.page === pageIndex)}
                onAddAnnotation={handleAddAnnotation}
                onUpdateAnnotation={handleUpdateAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                pendingImageDataUrl={pendingImageDataUrl}
                onImagePlaced={() => setPendingImageDataUrl(null)}
              />
            </div>

            {/* Export row */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={flattenOnExport}
                  onChange={(e) => setFlattenOnExport(e.target.checked)}
                />
                Flatten form fields (bake in values, non-editable after download)
              </label>
              <button
                onClick={handleDownload}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 shadow-sm"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4" />
                    <span>Building PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Filled PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}