from __future__ import annotations

import io
import re

from PIL import Image, ImageEnhance, ImageOps
import pytesseract


def _preprocess(image: Image.Image) -> Image.Image:
    width, height = image.size
    left = int(width * 0.30)
    right = int(width * 0.70)
    top = int(height * 0.70)
    bottom = height

    cropped = image.crop((left, top, right, bottom))
    gray = ImageOps.grayscale(cropped)
    contrast = ImageEnhance.Contrast(gray).enhance(2.6)
    sharpen = ImageEnhance.Sharpness(contrast).enhance(1.8)
    return sharpen


def parse_score_from_image(image_bytes: bytes) -> tuple[float | None, float]:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    processed = _preprocess(image)

    data = pytesseract.image_to_data(
        processed,
        output_type=pytesseract.Output.DICT,
        config="--psm 7 -c tessedit_char_whitelist=0123456789.",
    )

    tokens: list[tuple[str, float]] = []
    for text, conf in zip(data.get("text", []), data.get("conf", []), strict=False):
        token = (text or "").strip()
        if not token:
            continue
        try:
            confidence = float(conf)
        except (TypeError, ValueError):
            confidence = 0.0
        if confidence < 0:
            continue
        if not re.fullmatch(r"\d+(?:\.\d+)?", token):
            continue
        tokens.append((token, confidence))

    if not tokens:
        return None, 0.0

    token, confidence = max(tokens, key=lambda pair: pair[1])
    try:
        score = float(token)
    except ValueError:
        return None, confidence

    if confidence < 60:
        return None, confidence

    return score, confidence


def _clean_token(raw: str) -> str:
    token = (raw or "").strip()
    token = re.sub(r"[^A-Za-z0-9._-]", "", token)
    return token


def parse_scoreboard_entries(image_bytes: bytes) -> list[tuple[str, float, float]]:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    gray = ImageOps.grayscale(image)
    contrast = ImageEnhance.Contrast(gray).enhance(2.2)
    sharpen = ImageEnhance.Sharpness(contrast).enhance(1.6)

    data = pytesseract.image_to_data(
        sharpen,
        output_type=pytesseract.Output.DICT,
        config="--psm 6",
    )

    lines: dict[tuple[int, int, int], list[tuple[str, float]]] = {}
    count = len(data.get("text", []))
    for i in range(count):
        text = _clean_token(data.get("text", [""])[i])
        if not text:
            continue
        try:
            conf = float(data.get("conf", ["0"])[i])
        except (TypeError, ValueError):
            conf = 0.0
        if conf < 20:
            continue

        key = (
            int(data.get("block_num", [0])[i] or 0),
            int(data.get("par_num", [0])[i] or 0),
            int(data.get("line_num", [0])[i] or 0),
        )
        lines.setdefault(key, []).append((text, conf))

    extracted: list[tuple[str, float, float]] = []
    for words in lines.values():
        handle = ""
        handle_conf = 0.0
        score_token = ""
        score_conf = 0.0

        for token, conf in words:
            if re.fullmatch(r"-?\d+(?:\.\d+)?", token):
                if conf >= score_conf:
                    score_token = token
                    score_conf = conf
            elif re.search(r"[A-Za-z]", token):
                if not handle or conf > handle_conf:
                    handle = token
                    handle_conf = conf

        if not handle or not score_token:
            continue

        try:
            score = float(score_token)
        except ValueError:
            continue

        confidence = round((handle_conf + score_conf) / 2, 2)
        extracted.append((handle.lower(), score, confidence))

    return extracted
