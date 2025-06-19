import { useQuery } from '@tanstack/react-query';

// Types based on the Google Translate API response structure
export interface TranslationSentence {
  trans: string;
  orig: string;
}

export interface BilingualDictionaryEntry {
  word: string;
  reverseTranslation: string[];
}

export interface BilingualDictionary {
  pos: string;
  entry: BilingualDictionaryEntry[];
  baseForm: string;
  posEnum: number;
}

export interface GoogleTranslateResponse {
  translation: string;
  sentences: TranslationSentence[];
  bilingualDictionary: BilingualDictionary[];
  sourceLanguage: string;
}

export interface TranslateOptions {
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
  displayLanguage?: string;
  includeDefinitions?: boolean;
  enabled?: boolean;
}

const GOOGLE_TRANSLATE_API_URL = 'https://translate-pa.googleapis.com/v1/translate';
const API_KEY = 'AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA';

const translateText = async (options: TranslateOptions): Promise<GoogleTranslateResponse> => {
  const {
    sourceLanguage,
    targetLanguage,
    text,
    displayLanguage = 'en-US',
    includeDefinitions = true,
  } = options;

  const url = new URL(GOOGLE_TRANSLATE_API_URL);

  // Add query parameters
  url.searchParams.append('params.client', 'gtx');
  url.searchParams.append('query.source_language', sourceLanguage);
  url.searchParams.append('query.target_language', targetLanguage);
  url.searchParams.append('query.display_language', displayLanguage);
  url.searchParams.append('query.text', text);
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('data_types', 'TRANSLATION');
  url.searchParams.append('data_types', 'SENTENCE_SPLITS');

  if (includeDefinitions) {
    url.searchParams.append('data_types', 'BILINGUAL_DICTIONARY_FULL');
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

export const useGoogleTranslate = (options: TranslateOptions) => {
  const {
    sourceLanguage,
    targetLanguage,
    text,
    displayLanguage = 'en-US',
    includeDefinitions = true,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: [
      'translate',
      sourceLanguage,
      targetLanguage,
      text,
      displayLanguage,
      includeDefinitions,
    ],
    queryFn: () => translateText(options),
    enabled: enabled && !!text && text.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

// Helper hook for common translation pairs
export const useTranslateToVietnamese = (text: string, enabled = true) => {
  return useGoogleTranslate({
    sourceLanguage: 'en',
    targetLanguage: 'vi',
    text,
    enabled,
  });
};

export const useTranslateToEnglish = (text: string, enabled = true) => {
  return useGoogleTranslate({
    sourceLanguage: 'vi',
    targetLanguage: 'en',
    text,
    enabled,
  });
};
