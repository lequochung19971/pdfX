'use client';

import PDFManager from '@/components/pdf-manager';
import PDFUploadDialog from '@/components/pdf-upload-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPDFsFromStorage } from '@/lib/pdf-storage';
import type { PDFDocument } from '@/lib/types';
import { FileText, Grid, List, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [pdfs, setPdfs] = useState<PDFDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    const storedPDFs = await getPDFsFromStorage();
    setPdfs(storedPDFs);
  };

  const filteredPDFs = pdfs.filter((pdf) =>
    pdf.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to PDF X</h1>
          <p className="text-gray-600">Upload, view, and annotate your PDF documents</p>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search PDFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}>
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}>
                <List className="h-4 w-4" />
              </Button>
              <PDFUploadDialog onUploadComplete={loadPDFs} />
            </div>
          </div>

          {filteredPDFs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No PDFs found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? 'No PDFs match your search.'
                  : 'Upload your first PDF to get started.'}
              </p>
            </div>
          ) : (
            <PDFManager pdfs={filteredPDFs} viewMode={viewMode} onPDFsChange={loadPDFs} />
          )}
        </div>
      </div>
    </div>
  );
}
