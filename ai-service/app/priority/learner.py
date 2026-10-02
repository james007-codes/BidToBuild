"""
Online learner for complaint priority.

Every labelled complaint is kept in a replay buffer on disk. When a new label
arrives, the model takes a few gradient steps on that complaint mixed with a
random sample of older ones, so it adapts to new data without forgetting what
it learned before.

Before learning from a complaint, the model's guess for it is checked against
the label. That running "predicted before it saw the answer" accuracy is the
honest measure of whether the model is getting better.
"""
import json
import os
import random
import threading
from collections import deque
from pathlib import Path

import torch
import torch.nn.functional as F

from app.priority.features import PRIORITIES, ComplaintFeatures, cat_ids, numeric, text_ids
from app.priority.model import PriorityNet


MODEL_DIR = Path(os.getenv("PRIORITY_MODEL_DIR", Path(__file__).resolve().parents[2] / "priority_model"))

# Below this many labelled complaints, predictions are flagged as not ready
MIN_EXAMPLES = 20
ONLINE_STEPS = 4
REPLAY_SAMPLE = 31
RETRAIN_EPOCHS = 40
BATCH_SIZE = 32
LR = 3e-3
RECENT_WINDOW = 100


def _batch(items: list[ComplaintFeatures]):
    text, text_off, cat, cat_off, nums = [], [], [], [], []
    for c in items:
        text_off.append(len(text))
        text.extend(text_ids(c))
        cat_off.append(len(cat))
        cat.extend(cat_ids(c))
        nums.append(numeric(c))
    return (
        torch.tensor(text, dtype=torch.long),
        torch.tensor(text_off, dtype=torch.long),
        torch.tensor(cat, dtype=torch.long),
        torch.tensor(cat_off, dtype=torch.long),
        torch.tensor(nums, dtype=torch.float32),
    )


class PriorityLearner:
    def __init__(self, model_dir: Path = MODEL_DIR):
        self.dir = Path(model_dir)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()

        # id -> {"features": {...}, "label": "High", "weight": 1.0, "source": "admin"}
        self.examples: dict[str, dict] = {}
        self.recent = deque(maxlen=RECENT_WINDOW)  # (correct: bool, source: str)
        self.updates = 0
        self._load()

    # ---------- persistence ----------

    def _new_model(self):
        self.model = PriorityNet()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=LR)

    def _load(self):
        self._new_model()
        buffer_path, ckpt_path = self.dir / "examples.json", self.dir / "model.pt"
        if buffer_path.exists():
            self.examples = json.loads(buffer_path.read_text(encoding="utf-8"))
        if ckpt_path.exists():
            ckpt = torch.load(ckpt_path, weights_only=False)
            self.model.load_state_dict(ckpt["model"])
            self.optimizer.load_state_dict(ckpt["optimizer"])
            self.recent = deque(ckpt.get("recent", []), maxlen=RECENT_WINDOW)
            self.updates = ckpt.get("updates", 0)

    def _save(self):
        tmp = self.dir / "examples.json.tmp"
        tmp.write_text(json.dumps(self.examples), encoding="utf-8")
        tmp.replace(self.dir / "examples.json")
        torch.save(
            {
                "model": self.model.state_dict(),
                "optimizer": self.optimizer.state_dict(),
                "recent": list(self.recent),
                "updates": self.updates,
            },
            self.dir / "model.pt",
        )

    # ---------- training ----------

    def _step(self, rows: list[dict]):
        feats = [ComplaintFeatures(**r["features"]) for r in rows]
        labels = torch.tensor([PRIORITIES.index(r["label"]) for r in rows])
        weights = torch.tensor([r["weight"] for r in rows], dtype=torch.float32)

        self.model.train()
        logits = self.model(*_batch(feats))
        loss = (F.cross_entropy(logits, labels, reduction="none") * weights).sum() / weights.sum()
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        return loss.item()

    def _predict(self, c: ComplaintFeatures) -> dict:
        self.model.eval()
        with torch.no_grad():
            probs = F.softmax(self.model(*_batch([c])), dim=1)[0].tolist()
        best = max(range(len(PRIORITIES)), key=lambda i: probs[i])
        return {
            "priority": PRIORITIES[best],
            "confidence": round(probs[best], 4),
            "probabilities": {p: round(probs[i], 4) for i, p in enumerate(PRIORITIES)},
            "ready": len(self.examples) >= MIN_EXAMPLES,
            "examplesSeen": len(self.examples),
        }

    # ---------- public API ----------

    def predict(self, c: ComplaintFeatures) -> dict:
        with self.lock:
            return self._predict(c)

    def learn(self, complaint_id: str, c: ComplaintFeatures, label: str, weight: float, source: str) -> dict:
        with self.lock:
            # Score the guess before it sees the answer
            before = self._predict(c)
            correct = before["priority"] == label
            self.recent.append((correct, source))

            row = {"features": c.model_dump(), "label": label, "weight": weight, "source": source}
            existing = self.examples.get(complaint_id)
            # An admin label is never downgraded back to a rule label
            if not (existing and existing["weight"] > weight):
                self.examples[complaint_id] = row

            others = [v for k, v in self.examples.items() if k != complaint_id]
            for _ in range(ONLINE_STEPS):
                replay = random.sample(others, min(REPLAY_SAMPLE, len(others)))
                self._step([self.examples[complaint_id], *replay])

            self.updates += 1
            self._save()
            return {"predictedBefore": before["priority"], "correct": correct, **self._stats()}

    def retrain(self, rows: list[tuple[str, ComplaintFeatures, str, float, str]]) -> dict:
        """Rebuild from scratch on a full set of labelled complaints."""
        with self.lock:
            self.examples = {
                cid: {"features": c.model_dump(), "label": label, "weight": weight, "source": source}
                for cid, c, label, weight, source in rows
            }
            self._new_model()
            data = list(self.examples.values())
            for _ in range(RETRAIN_EPOCHS if data else 0):
                random.shuffle(data)
                for i in range(0, len(data), BATCH_SIZE):
                    self._step(data[i : i + BATCH_SIZE])

            # Training accuracy only; the live "recent" accuracy restarts from here
            self.model.eval()
            fit = sum(self._predict(ComplaintFeatures(**r["features"]))["priority"] == r["label"] for r in data)
            self.recent.clear()
            self.updates = 0
            self._save()
            return {**self._stats(), "trainingAccuracy": round(fit / len(data), 4) if data else None}

    def _stats(self) -> dict:
        recent = list(self.recent)
        admin = [ok for ok, src in recent if src == "admin"]
        return {
            "examplesSeen": len(self.examples),
            "adminLabels": sum(1 for r in self.examples.values() if r["source"] == "admin"),
            "ready": len(self.examples) >= MIN_EXAMPLES,
            "onlineUpdates": self.updates,
            # Accuracy of guesses made before seeing each label, over the last RECENT_WINDOW labels
            "recentAccuracy": round(sum(ok for ok, _ in recent) / len(recent), 4) if recent else None,
            "recentAdminAccuracy": round(sum(admin) / len(admin), 4) if admin else None,
            "recentWindow": len(recent),
        }

    def stats(self) -> dict:
        with self.lock:
            return self._stats()


learner = PriorityLearner()
