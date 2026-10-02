import glob
import os
from pathlib import Path

from dotenv import load_dotenv

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings


PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env")


DOCS_DIR = PROJECT_ROOT / "sample_docs"
INDEX_DIR = PROJECT_ROOT / "faiss_index"


def extract_metadata(text):

    metadata = {}

    if not text.startswith("---"):
        return metadata

    parts = text.split("---", 2)

    if len(parts) < 3:
        return metadata

    front_matter = parts[1].strip()

    for line in front_matter.splitlines():

        if ":" in line:

            key, value = line.split(":", 1)

            metadata[key.strip()] = value.strip()

    return metadata


def load_and_split(docs_dir):

    chunks = []

    files = (
        glob.glob(
            os.path.join(
                docs_dir,
                "**",
                "*.json"
            ),
            recursive=True
        )
        +
        glob.glob(
            os.path.join(
                docs_dir,
                "**",
                "*.md"
            ),
            recursive=True
        )
    )

    for path in files:

        with open(
            path,
            "r",
            encoding="utf-8"
        ) as f:

            text = f.read()

        source = os.path.basename(path)

        doc_metadata = extract_metadata(text)

        doc_metadata["source"] = source

        paragraphs = [
            p.strip()
            for p in text.split("\n\n")
            if p.strip()
        ]

        current = ""

        for para in paragraphs:

            if len(current) + len(para) + 2 <= 500:

                current = (
                    current
                    + "\n\n"
                    + para
                ).strip()

            else:

                if current:

                    chunks.append(
                        Document(
                            page_content=current,
                            metadata=doc_metadata.copy()
                        )
                    )

                current = para

        if current:

            chunks.append(
                Document(
                    page_content=current,
                    metadata=doc_metadata.copy()
                )
            )

    return chunks


def build_index():

    chunks = load_and_split(DOCS_DIR)

    print(
        f"{len(chunks)} chunks created."
    )

    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001"
    )

    vector_store = FAISS.from_documents(
        chunks,
        embeddings
    )

    vector_store.save_local(
        INDEX_DIR
    )

    print(
        "FAISS index rebuilt successfully."
    )


if __name__ == "__main__":
    build_index()