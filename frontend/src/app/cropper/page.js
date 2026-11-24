// src/app/cropper/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import FileDropzone from '../components/FileDropZone';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import { Crop, RotateCw, Download, RefreshCw, Eye } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

export default function CropperPage() {
  const [files, setFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspect, setAspect] = useState(undefined); // undefined means freeform cropping
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [croppedFileUrl, setCroppedFileUrl] = useState(null);
  const [downloadName, setDownloadName] = useState('');
  
  const imgRef = useRef(null);

  // Set up preview workspace when file is dropped
  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrl(null);
      setCrop(undefined);
      setCompletedCrop(null);
      setRotation(0);
      setCroppedFileUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(files[0]);
    setPreviewUrl(objectUrl);
    setCroppedFileUrl(null);

    return () => URL.revokeObjectURL(objectUrl);
  }, [files]);

  // Reset output state whenever crop coordinates or rotations shift, prompting a re-render
  useEffect(() => {
    setCroppedFileUrl(null);
  }, [completedCrop, rotation]);

  // Handle setting standard default crop zones once image loads on canvas screen
  function onImageLoad(e) {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;

    // Center an initial 80% boundary box crop window
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, aspect || 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  }

  // Handle Preset Aspect Shifts
  const handleAspectPreset = (value) => {
    setAspect(value);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      let newCrop;
      if (value === undefined) {
        newCrop = { unit: '%', width: 80, height: 80, x: 10, y: 10 };
      } else {
        newCrop = centerCrop(
          makeAspectCrop({ unit: '%', width: 80 }, value, width, height),
          width,
          height
        );
      }
      setCrop(newCrop);
      setCompletedCrop(newCrop);
    }
  };

  const handleRotation = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleCropSubmit = async () => {
    if (!files[0] || !completedCrop || !imgRef.current) return;
    setIsProcessing(true);

    const image = imgRef.current;
    
    // Scale percentages back to absolute source pixel sizes
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const left = Math.round(completedCrop.x * scaleX);
    const top = Math.round(completedCrop.y * scaleY);
    const widthPx = Math.round(completedCrop.width * scaleX);
    const heightPx = Math.round(completedCrop.height * scaleY);

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('left', left);
    formData.append('top', top);
    formData.append('right', left + widthPx);
    formData.append('bottom', top + heightPx);
    formData.append('rotation', rotation);

    try {
      const response = await fetch('http://127.0.0.1:8000/crop-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Backend failed to crop image.');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      setCroppedFileUrl(downloadUrl);
      
      // Pull pure filename to build download tracking name
      const lastDotIndex = files[0].name.lastIndexOf('.');
      const pureBaseName = lastDotIndex !== -1 ? files[0].name.substring(0, lastDotIndex) : files[0].name;
      const ext = files[0].name.split('.').pop();
      setDownloadName(`cropped_${pureBaseName}.${ext}`);
    } catch (error) {
      console.error(error);
      alert('Could not complete transformation crop pass.');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = () => {
    if (!croppedFileUrl) return;
    const link = document.createElement('a');
    link.href = croppedFileUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetState = () => {
    setFiles([]);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-xl text-indigo-600 mb-3">
            <Crop className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Image Cropper & Rotator</h1>
          <p className="text-gray-500 mt-2">Adjust composition frames and flip layout orientation bounds cleanly.</p>
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
              
              {/* Left Aspect Control Crop Board Sandbox Frame */}
              <div className="lg:col-span-7 flex flex-col">
                <span className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Eye className="h-4 w-4 mr-1.5 text-gray-400" /> Adjust Crop Bounding Area
                </span>
                
                <div className="w-full bg-gray-100 border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center p-4 shadow-inner min-h-[350px]">
                  {previewUrl && (
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={aspect}
                      className="max-w-full max-h-[500px]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Workspace Source"
                        onLoad={onImageLoad}
                        style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease' }}
                        className="max-w-full h-auto object-contain shadow-xs"
                      />
                    </ReactCrop>
                  )}
                </div>
                <button 
                  onClick={resetState} 
                  className="mt-3 text-xs text-red-600 hover:text-red-800 underline font-medium tracking-wide self-start"
                >
                  Discard and Change File
                </button>
              </div>

              {/* Right Settings Configuration Column Panel */}
              <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Canvas Modifiers</h3>
                  <p className="text-xs text-gray-400">Lock dimensions or adjust orientations.</p>
                </div>

                {/* Aspect Ratio Preset Selectors */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Aspect Ratio Preset</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAspectPreset(undefined)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                        aspect === undefined ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Freeform Custom
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAspectPreset(1)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                        aspect === 1 ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      1:1 Square
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAspectPreset(16 / 9)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                        aspect === 16 / 9 ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      16:9 Widescreen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAspectPreset(4 / 3)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                        aspect === 4 / 3 ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      4:3 Standard
                    </button>
                  </div>
                </div>

                {/* Rotation Triggers */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Orientation Actions</label>
                  <button
                    type="button"
                    onClick={handleRotation}
                    className="w-full inline-flex items-center justify-center space-x-2 py-2.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
                  >
                    <RotateCw className="h-3.5 w-3.5 text-gray-400" />
                    <span>Rotate Counter-Clockwise ({rotation}°)</span>
                  </button>
                </div>

                {/* Processing Actions Row */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={resetState}
                    disabled={isProcessing}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleCropSubmit}
                    disabled={isProcessing || !completedCrop?.width || !completedCrop?.height}
                    className="inline-flex items-center space-x-2 px-6 py-2.5 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-md transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="animate-spin h-4 w-4" />
                        <span>Applying Crop Transformation...</span>
                      </>
                    ) : (
                      <span>Crop & Save Image</span>
                    )}
                  </button>
                </div>

                {/* Sticky Download Segment Box */}
                {croppedFileUrl && (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center shadow-2xs mt-4 animate-fadeIn">
                    <span className="block font-bold text-emerald-800 text-md mb-0.5">Crop Applied Perfectly!</span>
                    <p className="text-xs text-emerald-600 mb-3.5">Your frame changes have been processed. Grab your file or re-adjust the grid boundaries above.</p>
                    <button
                      onClick={triggerDownload}
                      className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Cropped File</span>
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