// src/app/pdf-converter/page.js
'use client';
import { useState } from 'react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import FileDropzone from '../components/FileDropZone';
import { FileImage, RefreshCw, ArrowLeftRight } from 'lucide-react';

export default function ImageToPdfPage() {
  const [files, setFiles] = useState([]);
  const [pageSizeMode, setPageSizeMode] = useState('A4-PORTRAIT'); // 'ORIGINAL', 'A4-PORTRAIT', 'A4-LANDSCAPE'
  const [isProcessing, setIsProcessing] = useState(false);
  const [customFileName, setCustomFileName] = useState('converted_images');

  const convertImagesToPdf = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of files) {
        const imageBytes = await file.arrayBuffer();
        let embeddedImage;

        // Safely identify format variants
        if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          continue; // Skip unsupported anomalies gracefully
        }

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        let page;
        let drawWidth = imgWidth;
        let drawHeight = imgHeight;
        let posX = 0;
        let posY = 0;

        // --- Handle Layout Dimension Math ---
        if (pageSizeMode === 'ORIGINAL') {
          page = pdfDoc.addPage([imgWidth, imgHeight]);
        } else {
          // Select standard A4 boundaries: [595.28, 841.89] points
          const targetSize = pageSizeMode === 'A4-PORTRAIT' ? PageSizes.A4 : [PageSizes.A4[1], PageSizes.A4[0]];
          page = pdfDoc.addPage(targetSize);

          const pageWidth = targetSize[0];
          const pageHeight = targetSize[1];

          // Calculate scale ratios to fit the image inside the A4 canvas without stretching distortion
          const scaleFactor = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
          drawWidth = imgWidth * scaleFactor;
          drawHeight = imgHeight * scaleFactor;

          // Center the image inside the boundaries
          posX = (pageWidth - drawWidth) / 2;
          posY = (pageHeight - drawHeight) / 2;
        }

        page.drawImage(embeddedImage, {
          x: posX,
          y: posY,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      const cleanName = customFileName.trim().replace(/[/\\?%*:|"<>\s]+/g, '_') || 'converted_images';
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Image to PDF conversion crash:", error);
      alert("An error occurred while compiling your images into a PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setFiles([]);
    setCustomFileName('converted_images');
    setPageSizeMode('A4-PORTRAIT');
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-xl text-emerald-600 mb-3">
            <FileImage className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Image to PDF Converter</h1>
          <p className="text-gray-500 mt-2">Convert your photos or graphics instantly into a beautifully uniform PDF document.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          
          {files.length === 0 ? (
            <FileDropzone 
              acceptedTypes={['.jpg', '.jpeg', '.png']} 
              maxFiles={30} 
              files={files} 
              setFiles={setFiles} 
            />
          ) : (
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl mb-6 flex justify-between items-center text-sm">
              <div className="truncate pr-4">
                <span className="font-semibold text-gray-700 block truncate">
                  {files.length === 1 ? files[0].name : `${files.length} images loaded successfully`}
                </span>
                <span className="text-xs text-emerald-700 font-medium tracking-wider uppercase">
                  Ready to compile
                </span>
              </div>
              <button onClick={resetState} className="text-xs text-emerald-600 hover:text-emerald-800 underline font-medium shrink-0">
                Reset Files
              </button>
            </div>
          )}

          {files.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 border-t border-gray-100 pt-6">
              
              {/* Output Layout Strategy Dropdown Menu */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <label htmlFor="pageSizeMode" className="block text-sm font-medium text-gray-700 mb-1">
                  Page Dimensions Setup
                </label>
                <select
                  id="pageSizeMode"
                  value={pageSizeMode}
                  onChange={(e) => setPageSizeMode(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 p-2.5 bg-white text-gray-900 sm:text-sm focus:border-emerald-500 focus:ring-1"
                >
                  <option value="A4-PORTRAIT">A4 Standard Page (Portrait)</option>
                  <option value="A4-LANDSCAPE">A4 Standard Page (Landscape)</option>
                  <option value="ORIGINAL">Match Original Image Size</option>
                </select>
              </div>

              {/* Output Filename Input Box */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-1">
                  Output Filename
                </label>
                <div className="relative rounded-md shadow-xs">
                  <input
                    type="text"
                    id="filename"
                    className="block w-full rounded-lg border border-gray-300 pr-12 focus:border-emerald-500 focus:ring-1 sm:text-sm p-2.5 bg-white text-gray-900"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-400 sm:text-sm font-medium">.pdf</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Action Row */}
          <div className="mt-8 flex justify-end space-x-3 border-t border-gray-100 pt-6">
            <button
              onClick={resetState}
              disabled={files.length === 0 || isProcessing}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={convertImagesToPdf}
              disabled={files.length === 0 || isProcessing}
              className="inline-flex items-center space-x-2 px-5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4" />
                  <span>Generating Pages...</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>Convert Images</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}