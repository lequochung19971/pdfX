# AI Image Translation Setup Guide

This guide explains how to set up and use the AI-powered image translation feature using the AI SDK and Google's Gemini model.

## Prerequisites

1. **Google AI API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Dependencies**: The required packages are already installed:
   - `@ai-sdk/google` (v2.0.7)
   - `ai` (v5.0.19)
   - `zod` (v4.0.17)

## Environment Setup

1. Create a `.env.local` file in your project root:

```bash
# Google AI (Gemini) API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# Other existing environment variables...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Make sure to add `.env.local` to your `.gitignore` file to keep your API key secure.

## Usage Examples

### Basic Image Translation

```typescript
import { translateImage } from '@/lib/actions/translateImage';

// Translate image text to Vietnamese
const result = await translateImage({
  imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...', // base64 image
  targetLanguage: 'vi',
  sourceLanguage: 'auto' // optional, defaults to 'auto'
});

console.log(result);
// {
//   detectedText: "Hello World",
//   detectedLanguage: "en",
//   translatedText: "Xin chào thế giới",
//   confidence: 0.95
// }
```

### Using React Hook

```typescript
import { useImageTranslation } from '@/hooks/useImageTranslation';

function TranslationComponent() {
  const translation = useImageTranslation({
    onSuccess: (result) => {
      console.log('Translation successful:', result);
    },
    onError: (error) => {
      console.error('Translation failed:', error);
    }
  });

  const handleTranslate = () => {
    translation.mutate({
      imageData: imageBase64,
      targetLanguage: 'vi'
    });
  };

  return (
    <button 
      onClick={handleTranslate}
      disabled={translation.isPending}
    >
      {translation.isPending ? 'Translating...' : 'Translate'}
    </button>
  );
}
```

### Batch Translation

```typescript
import { translateImages } from '@/lib/actions/translateImage';

const images = [
  { imageData: 'data:image/png;base64,...', targetLanguage: 'vi' },
  { imageData: 'data:image/png;base64,...', targetLanguage: 'ja' },
];

const results = await translateImages(images);
```

### Integration with PDF Screenshots

```typescript
import { Screenshot, ImageTranslationResult } from '@/lib/types';
import { useScreenshotTranslation } from '@/hooks/useImageTranslation';

function PDFScreenshotHandler({ screenshot }: { screenshot: Screenshot }) {
  const translation = useScreenshotTranslation('vi');

  const handleTranslateScreenshot = () => {
    translation.mutate({
      imageData: screenshot.imageData,
      targetLanguage: 'vi'
    });
  };

  return (
    <div>
      <img src={screenshot.imageData} alt="Screenshot" />
      <button onClick={handleTranslateScreenshot}>
        Translate Text
      </button>
      {translation.data && (
        <div>
          <p>Original: {translation.data.detectedText}</p>
          <p>Translation: {translation.data.translatedText}</p>
          <p>Confidence: {Math.round(translation.data.confidence * 100)}%</p>
        </div>
      )}
    </div>
  );
}
```

## Supported Languages

The system supports translation between multiple languages:

- English (en)
- Vietnamese (vi)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- Thai (th)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Russian (ru)
- Arabic (ar)
- Hindi (hi)

## Features

### 1. **Automatic Text Detection**
- Uses Gemini's vision capabilities to detect and extract text from images
- Works with various image formats and text layouts
- Handles complex documents, screenshots, and photos

### 2. **Language Detection**
- Automatically detects the source language of the text
- Provides language codes for both source and target languages

### 3. **High-Quality Translation**
- Uses Google's Gemini model for accurate translations
- Maintains context and formatting where possible
- Handles technical terms and proper nouns appropriately

### 4. **Confidence Scoring**
- Provides confidence scores for both text detection and translation accuracy
- Helps users understand the reliability of the results

### 5. **Batch Processing**
- Process multiple images simultaneously
- Efficient for handling multiple screenshots or documents

## Error Handling

The system includes comprehensive error handling:

```typescript
try {
  const result = await translateImage({
    imageData: base64Image,
    targetLanguage: 'vi'
  });
} catch (error) {
  if (error.message.includes('API key')) {
    // Handle API key issues
  } else if (error.message.includes('rate limit')) {
    // Handle rate limiting
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **Image Quality**: Higher quality images produce better text detection results
2. **API Key Security**: Never expose your API key in client-side code
3. **Rate Limiting**: Be mindful of API usage limits
4. **Error Handling**: Always implement proper error handling
5. **Caching**: Consider caching translation results to avoid redundant API calls

## Integration with Existing Translation System

The new AI image translation system works alongside your existing Google Translate text API. You can choose which system to use based on your needs:

- Use Google Translate API for simple text translation
- Use AI image translation for extracting and translating text from images
- Combine both for comprehensive translation capabilities

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify your API key is correct
   - Check that the Gemini API is enabled in your Google Cloud Console
   - Ensure billing is set up if required

2. **No Text Detected**
   - Check image quality and resolution
   - Ensure text is clearly visible and not too small
   - Try adjusting image contrast or brightness

3. **Low Confidence Scores**
   - Improve image quality
   - Ensure good lighting and contrast
   - Check for image artifacts or noise

4. **Rate Limiting**
   - Implement exponential backoff for retries
   - Consider caching results
   - Monitor your API usage

## Performance Optimization

- Use appropriate image sizes (larger isn't always better)
- Implement result caching
- Consider using batch processing for multiple images
- Monitor API usage and costs
