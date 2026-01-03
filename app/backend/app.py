from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from services.context_parser import MyContextParser as ContextParser
from services.policy_retriever import PolicyRetriever
from services.precedent_retriever import PrecedentRetriever
from services.citation_builder import CitationBuilder
from datetime import datetime, timedelta  # Add this line
import json
import traceback
import sys
import os


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize components
print("🚀 Initializing Appian Knowledge Assistant...")
print("="*60)

try:
    # 1. Context Parser
    context_parser = ContextParser()
    print("✅ ContextParser initialized")
    
    # 2. Policy Retriever (PDF Search)
    policy_retriever = PolicyRetriever()
    print("✅ PolicyRetriever initialized")
    
    # 3. Precedent Retriever
    precedent_retriever = PrecedentRetriever()
    print("✅ PrecedentRetriever initialized")
    
    # 4. Citation Builder (SIMPLE VERSION - no NumPy issues)
    citation_builder = CitationBuilder()
    print("✅ CitationBuilder initialized (simple version)")
    
    # Load PDF documents from correct path
    base_dir = os.path.dirname(os.path.abspath(__file__))
    documents_folder = os.path.join(base_dir, 'data', 'documents')
    
    print(f"📚 PDF Folder: {documents_folder}")
    
    # Check if folder exists
    if not os.path.exists(documents_folder):
        print(f"❌ ERROR: Documents folder not found!")
        print(f"❌ Please create: {documents_folder}")
        print(f"❌ And add your PDF files there")
        print(f"❌ Current directory: {os.getcwd()}")
    else:
        # List files in folder
        pdf_files = []
        try:
            pdf_files = [f for f in os.listdir(documents_folder) if f.lower().endswith('.pdf')]
        except Exception as e:
            print(f"❌ Error listing PDFs: {e}")
        
        if not pdf_files:
            print(f"⚠️ No PDF files found in: {documents_folder}")
            print(f"ℹ️  Please add PDFs like: car_policy.pdf, EV_policy.pdf, etc.")
        else:
            print(f"📄 Found {len(pdf_files)} PDF files: {pdf_files}")
        
        # Load documents
        print(f"🔧 Loading PDF documents...")
        index_loaded = policy_retriever.load_documents(documents_folder)
        if index_loaded:
            print(f"✅ Loaded {policy_retriever.get_document_count()} PDFs")
            print(f"✅ Created {policy_retriever.get_total_chunks()} searchable text chunks")
        else:
            print("⚠️ Failed to load documents - system will use mock data")
    
    print("="*60)
    
except Exception as e:
    print(f"❌ Failed to initialize components: {e}")
    traceback.print_exc()
    sys.exit(1)

def generate_suggested_actions(context, precedents, policies):
    """Generate suggested actions based on analysis"""
    actions = []
    
    # Check for high-value claims
    try:
        claim_amount = context.get('claim_amount', '0')
        if isinstance(claim_amount, str):
            # Clean the amount string
            amount_str = claim_amount.replace('$', '').replace(',', '').strip()
        else:
            amount_str = str(claim_amount)
        
        if amount_str and amount_str != '0':
            amount = float(amount_str)
            if amount > 30000:
                actions.append("⚠️ High-value claim: Additional documentation required")
    except (ValueError, TypeError, AttributeError):
        pass  # Skip if amount parsing fails
    
    # Check precedent trends
    if precedents and len(precedents) > 0:
        approved_count = 0
        rejected_count = 0
        
        for p in precedents:
            status = p.get('status', '').lower()
            if status == 'approved':
                approved_count += 1
            elif status == 'rejected':
                rejected_count += 1
        
        if rejected_count > approved_count and rejected_count > 0:
            actions.append("⚠️ Similar cases were frequently rejected - review carefully")
        elif approved_count > rejected_count and approved_count > 0:
            actions.append("✓ Similar cases were mostly approved")
    
    # Check for critical policies
    if policies and len(policies) > 0:
        critical_count = 0
        for p in policies:
            if p.get('critical', False):
                critical_count += 1
        
        if critical_count > 0:
            actions.append(f"⚠️ {critical_count} critical policies apply to this case")
    
    # Default action if none found
    if not actions:
        actions.append("✓ Review case details and attached documents")
    
    return actions
