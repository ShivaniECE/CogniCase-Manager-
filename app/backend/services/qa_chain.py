from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from transformers import pipeline


# --------------------------------
# Load FAISS + QA model
# --------------------------------
def load_qa_chain(index_path="faiss_index"):
    # Embeddings model
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    # Load FAISS index
    db = FAISS.load_local(
        index_path,
        embeddings,
        allow_dangerous_deserialization=True
    )

    # Extractive QA model (lightweight)
    qa_pipeline = pipeline(
        "question-answering",
        model="distilbert-base-cased-distilled-squad",
        tokenizer="distilbert-base-cased-distilled-squad"
    )

    return db, qa_pipeline


# --------------------------------
# Ask question with improved logic
# --------------------------------
def ask_question(db, qa_pipeline, question, top_k=6):
    # Retrieve more context
    docs = db.similarity_search(question, k=top_k)

    if not docs:
        return (
            "I could not find relevant information in the document. "
            "Please ask a question related to the policy."
        )

    # Merge context cleanly
    context = "\n\n".join(doc.page_content.strip() for doc in docs)

    # Run QA model
    result = qa_pipeline(
        question=question,
        context=context,
        max_answer_len=200,
        handle_impossible_answer=True
    )

    answer = result.get("answer", "").strip()

    # Confidence & quality check
    if not answer or len(answer) < 15:
        return (
            "The document does not provide a clear answer to this question. "
            "Please ask a more specific question related to the policy."
        )

    return answer