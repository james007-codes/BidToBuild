from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.priority.features import ComplaintFeatures
from app.priority.learner import learner


router = APIRouter(
    prefix="/api/priority",
    tags=["priority"]
)

Priority = Literal["Low", "Medium", "High", "Critical"]

# How much a label counts: an admin decision is the real answer,
# a rule-based priority is only a hint
SOURCE_WEIGHTS = {"admin": 1.0, "rules": 0.3}


class LabelledComplaint(BaseModel):
    id: str
    features: ComplaintFeatures
    label: Priority
    source: Literal["admin", "rules"] = "rules"


class RetrainRequest(BaseModel):
    complaints: list[LabelledComplaint] = Field(default_factory=list)


@router.post("/predict")
def predict(features: ComplaintFeatures):
    return learner.predict(features)


@router.post("/learn")
def learn(item: LabelledComplaint):
    return learner.learn(item.id, item.features, item.label, SOURCE_WEIGHTS[item.source], item.source)


@router.post("/retrain")
def retrain(request: RetrainRequest):
    return learner.retrain(
        [(c.id, c.features, c.label, SOURCE_WEIGHTS[c.source], c.source) for c in request.complaints]
    )


@router.get("/stats")
def stats():
    return learner.stats()
