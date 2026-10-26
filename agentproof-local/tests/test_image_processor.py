"""Unit tests for ImageProcessor engine and security limits."""

import io
import pytest
from PIL import Image

from agentproof.image_processor import (
    ImageProcessor,
    ImageProcessingError,
    MAX_IMAGE_BYTES,
    MAX_PIXELS,
    default_image_processor,
)


def create_test_image(
    width: int = 100,
    height: int = 100,
    format: str = "PNG",
    color: str = "blue",
) -> bytes:
    """Helper to generate in-memory image bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format=format)
    return buf.getvalue()


def test_process_valid_png():
    raw = create_test_image(120, 80, "PNG", "red")
    res = default_image_processor.process_image(raw)
    assert res.success is True
    assert res.original_format == "PNG"
    assert res.width == 120
    assert res.height == 80
    assert res.size_bytes > 0
    assert res.normalized_bytes is not None


def test_process_valid_jpeg():
    raw = create_test_image(200, 150, "JPEG", "green")
    res = default_image_processor.process_image(raw)
    assert res.success is True
    assert res.original_format == "JPEG"
    assert res.width == 200
    assert res.height == 150


def test_process_valid_webp():
    raw = create_test_image(150, 150, "WEBP", "yellow")
    res = default_image_processor.process_image(raw)
    assert res.success is True
    assert res.original_format == "WEBP"


def test_magic_byte_mismatch_rejected():
    # Plain text file disguised as PNG
    fake_png = b"This is not a real PNG image content."
    res = default_image_processor.process_image(fake_png)
    assert res.success is False
    assert "Unrecognized or disallowed image format" in res.error


def test_empty_image_rejected():
    res = default_image_processor.process_image(b"")
    assert res.success is False
    assert "Empty image payload" in res.error


def test_oversized_byte_limit_rejected():
    processor = ImageProcessor(max_bytes=400)  # Low 400B limit for testing
    raw = create_test_image(200, 200, "PNG")
    assert len(raw) > 400
    res = processor.process_image(raw)
    assert res.success is False
    assert "exceeds maximum allowable size" in res.error


def test_oversized_megapixels_rejected():
    # Low pixel limit of 10,000 pixels (e.g. 100x100 is max)
    processor = ImageProcessor(max_pixels=10_000)
    raw = create_test_image(150, 150, "PNG")  # 22,500 pixels
    res = processor.process_image(raw)
    assert res.success is False
    assert "exceeds maximum pixel limit" in res.error


def test_rgba_converted_to_rgb():
    buf = io.BytesIO()
    rgba_img = Image.new("RGBA", (50, 50), color=(255, 0, 0, 128))
    rgba_img.save(buf, format="PNG")
    raw = buf.getvalue()

    res = default_image_processor.process_image(raw)
    assert res.success is True

    # Check decoded result is RGB
    with Image.open(io.BytesIO(res.normalized_bytes)) as out_img:
        assert out_img.mode == "RGB"
