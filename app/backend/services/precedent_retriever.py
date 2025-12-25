import json
from sentence_transformers import SentenceTransformer
import numpy as np

class PrecedentRetriever:
    def __init__(self, precedents_file="data/precedent_cases.json"):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.precedents = self.load_precedents(precedents_file)
        self.embeddings = None
        self._encode_precedents()
    
    def load_precedents(self, filepath):
        """Load precedent cases from JSON"""
        try:
            with open(filepath, 'r') as f:
                precedents = json.load(f)
            print(f"Loaded {len(precedents)} precedent cases")
            return precedents
        except FileNotFoundError:
            # Return sample data if file doesn't exist
            return [
                {
                    "case_id": "FL-09321",
                    "claim_type": "Flood",
                    "state": "Florida",
                    "claim_amount": 42000,
                    "status": "approved",
                    "decision_reason": "Flood claim approved under FEMA Clause 4.2",
                    "key_factors": ["timely_filing", "proper_documentation", "within_coverage"]
                },
                {
                    "case_id": "FL-08177",
                    "claim_type": "Flood",
                    "state": "Florida",
                    "claim_amount": 38000,
                    "status": "rejected",
                    "decision_reason": "Rejected due to missing damage verification report",
                    "key_factors": ["missing_docs", "late_submission"]
                }
            ]
    
    def _encode_precedents(self):
        """Create embeddings for all precedents"""
        texts = []
        for prec in self.precedents:
            text = f"{prec['claim_type']} {prec['state']} {prec.get('decision_reason', '')}"
            texts.append(text)
        
        if texts:
            self.embeddings = self.model.encode(texts)
    
    def find_similar_cases(self, case_context, top_k=3):
        """Find similar precedent cases"""
        if not self.precedents or not self.embeddings:
            return []
        
        # Create query from context
        query_text = f"{case_context.get('claim_type', '')} {case_context.get('state', '')}"
        query_embedding = self.model.encode([query_text])
        
        # Calculate similarities
        similarities = np.dot(query_embedding, self.embeddings.T)[0]
        
        # Get top matches
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0.3:  # Threshold
                precedent = self.precedents[idx]
                results.append({
                    **precedent,
                    'similarity_score': float(similarities[idx])
                })
        
        return results