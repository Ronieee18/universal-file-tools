// src/app/compressor/page.js
'use client';
import { useState, useEffect } from 'react';
import FileDropzone from '../components/FileDropZone';
import { Percent, RefreshCw, Download } from 'lucide-react';

export default function CompressorPage() {
  const [files, setFiles] = useState([]);
  const [fileType, setFileType] = useState(null);
  const [targetValue, setTargetValue] = useState(100);
  const [sizeUnit, setSizeUnit] = useState('KB');
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedFileUrl, setCompressedFileUrl] = useState(null);
  const [downloadName, setDownloadName] = useState('');

  useEffect(() => {
    if (files.length === 0) {
      setFileType(null);
      setCompressedFileUrl(null);
      return;
    }
    const file = files[0];
    const originalSizeMb = file.size / 1024 / 1024;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setFileType('pdf');
    } else {
      setFileType('image');
    }

    // Initialize smart default targets across both file formats
    if (originalSizeMb < 1) {
      setSizeUnit('KB');
      setTargetValue(Math.round((file.size / 1024) * 0.6));
    } else {
      setSizeUnit('MB');
      setTargetValue(parseFloat((originalSizeMb * 0.6).toFixed(2)));
    }
    setCompressedFileUrl(null);
  }, [files]);

  const handleCompression = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setCompressedFileUrl(null);

    const targetFile = files[0];
    const formData = new FormData();
    formData.append('file', targetFile);

    // Normalize input settings into fractional raw MB values for backend mapping
    const computedMb = sizeUnit === 'KB' ? targetValue / 1024 : targetValue;
    formData.append('max_size_mb', computedMb);

    const endpoint = fileType === 'image' 
      ? 'http://127.0.0.1:8000/compress-image' 
      : 'http://127.0.0.1:8000/compress-pdf';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Compression failure.');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      setCompressedFileUrl(downloadUrl);
      setDownloadName(`optimized_${targetFile.name}`);
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not connect to the backend compression engine.");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = () => {
    if (!compressedFileUrl) return;
    const link = document.createElement('a');
    link.href = compressedFileUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetState = () => {
    setFiles([]);
    setTargetValue(100);
    setSizeUnit('KB');
    setCompressedFileUrl(null);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-amber-100 rounded-xl text-amber-600 mb-3">
            <Percent className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Smart Size Compressor</h1>
          <p className="text-gray-500 mt-2">Compress images and heavy PDFs down to your preferred file size constraints.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          
          {files.length === 0 ? (
            <FileDropzone 
              acceptedTypes={['.jpg', '.jpeg', '.png', '.pdf']} 
              maxFiles={1} 
              files={files} 
              setFiles={setFiles} 
            />
          ) : (
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl mb-6 flex justify-between items-center text-sm">
              <div className="truncate pr-4">
                <span className="font-semibold text-gray-700 block truncate">{files[0].name}</span>
                <span className="text-xs text-amber-700 font-medium tracking-wider uppercase block mt-0.5">
                  Original Size: {(files[0].size / 1024).toFixed(1)} KB ({(files[0].size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button onClick={resetState} className="text-xs text-amber-600 hover:text-amber-800 underline font-medium shrink-0">
                Change File
              </button>
            </div>
          )}
          <p className='text-red-600 text-sm mt-4'>*Note:Too much compression can decrease quality especially in pdf.</p>

          {/* Unified Size Input Box UI */}
          {files.length > 0 && !compressedFileUrl && (
            <div className="mt-6 border-t border-gray-100 pt-6 max-w-md">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <label htmlFor="target-value" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Target Maximum File Size
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="target-value"
                    type="number"
                    step={sizeUnit === 'KB' ? '10' : '0.1'}
                    min="0.1"
                    className="block w-full max-w-[140px] rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-1 sm:text-sm p-2.5 bg-white text-gray-900 font-medium"
                    value={targetValue}
                    onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                  />
                  <select
                    value={sizeUnit}
                    onChange={(e) => setSizeUnit(e.target.value)}
                    className="block rounded-lg border border-gray-300 p-2.5 bg-white text-gray-900 sm:text-sm focus:border-amber-500 focus:ring-1 font-semibold cursor-pointer"
                  >
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                  </select>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {fileType === 'pdf' 
                    ? "The engine will compress structural data streams, linearize elements, and pack image blocks to match your size."
                    : "The algorithm checks qualities and drops layout margins iteratively to slide beneath your target ceiling."}
                </p>
              </div>
            </div>
          )}

          {/* Download Success Area */}
          {compressedFileUrl && (
            <div className="mt-6 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
              <span className="block font-semibold text-emerald-800 text-lg mb-1">Compression Completed!</span>
              <p className="text-sm text-emerald-600 mb-4">Your file has been optimized under your size threshold and is ready.</p>
              <button
                onClick={triggerDownload}
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm shadow-sm transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download Optimized File</span>
              </button>
            </div>
          )}

          {/* Action Row */}
          {!compressedFileUrl && (
            <div className="mt-8 flex justify-end space-x-3 border-t border-gray-100 pt-6">
              <button
                onClick={resetState}
                disabled={files.length === 0 || isProcessing}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleCompression}
                disabled={files.length === 0 || isProcessing}
                className="inline-flex items-center space-x-2 px-5 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4" />
                    <span>Optimizing Elements...</span>
                  </>
                ) : (
                  <span>Optimize Size</span>
                )}
              </button>
              
            </div>
          )}

        </div>
      </div>
    </main>
  );
}