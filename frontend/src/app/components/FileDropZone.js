// src/components/FileDropzone.js
'use client';
import { useState, useRef } from 'react';
import { UploadCloud, File, X } from 'lucide-react';

export default function FileDropzone({ acceptedTypes, maxFiles, onFilesSelected, files, setFiles }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFiles = (uploadedFiles) => {
    const validFiles = Array.from(uploadedFiles).filter(file => 
      acceptedTypes.some(type => file.name.toLowerCase().endsWith(type))
    );

    if (validFiles.length === 0) {
      alert("Invalid file type. Please upload correct formats.");
      return;
    }

    setFiles((prev) => {
      const updated = [...prev, ...validFiles];
      return updated.slice(0, maxFiles);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          className="hidden"
          onChange={handleChange}
          accept={acceptedTypes.join(',')}
        />
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-600 font-medium">Drag & drop your files here, or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">Supports: {acceptedTypes.join(', ')} (Max {maxFiles} files)</p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-semibold text-gray-700">Selected Files ({files.length}):</p>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              <div className="flex items-center space-x-2 truncate">
                <File className="h-4 w-4 text-gray-500 shrink-0" />
                <span className="truncate text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}