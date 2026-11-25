import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';

// Point the worker at the bundled copy shipped with pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface Props {
  base64: string;
}

export function PdfThumbnail({ base64 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(1);

        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render at the canvas's display width for a sharp thumbnail
        const displayWidth = canvas.clientWidth || 280;
        const viewport = page.getViewport({ scale: 1 });
        const scale = displayWidth / viewport.width;
        const scaled = page.getViewport({ scale });

        canvas.width = scaled.width;
        canvas.height = scaled.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
      } catch {
        if (!cancelled) setError(true);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [base64]);

  if (error) return null;

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-2xl"
      style={{ display: 'block' }}
    />
  );
}
