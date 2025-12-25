import json

class MyContextParser:
    def __init__(self):
        self.important_fields = [
            'claim_type', 'state', 'claim_amount', 
            'policy_type', 'customer_state', 'incident_date'
        ]
    
    def extract_from_case_data(self, case_data):
        """Extract relevant context from Appian case"""
        context = {}
        
        # Map common case fields
        if isinstance(case_data, dict):
            # Extract from structured data
            for field in self.important_fields:
                if field in case_data:
                    context[field] = case_data[field]
            
            # Fallback to manual mapping
            context['claim_type'] = case_data.get('Claim Type', case_data.get('claim_type'))
            context['state'] = case_data.get('State', case_data.get('state'))
            context['claim_amount'] = case_data.get('Claim Amount', case_data.get('claim_amount'))
            
        elif isinstance(case_data, str):
            # Parse from text
            import re
            patterns = {
                'claim_type': r'Claim Type:\s*([^\n]+)',
                'state': r'State:\s*([^\n]+)',
                'claim_amount': r'Claim Amount:\s*\$?([\d,]+)'
            }
            for key, pattern in patterns.items():
                match = re.search(pattern, case_data, re.IGNORECASE)
                if match:
                    context[key] = match.group(1).strip()
        
        return context
    
    def build_query_from_context(self, context):
        """Build search queries from context"""
        queries = []
        
        if context.get('claim_type'):
            queries.append(f"{context['claim_type']} insurance policy")
        
        if context.get('state'):
            queries.append(f"{context['state']} state regulations")
        
        if context.get('claim_amount'):
            amount = float(context['claim_amount'].replace('$', '').replace(',', ''))
            if amount > 30000:
                queries.append("large claim requirements documentation")
        
        # Combine all context
        combined_query = " ".join([
            context.get('claim_type', ''),
            context.get('state', ''),
            "insurance claim regulations"
        ])
        queries.append(combined_query)
        
        return queries