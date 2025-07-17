import faiss
import pickle
from sentence_transformers import SentenceTransformer
import numpy as np

def load_faiss_index(index_path: str, mapping_path: str):
    """Loads FAISS index and corresponding document mapping"""
    index = faiss.read_index(index_path)
    with open(mapping_path, 'rb') as f:
        doc_mapping = pickle.load(f)
    return index, doc_mapping

def query_faiss(index, mapping, question: str, model, top_k: int = 5):
    """Queries the FAISS index and returns top-k matched document chunks"""
    embedding = model.encode([question])
    distances, indices = index.search(np.array(embedding).astype("float32"), top_k)
    results = [mapping[i] for i in indices[0] if i < len(mapping)]
    return results
