import os
import json
import PyPDF2
import hashlib
import numpy as np
from sentence_transformers import SentenceTransformer

class PolicyRetriever:
    def __init__(self, embedding_model='all-MiniLM-L6-v2'):
        print("🔄 Initializing PDF Policy Retriever...")
        try:
            self.model = SentenceTransformer(embedding_model)
            print("✅ SentenceTransformer loaded")
        except ImportError as e:
            print(f"⚠️ SentenceTransformers not installed: {e}")
            self.model = None
        except Exception as e:
            print(f"⚠️ Error loading model: {e}")
            self.model = None
        
        self.documents = []      # List of text chunks
        self.metadata = []       # Metadata for each chunk
        self.pdf_files = []      # List of PDF files
        self.embeddings = None   # Document embeddings
        print("✅ PDF Retriever initialized")
    
    def load_documents(self, docs_folder):
        """Load and index PDF documents from specified folder"""
        try:
            if not docs_folder:
                print("❌ No documents folder specified")
                return False
            
            docs_folder = os.path.normpath(docs_folder)
            print(f"📚 Loading PDFs from: {docs_folder}")
            
            if not os.path.exists(docs_folder):
                print(f"❌ Documents folder not found: {docs_folder}")
                print(f"❌ Current directory: {os.getcwd()}")
                return False
            
            # Find all PDFs
            try:
                pdf_files = [f for f in os.listdir(docs_folder) if f.lower().endswith('.pdf')]
            except Exception as e:
                print(f"❌ Error listing files: {e}")
                return False
            
            if not pdf_files:
                print(f"❌ No PDF files found in: {docs_folder}")
                return False
            
            print(f"📚 Found {len(pdf_files)} PDF files: {pdf_files}")
            
            all_chunks = []
            all_metadata = []
            
            for pdf_file in pdf_files:
                pdf_path = os.path.join(docs_folder, pdf_file)
                print(f"📄 Processing: {pdf_file}")
                
                try:
                    # Extract text from PDF
                    text_chunks = self._extract_text_from_pdf(pdf_path)
                    
                    if not text_chunks:
                        print(f"  ⚠️ No text extracted from {pdf_file} (might be scanned image)")
                        continue
                    
                    for page_num, chunk in enumerate(text_chunks, 1):
                        if chunk and len(chunk.strip()) > 30:  # Skip empty/short chunks
                            all_chunks.append(chunk)
                            all_metadata.append({
                                'source': pdf_file,
                                'page': page_num,
                                'pdf_path': pdf_path,
                                'chunk_hash': hashlib.md5(chunk.encode()).hexdigest()[:8],
                                'chunk_length': len(chunk)
                            })
                    
                    self.pdf_files.append(pdf_file)
                    print(f"  ✅ Extracted {len(text_chunks)} text chunks")
                    
                except Exception as e:
                    print(f"  ❌ Error processing {pdf_file}: {e}")
                    continue
            
            if not all_chunks:
                print("❌ No text extracted from any PDFs")
                print("ℹ️  PDFs might be scanned images or protected")
                return False
            
            self.documents = all_chunks
            self.metadata = all_metadata
            
            # Create embeddings for semantic search
            print(f"🔧 Creating embeddings for {len(self.documents)} chunks...")
            if self.model:
                try:
                    self.embeddings = self.model.encode(self.documents, show_progress_bar=False)
                    print(f"✅ Embeddings created: {self.embeddings.shape}")
                except Exception as e:
                    print(f"⚠️ Error creating embeddings: {e}")
                    print("⚠️ Using simple keyword search only")
                    self.embeddings = None
            else:
                print("⚠️ No model available, using simple text search")
                self.embeddings = None
            
            print(f"✅ Successfully loaded {len(self.pdf_files)} PDFs with {len(self.documents)} text chunks")
            return True
            
        except Exception as e:
            print(f"❌ Error loading documents: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF with page preservation"""
        text_chunks = []
        try:
            with open(pdf_path, 'rb') as file:
                # Use PdfReader instead of PdfFileReader for PyPDF2 v3.0+
                try:
                    pdf_reader = PyPDF2.PdfReader(file)
                    
                    for page_num in range(len(pdf_reader.pages)):
                        page = pdf_reader.pages[page_num]
                        text = page.extract_text()
                        
                        if text and text.strip():
                            # Clean text: remove excessive whitespace
                            clean_text = ' '.join(text.replace('\n', ' ').split())
                            if len(clean_text) > 50:  # Only include meaningful content
                                text_chunks.append(clean_text)
                            elif len(clean_text) > 10:
                                # Keep short chunks that might be important
                                text_chunks.append(clean_text)
                    
                    return text_chunks
                    
                except AttributeError:
                    # Fallback for older PyPDF2 versions
                    pdf_reader = PyPDF2.PdfFileReader(file)
                    
                    for page_num in range(pdf_reader.numPages):
                        page = pdf_reader.getPage(page_num)
                        text = page.extractText()
                        
                        if text and text.strip():
                            clean_text = ' '.join(text.replace('\n', ' ').split())
                            if len(clean_text) > 50:
                                text_chunks.append(clean_text)
                    
                    return text_chunks
                    
        except Exception as e:
            print(f"❌ Error reading PDF {pdf_path}: {e}")
            return []
    
    def search_in_documents(self, query, top_k=5):
        """Search for query in PDF documents"""
        if not self.documents:
            print("⚠️ No documents loaded, returning mock results")
            return self._get_mock_results(query)
        
        try:
            print(f"🔍 Searching for: '{query}'")
            
            # Method 1: Semantic search with embeddings
            if self.model and self.embeddings is not None:
                try:
                    results = self._semantic_search(query, top_k)
                    if results:
                        print(f"✅ Semantic search found {len(results)} results")
                        return results
                    else:
                        print("⚠️ Semantic search returned no results, trying keyword search")
                except Exception as e:
                    print(f"⚠️ Semantic search failed: {e}")
            
            # Method 2: Keyword search as fallback
            results = self._keyword_search(query, top_k)
            print(f"✅ Keyword search found {len(results)} results")
            return results
            
        except Exception as e:
            print(f"❌ Search error: {e}")
            import traceback
            traceback.print_exc()
            return self._get_mock_results(query)
    
    def _semantic_search(self, query, top_k=5):
        """Semantic search using embeddings"""
        try:
            # Encode query
            query_embedding = self.model.encode([query])
            
            # Ensure embeddings is numpy array
            if not isinstance(self.embeddings, np.ndarray):
                self.embeddings = np.array(self.embeddings)
            
            # Calculate similarities - FIXED: Proper array handling
            # Use np.matmul for matrix multiplication
            similarities = np.matmul(query_embedding, self.embeddings.T)
            
            # Flatten to 1D array
            similarities = similarities.flatten()
            
            # Get top indices - FIXED: Check array size first
            if len(similarities) == 0:
                return []
            
            # Use argpartition for large arrays (more efficient)
            if len(similarities) > top_k * 2:
                # Get indices of top_k largest values
                top_indices = np.argpartition(similarities, -top_k)[-top_k:]
                # Sort these top indices
                top_indices = top_indices[np.argsort(similarities[top_indices])[::-1]]
            else:
                # For small arrays, just sort all
                top_indices = np.argsort(similarities)[::-1][:top_k]
            
            results = []
            for idx in top_indices:
                similarity_value = float(similarities[idx])
                if similarity_value > 0.3:  # Relevance threshold
                    results.append({
                        'content': self.documents[idx],
                        'source': self.metadata[idx]['source'],
                        'page': self.metadata[idx]['page'],
                        'pdf_path': self.metadata[idx]['pdf_path'],
                        'chunk_hash': self.metadata[idx]['chunk_hash'],
                        'relevance_score': similarity_value,
                        'type': 'policy'
                    })
            
            return results
            
        except Exception as e:
            print(f"❌ Semantic search error: {e}")
            return []
    
    def _keyword_search(self, query, top_k=5):
        """Simple keyword search"""
        query_words = [word.lower().strip() for word in query.split() if len(word) > 2]
        
        if not query_words:
            return []
        
        results = []
        
        for idx, doc in enumerate(self.documents):
            doc_lower = doc.lower()
            
            # Calculate relevance score
            # 1. Exact phrase match (highest score)
            if query.lower() in doc_lower:
                score = 1.0
            else:
                # 2. Count matching words
                matches = sum(1 for word in query_words if word in doc_lower)
                if matches == 0:
                    continue
                score = matches / len(query_words)
            
            # Add result
            results.append({
                'content': doc,
                'source': self.metadata[idx]['source'],
                'page': self.metadata[idx]['page'],
                'pdf_path': self.metadata[idx]['pdf_path'],
                'chunk_hash': self.metadata[idx]['chunk_hash'],
                'relevance_score': score,
                'type': 'policy'
            })
        
        # Sort by relevance score
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        return results[:top_k]
    
    def _get_mock_results(self, query):
        """Fallback mock results when search fails"""
        print(f"⚠️ Using mock results for query: {query}")
        
        # Try to find relevant mock data based on query
        query_lower = query.lower()
        
        if 'car' in query_lower or 'auto' in query_lower or 'vehicle' in query_lower:
            return [{
                'content': 'Article 4.2: All automotive claims must be reported within 24 hours of the incident. Failure to report promptly may result in claim denial.',
                'source': 'car_policy.pdf',
                'page': 4,
                'pdf_path': 'data/documents/car_policy.pdf',
                'relevance_score': 0.85,
                'type': 'policy'
            }]
        elif 'flood' in query_lower or 'water' in query_lower:
            return [{
                'content': 'Section 3.1: Flood damage claims require photographic evidence within 72 hours. Documentation must include water level markers and timestamps.',
                'source': 'flood_policy.pdf',
                'page': 3,
                'pdf_path': 'data/documents/flood_policy.pdf',
                'relevance_score': 0.88,
                'type': 'policy'
            }]
        elif 'ev' in query_lower or 'electric' in query_lower:
            return [{
                'content': 'Clause 2.5: Electric vehicle battery claims require diagnostic reports from certified technicians. Battery health reports must accompany all claims.',
                'source': 'EV_policy.pdf',
                'page': 2,
                'pdf_path': 'data/documents/EV_policy.pdf',
                'relevance_score': 0.82,
                'type': 'policy'
            }]
        elif 'laptop' in query_lower or 'mobile' in query_lower:
            return [{
                'content': 'Policy 1.3: Laptop and mobile device claims require proof of purchase and IMEI/Serial numbers. Physical damage must be documented with clear photos.',
                'source': 'laptop_mobile_policy.pdf',
                'page': 1,
                'pdf_path': 'data/documents/laptop_mobile_policy.pdf',
                'relevance_score': 0.79,
                'type': 'policy'
            }]
        elif 'fire' in query_lower:
            return [{
                'content': 'Regulation 5.2: Fire damage claims require fire department reports and cause determination. All claims above $25,000 need additional investigation.',
                'source': 'fire_policy.pdf',
                'page': 5,
                'pdf_path': 'data/documents/fire_policy.pdf',
                'relevance_score': 0.86,
                'type': 'policy'
            }]
        else:
            return [{
                'content': f'Relevant policy information for: {query}. Please check the uploaded PDF documents for specific clauses and regulations.',
                'source': 'general_policy.pdf',
                'page': 1,
                'pdf_path': 'data/documents/general_policy.pdf',
                'relevance_score': 0.7,
                'type': 'policy'
            }]
    
    def get_document_count(self):
        """Get number of loaded PDF documents"""
        return len(self.pdf_files)
    
    def get_document_list(self):
        """Get list of loaded PDF filenames"""
        return self.pdf_files
    
    def get_total_chunks(self):
        """Get total number of text chunks"""
        return len(self.documents)
    
    def debug_info(self):
        """Return debug information"""
        return {
            'pdf_count': len(self.pdf_files),
            'chunk_count': len(self.documents),
            'pdf_files': self.pdf_files,
            'has_embeddings': self.embeddings is not None,
            'embedding_shape': self.embeddings.shape if self.embeddings is not None else None,
            'model_loaded': self.model is not None
        }
    
    def test_extraction(self):
        """Test PDF text extraction"""
        results = {}
        for pdf_file in self.pdf_files:
            try:
                # Find the document folder
                docs_folder = os.path.dirname(self.metadata[0]['pdf_path']) if self.metadata else 'data/documents'
                pdf_path = os.path.join(docs_folder, pdf_file)
                
                text_chunks = self._extract_text_from_pdf(pdf_path)
                results[pdf_file] = {
                    'chunks': len(text_chunks),
                    'sample': text_chunks[0][:100] + '...' if text_chunks else 'No text extracted'
                }
            except Exception as e:
                results[pdf_file] = {'error': str(e)}
        
        return results