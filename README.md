# PDF X

PDF X is a modern web application for viewing, managing, and interacting with PDF documents. Built with Next.js and React, it provides a sleek interface for PDF document management with advanced features.

![PDF X App](https://via.placeholder.com/800x400?text=PDF+X+App)

## Features

- **PDF Management**
  - Upload and store PDF files locally using IndexedDB
  - Organize and browse your PDF collection with grid or list view
  - Search through your PDF documents by name

- **PDF Viewing**
  - Smooth, responsive PDF rendering
  - Zoom in/out functionality
  - Navigate between pages
  - Text selection and annotation

- **Annotation Tools**
  - Highlight text in documents
  - Add and manage annotations
  - Save annotations locally

- **Translation Support**
  - Translate selected text on the fly
  - Support for multiple languages
  - Translation popover with contextual positioning
  - Customizable source and target languages

## Tech Stack

- **Frontend Framework**: [Next.js](https://nextjs.org/) (React)
- **PDF Rendering**: [React PDF](https://react-pdf.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) with custom components
- **Data Management**: IndexedDB for offline storage
- **Backend Integration**: [Supabase](https://supabase.io/) for optional cloud storage
- **Data Fetching**: [TanStack Query](https://tanstack.com/query) for efficient API calls
- **Language Translation**: Google Translate API integration

## Getting Started

### Prerequisites

- Node.js 16.8.0 or later
- pnpm, npm, or yarn package manager

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/pdfx.git
cd pdfx
```

2. Install the dependencies:

```bash
pnpm install
# or
npm install
# or
yarn install
```

3. Start the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1. **Upload PDFs**: Click the upload button to add PDF files to your collection.
2. **Browse Documents**: View your PDFs in either grid or list view.
3. **Open a Document**: Click on a document to open the PDF viewer.
4. **PDF Navigation**: Use the controls to zoom, change pages, and navigate.
5. **Text Interaction**: Select text to highlight or translate.
6. **Save Annotations**: Annotations are automatically saved locally.

## Project Structure

```
pdfx/
  ├── app/               # Next.js app directory
  ├── components/        # React components
  │   ├── ui/            # Reusable UI components
  │   └── ...            # Feature-specific components
  ├── hooks/             # Custom React hooks
  ├── lib/               # Utility functions and types
  └── public/            # Static files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