@app.route('/api/save-precedent', methods=['POST'])
def save_precedent():
    """Save a case decision to precedent memory"""
    try:
        print("\n" + "="*60)
        print("💾 SAVE-PRECEDENT endpoint called")
        
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        precedent_data = request.get_json()
        print(f"📥 Received precedent data for case: {precedent_data.get('case_id', 'Unknown')}")
        
        # Validate required fields
        required_fields = ['case_id', 'claim_type', 'status']
        for field in required_fields:
            if field not in precedent_data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate status
        if precedent_data['status'] not in ['approved', 'rejected']:
            return jsonify({
                'success': False,
                'error': 'Status must be "approved" or "rejected"'
            }), 400
        
        # Define precedents file path
        base_dir = os.path.dirname(os.path.abspath(__file__))
        precedents_file = os.path.join(base_dir, 'data', 'precedent_cases.json')
        
        # Create data directory if it doesn't exist
        data_dir = os.path.dirname(precedents_file)
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
            print(f"📁 Created data directory: {data_dir}")
        
        # Load existing precedents
        precedents = []
        if os.path.exists(precedents_file):
            try:
                with open(precedents_file, 'r') as f:
                    precedents = json.load(f)
                print(f"📚 Loaded {len(precedents)} existing precedents")
            except Exception as e:
                print(f"⚠️ Error loading precedents file: {e}")
                precedents = []
        else:
            print(f"📝 Creating new precedents file: {precedents_file}")
        
        # Add timestamp and ID to new precedent
        precedent_data['timestamp'] = datetime.now().isoformat()
        precedent_data['id'] = len(precedents) + 1
        
        # Add to precedents array
        precedents.append(precedent_data)
        
        # Save back to file
        try:
            with open(precedents_file, 'w') as f:
                json.dump(precedents, f, indent=2)
            print(f"✅ Saved precedent #{len(precedents)} to {precedents_file}")
            
            return jsonify({
                'success': True,
                'message': f'Case {precedent_data["case_id"]} saved to precedent memory',
                'precedent_id': precedent_data['id'],
                'total_precedents': len(precedents),
                'saved_file': precedents_file
            })
            
        except Exception as e:
            print(f"❌ Error saving precedents file: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to save precedents: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"❌ ERROR in save_precedent: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

@app.route('/api/get-precedents', methods=['GET'])
def get_precedents():
    """Get all precedent cases"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        precedents_file = os.path.join(base_dir, 'data', 'precedent_cases.json')
        
        print(f"📖 Reading precedents from: {precedents_file}")
        
        if os.path.exists(precedents_file):
            with open(precedents_file, 'r') as f:
                precedents = json.load(f)
        else:
            precedents = []
        
        print(f"📊 Found {len(precedents)} precedent cases")
        
        return jsonify({
            'success': True,
            'precedents': precedents,
            'count': len(precedents)
        })
        
    except Exception as e:
        print(f"❌ Error getting precedents: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'precedents': []
        }), 500
    """Get all precedent cases"""
    try:
        precedents_file = 'data/precedent_cases.json'
        
        if os.path.exists(precedents_file):
            with open(precedents_file, 'r') as f:
                precedents = json.load(f)
        else:
            precedents = []
        
        return jsonify({
            'success': True,
            'precedents': precedents,
            'count': len(precedents)
        })
        
    except Exception as e:
        print(f"❌ Error getting precedents: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'precedents': []
        }), 500
@app.route('/api/get-precedents-enhanced', methods=['GET'])
def get_precedents_enhanced():
    """Get all precedent cases with enhanced analytics"""
    try:
        precedents_file = 'data/precedent_cases.json'
        
        if os.path.exists(precedents_file):
            with open(precedents_file, 'r') as f:
                precedents = json.load(f)
        else:
            precedents = []
        
        # Calculate analytics
        total = len(precedents)
        approved = len([p for p in precedents if p.get('status') == 'approved'])
        rejected = len([p for p in precedents if p.get('status') == 'rejected'])
        
        # Calculate claim amounts
        amounts = [float(p.get('claim_amount', 0)) for p in precedents if p.get('claim_amount')]
        avg_amount = sum(amounts) / len(amounts) if amounts else 0
        
        # Group by claim type
        claim_types = {}
        for p in precedents:
            claim_type = p.get('claim_type', 'Unknown')
            if claim_type not in claim_types:
                claim_types[claim_type] = 0
            claim_types[claim_type] += 1
        
        # Get recent activity (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent = []
        for p in precedents:
            try:
                timestamp = p.get('timestamp') or p.get('decision_date')
                if timestamp:
                    case_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    if case_date > thirty_days_ago:
                        recent.append(p)
            except:
                continue
        
        return jsonify({
            'success': True,
            'precedents': precedents,
            'analytics': {
                'total': total,
                'approved': approved,
                'rejected': rejected,
                'approval_rate': (approved / total * 100) if total > 0 else 0,
                'avg_claim_amount': avg_amount,
                'claim_types': claim_types,
                'recent_30_days': len(recent),
                'total_amount': sum(amounts)
            },
            'count': total
        })
        
    except Exception as e:
        print(f"❌ Error getting enhanced precedents: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'precedents': [],
            'analytics': {}
        }), 500

@app.route('/api/search-precedents', methods=['POST'])
def search_precedents():
    """Search precedents with filters"""
    try:
        data = request.get_json() or {}
        
        precedents_file = 'data/precedent_cases.json'
        if os.path.exists(precedents_file):
            with open(precedents_file, 'r') as f:
                all_precedents = json.load(f)
        else:
            all_precedents = []
        
        # Apply filters
        filtered = all_precedents
        
        # Status filter
        status = data.get('status')
        if status:
            filtered = [p for p in filtered if p.get('status') == status]
        
        # Claim type filter
        claim_type = data.get('claim_type')
        if claim_type:
            filtered = [p for p in filtered if p.get('claim_type') == claim_type]
        
        # Search term
        search_term = data.get('search', '').lower()
        if search_term:
            filtered = [p for p in filtered if 
                       search_term in (p.get('case_id', '')).lower() or
                       search_term in (p.get('claim_type', '')).lower() or
                       search_term in (p.get('state', '')).lower() or
                       search_term in (p.get('decision_reason', '')).lower() or
                       any(search_term in factor.lower() for factor in p.get('key_factors', []))]
        
        # Sort (newest first by default)
        sort_by = data.get('sort_by', 'timestamp')
        reverse = data.get('reverse', True)
        
        try:
            filtered.sort(key=lambda x: x.get(sort_by, ''), reverse=reverse)
        except:
            # Fallback to timestamp sorting
            filtered.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Pagination
        page = data.get('page', 1)
        per_page = data.get('per_page', 10)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        paginated = filtered[start_idx:end_idx]
        
        return jsonify({
            'success': True,
            'precedents': paginated,
            'total': len(filtered),
            'page': page,
            'per_page': per_page,
            'total_pages': (len(filtered) + per_page - 1) // per_page
        })
        
    except Exception as e:
        print(f"❌ Error searching precedents: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'precedents': [],
            'total': 0
        }), 500
@app.route('/api/clear-precedents', methods=['POST'])
def clear_precedents():
    """Clear all precedent memory"""
    try:
        print("\n" + "="*60)
        print("🗑️  Clearing all precedent memory...")
        
        # Clear the JSON file
        precedents_file = 'data/precedent_cases.json'
        
        if os.path.exists(precedents_file):
            # Create a backup before clearing (optional)
            backup_file = f"data/precedent_cases_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            try:
                import shutil
                shutil.copy2(precedents_file, backup_file)
                print(f"📦 Created backup: {backup_file}")
            except Exception as backup_error:
                print(f"⚠️ Could not create backup: {backup_error}")
            
            # Clear the file
            with open(precedents_file, 'w') as f:
                json.dump([], f)
            
            print("✅ Precedent memory file cleared")
            
            return jsonify({
                'success': True,
                'message': 'All precedent memory has been cleared',
                'backup_created': os.path.exists(backup_file) if 'backup_file' in locals() else False,
                'timestamp': datetime.now().isoformat()
            })
        else:
            # File doesn't exist, but that's okay
            print("ℹ️  Precedent file doesn't exist (already empty)")
            return jsonify({
                'success': True,
                'message': 'Precedent memory was already empty',
                'timestamp': datetime.now().isoformat()
            })
            
    except Exception as e:
        print(f"❌ ERROR clearing precedents: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

@app.route('/api/backup-precedents', methods=['GET'])
def backup_precedents():
    """Create a backup of precedent memory"""
    try:
        precedents_file = 'data/precedent_cases.json'
        
        if not os.path.exists(precedents_file):
            return jsonify({
                'success': False,
                'error': 'No precedent file found'
            }), 404
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"data/backups/precedent_backup_{timestamp}.json"
        
        # Ensure backup directory exists
        os.makedirs(os.path.dirname(backup_file), exist_ok=True)
        
        # Copy file
        import shutil
        shutil.copy2(precedents_file, backup_file)
        
        print(f"✅ Created backup: {backup_file}")
        
        return jsonify({
            'success': True,
            'message': f'Backup created: {backup_file}',
            'backup_file': backup_file,
            'timestamp': timestamp
        })
        
    except Exception as e:
        print(f"❌ ERROR creating backup: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analyze-case', methods=['POST'])
def analyze_case():
    """Main endpoint: Analyze case and return relevant PDF content"""
    try:
        print("\n" + "="*60)
        print("📥 Received /api/analyze-case request")
        
        # Validate request
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Empty request body'}), 400
        
        case_data = data.get('case_data', {})
        print(f"📄 Case data received keys: {list(case_data.keys())}")
        
        # 1. Parse context from case
        context = {}
        try:
            context = context_parser.extract_from_case_data(case_data)
            print(f"🔍 Parsed context: {context}")
        except Exception as e:
            print(f"⚠️ Error parsing context: {e}")
            # Use raw case data as fallback
            context = {
                'claim_type': case_data.get('Claim Type', ''),
                'state': case_data.get('State', ''),
                'claim_amount': case_data.get('Claim Amount', ''),
                'damage_type': case_data.get('Damage Type', '')
            }
        
        # 2. Build search queries
        queries = []
        try:
            queries = context_parser.build_query_from_context(context)
            print(f"🔎 Generated search queries: {queries}")
        except Exception as e:
            print(f"⚠️ Error building queries: {e}")
            # Create simple queries from claim type
            claim_type = context.get('claim_type') or case_data.get('Claim Type', '')
            if claim_type:
                queries = [
                    f"{claim_type} insurance policy",
                    f"{claim_type} claim procedure", 
                    f"{claim_type} damage assessment"
                ]
            else:
                queries = ["insurance policy", "claim procedure"]
        
        if not queries:
            queries = ["insurance claim", "policy document"]
        
        # 3. Search in PDF documents
        all_policies = []
        for i, query in enumerate(queries[:3]):  # Use top 3 queries
            if query and isinstance(query, str) and query.strip():
                print(f"  {i+1}. Searching PDFs for: '{query}'")
                try:
                    policies = policy_retriever.search_in_documents(query, top_k=3)
                    if policies:
                        all_policies.extend(policies)
                        print(f"    Found {len(policies)} results")
                except Exception as e:
                    print(f"    ⚠️ Search error: {e}")
        
        print(f"📊 Total policy excerpts found: {len(all_policies)}")
        
        # 4. Remove duplicates
        unique_policies = []
        seen_hashes = set()
        
        for policy in all_policies:
            if policy and isinstance(policy, dict) and 'content' in policy:
                # Create a simple hash of the content for deduplication
                content = str(policy['content'])[:200]  # First 200 chars
                content_hash = hash(content)
                
                if content_hash not in seen_hashes:
                    seen_hashes.add(content_hash)
                    
                    # Add PDF URL for frontend
                    pdf_url = citation_builder.create_pdf_url(policy)
                    if pdf_url:
                        policy['pdf_url'] = pdf_url
                    else:
                        # Fallback URL
                        source = policy.get('source', '')
                        if source:
                            policy['pdf_url'] = f"/api/documents/{source}"
                    
                    # Format citation
                    policy['citation'] = citation_builder.format_citation(policy)
                    
                    # Ensure relevance score exists
                    if 'relevance_score' not in policy:
                        policy['relevance_score'] = 0.5
                    
                    unique_policies.append(policy)
        
        # 5. Highlight critical policies
        try:
            unique_policies = citation_builder.highlight_critical_policy(unique_policies, context)
            critical_count = sum(1 for p in unique_policies if p.get('critical', False))
            print(f"🔍 Highlighted {critical_count} critical policies")
        except Exception as e:
            print(f"⚠️ Error in highlight_critical_policy: {e}")
            # Set all as non-critical if error occurs
            for policy in unique_policies:
                policy['critical'] = False
        
        # 6. Sort by relevance and critical status
        # First ensure all policies have relevance_score
        for policy in unique_policies:
            if 'relevance_score' not in policy:
                policy['relevance_score'] = 0.5
        
        # Sort: critical first, then by relevance score
        unique_policies.sort(
            key=lambda x: (x.get('critical', False), x.get('relevance_score', 0)), 
            reverse=True
        )
        
        # 7. Get similar precedent cases
        precedents = []
        try:
            precedents = precedent_retriever.find_similar_cases(context, top_k=3)
            print(f"📂 Found {len(precedents)} similar precedent cases")
        except Exception as e:
            print(f"⚠️ Error finding precedents: {e}")
        
        # 8. Generate suggested actions
        suggested_actions = generate_suggested_actions(context, precedents, unique_policies)
        
        # 9. Prepare response
        response = {
            'success': True,
            'case_context': context,
            'precedents': precedents,
            'policies': unique_policies[:5],  # Top 5 most relevant
            'suggested_actions': suggested_actions,
            'search_info': {
                'queries_used': queries[:3],
                'documents_searched': policy_retriever.get_document_count(),
                'results_found': len(unique_policies),
                'critical_policies': sum(1 for p in unique_policies if p.get('critical', False))
            }
        }
        
        print(f"📤 Sending response:")
        print(f"   • {len(precedents)} precedent cases")
        print(f"   • {len(unique_policies[:5])} policy excerpts")
        print(f"   • {len(suggested_actions)} suggested actions")
        print("="*60)
        
        return jsonify(response)
    
    except Exception as e:
        print(f"❌ ERROR in analyze_case: {str(e)}")
        print(f"❌ ERROR TYPE: {type(e).__name__}")
        
        # Get detailed error info
        error_trace = traceback.format_exc()
        print(f"❌ FULL TRACEBACK:")
        for line in error_trace.split('\n')[:10]:  # First 10 lines only
            print(f"   {line}")
        
        # Check if it's the NumPy error
        if "ambiguous" in str(e) or "any()" in str(e) or "all()" in str(e):
            print("❌ DETECTED: NumPy array boolean error")
            print("❌ This happens in citation_builder.py - using simplified version")
        
        # Return error but with some mock data for frontend
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'case_context': {},
            'precedents': [],
            'policies': [],
            'suggested_actions': ['System error occurred - check backend logs'],
            'search_info': {
                'error': True,
                'message': str(e),
                'numpy_error': "ambiguous" in str(e) or "any()" in str(e) or "all()" in str(e)
            }
        }), 500

@app.route('/api/documents/<path:filename>', methods=['GET'])
def serve_pdf(filename):
    """Serve PDF files from the documents folder"""
    try:
        # Sanitize filename
        safe_filename = os.path.basename(filename)
        
        # Get documents folder path
        base_dir = os.path.dirname(os.path.abspath(__file__))
        documents_folder = os.path.join(base_dir, 'data', 'documents')
        documents_folder = os.path.normpath(documents_folder)
        
        print(f"📄 PDF Request: {safe_filename}")
        print(f"📄 Looking in: {documents_folder}")
        
        # Check if file exists
        full_path = os.path.join(documents_folder, safe_filename)
        
        if os.path.exists(full_path) and safe_filename.lower().endswith('.pdf'):
            print(f"✅ Serving: {safe_filename}")
            return send_from_directory(documents_folder, safe_filename, as_attachment=False)
        else:
            print(f"❌ PDF not found: {full_path}")
            print(f"❌ File exists: {os.path.exists(full_path)}")
            
            # List available PDFs for debugging
            available = []
            if os.path.exists(documents_folder):
                try:
                    available = [f for f in os.listdir(documents_folder) if f.lower().endswith('.pdf')]
                    print(f"📄 Available PDFs: {available}")
                except Exception as e:
                    print(f"❌ Error listing PDFs: {e}")
            
            return jsonify({
                'error': f'PDF not found: {safe_filename}',
                'requested_file': safe_filename,
                'available_pdfs': available,
                'documents_folder': documents_folder
            }), 404
            
    except Exception as e:
        print(f"❌ Error serving PDF: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        pdf_count = policy_retriever.get_document_count()
        precedent_count = len(precedent_retriever.precedents) if hasattr(precedent_retriever, 'precedents') else 0
        
        return jsonify({
            'status': 'healthy',
            'service': 'Appian Knowledge Assistant',
            'version': '2.0',
            'pdf_search': pdf_count > 0,
            'documents_loaded': pdf_count,
            'precedents_loaded': precedent_count,
            'components': {
                'context_parser': True,
                'policy_retriever': True,
                'precedent_retriever': True,
                'citation_builder': True
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'degraded',
            'error': str(e),
            'service': 'Appian Knowledge Assistant'
        }), 500

@app.route('/api/debug', methods=['GET'])
def debug_info():
    """Debug information endpoint"""
    try:
        pdf_list = policy_retriever.get_document_list()
        pdf_count = policy_retriever.get_document_count()
        chunks_count = policy_retriever.get_total_chunks()
        
        # Get precedent count safely
        try:
            precedent_count = len(precedent_retriever.precedents)
        except:
            precedent_count = 0
        
        return jsonify({
            'pdf_documents': pdf_list,
            'pdf_count': pdf_count,
            'chunks_count': chunks_count,
            'precedent_count': precedent_count,
            'backend_status': 'running',
            'python_version': sys.version.split()[0],
            'working_directory': os.getcwd(),
            'app_directory': os.path.dirname(os.path.abspath(__file__)),
            'pdf_folder': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'documents')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-search', methods=['POST'])
def test_search():
    """Test search endpoint (bypasses context parsing)"""
    try:
        data = request.get_json()
        query = data.get('query', 'car insurance')
        
        print(f"\n🔍 TEST SEARCH REQUEST: '{query}'")
        
        # Perform search
        results = policy_retriever.search_in_documents(query, top_k=3)
        
        # Add citations and PDF URLs
        for result in results:
            result['citation'] = citation_builder.format_citation(result)
            result['pdf_url'] = citation_builder.create_pdf_url(result)
        
        print(f"✅ Found {len(results)} results")
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results,
            'count': len(results),
            'documents_searched': policy_retriever.get_document_count()
        })
        
    except Exception as e:
        print(f"❌ Test search error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/list-pdfs', methods=['GET'])
def list_pdfs():
    """List all available PDF documents"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        documents_folder = os.path.join(base_dir, 'data', 'documents')
        
        pdf_files = []
        if os.path.exists(documents_folder):
            for file in os.listdir(documents_folder):
                if file.lower().endswith('.pdf'):
                    file_path = os.path.join(documents_folder, file)
                    pdf_files.append({
                        'filename': file,
                        'size': os.path.getsize(file_path),
                        'url': f"/api/documents/{file}",
                        'last_modified': os.path.getmtime(file_path)
                    })
        
        return jsonify({
            'pdf_count': len(pdf_files),
            'pdfs': pdf_files,
            'folder': documents_folder,
            'folder_exists': os.path.exists(documents_folder)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🤖 APPIAN KNOWLEDGE ASSISTANT - PRODUCTION READY")
    print("="*60)
    print("Features:")
    print("  • User input form with dropdowns")
    print("  • Real PDF content search (not random text)")
    print("  • Clickable PDF links with citations")
    print("  • Automatic case context analysis")
    print("  • Historical precedent lookup")
    print("="*60)
    print(f"Port: 5000")
    print(f"PDF Documents: {policy_retriever.get_document_count()}")
    print("\nEndpoints:")
    print("  POST /api/analyze-case   - Main analysis endpoint")
    print("  POST /api/test-search    - Direct search test")
    print("  GET  /api/documents/[pdf] - Open PDF document")
    print("  GET  /api/list-pdfs      - List available PDFs")
    print("  GET  /api/health         - Health check")
    print("  GET  /api/debug          - Debug information")
    print("\nFrontend Instructions:")
    print("  1. Open index.html in browser")
    print("  2. Select claim type (Car, EV, Flood, etc.)")
    print("  3. Select state and enter claim amount")
    print("  4. Click 'Analyze Case & Search PDFs'")
    print("  5. System shows real PDF content with citations")
    print("  6. Click PDF links to open original documents")
    print("="*60)
    print("🚀 Server starting on http://localhost:5000")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)