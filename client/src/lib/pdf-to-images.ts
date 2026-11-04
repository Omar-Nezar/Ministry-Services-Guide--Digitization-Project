// Turns the pages of a PDF file into pictures, in the browser, so they can be uploaded as picture pages.
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface RenderedPdfPage {
  file: File;
  size: "A3" | "A4";
  orientation: "portrait" | "landscape";
}

/** PDF points: A4 is 595 x 842, A3 is 842 x 1191. Anything longer than between the two counts as A3. */
const A3_THRESHOLD = 1000;
/** About 200 dpi: A3 is 3307 px on its long side, A4 2339 px. A JPEG of that stays well under the 10 MB upload limit. */
const LONG_SIDE = { A3: 3307, A4: 2339 };

/** Renders every page of `pdf` as a JPEG, one at a time. `onPage` gets (done, total) after each page. */
export async function* pdfPagesAsImages(pdf: File): AsyncGenerator<RenderedPdfPage & { index: number; total: number }> {
  const task = pdfjsLib.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) });
  try {
    const doc = await task.promise;
    const base = pdf.name.replace(/\.pdf$/i, "");
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number);
      try {
        const natural = page.getViewport({ scale: 1 });
        const long = Math.max(natural.width, natural.height);
        const size = long > A3_THRESHOLD ? "A3" : "A4";
        const viewport = page.getViewport({ scale: LONG_SIDE[size] / long });

        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        try {
          const context = canvas.getContext("2d")!;
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvas, viewport, intent: "print" }).promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
          if (!blob) throw new Error("Could not turn the PDF page into a picture.");
          yield {
            file: new File([blob], `${base}-${number}.jpg`, { type: "image/jpeg" }),
            size,
            orientation: natural.width > natural.height ? "landscape" : "portrait",
            index: number,
            total: doc.numPages,
          };
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await task.destroy();
  }
}
