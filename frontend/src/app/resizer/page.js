// src/app/resizer/page.js
'use client';
import { useState, useEffect } from 'react';
import FileDropzone from '../components/FileDropZone';
import { Move, RefreshCw, Download, Lock, Unlock, Eye } from 'lucide-react';

export default function ResizerPage() {
  const [files, setFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [originalRatio, setOriginalRatio] = useState(1);
  const [lockRatio, setLockRatio] = useState(true);
  const [targetFormat, setTargetFormat] = useState('JPEG');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resizedFileUrl, setResizedFileUrl] = useState(null);
  const [downloadName, setDownloadName] = useState('');

  // Reset and extract image data upon fresh uploads
  useEffect(() => {
    if (files.length === 0) {
      setWidth('');
      setHeight('');
      setOriginalWidth(0);
      setOriginalHeight(0);
      setPreviewUrl(null);
      setResizedFileUrl(null);
      return;
    }

    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const img = new Image();
    img.onload = () => {
      setWidth(img.width);
      setHeight(img.height);
      setOriginalWidth(img.width);
      setOriginalHeight(img.height);
      setOriginalRatio(img.width / img.height);
    };
    img.src = objectUrl;
    setResizedFileUrl(null);

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [files]);

  // Clear previous output url instantly if settings change, prompting a re-run layout
  useEffect(() => {
    setResizedFileUrl(null);
  }, [width, height, targetFormat]);

  const handleWidthChange = (val) => {
    setWidth(val);
    const numVal = parseInt(val) || 0;
    if (lockRatio && numVal > 0 && originalRatio > 0) {
      setHeight(Math.round(numVal / originalRatio));
    }
  };

  const handleHeightChange = (val) => {
    setHeight(val);
    const numVal = parseInt(val) || 0;
    if (lockRatio && numVal > 0 && originalRatio > 0) {
      setWidth(Math.round(numVal * originalRatio));
    }
  };

  const handleResizeSubmit = async () => {
    if (files.length === 0 || !width || !height) return;
    setIsProcessing(true);
    setResizedFileUrl(null);

    const targetFile = files[0];
    const formData = new FormData();
    formData.append('file', targetFile);
    formData.append('width', parseInt(width));
    formData.append('height', parseInt(height));
    formData.append('target_format', targetFormat);

    try {
      const response = await fetch('http://127.0.0.1:8000/resize-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Resize failed.');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      // Isolate extension strings cleanly to prevent multiple trailing dot issues
      const extMap = { JPEG: 'jpg', PNG: 'png', WEBP: 'webp' };
      const chosenExtension = extMap[targetFormat];
      
      const lastDotIndex = targetFile.name.lastIndexOf('.');
      const pureBaseName = lastDotIndex !== -1 ? targetFile.name.substring(0, lastDotIndex) : targetFile.name;
      
      setResizedFileUrl(downloadUrl);
      setDownloadName(`resized_${width}x${height}_${pureBaseName}.${chosenExtension}`);
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to communicate with resizing backend service.");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = () => {
    if (!resizedFileUrl) return;
    const link = document.createElement('a');
    link.href = resizedFileUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetState = () => {
    setFiles([]);
    setResizedFileUrl(null);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-xl text-blue-600 mb-3">
            <Move className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Image Resizer & Converter</h1>
          <p className="text-gray-500 mt-2">Scale physical boundaries and toggle extension formats seamlessly.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          
          {files.length === 0 ? (
            <div className="max-w-3xl mx-auto">
              <FileDropzone 
                acceptedTypes={['.jpg', '.jpeg', '.png', '.webp']} 
                maxFiles={1} 
                files={files} 
                setFiles={setFiles} 
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Sandbox Preview Column */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <span className="text-sm font-semibold text-gray-700 mb-2 flex items-center self-start">
                  <Eye className="h-4 w-4 mr-1.5 text-gray-400" /> Image Canvas Preview
                </span>
                <div className="w-full aspect-square bg-gray-100 border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center relative p-4 group shadow-inner">
                  {previewUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                      src={previewUrl} 
                      alt="Sandbox Preview Source" 
                      className="max-w-full max-height-full object-contain rounded shadow-xs"
                    />
                  )}
                  <div className="absolute bottom-3 left-3 bg-gray-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-xs font-mono font-medium tracking-wider">
                    Source: {originalWidth} × {originalHeight} px
                  </div>
                </div>
                <button 
                  onClick={resetState} 
                  className="mt-3 text-xs text-red-600 hover:text-red-800 underline font-medium tracking-wide self-start"
                >
                  Discard and Change File
                </button>
              </div>

              {/* Right Settings and Controls Column */}
              <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-8 space-y-6">
                
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Resize Settings</h3>
                  <p className="text-xs text-gray-400">Configure dimensional parameters below.</p>
                </div>

                {/* Ratio Toggles */}
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Proportional Scaling Lock</span>
                  <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        setLockRatio(true);
                        if (width > 0) setHeight(Math.round(width / originalRatio));
                      }}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        lockRatio 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Lock Ratio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLockRatio(false)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        !lockRatio 
                          ? 'bg-amber-600 text-white shadow-xs' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>Unlock Ratio</span>
                    </button>
                  </div>
                </div>

                {/* Width / Height Input Blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="width-px" className="block text-sm font-semibold text-gray-700 mb-1">Width (pixels)</label>
                    <input
                      id="width-px"
                      type="number"
                      value={width}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 p-3 bg-white text-gray-900 sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label htmlFor="height-px" className="block text-sm font-semibold text-gray-700 mb-1">Height (pixels)</label>
                    <input
                      id="height-px"
                      type="number"
                      value={height}
                      onChange={(e) => handleHeightChange(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 p-3 bg-white text-gray-900 sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>

                {/* Target Format Dropdown */}
                <div className="max-w-xs">
                  <label htmlFor="target-fmt" className="block text-sm font-semibold text-gray-700 mb-1">Target Export Extension Format</label>
                  <select
                    id="target-fmt"
                    value={targetFormat}
                    onChange={(e) => setTargetFormat(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 p-3 bg-white text-gray-900 sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="JPEG">JPEG (.jpg)</option>
                    <option value="PNG">PNG (.png)</option>
                    <option value="WEBP">WEBP (.webp)</option>
                  </select>
                </div>

                {/* Core Control Action Strip - PERMANENTLY VISIBLE */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={resetState}
                    disabled={isProcessing}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleResizeSubmit}
                    disabled={isProcessing || !width || !height}
                    className="inline-flex items-center space-x-2 px-6 py-2.5 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed shadow-md transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="animate-spin h-4 w-4" />
                        <span>Processing Canvas...</span>
                      </>
                    ) : (
                      <span>Resize Image</span>
                    )}
                  </button>
                </div>

                {/* Dynamic Download Box Placement Below Core Action Buttons */}
                {resizedFileUrl && (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center shadow-2xs mt-4 animate-fadeIn">
                    <span className="block font-bold text-emerald-800 text-md mb-0.5">Transformation Generated!</span>
                    <p className="text-xs text-emerald-600 mb-3.5">The custom payload has been successfully saved. You can download it below or make further changes above.</p>
                    <button
                      onClick={triggerDownload}
                      className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Optimized Image</span>
                    </button>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      </div>
    </main>
  );
}