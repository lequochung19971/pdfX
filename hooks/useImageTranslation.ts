import { useMutation } from '@tanstack/react-query';
import {
  translateImage,
  translateImages,
  type ImageTranslationResult,
} from '@/lib/actions/translateImage';

interface UseImageTranslationOptions {
  onSuccess?: (result: ImageTranslationResult) => void;
  onError?: (error: Error) => void;
}

interface UseImageTranslationParams {
  imageData: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export const useImageTranslation = (options: UseImageTranslationOptions = {}) => {
  return useMutation({
    mutationFn: ({ imageData, targetLanguage, sourceLanguage }: UseImageTranslationParams) =>
      translateImage({ imageData, targetLanguage, sourceLanguage }),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
};

interface UseBatchImageTranslationOptions {
  onSuccess?: (results: ImageTranslationResult[]) => void;
  onError?: (error: Error) => void;
}

interface BatchTranslationParams {
  images: Array<{
    imageData: string;
    targetLanguage: string;
    sourceLanguage?: string;
  }>;
}

export const useBatchImageTranslation = (options: UseBatchImageTranslationOptions = {}) => {
  return useMutation({
    mutationFn: ({ images }: BatchTranslationParams) => translateImages(images),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
};

// Utility hook for common translation scenarios
export const useScreenshotTranslation = (targetLanguage: string = 'vi') => {
  return useImageTranslation({
    onSuccess: (result) => {
      console.log('Translation completed:', {
        detected: result.detectedLanguage,
        confidence: result.confidence,
        originalText: result.detectedText.slice(0, 100),
        translatedText: result.translatedText.slice(0, 100),
      });
    },
    onError: (error) => {
      console.error('Translation failed:', error.message);
    },
  });
};
