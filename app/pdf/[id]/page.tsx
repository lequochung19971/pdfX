'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PDFViewer from '@/components/pdf-viewer';
import { getPDFById } from '@/lib/pdf-storage';
import type { PDFDocument } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function PDFViewPage() {
  const params = useParams();
  const router = useRouter();
  const [pdf, setPdf] = useState<PDFDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    const loadPDF = async () => {
      if (!id) {
        setError('No PDF ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const pdfDocument = await getPDFById(id);

        if (!pdfDocument) {
          setError('PDF not found');
        } else {
          setPdf(pdfDocument);
        }
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [id]);

  const handleBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold mb-2">Loading PDF...</h2>
            <p className="text-gray-600">Please wait while we retrieve your document.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 text-red-700">{error || 'PDF Not Found'}</h2>
            <p className="text-gray-600 mb-6">
              {error === 'PDF not found'
                ? 'The requested PDF could not be found in your library.'
                : 'There was an error loading the PDF. Please try again.'}
            </p>
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PDFViewer pdf={pdf} onBack={handleBack} />;
}
