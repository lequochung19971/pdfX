-- Create the pdf_annotations table
CREATE TABLE IF NOT EXISTS pdf_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdf_id TEXT NOT NULL,
  annotations JSONB DEFAULT '[]'::jsonb,
  highlights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on pdf_id for faster queries
CREATE INDEX IF NOT EXISTS idx_pdf_annotations_pdf_id ON pdf_annotations(pdf_id);

-- Enable Row Level Security (optional)
ALTER TABLE pdf_annotations ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on pdf_annotations" ON pdf_annotations
  FOR ALL USING (true);
