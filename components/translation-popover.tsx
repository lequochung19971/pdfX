'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useGoogleTranslate } from '@/hooks/useGoogleTranslate';

interface TranslationPopoverProps {
  text: string;
  position: { x: number; y: number };
  sourceLanguage?: string;
  targetLanguage?: string;
  onClose: () => void;
}

// Skeleton component for loading state
const TranslationSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-3 bg-gray-600 rounded w-16 mb-2"></div>
    <div className="space-y-1">
      <div className="h-4 bg-gray-600 rounded w-full"></div>
      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
    </div>
  </div>
);

export function TranslationPopover({
  text,
  position,
  sourceLanguage = 'en',
  targetLanguage = 'vi',
  onClose,
}: TranslationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    data: translationData,
    isLoading,
    error,
  } = useGoogleTranslate({
    sourceLanguage,
    targetLanguage,
    text,
    enabled: !!text,
  });

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      en: 'English',
      vi: 'Vietnamese',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      ar: 'Arabic',
      ru: 'Russian',
    };
    return languages[code] || code.toUpperCase();
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-gray-800 text-white border border-gray-600 rounded-lg shadow-xl p-3 max-w-sm min-w-64"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-50%)', // Center vertically
      }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {/* Source text */}
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">
              Original ({getLanguageName(sourceLanguage)}):
            </div>
            <div className="text-sm text-gray-200 font-medium">{text}</div>
          </div>

          {/* Translation */}
          <div>
            <div className="text-xs text-gray-400 mb-1">
              Translation ({getLanguageName(targetLanguage)}):
            </div>
            {isLoading && <TranslationSkeleton />}
            {error && (
              <div className="text-sm text-red-400">Translation failed. Please try again.</div>
            )}
            {translationData && !isLoading && (
              <div>
                <div className="text-sm text-white font-medium mb-2">
                  {translationData.translation}
                </div>

                {/* Additional translation info */}
                {translationData.bilingualDictionary &&
                  translationData.bilingualDictionary.length > 0 && (
                    <div className="border-t border-gray-600 pt-2 mt-2">
                      <div className="text-xs text-gray-400 mb-1">Definitions:</div>
                      {translationData.bilingualDictionary.slice(0, 2).map((dict, index) => (
                        <div key={index} className="text-xs text-gray-300">
                          <span className="text-gray-400">{dict.pos}:</span>{' '}
                          {dict.entry.slice(0, 3).map((entry, entryIndex) => (
                            <span key={entryIndex}>
                              {entry.word}
                              {entryIndex < dict.entry.length - 1 && entryIndex < 2 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 flex-shrink-0 hover:bg-gray-700"
          onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
