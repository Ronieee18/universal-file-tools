// src/app/edit-fill/PdfPageCanvas.jsx
"use client";
import { useEffect, useRef, useState } from "react";

function toScalar(v) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ACROBAT_DATE_PRESETS = [
  "m/d",
  "m/d/yy",
  "mm/dd/yy",
  "mm/yy",
  "d-mmm",
  "d-mmm-yy",
  "dd-mmm-yy",
  "yy-mm-dd",
  "mmm-yy",
  "mmmm-yy",
  "mmm d, yyyy",
  "mmmm d, yyyy",
  "m/d/yy h:MM tt",
  "m/d/yy HH:MM",
];

function getDateFieldFormat(a) {
  const scripts = [
    ...(a.actions?.Format || []),
    ...(a.actions?.Keystroke || []),
  ];
  for (const script of scripts) {
    const literalMatch =
      /AFDate_(?:FormatEx|KeystrokeEx)\(\s*"([^"]+)"\s*\)/.exec(script);
    if (literalMatch) return literalMatch[1];
    const presetMatch = /AFDate_(?:Format|Keystroke)\(\s*(\d+)\s*\)/.exec(
      script,
    );
    if (presetMatch)
      return ACROBAT_DATE_PRESETS[parseInt(presetMatch[1], 10)] || null;
  }
  return null;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateWithPattern(date, pattern) {
  const tokenRegex = /yyyy|yy|mmmm|mmm|mm|m|dd|d/gi;
  return pattern.replace(tokenRegex, (token) => {
    switch (token.toLowerCase()) {
      case "yyyy":
        return String(date.getFullYear());
      case "yy":
        return pad2(date.getFullYear() % 100);
      case "mmmm":
        return MONTH_LONG[date.getMonth()];
      case "mmm":
        return MONTH_SHORT[date.getMonth()];
      case "mm":
        return pad2(date.getMonth() + 1);
      case "m":
        return String(date.getMonth() + 1);
      case "dd":
        return pad2(date.getDate());
      case "d":
        return String(date.getDate());
      default:
        return token;
    }
  });
}

function parseDateWithPattern(str, pattern) {
  if (!str) return null;
  const tokenRegex = /yyyy|yy|mmmm|mmm|mm|m|dd|d/gi;
  let lastIndex = 0;
  let match;
  const parts = [];
  while ((match = tokenRegex.exec(pattern))) {
    if (match.index > lastIndex)
      parts.push({ literal: pattern.slice(lastIndex, match.index) });
    parts.push({ token: match[0].toLowerCase() });
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < pattern.length)
    parts.push({ literal: pattern.slice(lastIndex) });

  let regexStr = "";
  const groups = [];
  for (const part of parts) {
    if (part.literal !== undefined) {
      regexStr += part.literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    } else {
      const group = {
        yyyy: "(\\d{4})",
        yy: "(\\d{2})",
        mmmm: "([A-Za-z]+)",
        mmm: "([A-Za-z]{3})",
        mm: "(\\d{1,2})",
        m: "(\\d{1,2})",
        dd: "(\\d{1,2})",
        d: "(\\d{1,2})",
      }[part.token];
      regexStr += group;
      groups.push(part.token);
    }
  }
  const result = new RegExp(`^${regexStr}$`, "i").exec(str.trim());
  if (!result) return null;

  let year, month, day;
  groups.forEach((token, i) => {
    const val = result[i + 1];
    if (token === "yyyy") year = parseInt(val, 10);
    else if (token === "yy") year = 2000 + parseInt(val, 10);
    else if (token === "mmmm")
      month = MONTH_LONG.findIndex(
        (mn) => mn.toLowerCase() === val.toLowerCase(),
      );
    else if (token === "mmm")
      month = MONTH_SHORT.findIndex(
        (mn) => mn.toLowerCase() === val.toLowerCase(),
      );
    else if (token === "mm" || token === "m") month = parseInt(val, 10) - 1;
    else if (token === "dd" || token === "d") day = parseInt(val, 10);
  });
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    month < 0
  )
    return null;
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

function isoFromDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function defaultFieldFontSizePt(a) {
  const raw = a.defaultAppearanceData?.fontSize;
  return raw && raw > 0 ? raw : 11;
}

