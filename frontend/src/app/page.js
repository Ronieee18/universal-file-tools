// src/app/page.js
'use client';
import Link from 'next/link';
import Navbar from './components/Navbar';
import { Percent, Move, Crop, Files, Layers, Scissors, ShieldCheck, ArrowRight, Activity } from 'lucide-react';

export default function Home() {
  const toolSuite = [
    {
      title: "Image/PDF Size Compressor",
      desc: "Squeeze images and heavy PDFs down beneath exact custom byte caps (KB/MB).",
      href: "/compressor",
      icon: Percent,
      theme: "border-amber-100 text-amber-600 bg-amber-50 group-hover:bg-amber-100/60",
      scope: "PDF + Images"
    },
    {
      title: "Image Resizer & Converter",
      desc: "Scale pixel aspect boundaries cleanly while modifying output extensions.",
      href: "/resizer",
      icon: Move,
      theme: "border-blue-100 text-blue-600 bg-blue-50 group-hover:bg-blue-100/60",
      scope: "JPG / PNG / WEBP"
    },
    {
      title: "Image Cropper & Rotator",
      desc: "Reframe asset margins or flip canvas layout orientations dynamically.",
      href: "/cropper",
      icon: Crop,
      theme: "border-indigo-100 text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100/60",
      scope: "Interactive Canvas"
    },
    {
      title: "Image to PDF Converter",
      desc: "Batch structure single or multi-frame graphics directly into layout sheets.",
      href: "/imagetopdf",
      icon: Layers,
      theme: "border-purple-100 text-purple-600 bg-purple-50 group-hover:bg-purple-100/60",
      scope: "Asset Packaging"
    },
    {
      title: "Merge PDF",
      desc: "Combine isolated document layers and resource pages into a single file.",
      href: "/pdf-merge",
      icon: Files,
      theme: "border-emerald-100 text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100/60",
      scope: "Document Bonding"
    },
    {
      title: "Split PDF",
      desc: "Extract specific page arrays out of large documents cleanly.",
      href: "/pdf-split",
      icon: Scissors,
      theme: "border-rose-100 text-rose-600 bg-rose-50 group-hover:bg-rose-100/60",
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Dynamic Hover-Driven Navigation Header */}
      <Navbar />

      {/* Main Core Section Framework */}
      <main className="flex-grow mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Dynamic Typography Hero Segment */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          {/* <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xxs font-bold tracking-wider uppercase mb-5 shadow-2xs">
            <Activity className="h-3.5 w-3.5 text-blue-500" />
            <span>High-Speed Deterministic Layouts Running Online</span>
          </div> */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-950 tracking-tight leading-tight sm:leading-none">
            Universal Tools Hub. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              Precision Tooling.
            </span>
          </h1>
          <p className="mt-5 text-gray-500 font-medium text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Optimize, upscale, reformat, and restructure your design assets instantly. Secure client-side execution running out of localized memory arrays.
          </p>
        </div>

        {/* Dynamic Responsive Workspace Grid Box Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {toolSuite.map((tool, idx) => {
            const ToolIcon = tool.icon;
            return (
              <Link 
                key={idx}
                href={tool.href}
                className="group relative flex flex-col p-6 bg-white border border-gray-200 rounded-2xl shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Float Icon Badge element mapping */}
                <div className={`p-3 border rounded-xl w-fit ${tool.theme} transition-all duration-200 mb-5 shadow-2xs group-hover:scale-102`}>
                  <ToolIcon className="h-5 w-5" />
                </div>

                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {tool.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-gray-300 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200 shrink-0" />
                </div>

                <p className="text-xs font-medium text-gray-400 leading-relaxed flex-grow mb-6">
                  {tool.desc}
                </p>

                {/* Scope Tag Baseboard Footer */}
                {/* <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-xxs font-bold uppercase tracking-wider text-gray-400">
                  <span>Scope Mode</span>
                  <span className="text-gray-600 font-mono bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                    {tool.scope}
                  </span>
                </div> */}
              </Link>
            );
          })}
        </div>

        {/* Privacy Infrastructure Banner Block */}
        <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center sm:space-x-4 space-y-3 sm:space-y-0">
          <div className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-center sm:text-left">
            <span className="block text-xs font-bold text-gray-900">100% Secure Local Memory Streaming</span>
            <p className="text-xxs font-medium text-gray-400 mt-0.5 leading-normal">
              Payload buffers are compiled entirely in temporary local terminal frames. Files remain completely isolated on your machine, away from external storage clouds.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}