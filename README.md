Backend port - 5000
frontend - 5173
ai-serivce - 8000

ai-service:
uv sync
uv run python -m app.retrieval.ingest
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000   

backend/frontend:
npm i
npm run dev



AI priority model (ai-service, /api/priority):
A small PyTorch network guesses each complaint's priority from its text, flair,
room and repeat counts. It learns from every new complaint and, much more
strongly, from every admin priority change. The guess is advisory: it is shown
on the admin complaint page and never changes the priority itself.
- Saved in ai-service/priority_model/ (not committed)
- First backend start trains it from existing complaints automatically
- Admin > Analytics shows its accuracy and has a "Retrain" button