function widgetControlType(a) {
  if (a.fieldType === "Tx") return "text";
  if (a.fieldType === "Ch") return a.combo ? "dropdown" : "listbox";
  if (a.fieldType === "Btn") {
    if (a.checkBox) return "checkbox";
    if (a.radioButton) return "radio";
    return "button";
  }
  if (a.fieldType === "Sig") return "signature";
  return "unknown";
}

function AnnotationContent({ ann, onUpdateAnnotation }) {
  switch (ann.type) {
    case "text":
    case "date":
      return (
        <textarea
          value={ann.text}
          onChange={(e) => onUpdateAnnotation(ann.id, { text: e.target.value })}
          style={{
            width: "100%",
            height: "100%",
            border: "1px dashed #6366f1",
            background: "rgba(99,102,241,0.06)",
            resize: "none",
            fontSize: ann.fontSize,
            fontFamily: "inherit",
            color: "#111827",
            fontWeight: 500,
            padding: 2,
            boxSizing: "border-box",
          }}
        />
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%">
          <path
            d="M4 13 L9 18 L20 5"
            stroke="#000000"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      );
    case "cross":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%">
          <line
            x1="4"
            y1="4"
            x2="20"
            y2="20"
            stroke="#dc2626"
            strokeWidth="3"
          />
          <line
            x1="20"
            y1="4"
            x2="4"
            y2="20"
            stroke="#dc2626"
            strokeWidth="3"
          />
        </svg>
      );
    case "draw":
      return (
        <svg width="100%" height="100%" style={{ overflow: "visible" }}>
          <polyline
            points={ann.points
              .map((p) => `${p.x - ann.x},${p.y - ann.y}`)
              .join(" ")}
            fill="none"
            stroke="#111827"
            strokeWidth={ann.thickness}
          />
        </svg>
      );
    case "image":
      return (
        <img
          src={ann.imageDataUrl}
          alt="stamp"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      );
    default:
      return null;
  }
}

