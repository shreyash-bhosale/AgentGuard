"""Image Processing and Normalisation Engine for AgentGuard.

Enforces strict defense-in-depth bounds on screenshots and uploaded images:
- Magic bytes verification (PNG, JPEG, WebP)
- 10 MB maximum byte size limit
- 40 megapixel maximum resolution limit
- Decompression bomb protection (PIL MAX_IMAGE_PIXELS limit)
- EXIF / metadata stripping and safe RGB normalization
"""

from dataclasses import dataclass
import io
from typing import Optional
from PIL import Image, ImageOps


# Enforced security limits
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_MEGAPIXELS = 40.0
MAX_PIXELS = int(MAX_MEGAPIXELS * 1_000_000)  # 40,000,000 pixels

# Configure PIL decompression bomb ceiling
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

# Known magic byte signatures
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8\xff"
WEBP_RIFF = b"RIFF"
WEBP_MAGIC = b"WEBP"


class ImageProcessingError(Exception):
    """Raised when an image fails validation or normalisation."""
    pass


@dataclass
class ImageProcessingResult:
    success: bool
    normalized_bytes: Optional[bytes] = None
    width: int = 0
    height: int = 0
    megapixels: float = 0.0
    size_bytes: int = 0
    original_format: str = ""
    error: Optional[str] = None


class ImageProcessor:
    """Validates, sanitizes, and normalizes image bytes."""

    def __init__(
        self,
        max_bytes: int = MAX_IMAGE_BYTES,
        max_pixels: int = MAX_PIXELS,
    ):
        self.max_bytes = max_bytes
        self.max_pixels = max_pixels

    def verify_magic_bytes(self, data: bytes) -> str:
        """Verify file header magic bytes to detect spoofed extensions."""
        if not data or len(data) < 12:
            raise ImageProcessingError("Image payload too small or empty.")

        if data.startswith(PNG_MAGIC):
            return "PNG"
        elif data.startswith(JPEG_MAGIC):
            return "JPEG"
        elif data.startswith(WEBP_RIFF) and data[8:12] == WEBP_MAGIC:
            return "WEBP"
        else:
            raise ImageProcessingError("Unrecognized or disallowed image format (only PNG, JPEG, WebP allowed).")

    def process_image(
        self,
        raw_bytes: bytes,
        target_format: str = "PNG",
    ) -> ImageProcessingResult:
        """Validate, sanitize, and normalize raw image bytes."""
        if not raw_bytes:
            return ImageProcessingResult(
                success=False,
                error="Empty image payload received.",
            )

        # 1. Byte size limit check
        if len(raw_bytes) > self.max_bytes:
            return ImageProcessingResult(
                success=False,
                size_bytes=len(raw_bytes),
                error=f"Image exceeds maximum allowable size of {self.max_bytes / (1024 * 1024):.1f} MB (got {len(raw_bytes)} bytes).",
            )

        # 2. Magic bytes verification
        try:
            detected_fmt = self.verify_magic_bytes(raw_bytes)
        except ImageProcessingError as exc:
            return ImageProcessingResult(
                success=False,
                size_bytes=len(raw_bytes),
                error=str(exc),
            )

        # 3. Decompression and dimension bounds check
        try:
            with Image.open(io.BytesIO(raw_bytes)) as img:
                width, height = img.size
                total_pixels = width * height
                megapixels = round(total_pixels / 1_000_000, 2)

                if total_pixels > self.max_pixels:
                    return ImageProcessingResult(
                        success=False,
                        width=width,
                        height=height,
                        megapixels=megapixels,
                        size_bytes=len(raw_bytes),
                        original_format=detected_fmt,
                        error=f"Image exceeds maximum pixel limit of {self.max_pixels:,} pixels ({megapixels} MP).",
                    )

                # 4. Safe RGB normalization & EXIF stripping
                # Using ImageOps.exif_transpose to correctly orient before stripping metadata
                try:
                    img = ImageOps.exif_transpose(img)
                except Exception:
                    pass

                # Convert to standard RGB to drop unknown palettes, CMYK, or corrupted alpha channels
                rgb_img = img.convert("RGB")

                # Re-encode into clean memory buffer without original metadata/comments/EXIF
                out_buffer = io.BytesIO()
                normalized_format = target_format.upper()
                if normalized_format == "JPEG":
                    rgb_img.save(out_buffer, format="JPEG", quality=85, optimize=True)
                else:
                    rgb_img.save(out_buffer, format="PNG", optimize=True)

                normalized_data = out_buffer.getvalue()

                return ImageProcessingResult(
                    success=True,
                    normalized_bytes=normalized_data,
                    width=width,
                    height=height,
                    megapixels=megapixels,
                    size_bytes=len(normalized_data),
                    original_format=detected_fmt,
                )

        except Image.DecompressionBombError as exc:
            return ImageProcessingResult(
                success=False,
                size_bytes=len(raw_bytes),
                original_format=detected_fmt,
                error=f"Decompression bomb detected and blocked: {exc}",
            )
        except Exception as exc:
            return ImageProcessingResult(
                success=False,
                size_bytes=len(raw_bytes),
                original_format=detected_fmt,
                error=f"Image decoding failed: {exc}",
            )


# Default shared processor instance
default_image_processor = ImageProcessor()
