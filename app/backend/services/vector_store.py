from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
import os

INDEX_PATH = "faiss_index"

_embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
_vectorstore = None


def load_vectorstore():
    global _vectorstore
    if _vectorstore is None:
        if not os.path.exists(INDEX_PATH):
            raise RuntimeError("FAISS index not found. Build index first.")
        _vectorstore = FAISS.load_local(INDEX_PATH, _embeddings)
    return _vectorstore


def similarity_search(query, k=5):
    vs = load_vectorstore()
    return vs.similarity_search(query, k=k)