export default function PdfPageCanvas({
  pdfDoc,
  pageIndex,
  scale,
  activeTool,
  fieldValues,
  onFieldChange,
  onFontSizeChange,
  freeAnnotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  pendingImageDataUrl,
  onImagePlaced,
}) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const renderTaskRef = useRef(null);
  const buttonImageInputRef = useRef(null);
  const [pendingButtonTarget, setPendingButtonTarget] = useState(null);
  const [focusedFieldId, setFocusedFieldId] = useState(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [fieldAnnotations, setFieldAnnotations] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [drawingPath, setDrawingPath] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // Render the current page + read its real AcroForm field annotations
  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!pdfDoc) return;
      const page = await pdfDoc.getPage(pageIndex + 1);
      if (cancelled) return;

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          /* no-op */
        }
      }

      const task = page.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      renderTaskRef.current = task;

      try {
        await task.promise;
      } catch (err) {
        if (err?.name === "RenderingCancelledException") return;
        console.error("PDF page render failed:", err);
        return;
      } finally {
        if (renderTaskRef.current === task) renderTaskRef.current = null;
      }

      if (cancelled) return;
      setViewportSize({ width: viewport.width, height: viewport.height });

      const rawAnnotations = await page.getAnnotations({ intent: "display" });
      const widgets = rawAnnotations
        .filter((a) => a.fieldType)
        .map((a) => {
          const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(
            a.rect,
          );
          const x = Math.min(vx1, vx2);
          const y = Math.min(vy1, vy2);
          const width = Math.abs(vx2 - vx1);
          const height = Math.abs(vy2 - vy1);
          return { ...a, screen: { x, y, width, height } };
        });

      if (!cancelled) {
        setFieldAnnotations(widgets);

        // ✅ FIX 1: Auto-populate default font sizes and initial values into state
        widgets.forEach((a) => {
          if (!a.fieldName) return;
          const initialFont = defaultFieldFontSizePt(a);
          const initialVal = toScalar(a.fieldValue);

          // If font size or field value hasn't been synced to parent state yet, sync it now
          if (
            fieldValues[a.fieldName]?.fontSizePt === undefined &&
            onFontSizeChange
          ) {
            onFontSizeChange(a.fieldName, initialFont);
          }
          if (
            fieldValues[a.fieldName]?.value === undefined &&
            initialVal !== ""
          ) {
            onFieldChange(a.fieldName, widgetControlType(a), initialVal);
          }
        });
      }
    }

    render();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          /* no-op */
        }
      }
    };
  }, [pdfDoc, pageIndex, scale]);

  function getRelativePoint(e) {
    const rect = overlayRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleButtonImageChosen(e) {
    const imgFile = e.target.files?.[0];
    const target = pendingButtonTarget;
    e.target.value = "";
    if (!imgFile || !target) return;
    const reader = new FileReader();
    reader.onload = () => {
      onAddAnnotation({
        type: "image",
        page: pageIndex,
        scale,
        x: target.screen.x,
        y: target.screen.y,
        width: target.screen.width,
        height: target.screen.height,
        imageDataUrl: reader.result,
      });
      setPendingButtonTarget(null);
    };
    reader.readAsDataURL(imgFile);
  }

  function handleOverlayPointerDown(e) {
    if (e.target !== overlayRef.current) return;
    const pt = getRelativePoint(e);

    if (activeTool === "draw") {
      setDrawingPath({ points: [pt] });
      return;
    }
    if (activeTool === "image") {
      if (!pendingImageDataUrl) return;
      const id = onAddAnnotation({
        type: "image",
        page: pageIndex,
        scale,
        x: pt.x,
        y: pt.y,
        width: 140,
        height: 70,
        imageDataUrl: pendingImageDataUrl,
      });
      setSelectedId(id);
      onImagePlaced?.();
      return;
    }
    if (["text", "check", "cross", "date"].includes(activeTool)) {
      const defaults = {
        text: { width: 160, height: 26, text: "Text", fontSize: 14 },
        check: { width: 22, height: 22 },
        cross: { width: 22, height: 22 },
        date: {
          width: 130,
          height: 26,
          text: new Date().toLocaleDateString(),
          fontSize: 14,
        },
      }[activeTool];
      const id = onAddAnnotation({
        type: activeTool,
        page: pageIndex,
        scale,
        x: pt.x,
        y: pt.y,
        ...defaults,
      });
      setSelectedId(id);
      return;
    }
    setSelectedId(null);
  }

  function handleOverlayPointerMove(e) {
    if (drawingPath) {
      const pt = getRelativePoint(e);
      setDrawingPath((prev) => ({ points: [...prev.points, pt] }));
      return;
    }
    if (dragState) {
      const pt = getRelativePoint(e);
      const dx = pt.x - dragState.startX;
      const dy = pt.y - dragState.startY;
      if (dragState.mode === "move") {
        onUpdateAnnotation(dragState.id, {
          x: dragState.origBox.x + dx,
          y: dragState.origBox.y + dy,
        });
      } else {
        onUpdateAnnotation(dragState.id, {
          width: Math.max(12, dragState.origBox.width + dx),
          height: Math.max(12, dragState.origBox.height + dy),
        });
      }
    }
  }

  function handleOverlayPointerUp() {
    if (drawingPath) {
      if (drawingPath.points.length > 1) {
        const xs = drawingPath.points.map((p) => p.x);
        const ys = drawingPath.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        onAddAnnotation({
          type: "draw",
          page: pageIndex,
          scale,
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
          points: drawingPath.points,
          thickness: 2.2,
        });
      }
      setDrawingPath(null);
    }
    setDragState(null);
  }

  function startDrag(e, ann, mode) {
    e.stopPropagation();
    const pt = getRelativePoint(e);
    setSelectedId(ann.id);
    setDragState({
      id: ann.id,
      mode,
      startX: pt.x,
      startY: pt.y,
      origBox: { x: ann.x, y: ann.y, width: ann.width, height: ann.height },
    });
  }

  return (
    <div
      style={{
        position: "relative",
        width: viewportSize.width || undefined,
        margin: "0 auto",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
      />

      <div
        ref={overlayRef}
        onPointerDown={handleOverlayPointerDown}
        onPointerMove={handleOverlayPointerMove}
        onPointerUp={handleOverlayPointerUp}
        onPointerLeave={handleOverlayPointerUp}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: viewportSize.width,
          height: viewportSize.height,
          cursor:
            activeTool && activeTool !== "select" ? "crosshair" : "default",
        }}
      >
        <input
          ref={buttonImageInputRef}
          type="file"
          accept="image/png,image/jpeg"
          style={{ display: "none" }}
          onChange={handleButtonImageChosen}
        />

        {fieldAnnotations.map((a) => {
          if (a.hidden) return null;

          const ctrl = widgetControlType(a);
          const style = {
            position: "absolute",
            left: a.screen.x,
            top: a.screen.y,
            width: a.screen.width,
            height: a.screen.height,
            textAlign: ["left", "center", "right"][a.textAlignment] || "left",
            outline: a.required ? "1px solid #f59e0b" : "none",
            boxSizing: "border-box",
          };
          const current = fieldValues[a.fieldName]?.value;
          const dateFormat = ctrl === "text" ? getDateFieldFormat(a) : null;

          const fontSizePt =
            fieldValues[a.fieldName]?.fontSizePt ?? defaultFieldFontSizePt(a);
          const displayFontSize = Math.min(28, Math.max(8, fontSizePt * scale));

          function FontSizeStepper() {
            if (focusedFieldId !== a.id) return null;
            return (
              <div
                style={{
                  position: "absolute",
                  left: a.screen.x,
                  top: a.screen.y - 28,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "white",
                  border: "1px solid #2563eb",
                  borderRadius: 6,
                  padding: "2px 6px",
                  fontSize: 11,
                  color: "#111827",
                  boxSizing: "border-box",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    onFontSizeChange(a.fieldName, Math.max(6, fontSizePt - 1))
                  }
                  style={{
                    width: 18,
                    height: 18,
                    lineHeight: "16px",
                    cursor: "pointer",
                  }}
                >
                  −
                </button>
                <span>{Math.round(fontSizePt)}pt</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    onFontSizeChange(a.fieldName, Math.min(48, fontSizePt + 1))
                  }
                  style={{
                    width: 18,
                    height: 18,
                    lineHeight: "16px",
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>
            );
          }

          if (ctrl === "text") {
            if (dateFormat) {
              const raw = toScalar(current ?? a.fieldValue);
              const parsed = parseDateWithPattern(raw, dateFormat);
              const isoValue = parsed ? isoFromDate(parsed) : "";
              return (
                <input
                  key={a.id}
                  type="date"
                  disabled={a.readOnly}
                  title={`Format: ${dateFormat}`}
                  style={{
                    ...style,
                    fontSize: displayFontSize,
                    border: "1px solid #2563eb",
                    background: a.readOnly
                      ? "rgba(0,0,0,0.04)"
                      : "rgba(37,99,235,0.06)",
                    color: "#111827",
                  }}
                  value={isoValue} // ✅ FIX 2: Switched defaultValue -> value
                  onChange={(e) => {
                    if (!e.target.value) {
                      onFieldChange(a.fieldName, "Tx", "");
                      return;
                    }
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    const formatted = formatDateWithPattern(
                      new Date(y, m - 1, d),
                      dateFormat,
                    );
                    onFieldChange(a.fieldName, "Tx", formatted);
                  }}
                />
              );
            }

            // ✅ FIX 3: Controlled input properties
            const fieldValue = toScalar(current ?? a.fieldValue ?? "");
            const commonProps = {
              disabled: a.readOnly,
              maxLength: a.maxLen > 0 ? a.maxLen : undefined,
              value: fieldValue, // Controlled component binding
              onChange: (e) => onFieldChange(a.fieldName, "Tx", e.target.value),
              onFocus: () => setFocusedFieldId(a.id),
              onBlur: () => setFocusedFieldId(null),
              style: {
                ...style,
                fontSize: displayFontSize,
                border: "1px solid #2563eb",
                background: a.readOnly
                  ? "rgba(0,0,0,0.04)"
                  : "rgba(37,99,235,0.06)",
                color: "#111827",
                fontFamily: "inherit",
              },
            };

            return (
              <div key={a.id}>
                {a.multiLine ? (
                  <textarea {...commonProps} />
                ) : (
                  <input type="text" {...commonProps} />
                )}
                <FontSizeStepper />
              </div>
            );
          }

          if (ctrl === "checkbox") {
            const checked =
              current !== undefined
                ? Boolean(current)
                : a.fieldValue === a.exportValue;
            return (
              <input
                key={a.id}
                type="checkbox"
                disabled={a.readOnly}
                style={{
                  ...style,
                  cursor: a.readOnly ? "not-allowed" : "pointer",
                }}
                checked={checked} // ✅ FIX 4: Controlled checked state
                onChange={(e) =>
                  onFieldChange(a.fieldName, "checkbox", e.target.checked)
                }
              />
            );
          }

          if (ctrl === "radio") {
            const checked =
              current !== undefined
                ? current === a.buttonValue
                : a.fieldValue === a.buttonValue;
            return (
              <input
                key={a.id}
                type="radio"
                name={a.fieldName}
                disabled={a.readOnly}
                style={{
                  ...style,
                  cursor: a.readOnly ? "not-allowed" : "pointer",
                }}
                checked={checked} // ✅ FIX 5: Controlled checked state
                onChange={() =>
                  onFieldChange(a.fieldName, "radio", a.buttonValue)
                }
              />
            );
          }

          if (ctrl === "dropdown") {
            return (
              <select
                key={a.id}
                disabled={a.readOnly}
                style={{
                  ...style,
                  fontSize: displayFontSize,
                  border: "1px solid #2563eb",
                  color: "#111827",
                }}
                value={toScalar(current ?? a.fieldValue ?? "")} // ✅ FIX 6: Controlled select value
                onChange={(e) =>
                  onFieldChange(a.fieldName, "dropdown", e.target.value)
                }
              >
                <option value="" disabled>
                  Select...
                </option>
                {(a.options || []).map((opt) => (
                  <option key={opt.exportValue} value={opt.exportValue}>
                    {opt.displayValue}
                  </option>
                ))}
              </select>
            );
          }

          if (ctrl === "listbox") {
            const listVal = Array.isArray(current)
              ? current
              : current
                ? [current]
                : a.fieldValue
                  ? [a.fieldValue]
                  : [];
            return (
              <select
                key={a.id}
                multiple
                disabled={a.readOnly}
                style={{
                  ...style,
                  fontSize: displayFontSize,
                  border: "1px solid #2563eb",
                  color: "#111827",
                }}
                value={listVal} // ✅ FIX 7: Controlled listbox value
                onChange={(e) =>
                  onFieldChange(
                    a.fieldName,
                    "listbox",
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                  )
                }
              >
                {(a.options || []).map((opt) => (
                  <option key={opt.exportValue} value={opt.exportValue}>
                    {opt.displayValue}
                  </option>
                ))}
              </select>
            );
          }

          if (ctrl === "signature") {
            return (
              <div
                key={a.id}
                style={{
                  ...style,
                  border: "1px dashed #9333ea",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "#9333ea",
                  background: "rgba(147,51,234,0.05)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                Sign here (use Draw tool)
              </div>
            );
          }

          if (ctrl === "button") {
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setPendingButtonTarget(a);
                  buttonImageInputRef.current?.click();
                }}
                style={{
                  ...style,
                  border: "1px dashed #2563eb",
                  background: "rgba(37,99,235,0.06)",
                  color: "#2563eb",
                  fontSize: Math.min(11, style.fontSize),
                  cursor: "pointer",
                }}
              >
                Click to add image
              </button>
            );
          }
          return null;
        })}

        {freeAnnotations.map((ann) => (
          <div
            key={ann.id}
            onPointerDown={(e) => startDrag(e, ann, "move")}
            style={{
              position: "absolute",
              left: ann.x,
              top: ann.y,
              width: ann.width,
              height: ann.height,
              outline: selectedId === ann.id ? "2px solid #2563eb" : "none",
              cursor: "move",
            }}
          >
            <AnnotationContent
              ann={ann}
              onUpdateAnnotation={onUpdateAnnotation}
            />
            {selectedId === ann.id && (
              <>
                <div
                  onPointerDown={(e) => startDrag(e, ann, "resize")}
                  style={{
                    position: "absolute",
                    right: -6,
                    bottom: -6,
                    width: 12,
                    height: 12,
                    background: "#2563eb",
                    borderRadius: 3,
                    cursor: "nwse-resize",
                  }}
                />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(ann.id);
                    setSelectedId(null);
                  }}
                  style={{
                    position: "absolute",
                    top: -22,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    fontSize: 12,
                    lineHeight: "20px",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}

        {drawingPath && (
          <svg
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: viewportSize.width,
              height: viewportSize.height,
              pointerEvents: "none",
            }}
          >
            <polyline
              points={drawingPath.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#111827"
              strokeWidth={2.2}
            />
          </svg>
        )}
      </div>
    </div>
  );
}
