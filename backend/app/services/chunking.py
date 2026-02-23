"""Recursive text splitter using tiktoken for token counting."""

from dataclasses import dataclass

import tiktoken

from app.config import get_settings

settings = get_settings()


@dataclass
class Chunk:
    """A text chunk with metadata."""

    content: str
    chunk_index: int
    token_count: int


def _count_tokens(text: str, encoding: tiktoken.Encoding) -> int:
    """Count the number of tokens in a text."""
    return len(encoding.encode(text))


def _split_text(
    text: str,
    separators: list[str],
    chunk_size: int,
    encoding: tiktoken.Encoding,
) -> list[str]:
    """Recursively split text by separators until chunks are within size limit."""
    if not text.strip():
        return []

    # If the text fits within chunk size, return it
    if _count_tokens(text, encoding) <= chunk_size:
        return [text.strip()] if text.strip() else []

    # Try each separator
    for i, separator in enumerate(separators):
        if separator in text:
            parts = text.split(separator)
            remaining_separators = separators[i + 1 :] if i + 1 < len(separators) else [" "]

            chunks: list[str] = []
            current = ""

            for part in parts:
                candidate = (current + separator + part) if current else part

                if _count_tokens(candidate, encoding) <= chunk_size:
                    current = candidate
                else:
                    if current.strip():
                        chunks.append(current.strip())
                    # If part itself is too large, recursively split it
                    if _count_tokens(part, encoding) > chunk_size:
                        sub_chunks = _split_text(part, remaining_separators, chunk_size, encoding)
                        chunks.extend(sub_chunks)
                        current = ""
                    else:
                        current = part

            if current.strip():
                chunks.append(current.strip())

            return chunks

    # Fallback: split by characters
    words = text.split(" ")
    chunks = []
    current = ""
    for word in words:
        candidate = (current + " " + word) if current else word
        if _count_tokens(candidate, encoding) <= chunk_size:
            current = candidate
        else:
            if current.strip():
                chunks.append(current.strip())
            current = word

    if current.strip():
        chunks.append(current.strip())

    return chunks


def _apply_overlap(
    raw_chunks: list[str],
    chunk_overlap: int,
    encoding: tiktoken.Encoding,
) -> list[str]:
    """Apply token-based overlap by prepending tail tokens of the previous chunk."""
    if chunk_overlap <= 0 or len(raw_chunks) <= 1:
        return raw_chunks

    result = [raw_chunks[0]]
    for i in range(1, len(raw_chunks)):
        prev_tokens = encoding.encode(raw_chunks[i - 1])
        if len(prev_tokens) > chunk_overlap:
            overlap_tokens = prev_tokens[-chunk_overlap:]
        else:
            overlap_tokens = prev_tokens
        overlap_text = encoding.decode(overlap_tokens).strip()
        if overlap_text:
            result.append(overlap_text + " " + raw_chunks[i])
        else:
            result.append(raw_chunks[i])

    return result


def split_text(
    text: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Chunk]:
    """Split text into chunks using recursive splitting.

    Args:
        text: The text to split.
        chunk_size: Max tokens per chunk (defaults to settings.CHUNK_SIZE).
        chunk_overlap: Overlap in tokens between chunks (defaults to settings.CHUNK_OVERLAP).

    Returns:
        List of Chunk objects.
    """
    if chunk_size is None:
        chunk_size = settings.CHUNK_SIZE
    if chunk_overlap is None:
        chunk_overlap = settings.CHUNK_OVERLAP

    encoding = tiktoken.encoding_for_model("gpt-4o")

    separators = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "]
    raw_chunks = _split_text(text, separators, chunk_size, encoding)

    overlapped_chunks = _apply_overlap(raw_chunks, chunk_overlap, encoding)

    chunks: list[Chunk] = []
    for idx, content in enumerate(overlapped_chunks):
        token_count = _count_tokens(content, encoding)
        chunks.append(
            Chunk(
                content=content,
                chunk_index=idx,
                token_count=token_count,
            )
        )

    return chunks
