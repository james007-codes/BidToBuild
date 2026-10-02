from pathlib import Path

from dotenv import load_dotenv

from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings


PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env")


INDEX_DIR = PROJECT_ROOT / "faiss_index"


embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001"
)


vector_store = FAISS.load_local(
    INDEX_DIR,
    embeddings,
    allow_dangerous_deserialization=True
)


retriever = vector_store.as_retriever(
    search_kwargs={
        "k": 5
    }
)