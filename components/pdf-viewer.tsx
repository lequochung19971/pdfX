'use client';
import '@/app/pdfjs.css';
import { TranslationPopover } from '@/components/translation-popover';
import { TranslationSettings } from '@/components/translation-settings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllFromIndexedDB, saveAllToIndexedDB } from '@/lib/indexdb-storage';
import { saveAnnotation } from '@/lib/supabase';
import type { Annotation, Highlight, PDFDocument } from '@/lib/types';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  ChevronUp,
  Download,
  FileText,
  Highlighter,
  Languages,
  Save,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Outline, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdf: PDFDocument;
  onBack: () => void;
}

type Tool = 'select' | 'highlight' | 'translate';

// Define type for TOC item
interface TOCItem {
  title: string;
  dest: string | unknown[] | null;
  items?: TOCItem[];
  // Additional properties that might come from PDF.js
  bold?: boolean;
  italic?: boolean;
  color?: Uint8ClampedArray;
  url?: string | null;
  unsafeUrl?: string;
  newWindow?: boolean;
  count?: number;
  // Custom property for storing page number after processing
  pageIndex?: number;
}

export default function PDFViewer({ pdf, onBack }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [activeTool] = useState<Tool>('select');
  const [selectedText, setSelectedText] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showSelectionToolbar, setShowSelectionToolbar] = useState<boolean>(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showTranslationPopover, setShowTranslationPopover] = useState<boolean>(false);
  const [translationPopoverPosition, setTranslationPopoverPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [translationText, setTranslationText] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] = useState<string>('en');
  const [targetLanguage, setTargetLanguage] = useState<string>('vi');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(false);
  const [storageType, setStorageType] = useState<'indexeddb' | 'supabase'>('indexeddb');
  const [expandedHighlights, setExpandedHighlights] = useState<boolean>(true);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [highlightToolbarPosition, setHighlightToolbarPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [tableOfContents, setTableOfContents] = useState<TOCItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pages' | 'toc'>('toc');

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll to specific page
  const scrollToPage = (targetPage: number) => {
    const pageRef = pageRefs.current[targetPage - 1];
    if (pageRef && containerRef.current) {
      pageRef.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // Scroll to highlight
  const scrollToHighlight = (highlight: Highlight) => {
    const pageRef = pageRefs.current[highlight.page - 1];
    if (pageRef && containerRef.current) {
      setPageNumber(highlight.page);
      pageRef.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      // Briefly highlight the selected annotation
      const tempElement = document.createElement('div');
      tempElement.className = 'absolute pointer-events-none pulse-animation';
      tempElement.style.left = `${highlight.x}%`;
      tempElement.style.top = `${highlight.y}%`;
      tempElement.style.width = `${highlight.width}%`;
      tempElement.style.height = `${highlight.height}%`;
      tempElement.style.backgroundColor = highlight.color;
      tempElement.style.opacity = '0.7';
      tempElement.style.zIndex = '50';

      pageRef.appendChild(tempElement);
      setTimeout(() => {
        pageRef.removeChild(tempElement);
      }, 2000);
    }
  };

  useEffect(() => {
    loadAnnotations();
  }, [pdf.id]);

  // Close highlight toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeHighlight && event.target instanceof Element) {
        // Check if the click is outside the toolbar and highlight elements
        const isOutsideToolbar = !event.target.closest('.highlight-toolbar');
        const isOutsideHighlight = !event.target.closest('.highlight-element');

        if (isOutsideToolbar && isOutsideHighlight) {
          setActiveHighlight(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeHighlight]);

  const loadAnnotations = async () => {
    try {
      // First try to load from IndexedDB
      const localData = await getAllFromIndexedDB(pdf.id);

      if (localData.highlights.length > 0 || localData.annotations.length > 0) {
        setHighlights(localData.highlights);
        setAnnotations(localData.annotations);
        setStorageType('indexeddb');
        return;
      }

      // // If no local data, fall back to Supabase
      // const supabaseData = await getAnnotations(pdf.id);
      // setAnnotations(supabaseData.annotations || []);
      // setHighlights(supabaseData.highlights || []);
      // setStorageType('supabase');
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  const onDocumentLoadSuccess = ({ numPages, ...args }: { numPages: number }) => {
    setNumPages(numPages);
    console.log('args', args);
    pageRefs.current = new Array(numPages).fill(null);
  };

  const onOutlineLoadSuccess = (outline: TOCItem[] | null) => {
    if (outline) {
      setTableOfContents(outline);
    }
  };

  const onPageLoadSuccess = useCallback(() => {
    // Page load success handler - can be used for future enhancements
  }, []);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);

      // Get selection position for toolbar
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position toolbar above the selection
        setToolbarPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 50, // Offset above the selection
        });
        setShowSelectionToolbar(true);
      }

      if (activeTool === 'translate') {
        handleTranslate(text);
      }
    } else {
      // Hide toolbar when no text is selected
      setShowSelectionToolbar(false);
      setSelectedText('');
    }
  };

  const handleTranslate = async (text: string, showInPopover = false) => {
    try {
      if (showInPopover) {
        // Get current selection position for popover
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Position popover to the right of selection
          setTranslationPopoverPosition({
            x: rect.right + 10,
            y: rect.top + rect.height / 2,
          });
          setTranslationText(text);
          setShowTranslationPopover(true);
        }
      }
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const handleHighlight = async () => {
    if (!selectedText) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Find which page the selection is on
    let targetPage = 1;
    let targetPageRef: HTMLDivElement | null = null;

    for (let i = 0; i < pageRefs.current.length; i++) {
      const pageRef = pageRefs.current[i];
      if (pageRef) {
        const pageRect = pageRef.getBoundingClientRect();
        if (rect.top >= pageRect.top && rect.top <= pageRect.bottom) {
          targetPage = i + 1;
          targetPageRef = pageRef;
          break;
        }
      }
    }

    if (!targetPageRef) return;

    const pageRect = targetPageRef.getBoundingClientRect();

    // Calculate relative position as percentage
    const x = ((rect.left - pageRect.left) / pageRect.width) * 100;
    const y = ((rect.top - pageRect.top) / pageRect.height) * 100;
    const width = (rect.width / pageRect.width) * 100;
    const height = (rect.height / pageRect.height) * 100;

    const highlight: Highlight = {
      id: Math.random().toString(36).substr(2, 9),
      text: selectedText,
      x,
      y,
      width,
      height,
      page: targetPage,
      color: '#ffff00',
    };

    const newHighlights = [...highlights, highlight];
    setHighlights(newHighlights);

    // Save to storage
    try {
      // Save to IndexedDB
      await saveAllToIndexedDB(pdf.id, {
        annotations,
        highlights: newHighlights,
      });

      // If we were using Supabase before, also save there for sync
      if (storageType === 'supabase') {
        await saveAnnotation(pdf.id, {
          annotations,
          highlights: newHighlights,
        });
      }
    } catch (error) {
      console.error('Failed to save highlight:', error);
    }

    selection.removeAllRanges();
    setSelectedText('');
  };

  const handleToolbarHighlight = async () => {
    await handleHighlight();
    setShowSelectionToolbar(false);
  };

  const handleToolbarTranslate = async () => {
    if (selectedText) {
      await handleTranslate(selectedText, true); // Show in popover
      setShowSelectionToolbar(false);
    }
  };

  const handleHighlightClick = (highlight: Highlight, event: React.MouseEvent) => {
    // Toggle the active state if clicking on the same highlight
    if (activeHighlight && activeHighlight.id === highlight.id) {
      setActiveHighlight(null);
      return;
    }

    setActiveHighlight(highlight);

    // Calculate position for the toolbar - position to the right of the highlight
    const rect = event.currentTarget.getBoundingClientRect();
    setHighlightToolbarPosition({
      x: rect.right + 10,
      y: rect.top + rect.height / 2,
    });
  };

  const handleHighlightTranslate = (highlight: Highlight) => {
    setTranslationText(highlight.text);
    setTranslationPopoverPosition(highlightToolbarPosition);
    setShowTranslationPopover(true);
    setActiveHighlight(null);
  };

  const saveAllAnnotations = async () => {
    try {
      // Save to IndexedDB
      await saveAllToIndexedDB(pdf.id, {
        annotations,
        highlights,
      });

      // Also save to Supabase for cloud backup
      await saveAnnotation(pdf.id, {
        annotations,
        highlights,
      });

      setStorageType('indexeddb');
      alert('Annotations saved successfully to IndexedDB and cloud!');
    } catch (error) {
      console.error('Failed to save annotations:', error);
      alert('Failed to save annotations');
    }
  };

  const downloadPDF = () => {
    const url = URL.createObjectURL(pdf.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdf.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteHighlight = (id: string) => {
    const newHighlights = highlights.filter((h) => h.id !== id);
    setHighlights(newHighlights);
    setActiveHighlight(null);

    // Save to storage
    saveAllToIndexedDB(pdf.id, {
      annotations,
      highlights: newHighlights,
    }).catch((error) => {
      console.error('Failed to save after deletion:', error);
    });
  };

  // Handle outline item click from the react-pdf Outline component
  const handleOutlineItemClick = (props: { pageNumber: number }) => {
    // The Outline component provides the pageNumber directly
    if (props.pageNumber) {
      setPageNumber(props.pageNumber);
      scrollToPage(props.pageNumber);
    }
  };

  return (
    <Document file={pdf.file} onLoadSuccess={onDocumentLoadSuccess}>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 flex justify-center`}>
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 bg-transparent px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline">
                  <h1 className="font-semibold text-gray-900 truncate max-w-md">{pdf.name}</h1>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={saveAllAnnotations}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" onClick={downloadPDF}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex flex-1 p-4 pt-16 relative h-[100vh] overflow-auto flex-col items-center justify-start">
            <div className="flex justify-center">
              <div ref={containerRef} className="space-y-4">
                {Array.from(new Array(numPages), (el, index) => (
                  <div
                    key={`page_${index + 1}`}
                    ref={(el) => {
                      pageRefs.current[index] = el;
                    }}
                    className="relative bg-white shadow-lg mb-4">
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      onLoadSuccess={onPageLoadSuccess}
                      onMouseUp={handleTextSelection}
                    />

                    {/* Highlights Overlay */}
                    {highlights
                      .filter((h) => h.page === index + 1)
                      .map((highlight) => (
                        <div
                          key={highlight.id}
                          className="absolute cursor-pointer z-[2] highlight-element"
                          style={{
                            left: `${highlight.x}%`,
                            top: `${highlight.y}%`,
                            width: `${highlight.width}%`,
                            height: `${highlight.height}%`,
                            backgroundColor: highlight.color,
                            opacity: activeHighlight?.id === highlight.id ? 0.5 : 0.3,
                          }}
                          onClick={(e) => handleHighlightClick(highlight, e)}
                        />
                      ))}

                    {/* Page number indicator */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      Page {index + 1}
                    </div>
                  </div>
                ))}
                {/* Outline component to extract TOC data */}
              </div>
            </div>
          </div>

          {/* Controls */}
          {numPages > 1 && (
            <div className="flex items-center gap-2 p-[6px] rounded-md border border-border bg-background fixed bottom-8 shadow-lg z-40">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setScale((prev) => Math.min(3, prev + 0.1))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newPage = Math.max(1, pageNumber - 1);
                    setPageNumber(newPage);
                    scrollToPage(newPage);
                  }}
                  disabled={pageNumber <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pageNumber}
                    onChange={(e) => {
                      const page = Number.parseInt(e.target.value);
                      if (page >= 1 && page <= numPages) {
                        setPageNumber(page);
                      }
                    }}
                    onBlur={() => {
                      if (pageNumber >= 1 && pageNumber <= numPages) {
                        scrollToPage(pageNumber);
                      }
                    }}
                    className="w-16 text-center"
                    min={1}
                    max={numPages}
                  />
                  <span className="text-sm text-gray-500">of {numPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newPage = Math.min(numPages, pageNumber + 1);
                    setPageNumber(newPage);
                    scrollToPage(newPage);
                  }}
                  disabled={pageNumber >= numPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Left Sidebar - Page List and Table of Contents */}
      <div
        className={`fixed top-6 left-6 h-[calc(100%-96px)] rounded-xl bg-background border-r border-border transition-all duration-300 z-50 shadow-lg overflow-y-auto ${
          leftSidebarOpen ? 'w-80' : 'w-0 border-none'
        }`}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-lg">Document</h2>
          <Button variant="ghost" size="icon" onClick={() => setLeftSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab navigation */}
        <Tabs
          defaultValue="toc"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'pages' | 'toc')}>
          <div className="px-4 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="toc" className="flex-1">
                Contents
              </TabsTrigger>
              <TabsTrigger value="pages" className="flex-1">
                Pages
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pages">
            <h3 className="font-semibold text-sm px-4 py-2">All Pages ({numPages})</h3>
            <div className="space-y-2 max-h-[calc(100vh-262px)] overflow-y-auto px-4 pb-4">
              {Array.from(new Array(numPages), (_, index) => (
                <div
                  key={`page_nav_${index + 1}`}
                  className={`p-2 flex text-accent-foreground items-center gap-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                    pageNumber === index + 1 ? 'bg-accent' : 'bg-background'
                  }`}
                  onClick={() => {
                    setPageNumber(index + 1);
                    scrollToPage(index + 1);
                  }}>
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Page {index + 1}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="toc">
            <h3 className="font-semibold text-sm px-4 py-2">Table of Contents</h3>
            <div className="space-y-2 max-h-[calc(100vh-262px)] overflow-y-auto px-4 pb-4">
              <Outline onLoadSuccess={onOutlineLoadSuccess} onItemClick={handleOutlineItemClick} />
              {tableOfContents.length === 0 && (
                <p className="text-sm text-muted-foreground">No table of contents available</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Collapse/Expand button when left sidebar is closed */}
      {!leftSidebarOpen && (
        <button
          onClick={() => setLeftSidebarOpen(true)}
          className="fixed top-1/2 left-0 transform -translate-y-1/2 bg-primary text-primary-foreground p-2 rounded-r-md shadow-md z-50">
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      )}

      {/* Collapsible Right Sidebar */}
      <div
        className={`fixed top-6 right-6 h-[calc(100%-96px)] rounded-xl bg-background border-l border-border transition-all duration-300 z-50 shadow-lg overflow-y-auto ${
          sidebarOpen ? 'w-96' : 'w-0 border-none'
        }`}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-lg">Annotations & Tools</h2>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Sidebar content */}
        <div className="p-4 space-y-4">
          {/* Storage Type Indicator */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Storage</h3>
            <div className="flex items-center">
              <Badge variant={storageType === 'indexeddb' ? 'default' : 'outline'}>
                {storageType === 'indexeddb' ? 'Local (IndexedDB)' : 'Cloud (Supabase)'}
              </Badge>
              <span className="text-xs ml-2 text-gray-500">
                {storageType === 'indexeddb'
                  ? 'Saved locally in your browser'
                  : 'Synced to cloud storage'}
              </span>
            </div>
          </div>

          {/* Highlights List */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Highlights ({highlights.length})</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setExpandedHighlights(!expandedHighlights)}>
                {expandedHighlights ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {expandedHighlights && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {highlights.length > 0 ? (
                  highlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors group">
                      <div className="flex justify-between items-start">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => scrollToHighlight(highlight)}>
                          <p className="text-sm font-medium line-clamp-2">{highlight.text}</p>
                          <div className="flex items-center mt-1">
                            <Badge className="text-xs">Page {highlight.page}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHighlight(highlight.id);
                          }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No highlights yet</p>
                )}
              </div>
            )}
          </div>

          {/* Translation Settings */}
          <TranslationSettings
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            onSourceLanguageChange={setSourceLanguage}
            onTargetLanguageChange={setTargetLanguage}
          />

          {/* Tool Instructions */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <div className="text-sm text-gray-600 space-y-2">
              {activeTool === 'select' && <p>Select text to copy or perform actions.</p>}
              {activeTool === 'highlight' && (
                <p>Select text and click "Highlight" to add highlights.</p>
              )}
              {activeTool === 'translate' && <p>Select text to automatically translate it.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Collapse/Expand button when right sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-primary text-primary-foreground p-2 rounded-l-md shadow-md z-50">
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      )}

      {/* Floating Selection Toolbar */}
      {showSelectionToolbar && selectedText && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-2"
          style={{
            left: `${toolbarPosition.x}px`,
            top: `${toolbarPosition.y}px`,
            transform: 'translateX(-50%)', // Center horizontally
          }}>
          <Button size="icon" onClick={handleToolbarHighlight} className="text-xs">
            <Highlighter className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleToolbarTranslate}
            className="text-xs">
            <Languages className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Highlight Toolbar - Shows when highlight is clicked */}
      {activeHighlight && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-2 highlight-toolbar"
          style={{
            left: `${highlightToolbarPosition.x}px`,
            top: `${highlightToolbarPosition.y}px`,
          }}>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleHighlightTranslate(activeHighlight)}
            className="text-xs"
            title="Translate">
            <Languages className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => deleteHighlight(activeHighlight.id)}
            className="text-xs"
            title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}

      {/* Translation Popover */}
      {showTranslationPopover && translationText && (
        <TranslationPopover
          text={translationText}
          position={translationPopoverPosition}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onClose={() => setShowTranslationPopover(false)}
        />
      )}
    </Document>
  );
}
