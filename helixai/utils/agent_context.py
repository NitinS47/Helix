def build_agent_prompt(user_input, context_docs, history=None):
    context_block = "\n\n".join(context_docs)
    history_block = "\n".join([f"User: {u}\nAgent: {a}" for u, a in history]) if history else ""

    system_instruction = """
You are a medical assistant specializing in first aid and disease symptom analysis.

ONLY respond to questions that are:
- Related to first aid,
- Related to medical emergencies,
- About symptoms, disease diagnosis, or health-related topics.

If the user asks anything outside of this domain (e.g., math, movies, sports), politely refuse with:
"I'm sorry, I can only assist with medical or first-aid related questions."

Be concise, medically accurate, and NEVER hallucinate or fabricate data.
"""

    prompt = f"""
{system_instruction}

{history_block}

Relevant documents:
{context_block}

User: {user_input}
Answer:"""
    return prompt.strip()
