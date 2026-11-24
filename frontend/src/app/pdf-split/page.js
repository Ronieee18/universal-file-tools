// src/app/pdf-split/page.js
'use client';
import { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import FileDropzone from '../components/FileDropZone';
import { Scissors, RefreshCw, Plus, Trash2 } from 'lucide-react';

export default function PdfSplitPage() {
  const [files, setFiles] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [ranges, setRanges] = useState([{ start: 1, end: 1 }]);
  const [mergeRanges, setMergeRanges] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customFileName, setCustomFileName] = useState('split_document');

  // Automatically parse single PDF pages on upload
  useEffect(() => {
    async function readPdfPageCount() {
      if (files.length === 0) return;
      
      const targetFile = files[0];
      try {
        const fileBuffer = await targetFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer, { updateMetadata: false });
        const count = pdfDoc.getPageCount();
        
        setTotalPages(count);
        // Initialize with a safe default range matching total length
        setRanges([{ start: 1, end: count }]);
      } catch (error) {
        console.error("Error reading PDF pages:", error);
        alert("Could not read this PDF file. Make sure it is not password protected.");
        setFiles([]);
      }
    }

    readPdfPageCount();
  }, [files]);

  const addRangeRow = () => {
    setRanges([...ranges, { start: 1, end: totalPages }]);
  };

  const removeRangeRow = (indexToRemove) => {
    if (ranges.length === 1) return;
    setRanges(ranges.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRangeChange = (index, field, value) => {
    const intVal = parseInt(value) || '';
    const updated = [...ranges];
    updated[index][field] = intVal;
    setRanges(updated);
  };

  const executeSplit = async () => {
    if (files.length === 0) return;

    // 1. Structural Range Validations
    for (let i = 0; i < ranges.length; i++) {
      const { start, end } = ranges[i];
      if (!start || !end || start < 1 || end > totalPages || start > end) {
        alert(`Range #${i + 1} is invalid. Please ensure values fall between 1 and ${totalPages}.`);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const sourceBuffer = await files[0].arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBuffer);
      const cleanBaseName = customFileName.trim().replace(/[/\\?%*:|"<>\s]+/g, '_') || 'split_document';

      if (mergeRanges) {
        // --- APPROACH A: Compile all ranges sequentially into ONE single output PDF ---
        const masterPdf = await PDFDocument.create();
        
        for (const range of ranges) {
          const indices = [];
          for (let i = range.start - 1; i <= range.end - 1; i++) {
            indices.push(i);
          }
          const copiedPages = await masterPdf.copyPages(sourcePdf, indices);
          copiedPages.forEach(page => masterPdf.addPage(page));
        }

        const pdfBytes = await masterPdf.save();
        triggerBrowserDownload(pdfBytes, `${cleanBaseName}.pdf`, 'application/pdf');

      } else {
        // --- APPROACH B: Export separate files zipped together cleanly ---
        const zip = new JSZip();

        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          const rangePdf = await PDFDocument.create();
          const indices = [];
          for (let k = range.start - 1; k <= range.end - 1; k++) {
            indices.push(k);
          }

          const copiedPages = await rangePdf.copyPages(sourcePdf, indices);
          copiedPages.forEach(page => rangePdf.addPage(page));
          const pdfBytes = await rangePdf.save();
          
          // Add file entry inside the zip buffer layout
          zip.file(`${cleanBaseName}_pages_${range.start}-${range.end}.pdf`, pdfBytes);
        }

        const zipBlobBytes = await zip.generateAsync({ type: 'blob' });
        triggerBrowserDownload(zipBlobBytes, `${cleanBaseName}_split_packages.zip`, 'application/zip');
      }
    } catch (error) {
      console.error("Split compilation processing error:", error);
      alert("An error occurred during range processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerBrowserDownload = (dataBytes, fileName, mimeType) => {
    const blob = dataBytes instanceof Blob ? dataBytes : new Blob([dataBytes], { type: mimeType });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  const resetState = () => {
    setFiles([]);
    setTotalPages(0);
    setRanges([{ start: 1, end: 1 }]);
    setCustomFileName('split_document');
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-xl text-indigo-600 mb-3">
            <Scissors className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Advanced PDF Splitter</h1>
          <p className="text-gray-500 mt-2">Extract dynamic page ranges and merge them or package them into isolated files instantly.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          
          {files.length === 0 ? (
            <FileDropzone 
              acceptedTypes={['.pdf']} 
              maxFiles={1} 
              files={files} 
              setFiles={setFiles} 
            />
          ) : (
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl mb-6 flex justify-between items-center text-sm">
              <div className="truncate pr-4">
                <span className="font-semibold text-gray-700 block truncate">{files[0].name}</span>
                <span className="text-xs text-indigo-600 font-medium">Total Pages Detected: {totalPages}</span>
              </div>
              <button onClick={resetState} className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium shrink-0">
                Change File
              </button>
            </div>
          )}

          {/* Dynamic Range Rows */}
          {totalPages > 0 && (
            <div className="space-y-4 mt-6 border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">Configure Page Extraction Ranges</label>
                <button
                  type="button"
                  onClick={addRangeRow}
                  className="inline-flex items-center space-x-1 text-xs font-bold bg-indigo-5 text-indigo-600 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Range</span>
                </button>
              </div>

              <div className="space-y-2 max-w-xl">
                {ranges.map((range, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 w-6 text-center">#{index + 1}</span>
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        placeholder="Start"
                        value={range.start}
                        onChange={(e) => handleRangeChange(index, 'start', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-1.5 bg-white text-sm text-gray-900 focus:border-indigo-500 focus:ring-1"
                      />
                      <span className="text-gray-400 text-xs font-medium">to</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        placeholder="End"
                        value={range.end}
                        onChange={(e) => handleRangeChange(index, 'end', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-1.5 bg-white text-sm text-gray-900 focus:border-indigo-500 focus:ring-1"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={ranges.length === 1}
                      onClick={() => removeRangeRow(index)}
                      className="text-gray-400 hover:text-red-500 p-1.5 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Output Management Configurations */}
              <div className="mt-6 p-5 bg-gray-50 border border-gray-200 rounded-2xl max-w-md space-y-4">
                <div>
                  <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-1">
                    Output Base Filename
                  </label>
                  <input
                    type="text"
                    id="filename"
                    className="block w-full rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 sm:text-sm p-2.5 bg-white text-gray-900"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                  />
                </div>

                <div className="flex items-start pt-2">
                  <div className="flex h-5 items-center">
                    <input
                      id="merge-checkbox"
                      type="checkbox"
                      checked={mergeRanges}
                      onChange={(e) => setMergeRanges(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="merge-checkbox" className="font-medium text-gray-700 cursor-pointer select-none">
                      Merge all selected ranges into a single PDF
                    </label>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {mergeRanges 
                        ? "Outputs one combined document based on rows above." 
                        : "Outputs separate PDFs zipped cleanly into one package file."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-8 flex justify-end space-x-3 border-t border-gray-100 pt-6">
            <button
              onClick={resetState}
              disabled={files.length === 0 || isProcessing}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={executeSplit}
              disabled={files.length === 0 || isProcessing}
              className="inline-flex items-center space-x-2 px-5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4" />
                  <span>Processing Ranges...</span>
                </>
              ) : (
                <span>Extract Ranges</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}