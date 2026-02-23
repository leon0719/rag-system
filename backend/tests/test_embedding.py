"""Embedding service tests (mock OpenAI)."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.embedding import embed_text, embed_texts


@pytest.mark.asyncio
async def test_embed_text():
    """embed_text should return a list of floats."""
    fake_embedding = [0.1] * 1536

    mock_data_item = MagicMock()
    mock_data_item.embedding = fake_embedding
    mock_response = MagicMock()
    mock_response.data = [mock_data_item]

    mock_client = AsyncMock()
    mock_client.embeddings.create = AsyncMock(return_value=mock_response)

    with patch("app.services.embedding.get_openai_client", return_value=mock_client):
        result = await embed_text("Hello world")
        assert isinstance(result, list)
        assert len(result) == 1536
        mock_client.embeddings.create.assert_called_once()


@pytest.mark.asyncio
async def test_embed_texts_batch():
    """embed_texts should handle batching correctly."""
    fake_embedding = [0.2] * 1536

    mock_data_item = MagicMock()
    mock_data_item.embedding = fake_embedding

    mock_client = AsyncMock()

    # For 150 texts with batch_size=100, we need 2 API calls
    mock_response_1 = MagicMock()
    mock_response_1.data = [mock_data_item] * 100
    mock_response_2 = MagicMock()
    mock_response_2.data = [mock_data_item] * 50

    mock_client.embeddings.create = AsyncMock(side_effect=[mock_response_1, mock_response_2])

    with patch("app.services.embedding.get_openai_client", return_value=mock_client):
        texts = [f"Text {i}" for i in range(150)]
        result = await embed_texts(texts)
        assert len(result) == 150
        assert mock_client.embeddings.create.call_count == 2
