# backend/main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import re
import shutil
import subprocess
import tempfile
import os
import logging

app = FastAPI(title="Universal File Utilities API")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn.error")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def sanitize_header_filename(filename: str) -> str:
    clean_name = re.sub(r'[/\\?%*:|"<>\s,;]+', '_', filename)
    return clean_name


# --- Ghostscript binary discovery (this is the part that was silently failing) ---
_GS_BINARY_CANDIDATES = ["gs", "gswin64c", "gswin32c"]
_GS_BINARY_CACHE = None


def get_ghostscript_binary():
    """
    Finds the correct Ghostscript executable name for the current OS.
    On Linux/Mac it's usually 'gs'. On Windows it's 'gswin64c' or 'gswin32c'.
    Returns None if Ghostscript isn't installed / not on PATH at all.
    """
    global _GS_BINARY_CACHE
    if _GS_BINARY_CACHE is not None:
        return _GS_BINARY_CACHE
    for candidate in _GS_BINARY_CANDIDATES:
        if shutil.which(candidate):
            _GS_BINARY_CACHE = candidate
            logger.info(f"Ghostscript found: using binary '{candidate}'")
            return candidate
    logger.error(
        "Ghostscript binary not found on PATH. Tried: %s. "
        "Install it (see instructions) or PDF compression will not work.",
        _GS_BINARY_CANDIDATES,
    )
    return None


@app.get("/")
def read_root():
    gs = get_ghostscript_binary()
    return {
        "status": "Backend Server Running Online",
        "ghostscript_available": gs is not None,
        "ghostscript_binary": gs,
    }


