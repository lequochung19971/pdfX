'use client';

import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import PDFUpload from '@/components/pdf-upload';
import { useState } from 'react';

interface PDFUploadDialogProps {
  onUploadComplete: () => void;
  trigger?: React.ReactNode;
}

export default function PDFUploadDialog({ onUploadComplete, trigger }: PDFUploadDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUploadComplete = () => {
    onUploadComplete();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Upload PDF</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload PDF Document</DialogTitle>
        </DialogHeader>
        <PDFUpload onUploadComplete={handleUploadComplete} />
      </DialogContent>
    </Dialog>
  );
}
