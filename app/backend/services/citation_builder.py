
class CitationBuilder:
    @staticmethod
    def format_citation(policy):
        """Format citation for display - SIMPLE VERSION (no NumPy)"""
        try:
            source = policy.get('source', 'Unknown Document')
            page = policy.get('page', 'N/A')
            
            # Simple citation format
            if page != 'N/A' and page is not None:
                return f"{source} (Page {page})"
            else:
                return f"{source}"
                
        except Exception as e:
            print(f"⚠️ Error formatting citation: {e}")
            return "Source document"
    
    @staticmethod
    def highlight_critical_policy(policies, case_context):
        """Identify and highlight critical policies - SIMPLE VERSION (no NumPy)"""
        if not policies:
            return []
        
        # Convert case_context to dict if needed
        if not isinstance(case_context, dict):
            try:
                if hasattr(case_context, '__dict__'):
                    case_context = case_context.__dict__
                else:
                    case_context = {}
            except:
                case_context = {}
        
        critical_keywords = ['must', 'required', 'mandatory', 'shall', 'prohibited']
        amount_keywords = ['$30,000', '30000', 'thirty thousand', 'large claim']
        
        for policy in policies:
            policy['critical'] = False
            
            # Get content safely
            content = policy.get('content', '')
            if not isinstance(content, str):
                continue
            
            content_lower = content.lower()
            
            # Check for critical keywords (SIMPLE - no NumPy)
            for keyword in critical_keywords:
                if keyword in content_lower:
                    policy['critical'] = True
                    break
            
            # Check for high-value claims
            try:
                claim_amount = case_context.get('claim_amount', '0')
                
                # Handle different types
                if isinstance(claim_amount, str):
                    # Remove $ and commas
                    amount_str = claim_amount.replace('$', '').replace(',', '').strip()
                else:
                    amount_str = str(claim_amount)
                
                # Convert to float if possible
                if amount_str and amount_str != '0':
                    amount = float(amount_str)
                    if amount > 30000:
                        # Check if policy mentions large amounts
                        for keyword in amount_keywords:
                            if keyword in content_lower:
                                policy['critical'] = True
                                break
            except (ValueError, TypeError, AttributeError):
                # Skip if conversion fails
                pass
        
        return policies
    
    @staticmethod
    def create_pdf_url(policy):
        """Create PDF URL for frontend"""
        source = policy.get('source', '')
        if source and isinstance(source, str) and source.lower().endswith('.pdf'):
            return f"/api/documents/{source}"
        return ""