# --- 1. SMART IMAGE COMPRESSION ENDPOINT (unchanged, already working) ---
@app.post("/compress-image")
async def compress_image(
    file: UploadFile = File(...),
    max_size_mb: float = Form(1.0)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        file_bytes = await file.read()
        target_bytes_limit = max_size_mb * 1024 * 1024
        safe_name = sanitize_header_filename(file.filename)

        if len(file_bytes) <= target_bytes_limit:
            return Response(
                content=file_bytes,
                media_type=file.content_type,
                headers={"Content-Disposition": f'attachment; filename="optimized_{safe_name}"'}
            )

        img = Image.open(io.BytesIO(file_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        quality = 90
        output_bytes = b""

        while quality >= 15:
            output_buffer = io.BytesIO()
            img.save(output_buffer, format="JPEG", quality=quality, optimize=True)
            output_bytes = output_buffer.getvalue()

            if len(output_bytes) <= target_bytes_limit:
                break
            quality -= 5

        scale_ratio = 0.90
        original_width, original_height = img.size

        while len(output_bytes) > target_bytes_limit and scale_ratio >= 0.10:
            new_width = int(original_width * scale_ratio)
            new_height = int(original_height * scale_ratio)

            if new_width < 10 or new_height < 10:
                break

            resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            output_buffer = io.BytesIO()
            resized_img.save(output_buffer, format="JPEG", quality=15, optimize=True)
            output_bytes = output_buffer.getvalue()

            scale_ratio -= 0.10

        return Response(
            content=output_bytes,
            media_type="image/jpeg",
            headers={"Content-Disposition": f'attachment; filename="target_{max_size_mb}mb_{safe_name}.jpg"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image size compression failed: {str(e)}")


# --- 2. PDF COMPRESSION ENDPOINT (Ghostscript-based, with proper error visibility) ---
@app.post("/compress-pdf")
async def compress_pdf(file: UploadFile = File(...), max_size_mb: float = Form(1.0)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF.")

    gs_binary = get_ghostscript_binary()
    if gs_binary is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Ghostscript is not installed or not found on PATH. "
                "Install it and restart the backend. "
                "Windows: https://ghostscript.com/releases/gsdnld.html (adds gswin64c.exe). "
                "Mac: `brew install ghostscript`. "
                "Linux: `sudo apt-get install ghostscript`."
            ),
        )

    file_bytes = await file.read()
    target_bytes = max_size_mb * 1024 * 1024
    safe_name = sanitize_header_filename(file.filename)

    if len(file_bytes) <= target_bytes:
        return Response(
            content=file_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="optimized_{safe_name}"'},
        )

    final_bytes = file_bytes
    gs_errors = []

    # Graduated DPI ladder instead of a hard /ebook -> /screen jump.
    # We stop at the FIRST (highest-quality) resolution that satisfies the target,
    # so a lenient target only gets lightly compressed instead of maxed out.
    dpi_ladder = [150, 130, 110, 90, 70, 55, 45, 35, 25]

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.pdf")
        with open(input_path, "wb") as f:
            f.write(file_bytes)

        for dpi in dpi_ladder:
            output_path = os.path.join(tmpdir, f"out_{dpi}dpi.pdf")
            try:
                result = subprocess.run(
                    [
                        gs_binary,
                        "-sDEVICE=pdfwrite",
                        "-dCompatibilityLevel=1.4",
                        "-dPDFSETTINGS=/printer",  # high-quality base; downsampling below controls actual size
                        "-dNOPAUSE",
                        "-dBATCH",
                        "-dSAFER",
                        "-dDetectDuplicateImages=true",
                        "-dCompressFonts=true",
                        "-dDownsampleColorImages=true",
                        "-dDownsampleGrayImages=true",
                        "-dDownsampleMonoImages=true",
                        "-dColorImageDownsampleType=/Bicubic",
                        "-dGrayImageDownsampleType=/Bicubic",
                        "-dMonoImageDownsampleType=/Bicubic",
                        f"-dColorImageResolution={dpi}",
                        f"-dGrayImageResolution={dpi}",
                        f"-dMonoImageResolution={dpi * 2}",  # scanned text needs higher dpi to stay readable
                        f"-sOutputFile={output_path}",
                        input_path,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=120,
                )
            except FileNotFoundError as e:
                gs_errors.append(f"{dpi}dpi: binary not found ({e})")
                continue
            except subprocess.TimeoutExpired:
                gs_errors.append(f"{dpi}dpi: timed out after 120s")
                continue

            if result.returncode != 0:
                gs_errors.append(f"{dpi}dpi: exit code {result.returncode} - {result.stderr.strip()[:500]}")
                logger.error("Ghostscript failed at %sdpi: %s", dpi, result.stderr)
                continue

            if not os.path.exists(output_path):
                gs_errors.append(f"{dpi}dpi: no output file produced")
                continue

            with open(output_path, "rb") as f:
                candidate = f.read()

            # Keep the best (smallest so far) result in case none hit target
            if len(candidate) < len(final_bytes):
                final_bytes = candidate

            # Stop at the FIRST (highest-quality) dpi step that meets the target
            if len(candidate) <= target_bytes:
                final_bytes = candidate
                break

    # If Ghostscript ran but we never actually shrank the file, tell the truth instead
    # of quietly shipping back the original (this was the "not reducing size" symptom).
    if final_bytes is file_bytes or len(final_bytes) >= len(file_bytes):
        logger.warning(
            "PDF compression did not reduce size for %s. Ghostscript errors: %s",
            safe_name, gs_errors,
        )

    return Response(
        content=final_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="target_{max_size_mb}mb_{safe_name}"',
            "X-Compression-Note": "no-reduction-achieved" if len(final_bytes) >= len(file_bytes) else "ok",
        },
    )

# backend/main.py (Append this to the bottom of your file)

# --- 3. IMAGE RESIZER & FORMAT CONVERTER ENDPOINT ---
@app.post("/resize-image")
async def resize_image(
    file: UploadFile = File(...),
    width: int = Form(...),          # Target Width in pixels
    height: int = Form(...),         # Target Height in pixels
    target_format: str = Form(...)   # 'JPEG', 'PNG', or 'WEBP'
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
        
    try:
        file_bytes = await file.read()
        img = Image.open(io.BytesIO(file_bytes))
        
        # Enforce RGB conversion if saving transparency layers to JPEG
        if target_format == "JPEG" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # Execute pixel dimension resizing
        resized_img = img.resize((width, height), Image.Resampling.LANCZOS)
        
        output_buffer = io.BytesIO()
        # Save file with proper optimizations based on target extension format
        resized_img.save(output_buffer, format=target_format, quality=90, optimize=True)
        
        # Determine content extension tags
        extension_map = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
        ext = extension_map.get(target_format, "jpg")
        
        base_name = file.filename.rsplit('.', 1)[0]
        safe_name = sanitize_header_filename(base_name)
        
        media_type_map = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
        
        return Response(
            content=output_buffer.getvalue(),
            media_type=media_type_map.get(target_format, "image/jpeg"),
            headers={"Content-Disposition": f'attachment; filename="resized_{width}x{height}_{safe_name}.{ext}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image resize calculation failed: {str(e)}")

# backend/main.py (Append this to the bottom of your file)

# --- 4. IMAGE CROPPER & ROTATOR ENDPOINT ---
@app.post("/crop-image")
async def crop_image(
    file: UploadFile = File(...),
    left: int = Form(...),
    top: int = Form(...),
    right: int = Form(...),
    bottom: int = Form(...),
    rotation: int = Form(0)  # Rotation angle: 0, 90, 180, 270
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
        
    try:
        file_bytes = await file.read()
        img = Image.open(io.BytesIO(file_bytes))
        original_format = img.format or "JPEG"
        
        # Apply rotation first if requested
        if rotation in (90, 180, 270):
            # Rotate counter-clockwise to match typical web UI standards
            if rotation == 90:
                img = img.transpose(Image.Transpose.ROTATE_90)
            elif rotation == 180:
                img = img.transpose(Image.Transpose.ROTATE_180)
            elif rotation == 270:
                img = img.transpose(Image.Transpose.ROTATE_270)
        
        # Execute crop bounding box alignment mapping
        cropped_img = img.crop((left, top, right, bottom))
        
        output_buffer = io.BytesIO()
        cropped_img.save(output_buffer, format=original_format, quality=95, optimize=True)
        
        base_name = file.filename.rsplit('.', 1)[0]
        safe_name = sanitize_header_filename(base_name)
        ext = "jpg" if original_format == "JPEG" else original_format.lower()
        
        return Response(
            content=output_buffer.getvalue(),
            media_type=file.content_type,
            headers={"Content-Disposition": f'attachment; filename="cropped_{safe_name}.{ext}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image cropping transformation failed: {str(e)}")

# backend/main.py (Append to the bottom of your file)
# backend/main.py (Replace the analyze and fill form endpoints)
import base64,json,fitz

# backend/main.py (Replace the /analyze-pdf-canvas endpoint block)
# backend/main.py (Replace your PDF canvas edit endpoints)

@app.post("/analyze-pdf-canvas")
async def analyze_pdf_canvas(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Must be a PDF document.")
    try:
        file_bytes = await file.read()
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        parsed_pages = []
        
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            img_bytes = pix.tobytes("jpeg")
            base64_img = base64.b64encode(img_bytes).decode("utf-8")
            
            p_width = page.rect.width
            p_height = page.rect.height
            
            fields = []
            widgets = page.widgets()
            if widgets:
                for widget in widgets:
                    # STRICT TYPE SCANNING RULES
                    w_type = widget.field_type
                    field_mapping = "text"
                    options = []
                    
                    if w_type == 2:
                        field_mapping = "checkbox"
                    elif w_type == 5:
                        field_mapping = "dropdown"
                        options = [opt[0] if isinstance(opt, tuple) else opt for opt in getattr(widget, 'choice_values', [])]
                    
                    # Inspect precise system structural flag keywords instead of guessing names blindly
                    field_name_lower = (widget.field_name or "").lower()
                    
                    # Explicit context rules for specific overrides
                    if "dob" in field_name_lower or "birth" in field_name_lower or "expiry" in field_name_lower:
                        field_mapping = "date"
                    elif "image" in field_name_lower or "photo" in field_name_lower or "sign" in field_name_lower:
                        field_mapping = "image"

                    fields.append({
                        "name": widget.field_name,
                        "type": field_mapping,
                        "value": widget.field_value or "",
                        "options": options,
                        "style": {
                            "left": f"{(widget.rect.x0 / p_width) * 100}%",
                            "top": f"{(widget.rect.y0 / p_height) * 100}%",
                            "width": f"{((widget.rect.x1 - widget.rect.x0) / p_width) * 100}%",
                            "height": f"{((widget.rect.y1 - widget.rect.y0) / p_height) * 100}%"
                        }
                    })
                    
            parsed_pages.append({
                "page_num": page_idx + 1,
                "background_data": f"data:image/jpeg;base64,{base64_img}",
                "width": p_width,
                "height": p_height,
                "fields": fields
            })
            
        doc.close()
        return {"pages": parsed_pages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visual canvas parse failed: {str(e)}")


@app.post("/compile-pdf-canvas")
async def compile_pdf_canvas(
    file: UploadFile = File(...),
    form_data_json: str = Form(...),
    annotations_json: str = Form(...)
):
    try:
        file_bytes = await file.read()
        native_data = json.loads(form_data_json)
        custom_annotations = json.loads(annotations_json)
        
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        # 1. Update form entries
        for page in doc:
            for widget in page.widgets():
                if widget.field_name in native_data:
                    val = native_data[widget.field_name]
                    if widget.field_type == 2:
                        widget.field_value = "Yes" if val is True or val == "Yes" else "Off"
                    else:
                        widget.field_value = str(val)
                    widget.update()
                    
        # 2. Burn Custom Vector Overlays Safely
        for ann in custom_annotations:
            page_num = ann.get("page", 1) - 1
            if page_num < 0 or page_num >= len(doc):
                continue
                
            page = doc[page_num]
            p_width = page.rect.width
            p_height = page.rect.height
            
            x = (ann["left_pct"] / 100.0) * p_width
            y = (ann["top_pct"] / 100.0) * p_height
            
            # Safe Fallback Strategy: Burn standard ASCII text lines instead of binary symbol maps
            text_str = str(ann.get("content", ""))
            if text_str == "✓":
                text_str = "[X]"  # Standard cross-box marker for crystal-clear cross-platform printing
            elif text_str == "✗":
                text_str = "[O]"
                
            page.insert_text(fitz.Point(x, y + 10), text_str, fontsize=12, color=(0, 0, 0))
            
        output_buffer = io.BytesIO()
        doc.save(output_buffer, garbage=3, deflate=True)
        doc.close()
        return Response(content=output_buffer.getvalue(), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Canvas compile failure: {str(e)}")
@app.post("/fill-pdf-form")
async def fill_pdf_form(
    file: UploadFile = File(...),
    form_data_json: str = Form(...)  # JSON string mapping field keys to values
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF document.")
        
    try:
        file_bytes = await file.read()
        data_map = json.loads(form_data_json)
        
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        # Loop over form widgets across all pages and inject incoming mappings
        for page in doc:
            for widget in page.widgets():
                field_name = widget.field_name
                if field_name in data_map:
                    val = data_map[field_name]
                    
                    # Handle boolean check mappings securely
                    if widget.field_type == 2: # Checkbox
                        widget.field_value = "Yes" if val is True or val == "Yes" else "Off"
                    else:
                        widget.field_value = str(val)
                        
                    widget.update()
        
        output_buffer = io.BytesIO()
        # Save structural adjustments using clean layout matrices
        doc.save(output_buffer, garbage=3, deflate=True, clean=True)
        doc.close()
        
        safe_name = sanitize_header_filename(file.filename)
        return Response(
            content=output_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="filled_{safe_name}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF field injection engine failed: {str(e)}")