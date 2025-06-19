'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TranslationSettingsProps {
  sourceLanguage: string;
  targetLanguage: string;
  onSourceLanguageChange: (language: string) => void;
  onTargetLanguageChange: (language: string) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
];

export function TranslationSettings({
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
}: TranslationSettingsProps) {
  const getLanguageName = (code: string) => {
    return LANGUAGES.find((lang) => lang.code === code)?.name || code.toUpperCase();
  };

  return (
    <div className="p-4 border border-border rounded-lg bg-card">
      <div className="pb-3 mb-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Translation Settings
        </h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">From:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {getLanguageName(sourceLanguage)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {LANGUAGES.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onClick={() => onSourceLanguageChange(language.code)}
                  className={sourceLanguage === language.code ? 'bg-accent' : ''}>
                  {language.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">To:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {getLanguageName(targetLanguage)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {LANGUAGES.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onClick={() => onTargetLanguageChange(language.code)}
                  className={targetLanguage === language.code ? 'bg-accent' : ''}>
                  {language.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
