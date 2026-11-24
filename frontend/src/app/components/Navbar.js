// src/components/Navbar.js
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Percent, Move, Crop, Files, Sliders, ChevronDown, Menu, X, Sparkles, Layers, Scissors, Search } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  const categories = [
    {
      name: "Image Tools",
      items: [
        { title: "Image/PDF size Compressor", href: "/compressor", icon: Percent, desc: "Compress down to target KB/MB limits" },
        { title: "Resizer & Converter", href: "/resizer", icon: Move, desc: "Change pixels and format extensions" },
        { title: "Cropper & Rotator", href: "/cropper", icon: Crop, desc: "Crop boundaries and tweak angles" },
        { title: "Image to PDF", href: "/imagetopdf", icon: Layers, desc: "Convert canvases to PDF pages" },
      ]
    },
    {
      name: "PDF Utilities",
      items: [
        { title: "PDF Merger", href: "/pdf-merge", icon: Files, desc: "Combine multiple sheets smoothly" },
        { title: "PDF Splitter", href: "/pdf-split", icon: Scissors, desc: "Separate document pages instantly" },
      ]
    }
  ];

  // Flatten tools list to make searching instant
  const allTools = categories.flatMap(cat => cat.items);
  
  const filteredTools = allTools.filter(tool => 
    tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tool.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close search results overlay when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Core Brand Badge */}
        <Link href="/" className="flex items-center space-x-2 font-bold text-gray-900 tracking-tight text-lg group shrink-0">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white group-hover:bg-blue-700 transition-colors shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <span>Universal<span className="text-blue-600 font-extrabold">Tool</span></span>
        </Link>

        {/* Desktop Categorized Navigation Menu Grid */}
        <nav className="hidden md:flex space-x-8">
          {categories.map((cat, idx) => (
            <div key={idx} className="relative group/menu py-4">
              <button className="flex items-center space-x-1 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
                <span>{cat.name}</span>
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover/menu:rotate-180 transition-transform duration-200" />
              </button>

              {/* Mega Dropdown Panel Overlay */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-72 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 p-2 mt-1 translate-y-2 group-hover/menu:translate-y-0">
                {cat.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      className="flex items-start space-x-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group/item"
                    >
                      <div className="p-2 bg-gray-50 border border-gray-100 rounded-md text-gray-500 group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-gray-900 group-hover/item:text-blue-600 transition-colors">
                          {item.title}
                        </span>
                        <span className="block text-xs text-gray-400 font-medium mt-0.5 leading-normal">
                          {item.desc}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Dynamic Search Box Input Field */}
        <div ref={searchRef} className="relative hidden md:block w-64">
          <div className="relative">
            <input
              type="text"
              suppressHydrationWarning
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl pl-9 pr-4 py-1.5 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          </div>

          {/* Quick-Filter Overlay Dropdown Menu */}
          {searchFocused && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden p-1 z-50 animate-fadeIn">
              {filteredTools.length > 0 ? (
                filteredTools.map((tool, idx) => {
                  const ToolIcon = tool.icon;
                  return (
                    <Link
                      key={idx}
                      href={tool.href}
                      onClick={() => {
                        setSearchFocused(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group/search-item"
                    >
                      <div className="p-1.5 bg-gray-50 border border-gray-100 rounded-md text-gray-400 group-hover/search-item:text-blue-600 group-hover/search-item:bg-blue-50 transition-colors">
                        <ToolIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="block text-sm font-bold text-gray-800 group-hover/search-item:text-blue-600 truncate transition-colors">
                          {tool.title}
                        </span>
                        <span className="block text-xs text-gray-400 truncate mt-0.5">
                          {tool.desc}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xxs font-semibold text-gray-400 uppercase tracking-wide">
                  No utility matching found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger Drawer Trigger Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Collapsible Mobile Navigation Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-6 shadow-inner animate-slideDown">
          
          {/* Mobile Search Field Input */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            
            {searchQuery && (
              <div className="border border-gray-100 rounded-xl mt-2 bg-gray-50/50 p-1 divide-y divide-gray-100/50">
                {filteredTools.map((tool, idx) => (
                  <Link
                    key={idx}
                    href={tool.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-3 p-2.5 text-xs font-semibold text-gray-700"
                  >
                    <span className="text-blue-600 font-bold">{tool.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-xxs font-extrabold uppercase tracking-wider text-gray-400 pl-2">
                {cat.name}
              </h4>
              <div className="grid grid-cols-1 gap-1">
                {cat.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-3 p-3 rounded-xl border border-transparent hover:border-gray-100 hover:bg-gray-50/50 transition-all"
                    >
                      <div className="p-2 bg-gray-50 text-gray-500 rounded-lg">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}