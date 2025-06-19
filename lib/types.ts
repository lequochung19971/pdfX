export interface PDFDocument {
  id: string
  name: string
  size: number
  uploadDate: Date
  file: File
}

export interface Annotation {
  id: string
  type: "drawing" | "text"
  path?: string
  text?: string
  x?: number
  y?: number
  page: number
  color: string
  strokeWidth?: number
}

export interface Highlight {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  page: number
  color: string
}

export interface AnnotationData {
  annotations: Annotation[]
  highlights: Highlight[]
}
