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
import type {
  Annotation,
  Highlight,
  PDFDocument,
  Screenshot,
  ImageTranslationResult,
} from '@/lib/types';
import { useImageTranslation } from '@/hooks/useImageTranslation';
import html2canvas from 'html2canvas';
import {
  ArrowLeft,
  Camera,
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

type Tool = 'select' | 'highlight' | 'translate' | 'screenshot';

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
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedText, setSelectedText] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
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
  const [tableOfContents, setTableOfContents] = useState<TOCItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pages' | 'toc'>('toc');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [activeScreenshot, setActiveScreenshot] = useState<Screenshot | null>(null);
  const [screenshotToolbarPosition, setScreenshotToolbarPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const [screenshotTextInput, setScreenshotTextInput] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [currentDragPage, setCurrentDragPage] = useState<number | null>(null);
  const [translatingScreenshots, setTranslatingScreenshots] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track current translating screenshot ID
  const [currentTranslatingId, setCurrentTranslatingId] = useState<string | null>(null);
  const [showEscFeedback, setShowEscFeedback] = useState<boolean>(false);

  // Image translation hook
  const imageTranslation = useImageTranslation({
    onSuccess: (result) => {
      // Use the tracked screenshot ID to update the correct screenshot
      if (currentTranslatingId) {
        updateScreenshotTranslation(currentTranslatingId, result);
        setCurrentTranslatingId(null);
      }
    },
    onError: (error) => {
      console.error('Screenshot translation failed:', error);
      // Remove from translating set on error
      if (currentTranslatingId) {
        setTranslatingScreenshots((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentTranslatingId);
          return newSet;
        });
        setCurrentTranslatingId(null);
      }
    },
  });

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

  // Handle ESC key to cancel all actions
  useEffect(() => {
    const cancelAllActions = () => {
      let actionsCancelled = false;

      // Cancel screenshot drag selection
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setCurrentDragPage(null);
        actionsCancelled = true;
      }

      // Close active screenshot toolbar
      if (activeScreenshot) {
        setActiveScreenshot(null);
        setScreenshotTextInput('');
        actionsCancelled = true;
      }

      // Close translation popover
      if (showTranslationPopover) {
        setShowTranslationPopover(false);
        setTranslationText('');
        actionsCancelled = true;
      }

      // Close selection toolbar
      if (showSelectionToolbar) {
        setShowSelectionToolbar(false);
        setSelectedText('');
        // Clear any text selection
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
        actionsCancelled = true;
      }

      // Close sidebars
      if (sidebarOpen) {
        setSidebarOpen(false);
        actionsCancelled = true;
      }
      if (leftSidebarOpen) {
        setLeftSidebarOpen(false);
        actionsCancelled = true;
      }

      // Reset active tool to select
      if (activeTool !== 'select') {
        setActiveTool('select');
        actionsCancelled = true;
      }

      // Show feedback if any actions were cancelled
      if (actionsCancelled) {
        setShowEscFeedback(true);
        setTimeout(() => setShowEscFeedback(false), 1500);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelAllActions();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isDragging,
    activeTool,
    activeScreenshot,
    showTranslationPopover,
    showSelectionToolbar,
    sidebarOpen,
    leftSidebarOpen,
    activeTool,
  ]);

  // Handle mouse events for screenshot drag selection
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging && dragStart && activeTool === 'screenshot') {
        setDragEnd({ x: event.clientX, y: event.clientY });
      }
    };

    const handleMouseUp = () => {
      if (
        isDragging &&
        dragStart &&
        dragEnd &&
        currentDragPage !== null &&
        activeTool === 'screenshot'
      ) {
        finishScreenshotSelection();
      }
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setCurrentDragPage(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, dragEnd, currentDragPage, activeTool]);

  const loadAnnotations = async () => {
    try {
      // First try to load from IndexedDB
      const localData = await getAllFromIndexedDB(pdf.id);

      if (
        localData.highlights.length > 0 ||
        localData.annotations.length > 0 ||
        localData.screenshots?.length > 0
      ) {
        setHighlights(localData.highlights);
        setAnnotations(localData.annotations);
        setScreenshots(localData.screenshots || []);
        setStorageType('indexeddb');
        return;
      }

      // // If no local data, fall back to Supabase
      // const supabaseData = await getAnnotations(pdf.id);
      // setAnnotations(supabaseData.annotations || []);
      // setHighlights(supabaseData.highlights || []);
      // setScreenshots(supabaseData.screenshots || []);
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
        screenshots,
      });

      // If we were using Supabase before, also save there for sync
      if (storageType === 'supabase') {
        await saveAnnotation(pdf.id, {
          annotations,
          highlights: newHighlights,
          screenshots,
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
    // Close any existing popover first
    setShowTranslationPopover(false);

    // Calculate position for the translation popover - position to the right of the highlight
    const rect = event.currentTarget.getBoundingClientRect();
    const popoverPosition = {
      x: rect.right + 10,
      y: rect.top + rect.height / 2,
    };

    // Set translation popover data and show it
    setTranslationText(highlight.text);
    setTranslationPopoverPosition(popoverPosition);
    setShowTranslationPopover(true);
  };

  const saveAllAnnotations = async () => {
    try {
      // Save to IndexedDB
      await saveAllToIndexedDB(pdf.id, {
        annotations,
        highlights,
        screenshots,
      });

      // Also save to Supabase for cloud backup
      await saveAnnotation(pdf.id, {
        annotations,
        highlights,
        screenshots,
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

    // Save to storage
    saveAllToIndexedDB(pdf.id, {
      annotations,
      highlights: newHighlights,
      screenshots,
    }).catch((error) => {
      console.error('Failed to save after deletion:', error);
    });
  };

  // Handle mouse down for screenshot drag selection
  const handleScreenshotMouseDown = (event: React.MouseEvent, pageIndex: number) => {
    if (activeTool !== 'screenshot') return;

    event.preventDefault();
    // const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    setIsDragging(true);
    setDragStart({ x, y });
    setDragEnd({ x, y });
    setCurrentDragPage(pageIndex);
  };

  // Calculate selection rectangle from drag coordinates
  const getSelectionRect = () => {
    if (!dragStart || !dragEnd || currentDragPage === null) return null;

    const pageRef = pageRefs.current[currentDragPage];
    if (!pageRef) return null;

    const pageRect = pageRef.getBoundingClientRect();

    // Convert screen coordinates to relative page coordinates
    const x1 = Math.min(dragStart.x, dragEnd.x) - pageRect.left;
    const y1 = Math.min(dragStart.y, dragEnd.y) - pageRect.top;
    const x2 = Math.max(dragStart.x, dragEnd.x) - pageRect.left;
    const y2 = Math.max(dragStart.y, dragEnd.y) - pageRect.top;

    // Ensure coordinates are within page bounds
    const clampedX1 = Math.max(0, Math.min(x1, pageRect.width));
    const clampedY1 = Math.max(0, Math.min(y1, pageRect.height));
    const clampedX2 = Math.max(0, Math.min(x2, pageRect.width));
    const clampedY2 = Math.max(0, Math.min(y2, pageRect.height));

    return {
      x: clampedX1,
      y: clampedY1,
      width: clampedX2 - clampedX1,
      height: clampedY2 - clampedY1,
      pageRect,
    };
  };

  // Get visual selection overlay coordinates
  const getSelectionOverlay = () => {
    if (!dragStart || !dragEnd || !isDragging || currentDragPage === null) return null;

    const pageRef = pageRefs.current[currentDragPage];
    if (!pageRef) return null;

    // const pageRect = pageRef.getBoundingClientRect();

    const x1 = Math.min(dragStart.x, dragEnd.x);
    const y1 = Math.min(dragStart.y, dragEnd.y);
    const x2 = Math.max(dragStart.x, dragEnd.x);
    const y2 = Math.max(dragStart.y, dragEnd.y);

    return {
      left: x1,
      top: y1,
      width: x2 - x1,
      height: y2 - y1,
    };
  };

  // Finish screenshot selection and capture
  const finishScreenshotSelection = async () => {
    if (isCapturing || !dragStart || !dragEnd || currentDragPage === null) return;

    const selectionRect = getSelectionRect();
    if (!selectionRect || selectionRect.width < 10 || selectionRect.height < 10) {
      // Selection too small, ignore
      return;
    }

    console.log('setIsCapturing(true)');
    setIsCapturing(true);
    const pageRef = pageRefs.current[currentDragPage];

    if (!pageRef) {
      setIsCapturing(false);
      return;
    }

    try {
      // Capture the entire page first
      const canvas = await html2canvas(pageRef, {
        useCORS: true,
        scale: 1,
        backgroundColor: '#ffffff',
      });

      // Create a new canvas for the selected area
      const selectedCanvas = document.createElement('canvas');
      const selectedCtx = selectedCanvas.getContext('2d');

      if (!selectedCtx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size to selection size
      selectedCanvas.width = selectionRect.width;
      selectedCanvas.height = selectionRect.height;

      // Draw the selected portion
      selectedCtx.drawImage(
        canvas,
        selectionRect.x,
        selectionRect.y,
        selectionRect.width,
        selectionRect.height,
        0,
        0,
        selectionRect.width,
        selectionRect.height
      );

      const imageData = selectedCanvas.toDataURL('image/png');

      // Calculate relative position as percentage
      const x = (selectionRect.x / selectionRect.pageRect.width) * 100;
      const y = (selectionRect.y / selectionRect.pageRect.height) * 100;
      const width = (selectionRect.width / selectionRect.pageRect.width) * 100;
      const height = (selectionRect.height / selectionRect.pageRect.height) * 100;

      // Create screenshot object
      const screenshot: Screenshot = {
        id: Math.random().toString(36).substr(2, 9),
        x,
        y,
        width,
        height,
        page: currentDragPage + 1,
        imageData,
        timestamp: new Date(),
        text: 'Screenshot',
      };

      const newScreenshots = [...screenshots, screenshot];
      setScreenshots(newScreenshots);

      // Save to storage
      await saveAllToIndexedDB(pdf.id, {
        annotations,
        highlights,
        screenshots: newScreenshots,
      });

      if (storageType === 'supabase') {
        await saveAnnotation(pdf.id, {
          annotations,
          highlights,
          screenshots: newScreenshots,
        });
      }

      // Show the new screenshot as active
      setActiveScreenshot(screenshot);
      handleScreenshotTranslate(screenshot);
      setScreenshotToolbarPosition({
        x: selectionRect.pageRect.right + 10,
        y: selectionRect.pageRect.top + 50,
      });
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      alert('Failed to capture screenshot');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleScreenshotClick = (screenshot: Screenshot, event: React.MouseEvent) => {
    // Toggle the active state if clicking on the same screenshot
    if (activeScreenshot && activeScreenshot.id === screenshot.id) {
      setActiveScreenshot(null);
      return;
    }

    setActiveScreenshot(screenshot);
    setScreenshotTextInput(screenshot.text || '');

    // Calculate position for the toolbar
    const rect = event.currentTarget.getBoundingClientRect();
    setScreenshotToolbarPosition({
      x: rect.right + 10,
      y: rect.top + rect.height / 2,
    });
  };

  const saveScreenshotText = async () => {
    if (!activeScreenshot) return;

    const updatedScreenshots = screenshots.map((s) =>
      s.id === activeScreenshot.id ? { ...s, text: screenshotTextInput } : s
    );

    setScreenshots(updatedScreenshots);
    // setActiveScreenshot(null);
    // setScreenshotTextInput('');

    // Save to storage
    try {
      await saveAllToIndexedDB(pdf.id, {
        annotations,
        highlights,
        screenshots: updatedScreenshots,
      });

      if (storageType === 'supabase') {
        await saveAnnotation(pdf.id, {
          annotations,
          highlights,
          screenshots: updatedScreenshots,
        });
      }
    } catch (error) {
      console.error('Failed to save screenshot text:', error);
    }
  };

  const deleteScreenshot = (id: string) => {
    const newScreenshots = screenshots.filter((s) => s.id !== id);
    setScreenshots(newScreenshots);
    setActiveScreenshot(null);

    // Save to storage
    saveAllToIndexedDB(pdf.id, {
      annotations,
      highlights,
      screenshots: newScreenshots,
    }).catch((error) => {
      console.error('Failed to save after screenshot deletion:', error);
    });
  };

  // Update screenshot with translation result
  const updateScreenshotTranslation = async (
    screenshotId: string,
    translation: ImageTranslationResult
  ) => {
    const updatedScreenshots = screenshots.map((s) =>
      s.id === screenshotId ? { ...s, translation } : s
    );

    setScreenshots(updatedScreenshots);
    setTranslatingScreenshots((prev) => {
      const newSet = new Set(prev);
      newSet.delete(screenshotId);
      return newSet;
    });

    if (activeScreenshot?.id && activeScreenshot?.id === screenshotId) {
      setActiveScreenshot({
        ...activeScreenshot,
        translation,
      });
    }

    // Save to storage
    try {
      await saveAllToIndexedDB(pdf.id, {
        annotations,
        highlights,
        screenshots: updatedScreenshots,
      });

      if (storageType === 'supabase') {
        await saveAnnotation(pdf.id, {
          annotations,
          highlights,
          screenshots: updatedScreenshots,
        });
      }
    } catch (error) {
      console.error('Failed to save screenshot translation:', error);
    }
  };

  // Handle screenshot translation
  const handleScreenshotTranslate = (screenshot: Screenshot) => {
    if (!screenshot.imageData) return;

    setTranslatingScreenshots((prev) => new Set(prev).add(screenshot.id));
    setCurrentTranslatingId(screenshot.id);
    // setActiveScreenshot(null);

    // Use the image translation hook with the screenshot data
    imageTranslation.mutate({
      imageData: screenshot.imageData,
      targetLanguage,
      sourceLanguage: 'auto',
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
          <div
            className={`flex flex-1 p-4 pt-16 relative h-[100vh] overflow-auto flex-col items-center justify-start ${
              activeTool === 'screenshot' ? 'cursor-crosshair' : ''
            }`}>
            <div className="flex justify-center">
              <div ref={containerRef} className="space-y-4">
                {Array.from(new Array(numPages), (el, index) => (
                  <div
                    key={`page_${index + 1}`}
                    ref={(el) => {
                      pageRefs.current[index] = el;
                    }}
                    className="relative bg-white shadow-lg mb-4">
                    <div
                      onMouseDown={(e) => handleScreenshotMouseDown(e, index)}
                      onMouseUp={activeTool !== 'screenshot' ? handleTextSelection : undefined}
                      style={{
                        cursor: activeTool === 'screenshot' ? 'crosshair' : 'default',
                        userSelect: activeTool === 'screenshot' ? 'none' : 'auto',
                      }}>
                      <Page
                        pageNumber={index + 1}
                        scale={scale}
                        onLoadSuccess={onPageLoadSuccess}
                      />
                    </div>

                    {/* Highlights Overlay */}
                    {highlights
                      .filter((h) => h.page === index + 1)
                      .map((highlight) => (
                        <div
                          key={highlight.id}
                          className="absolute cursor-pointer z-[2] highlight-element hover:ring-2 hover:ring-blue-400 hover:ring-opacity-50 transition-all duration-200 group"
                          style={{
                            left: `${highlight.x}%`,
                            top: `${highlight.y}%`,
                            width: `${highlight.width}%`,
                            height: `${highlight.height}%`,
                            backgroundColor: highlight.color,
                            opacity: 0.6,
                          }}
                          onClick={(e) => handleHighlightClick(highlight, e)}
                          title="Click to translate this text">
                          {/* Translation indicator icon */}
                          <div className="absolute -top-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded shadow-sm flex items-center gap-1">
                              <Languages className="h-3 w-3" />
                              <span>Translate</span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Screenshots Overlay */}
                    {screenshots
                      .filter((s) => s.page === index + 1)
                      .map((screenshot) => (
                        <div
                          key={screenshot.id}
                          className="absolute cursor-pointer z-[3] border-2 border-sky-500 bg-sky-100 bg-opacity-20 hover:bg-opacity-40 transition-opacity rounded-b-md rounded-tr"
                          style={{
                            left: `${screenshot.x}%`,
                            top: `${screenshot.y}%`,
                            width: `${screenshot.width}%`,
                            height: `${screenshot.height}%`,
                            opacity: activeScreenshot?.id === screenshot.id ? 1 : 0.4,
                          }}
                          onClick={(e) => handleScreenshotClick(screenshot, e)}
                          title={
                            screenshot.translation?.translatedText ||
                            screenshot.text ||
                            'Screenshot - click for options'
                          }>
                          {/* Screenshot label */}
                          <div className="absolute -top-6 left-[-2px] flex gap-1">
                            <div className="bg-sky-500 text-white text-xs px-2 py-1 rounded-t whitespace-nowrap">
                              {screenshot.text ? (
                                <>
                                  {screenshot.text.substring(0, 20)}
                                  {screenshot.text.length > 20 ? '...' : ''}
                                </>
                              ) : (
                                'Screenshot'
                              )}
                            </div>
                            {screenshot.translation && (
                              <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-t whitespace-nowrap">
                                📝 {screenshot.translation.translatedText.substring(0, 10)}
                                {screenshot.translation.translatedText.length > 10 ? '...' : ''}
                              </div>
                            )}
                            {translatingScreenshots.has(screenshot.id) && (
                              <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-t whitespace-nowrap animate-pulse">
                                🔄 Translating...
                              </div>
                            )}
                          </div>
                        </div>
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
              <Button
                variant={activeTool === 'screenshot' ? 'default' : 'outline'}
                onClick={() => setActiveTool(activeTool === 'screenshot' ? 'select' : 'screenshot')}
                disabled={isCapturing}>
                <Camera className="h-4 w-4" />
                {isCapturing ? 'Capturing...' : 'Screenshot to translate'}
              </Button>
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

      {/* Visual Selection Overlay for Screenshot Drag */}
      {isDragging &&
        activeTool === 'screenshot' &&
        (() => {
          const overlay = getSelectionOverlay();
          return overlay ? (
            <div
              className="fixed pointer-events-none z-[100] border-2 border-sky-500 bg-sky-200 bg-opacity-30 rounded"
              style={{
                left: `${overlay.left}px`,
                top: `${overlay.top}px`,
                width: `${overlay.width}px`,
                height: `${overlay.height}px`,
              }}
            />
          ) : null;
        })()}

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
                          <div className="flex items-center mt-1 gap-2">
                            <Badge className="text-xs">Page {highlight.page}</Badge>
                            <div className="flex items-center text-xs text-blue-600">
                              <Languages className="h-3 w-3 mr-1" />
                              <span>Click to translate</span>
                            </div>
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

          {/* Screenshots List */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Screenshots ({screenshots.length})</h3>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {screenshots.length > 0 ? (
                screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Camera className="size-4 text-sky-500" />
                          <Badge className="text-xs">Page {screenshot.page}</Badge>
                          {translatingScreenshots.has(screenshot.id) && (
                            <Badge variant="secondary" className="text-xs">
                              Translating...
                            </Badge>
                          )}
                          {screenshot.translation && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(screenshot.translation.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                        {screenshot.text && (
                          <p className="text-sm font-medium line-clamp-2">{screenshot.text}</p>
                        )}
                        {screenshot.translation && (
                          <div className="mt-2 p-2 bg-sky-50 border border-sky-200 rounded text-xs space-y-1">
                            <div>
                              <span className="font-medium text-sky-800">
                                Original ({screenshot.translation.detectedLanguage}):
                              </span>
                              <p className="text-sky-700">{screenshot.translation.detectedText}</p>
                            </div>
                            <div>
                              <span className="font-medium text-sky-800">
                                Translation ({targetLanguage}):
                              </span>
                              <p className="text-sky-700 font-medium">
                                {screenshot.translation.translatedText}
                              </p>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(screenshot.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {!screenshot.translation && !translatingScreenshots.has(screenshot.id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScreenshotTranslate(screenshot);
                            }}
                            title="Translate">
                            <Languages className="h-3 w-3 text-sky-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScreenshot(screenshot.id);
                          }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No screenshots yet</p>
              )}
            </div>
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
                <p>
                  Select text and click "Highlight" to add highlights. Click any highlight to
                  translate it.
                </p>
              )}
              {activeTool === 'translate' && <p>Select text to automatically translate it.</p>}
              {activeTool === 'screenshot' && (
                <p>
                  Drag your mouse on any page to select an area for screenshot. Click on screenshot
                  boxes to add text notes or translate text using AI.
                </p>
              )}
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <p className="font-medium text-blue-800 mb-1">💡 Translation Tips:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>
                    • Click any <span className="bg-yellow-200 px-1 rounded">highlight</span> to
                    translate its text
                  </li>
                  <li>• Click the 🌐 button on screenshots to translate image text</li>
                  <li>• Set your target language in the settings above</li>
                </ul>
              </div>
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

      {/* Screenshot Toolbar - Shows when screenshot is clicked */}
      {activeScreenshot && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-2 flex-col"
          style={{
            left: `${screenshotToolbarPosition.x}px`,
            top: `${screenshotToolbarPosition.y}px`,
          }}>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => handleScreenshotTranslate(activeScreenshot)}
              className="text-xs"
              title="Translate Text in Image"
              disabled={
                translatingScreenshots.has(activeScreenshot.id) || !!activeScreenshot.translation
              }>
              <Languages className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => deleteScreenshot(activeScreenshot.id)}
              className="text-xs"
              title="Delete Screenshot">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          {activeScreenshot.translation && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Translation</h4>
              <div className="p-2 bg-sky-50 border border-sky-200 rounded text-xs space-y-1">
                <div>
                  <span className="font-medium text-sky-800">
                    Original ({activeScreenshot.translation.detectedLanguage}):
                  </span>
                  <p className="text-sky-700">{activeScreenshot.translation.detectedText}</p>
                </div>
                <div>
                  <span className="font-medium text-sky-800">Translation ({targetLanguage}):</span>
                  <p className="text-sky-700 font-medium">
                    {activeScreenshot.translation.translatedText}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Title</h4>
            <div className="flex gap-2 items-center">
              <Input
                value={screenshotTextInput}
                onChange={(e) => setScreenshotTextInput(e.target.value)}
                placeholder="Enter your note..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    saveScreenshotText();
                  }
                }}
              />
              <Button size="sm" onClick={saveScreenshotText}>
                Save
              </Button>
            </div>
          </div>

          {translatingScreenshots.has(activeScreenshot.id) && (
            <div className="p-2 bg-sky-50 border border-sky-200 rounded text-xs space-y-1">
              <p className="text-sky-700 font-medium">Translating...</p>
            </div>
          )}
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

      {/* ESC Key Feedback */}
      {showEscFeedback && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-sm font-medium">✨ Actions cancelled</span>
          <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">ESC</kbd>
        </div>
      )}
    </Document>
  );
}
