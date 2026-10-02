"""
Turns a complaint into model inputs.

Words and categories are hashed into fixed-size buckets, so new flairs, rooms
or vocabulary never need a vocabulary rebuild. crc32 is used instead of
Python's hash() because hash() is randomised per process and would scramble
a saved model on restart.
"""
import math
import re
import zlib

from pydantic import BaseModel


PRIORITIES = ["Low", "Medium", "High", "Critical"]

TEXT_BUCKETS = 2 ** 16
CAT_BUCKETS = 2 ** 12
NUM_FEATURES = 3

_TOKEN_RE = re.compile(r"[a-z0-9]+")


class ComplaintFeatures(BaseModel):
    title: str = ""
    description: str = ""
    flair: str
    flairGroup: str = ""
    roomType: str = ""
    buildingId: str = ""
    reporterType: str = ""
    # Earlier reports of the same flair in this room / across campus
    roomRecentCount: int = 0
    campusRecentCount: int = 0


def _bucket(token: str, size: int) -> int:
    return zlib.crc32(token.encode("utf-8")) % size


def text_ids(c: ComplaintFeatures) -> list[int]:
    words = _TOKEN_RE.findall(f"{c.title} {c.description}".lower())
    # Title words get their own ids so "sparking" in the title can weigh more
    title_words = _TOKEN_RE.findall(c.title.lower())
    tokens = words + [f"{a}_{b}" for a, b in zip(words, words[1:])] + [f"t:{w}" for w in title_words]
    return [_bucket(t, TEXT_BUCKETS) for t in tokens]


def cat_ids(c: ComplaintFeatures) -> list[int]:
    fields = {
        "flair": c.flair,
        "group": c.flairGroup,
        "room": c.roomType,
        "building": c.buildingId,
        "reporter": c.reporterType,
    }
    return [_bucket(f"{k}={v}", CAT_BUCKETS) for k, v in fields.items() if v]


def numeric(c: ComplaintFeatures) -> list[float]:
    n_words = len(_TOKEN_RE.findall(c.description))
    return [
        math.log1p(max(c.roomRecentCount, 0)),
        math.log1p(max(c.campusRecentCount, 0)),
        math.log1p(n_words) / 5,
    ]
