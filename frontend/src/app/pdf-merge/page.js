// src/app/pdf-merge/page.js
"use client";
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Layers, RefreshCw, GripVertical, FileText } from "lucide-react";
import FileDropzone from "../components/FileDropZone";

export default function PdfMergePage() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customFileName, setCustomFileName] = useState("merged_document");
  const [draggedIndex, setDraggedIndex] = useState(null);

  // --- HTML5 Drag and Drop Reordering Handlers ---
  // --- HTML5 Drag and Drop Reordering Handlers ---
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedFiles = [...files];
    const targetItem = updatedFiles[draggedIndex];

    updatedFiles.splice(draggedIndex, 1);
    updatedFiles.splice(index, 0, targetItem);

    setDraggedIndex(index);
    setFiles(updatedFiles);
  };

  // Safe reset function
  const clearDragState = () => {
    setDraggedIndex(null);
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // --- Core Merge Action ---
  const mergePDFs = async () => {
    if (files.length < 2) {
      alert("Please select at least 2 PDF files to merge.");
      return;
    }

    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const fileBuffer = await file.arrayBuffer();
        const pdfToMerge = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(
          pdfToMerge,
          pdfToMerge.getPageIndices(),
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);

      // Clean up user filename input to ensure no weird file system breaks
      const cleanName =
        customFileName.trim().replace(/[/\\?%*:|"<>\s]+/g, "_") ||
        "merged_document";

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error during file compilation processing:", error);
      alert("An error occurred while merging your PDF documents.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-xl text-blue-600 mb-3">
            <Layers className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Merge PDF Documents
          </h1>
          <p className="text-gray-500 mt-2">
            Combine multiple PDF files into a single document instantly, 100%
            locally in your browser.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          {/* We handle our own list rendering below to enable custom re-ordering, so pass empty lists inside the base Dropzone */}
          <FileDropzone
            acceptedTypes={[".pdf"]}
            maxFiles={15}
            files={[]}
            setFiles={setFiles}
          />

          {/* Interactive Re-orderable File List */}
          {files.length > 0 && (
            <div className="mt-8 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  File Order List ({files.length}):
                </p>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  💡 Drag handles to sort
                </span>
              </div>

              <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden shadow-xs">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={clearDragState}
                    onDrop={clearDragState}
                    className={`flex items-center justify-between p-3 bg-white transition-all ${
                      draggedIndex === index
                        ? "bg-blue-50 opacity-50 scale-[0.99]"
                        : "hover:bg-gray-50/70"
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="cursor-grab active:cursor-grabbing text-gray-400 p-1 hover:text-gray-600 transition-colors">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <span className="bg-blue-50 text-blue-600 text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="truncate text-gray-700 text-sm font-medium">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-xs font-semibold text-gray-400 hover:text-red-500 px-2 py-1 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Custom Filename Input Field Box */}
          {files.length >= 2 && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <label
                htmlFor="filename"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Output File Name
              </label>
              <div className="relative rounded-md shadow-xs max-w-md">
                <input
                  type="text"
                  name="filename"
                  id="filename"
                  className="block w-full rounded-lg border-gray-300 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 bg-white border text-black"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="merged_document"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400 sm:text-sm font-medium">
                    .pdf
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="mt-8 flex justify-end space-x-3 border-t border-gray-100 pt-6">
            <button
              onClick={() => {
                setFiles([]);
                setCustomFileName("merged_document");
              }}
              disabled={files.length === 0 || isProcessing}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={mergePDFs}
              disabled={files.length < 2 || isProcessing}
              className="inline-flex items-center space-x-2 px-5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4" />
                  <span>Merging Files...</span>
                </>
              ) : (
                <span>Merge PDFs</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
