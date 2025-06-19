'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { savePDFToStorage } from '@/lib/pdf-storage';
import type { PDFDocument } from '@/lib/types';
import { CheckCircle, FileText, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface PDFUploadProps {
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function PDFUpload({ onUploadComplete }: PDFUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploadFiles((prev) => [...prev, ...newFiles]);

      // Process each file
      for (const uploadFile of newFiles) {
        try {
          // Simulate upload progress
          for (let progress = 0; progress <= 100; progress += 10) {
            setUploadFiles((prev) =>
              prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f))
            );
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Save to local storage
          const pdfDoc: PDFDocument = {
            id: uploadFile.id,
            name: uploadFile.file.name,
            size: uploadFile.file.size,
            uploadDate: new Date(),
            file: uploadFile.file,
          };

          await savePDFToStorage(pdfDoc);

          setUploadFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'completed' } : f))
          );
        } catch {
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: 'error', error: 'Failed to upload' } : f
            )
          );
        }
      }

      onUploadComplete();
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearCompleted = () => {
    setUploadFiles((prev) => prev.filter((f) => f.status !== 'completed'));
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}>
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-blue-600">Drop the PDF files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">Drag and drop PDF files here, or click to select</p>
            <p className="text-sm text-gray-500">Supports multiple PDF files</p>
          </div>
        )}
      </div>

      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upload Progress</CardTitle>
              <CardDescription>
                {uploadFiles.filter((f) => f.status === 'completed').length} of {uploadFiles.length}{' '}
                files completed
              </CardDescription>
            </div>
            <Button variant="outline" onClick={clearCompleted}>
              Clear Completed
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={uploadFile.progress} className="flex-1 h-2" />
                    <span className="text-xs text-gray-500 w-12">{uploadFile.progress}%</span>
                  </div>
                  {uploadFile.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {uploadFile.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeFile(uploadFile.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
