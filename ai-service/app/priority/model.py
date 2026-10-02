"""
PriorityNet: a small fastText-style network.

    text tokens  -> EmbeddingBag (mean) --\
    categories   -> EmbeddingBag (mean) ---+-> MLP -> Low / Medium / High / Critical
    counts       -----------------------/
"""
import torch
from torch import nn

from app.priority.features import CAT_BUCKETS, NUM_FEATURES, PRIORITIES, TEXT_BUCKETS


class PriorityNet(nn.Module):
    def __init__(self, dim: int = 48, hidden: int = 64):
        super().__init__()
        self.text = nn.EmbeddingBag(TEXT_BUCKETS, dim, mode="mean")
        self.cat = nn.EmbeddingBag(CAT_BUCKETS, dim, mode="mean")
        self.head = nn.Sequential(
            nn.Linear(2 * dim + NUM_FEATURES, hidden),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden, len(PRIORITIES)),
        )

    def forward(self, text_ids, text_offsets, cat_ids, cat_offsets, nums):
        x = torch.cat(
            [self.text(text_ids, text_offsets), self.cat(cat_ids, cat_offsets), nums],
            dim=1,
        )
        return self.head(x)
