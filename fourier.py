import logging
from typing import Optional

import torch
import torch.nn as nn


logger = logging.getLogger(__name__)


def warning_once(message: str):
    if not hasattr(warning_once, "seen"):
        warning_once.seen = set()

    if message not in warning_once.seen:
        logger.warning(message)
        warning_once.seen.add(message)


def input_mapping(x: torch.Tensor, B: Optional[torch.Tensor]) -> torch.Tensor:
    """Apply Fourier feature mapping with a provided frequency matrix."""
    if B is None:
        return x
    x_proj = (2.0 * torch.pi * x) @ B.T
    return torch.cat([torch.sin(x_proj), torch.cos(x_proj)], dim=-1)


class FourierFeatureMapping(nn.Module):
    """Gaussian Fourier feature mapping for low-dimensional continuous inputs."""

    def __init__(
        self,
        input_dims: int,
        scale: float = 1.0,
        mapping_size: Optional[int] = None,
        embed_size: Optional[int] = None,
    ):
        super().__init__()

        assert mapping_size is not None or embed_size is not None, (
            "Either mapping_size or embed_size should be provided"
        )
        assert mapping_size is None or embed_size is None, (
            "Only one of mapping_size or embed_size should be provided"
        )

        if embed_size is not None:
            mapping_size = embed_size // 2

        self.B = nn.Parameter(torch.randn(mapping_size, input_dims) * scale)
        self.mapping_size = mapping_size
        self.embed_size = embed_size
        self.input_dims = input_dims

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.dtype != self.B.dtype:
            warning_once(
                f"Input x and B have different dtypes: {x.dtype} and "
                f"{self.B.dtype}, casting x to {self.B.dtype}"
            )
            x = x.to(self.B.dtype)

        return input_mapping(x, self.B)

    @property
    def output_dims(self) -> int:
        return 2 * self.mapping_size

    def extra_repr(self) -> str:
        return f"input_dims={self.input_dims}, mapping_size={self.mapping_size}"
