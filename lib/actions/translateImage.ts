'use server';

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Schema for the AI response
const imageTranslationSchema = z.object({
  detectedText: z.string().describe('The text detected in the image'),
  detectedLanguage: z
    .string()
    .describe('The detected language code (e.g., "en", "vi", "ja", "ko")'),
  translatedText: z.string().describe('The translated text in the target language'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score for the detection and translation'),
});

export type ImageTranslationResult = z.infer<typeof imageTranslationSchema>;

interface TranslateImageOptions {
  imageData: string; // base64 encoded image data
  targetLanguage: string; // target language code (e.g., "vi", "en", "ja", "ko")
  sourceLanguage?: string; // optional source language hint
}

export const translateImage = async ({
  imageData,
  targetLanguage,
  sourceLanguage = 'auto',
}: TranslateImageOptions): Promise<ImageTranslationResult> => {
  try {
    // Ensure the image data has the proper data URL format
    const base64Data = imageData.startsWith('data:')
      ? imageData
      : `data:image/png;base64,${imageData}`;

    const prompt = `Analyze this image and:
1. Extract all visible text from the image
2. Detect the language of the extracted text
3. Translate the text to ${getLanguageName(targetLanguage)}
4. Provide a confidence score for the overall process

${
  sourceLanguage !== 'auto'
    ? `Hint: The source language might be ${getLanguageName(sourceLanguage)}`
    : ''
}

Important guidelines:
- If no text is detected, return empty strings for detectedText and translatedText
- Maintain the original formatting and structure as much as possible
- For technical terms or proper nouns, consider keeping them untranslated if appropriate
- Provide accurate confidence scoring based on text clarity and translation certainty`;

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: imageTranslationSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: base64Data },
          ],
        },
      ],
      temperature: 0.1, // Low temperature for consistent results
    });

    return result.object;
  } catch (error) {
    console.error('Image translation error:', error);
    throw new Error(
      `Failed to translate image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

// Helper function to get language names
function getLanguageName(languageCode: string): string {
  const languageMap: Record<string, string> = {
    en: 'English',
    vi: 'Vietnamese',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    th: 'Thai',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ar: 'Arabic',
    hi: 'Hindi',
  };

  return languageMap[languageCode] || languageCode;
}

// Batch translation for multiple images
export const translateImages = async (
  images: TranslateImageOptions[]
): Promise<ImageTranslationResult[]> => {
  try {
    const results = await Promise.all(images.map((imageOptions) => translateImage(imageOptions)));
    return results;
  } catch (error) {
    console.error('Batch image translation error:', error);
    throw new Error(
      `Failed to translate images: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
