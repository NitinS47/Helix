from utils.rag_utils import load_faiss_index, query_faiss
from utils.agent_context import build_agent_prompt
from sentence_transformers import SentenceTransformer
import ollama

# Paths to FAISS index and document mapping
index_path = 'C:\\Users\\nitin\\Desktop\\HELIX\\faiss_index\\index.faiss'
mapping_path = 'C:\\Users\\nitin\\Desktop\\HELIX\\faiss_index\\index.pkl'

# Load FAISS index + mapping
index, mapping = load_faiss_index(index_path, mapping_path)

# Load the same embedding model used during indexing
embed_model = SentenceTransformer('all-MiniLM-L6-v2')

# Chat history for agentic memory
chat_history = []

print("Agentic RAG Health Assistant (Gemma 3B) — type 'exit' to quit.\n")
while True:
    user_input = input("User: ")
    if user_input.lower() == "exit":
        break

    docs = query_faiss(index, mapping, user_input, embed_model)
    prompt = build_agent_prompt(user_input, docs, chat_history)

    response = ollama.chat(model='gemma3', messages=[{'role': 'user', 'content': prompt}])
    reply = response['message']['content']

    print(f"\nAssistant: {reply}\n")
    chat_history.append((user_input, reply))
