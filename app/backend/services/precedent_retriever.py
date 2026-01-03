import json
import os
from datetime import datetime
from sentence_transformers import SentenceTransformer
import numpy as np

class PrecedentRetriever:
    def __init__(self, precedents_file="data/precedent_cases.json"):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.precedents = self.load_precedents(precedents_file)
        self.embeddings = None
        self._encode_precedents()
    
    def load_precedents(self, filepath):
        """Load precedent cases from JSON file"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    precedents = json.load(f)
                print(f"✅ Loaded {len(precedents)} precedent cases from {filepath}")
            else:
                # Create initial file with sample data
                precedents = [
                    {
                        "id": 1,
                        "case_id": "FL-09321",
                        "claim_type": "Flood",
                        "state": "Florida",
                        "claim_amount": 42000,
                        "status": "approved",
                        "decision_reason": "Flood claim approved under FEMA Clause 4.2",
                        "key_factors": ["timely_filing", "proper_documentation", "within_coverage"],
                        "timestamp": "2024-01-10T10:30:00"
                    },
                    {
                        "id": 2,
                        "case_id": "FL-08177",
                        "claim_type": "Flood",
                        "state": "Florida",
                        "claim_amount": 38000,
                        "status": "rejected",
                        "decision_reason": "Rejected due to missing damage verification report",
                        "key_factors": ["missing_docs", "late_submission"],
                        "timestamp": "2024-01-09T14:20:00"
                    }
                ]
                
                # Save initial precedents
                with open(filepath, 'w') as f:
                    json.dump(precedents, f, indent=2)
                print(f"📝 Created new precedent file with {len(precedents)} sample cases")
            
            return precedents
            
        except Exception as e:
            print(f"❌ Error loading precedents: {e}")
            return []
    
    def _encode_precedents(self):
        """Create embeddings for all precedents"""
        if not self.precedents:
            return
        
        texts = []
        for prec in self.precedents:
            # Create a text representation for embedding
            text = f"{prec.get('claim_type', '')} {prec.get('state', '')} "
            text += f"{prec.get('decision_reason', '')} {prec.get('damage_type', '')} "
            text += f"{' '.join(prec.get('key_factors', []))}"
            texts.append(text)
        
        if texts:
            self.embeddings = self.model.encode(texts)
            print(f"✅ Created embeddings for {len(texts)} precedents")
    
    def find_similar_cases(self, case_context, top_k=5):
        """Find similar precedent cases"""
        if not self.precedents or not self.embeddings:
            return []
        
        # Create query from context
        query_text = self._create_query_from_context(case_context)
        print(f"🔍 Searching precedents for: {query_text}")
        
        try:
            query_embedding = self.model.encode([query_text])
            
            # Calculate similarities
            similarities = np.dot(query_embedding, self.embeddings.T)[0]
            
            # Get top matches
            top_indices = np.argsort(similarities)[::-1][:top_k]
            
            results = []
            for idx in top_indices:
                if similarities[idx] > 0.2:  # Lower threshold to get more results
                    precedent = self.precedents[idx].copy()
                    precedent['similarity_score'] = float(similarities[idx])
                    precedent['similarity_percent'] = int(similarities[idx] * 100)
                    results.append(precedent)
            
            print(f"✅ Found {len(results)} similar precedent cases")
            return results
            
        except Exception as e:
            print(f"⚠️ Error in similarity search: {e}")
            # Return top precedents by recency as fallback
            return self.get_recent_precedents(top_k)
    
    def _create_query_from_context(self, context):
        """Create search query from case context"""
        query_parts = []
        
        if context.get('claim_type'):
            query_parts.append(context['claim_type'])
        
        if context.get('state'):
            query_parts.append(context['state'])
        
        if context.get('damage_type'):
            query_parts.append(context['damage_type'])
        
        if context.get('claim_amount'):
            # Add amount category
            try:
                amount = float(str(context['claim_amount']).replace('$', '').replace(',', ''))
                if amount > 50000:
                    query_parts.append("high value claim")
                elif amount > 20000:
                    query_parts.append("medium value claim")
            except:
                pass
        
        return " ".join(query_parts) if query_parts else "insurance claim"
    
    def get_recent_precedents(self, top_k=5):
        """Get most recent precedents"""
        if not self.precedents:
            return []
        
        # Sort by timestamp (most recent first)
        sorted_precedents = sorted(
            self.precedents,
            key=lambda x: x.get('timestamp', ''),
            reverse=True
        )[:top_k]
        
        return sorted_precedents
    
    def add_precedent(self, precedent_data):
        """Add a new precedent to memory"""
        try:
            # Generate ID
            precedent_data['id'] = len(self.precedents) + 1
            precedent_data['timestamp'] = datetime.now().isoformat()
            
            # Add to list
            self.precedents.append(precedent_data)
            
            # Save to file
            self._save_to_file()
            
            # Update embeddings
            self._encode_precedents()
            
            print(f"✅ Added new precedent: {precedent_data['case_id']}")
            return True
            
        except Exception as e:
            print(f"❌ Error adding precedent: {e}")
            return False
    
    def _save_to_file(self):
        """Save precedents to JSON file"""
        try:
            with open("data/precedent_cases.json", 'w') as f:
                json.dump(self.precedents, f, indent=2)
            return True
        except Exception as e:
            print(f"❌ Error saving precedents: {e}")
            return False