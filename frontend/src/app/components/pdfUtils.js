// src/app/edit-fill/pdfUtils.js
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Convert a screen-space box (top-left x,y + width/height, in canvas pixels at a given
 * render `scale`) back into PDF point coordinates (origin bottom-left).
 *
 * NOTE: assumes page rotation = 0, which covers the vast majority of real-world PDFs.
 * A rotated page (rare, but some scanned docs use it) would need the inverse of
 * pdfjs's viewport transform instead of this simple flip - flagging as a known limitation.
 */
export function screenBoxToPdf(box, scale, pageHeightPts) {
  const pdfWidth = box.width / scale;
  const pdfHeight = box.height / scale;
  const pdfYTop = pageHeightPts - box.y / scale; // y of the TOP edge, in PDF space
  const pdfY = pdfYTop - pdfHeight; // y of the BOTTOM edge (what pdf-lib drawX functions expect)
  const pdfX = box.x / scale;
  return { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight };
}

/**
 * Takes the original PDF bytes, the collected AcroForm field values, and any free-form
 * annotations (checks/crosses/signatures/text/images/dates), and produces the final,
 * downloadable PDF bytes.
 */
export async function buildFilledPdf({ originalBytes, fieldValues, freeAnnotations, flatten }) {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const form = pdfDoc.getForm();
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // --- 1. Fill real AcroForm fields ---
  for (const [name, entry] of Object.entries(fieldValues)) {
    try {
      switch (entry.fieldType) {
        case 'Tx': {
          const field = form.getTextField(name);
          if (entry.fontSizePt) field.setFontSize(entry.fontSizePt);
          field.setText(entry.value ?? '');
          break;
        }
        case 'checkbox': {
          const field = form.getCheckBox(name);
          if (entry.value) field.check();
          else field.uncheck();
          break;
        }
        case 'radio': {
          if (entry.value) form.getRadioGroup(name).select(entry.value);
          break;
        }
        case 'dropdown': {
          if (entry.value) form.getDropdown(name).select(entry.value);
          break;
        }
        case 'listbox': {
          if (entry.value) {
            const values = Array.isArray(entry.value) ? entry.value : [entry.value];
            form.getOptionList(name).select(values);
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      // Don't let one bad field abort the whole export - skip and keep going.
      console.warn(`Could not set field "${name}":`, err);
    }
  }

  if (flatten) {
    try {
      form.flatten();
    } catch (err) {
      console.warn('Form flatten failed, continuing with an unflattened (still editable) form:', err);
    }
  }

  // --- 2. Draw free-form annotations on top ---
  const imageCache = new Map();

  for (const ann of freeAnnotations) {
    const page = pdfDoc.getPage(ann.page);
    const { height: pageHeightPts } = page.getSize();
    const scale = ann.scale;
    const box = screenBoxToPdf(
      { x: ann.x, y: ann.y, width: ann.width, height: ann.height },
      scale,
      pageHeightPts
    );

    switch (ann.type) {
      case 'text':
      case 'date': {
        const fontSize = ann.fontSize || 14;
        page.drawText(ann.text || '', {
          x: box.x + 2,
          y: box.y + Math.max(0, (box.height - fontSize) / 2),
          size: fontSize,
          font: helv,
          color: rgb(0, 0, 0),
          maxWidth: Math.max(1, box.width - 4),
        });
        break;
      }
      case 'check': {
        const color = rgb(0,0,0);
        const thickness = 2.2;
        const { x: x0, y: y0, width: w, height: h } = box;
        page.drawLine({
          start: { x: x0 + w * 0.05, y: y0 + h * 0.45 },
          end: { x: x0 + w * 0.4, y: y0 + h * 0.1 },
          thickness,
          color,
        });
        page.drawLine({
          start: { x: x0 + w * 0.4, y: y0 + h * 0.1 },
          end: { x: x0 + w * 0.95, y: y0 + h * 0.9 },
          thickness,
          color,
        });
        break;
      }
      case 'cross': {
        const color = rgb(0.8, 0.15, 0.15);
        const thickness = 2.2;
        const { x: x0, y: y0, width: w, height: h } = box;
        page.drawLine({ start: { x: x0, y: y0 }, end: { x: x0 + w, y: y0 + h }, thickness, color });
        page.drawLine({ start: { x: x0, y: y0 + h }, end: { x: x0 + w, y: y0 }, thickness, color });
        break;
      }
      case 'draw': {
        const color = rgb(0.1, 0.1, 0.1);
        const thickness = ann.thickness || 2.2;
        const pts = ann.points.map((p) =>
          screenBoxToPdf({ x: p.x, y: p.y, width: 0, height: 0 }, scale, pageHeightPts)
        );
        for (let i = 1; i < pts.length; i++) {
          page.drawLine({
            start: { x: pts[i - 1].x, y: pts[i - 1].y },
            end: { x: pts[i].x, y: pts[i].y },
            thickness,
            color,
          });
        }
        break;
      }
      case 'image': {
        try {
          let embedded = imageCache.get(ann.imageDataUrl);
          if (!embedded) {
            const isPng = ann.imageDataUrl.startsWith('data:image/png');
            const base64 = ann.imageDataUrl.split(',')[1];
            const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            embedded = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
            imageCache.set(ann.imageDataUrl, embedded);
          }
          page.drawImage(embedded, { x: box.x, y: box.y, width: box.width, height: box.height });
        } catch (err) {
          console.warn('Image stamp failed to embed:', err);
        }
        break;
      }
      default:
        break;
    }
  }

  return pdfDoc.save();
}