export interface PDFDocument {
  id: string;
  name: string;
  size: number;
  uploadDate: Date;
  file: File;
}

export interface Annotation {
  id: string;
  type: 'drawing' | 'text';
  path?: string;
  text?: string;
  x?: number;
  y?: number;
  page: number;
  color: string;
  strokeWidth?: number;
}

export interface Highlight {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  color: string;
}

export interface Screenshot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  imageData: string; // base64 encoded image
  text?: string; // optional text annotation
  timestamp: Date;
  translation?: ImageTranslationResult; // AI-powered translation result
}

export interface ImageTranslationResult {
  detectedText: string;
  detectedLanguage: string;
  translatedText: string;
  confidence: number;
}

export interface AnnotationData {
  annotations: Annotation[];
  highlights: Highlight[];
  screenshots: Screenshot[];
}

export interface TranslationSettings {
  targetLanguage: string;
  sourceLanguage?: string;
  autoTranslate: boolean;
  showOriginalText: boolean;
  translationProvider: 'google' | 'ai-gemini';
}
