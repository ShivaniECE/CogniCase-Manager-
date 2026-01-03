// approval.js - Case Approval Page JavaScript
console.log("✅ Approval page loaded");

class CaseApprovalManager {
    constructor() {
        this.backendUrl = 'http://localhost:5000/api';
        this.currentCase = {};
        this.currentCaseId = null;
        this.initialize();
    }

    initialize() {
        console.log("🔄 Initializing Case Approval Manager...");
        
        // Get case ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.currentCaseId = urlParams.get('case_id') || 'CASE-2024-00158';
        
        // Setup user info
        this.setupUserInfo();
        
        // Load case details
        this.loadCaseForApproval();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupUserInfo() {
        const currentUser = localStorage.getItem('currentUser') || 'Agent';
        const userNameElement = document.getElementById('userName');
        const userInitialElement = document.getElementById('userInitial');
        
        if (userNameElement) userNameElement.textContent = currentUser;
        if (userInitialElement) userInitialElement.textContent = currentUser.charAt(0).toUpperCase();
    }

    async loadCaseForApproval() {
        console.log(`📥 Loading case ${this.currentCaseId} for approval...`);
        
        const loadingElement = document.getElementById('loading-indicator');
        const contentElement = document.getElementById('case-content');
        const errorElement = document.getElementById('error-message');
        
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';
        
        try {
            // Try to get case details from backend
            const response = await fetch(`${this.backendUrl}/get_case_for_approval?case_id=${this.currentCaseId}`);
            
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.case) {
                this.currentCase = data.case;
                console.log("✅ Case loaded:", this.currentCase);
                
                // Update UI with case details
                this.updateCaseUI();
                
                // Find similar cases
                await this.findSimilarPrecedents();
                
                // Show content
                if (loadingElement) loadingElement.style.display = 'none';
                if (contentElement) contentElement.style.display = 'block';
                
            } else {
                throw new Error('Invalid case data received');
            }
            
        } catch (error) {
            console.error("❌ Error loading case:", error);
            
            // Fallback: Use localStorage or mock data
            this.loadFallbackCase();
            
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'block';
        }
    }

    loadFallbackCase() {
        console.log("🔄 Loading fallback case data");
        
        // Try to get from localStorage
        const savedCase = localStorage.getItem('currentCase');
        if (savedCase) {
            try {
                this.currentCase = JSON.parse(savedCase);
                console.log("✅ Using saved case from localStorage");
            } catch (e) {
                console.error("Error parsing saved case:", e);
                this.createMockCase();
            }
        } else {
            this.createMockCase();
        }
    }

    createMockCase() {
        this.currentCase = {
            case_id: this.currentCaseId,
            case_title: 'Car Accident Insurance Claim',
            claim_type: 'Car Insurance',
            state: 'California',
            claim_amount: 45000,
            damage_type: 'Collision',
            policy_number: 'POL-9876-5432-210',
            date_filed: new Date().toISOString().split('T')[0],
            relevant_pdfs: ['car_policy.pdf', 'auto_insurance.pdf'],
            summary: 'This is a car accident claim requiring agent approval.',
            status: 'pending'
        };
    }

    updateCaseUI() {
        // Update case header
        document.getElementById('case-title').textContent = this.currentCase.case_title || 'Untitled Case';
        document.getElementById('case-id').textContent = this.currentCase.case_id || this.currentCaseId;
        
        // Update case information
        document.getElementById('info-claim-type').textContent = this.currentCase.claim_type || 'Not specified';
        document.getElementById('info-state').textContent = this.currentCase.state || 'Not specified';
        
        const amount = this.currentCase.claim_amount || 0;
        document.getElementById('info-amount').textContent = typeof amount === 'number' ? `$${amount.toLocaleString()}` : amount;
        
        document.getElementById('info-damage-type').textContent = this.currentCase.damage_type || 'Not specified';
        document.getElementById('info-policy-number').textContent = this.currentCase.policy_number || 'Not provided';
        document.getElementById('info-date-filed').textContent = this.currentCase.date_filed || 'Unknown';
        
        // Update PDF list
        this.updatePDFList();
    }

    updatePDFList() {
        const container = document.getElementById('pdf-list-container');
        if (!container) return;
        
        const pdfs = this.currentCase.relevant_pdfs || [];
        
        if (pdfs.length === 0) {
            container.innerHTML = '<p style="color: #666; font-style: italic;">No PDFs attached to this case.</p>';
            return;
        }
        
        let html = '';
        pdfs.forEach(pdf => {
            const pdfUrl = `http://localhost:5000/api/documents/${encodeURIComponent(pdf)}`;
            html += `
                <a href="${pdfUrl}" target="_blank" class="pdf-badge">
                    <i class="fas fa-file-pdf"></i>
                    ${pdf}
                </a>
            `;
        });
        
        container.innerHTML = html;
    }

    async findSimilarPrecedents() {
        try {
            const searchData = {
                claim_type: this.currentCase.claim_type,
                state: this.currentCase.state,
                damage_type: this.currentCase.damage_type,
                claim_amount: this.currentCase.claim_amount
            };
            
            const response = await fetch(`${this.backendUrl}/find_similar_precedents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchData)
            });
            
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.similar_cases && data.similar_cases.length > 0) {
                this.displaySimilarCases(data.similar_cases);
            } else {
                // Hide similar cases section
                document.getElementById('similar-cases-section').style.display = 'none';
            }
            
        } catch (error) {
            console.error("❌ Error finding similar precedents:", error);
            document.getElementById('similar-cases-section').style.display = 'none';
        }
    }

    displaySimilarCases(similarCases) {
        const container = document.getElementById('similar-cases-container');
        const section = document.getElementById('similar-cases-section');
        const countElement = document.getElementById('similar-cases-count');
        
        if (!container || !section || !countElement) return;
        
        countElement.textContent = similarCases.length;
        
        let html = '';
        similarCases.forEach((caseItem, index) => {
            const statusClass = caseItem.status === 'approved' ? 'status-approved' : 'status-rejected';
            const statusText = caseItem.status === 'approved' ? 'APPROVED' : 'REJECTED';
            const similarityPercent = Math.round(caseItem.similarity_score || 0);
            
            html += `
                <div class="precedent-card" style="padding: 15px; margin-bottom: 10px; border-radius: 6px; border: 1px solid #e9ecef; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-weight: 600; color: #0066cc;">${caseItem.case_id || `PREC-${index + 1}`}</span>
                        <span class="${statusClass}" style="padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
                            ${statusText}
                        </span>
                    </div>
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 8px;">
                        ${caseItem.claim_type || 'Unknown'} • ${caseItem.state || 'Unknown'} • $${caseItem.claim_amount || 0}
                    </div>
                    ${caseItem.decision_reason ? `
                        <div style="font-size: 0.85rem; color: #495057; background: #f8f9fa; padding: 8px; border-radius: 4px; margin-top: 8px;">
                            <strong>Decision:</strong> ${caseItem.decision_reason}
                        </div>
                    ` : ''}
                    <div style="font-size: 0.8rem; color: #28a745; margin-top: 8px; font-weight: 600;">
                        <i class="fas fa-chart-line"></i> ${similarityPercent}% Similarity Match
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        section.style.display = 'block';
    }

    setupEventListeners() {
        // Approve button
        const approveBtn = document.getElementById('approve-btn');
        if (approveBtn) {
            approveBtn.addEventListener('click', () => this.handleDecision('approved'));
        }
        
        // Reject button
        const rejectBtn = document.getElementById('reject-btn');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => this.handleDecision('rejected'));
        }
    }

    async handleDecision(decision) {
        console.log(`🤔 Agent decision: ${decision}`);
        
        const approveBtn = document.getElementById('approve-btn');
        const rejectBtn = document.getElementById('reject-btn');
        const statusMessage = document.getElementById('status-message');
        const notes = document.getElementById('agent-notes').value;
        
        // Disable buttons during processing
        if (approveBtn) approveBtn.disabled = true;
        if (rejectBtn) rejectBtn.disabled = true;
        
        // Show processing message
        if (statusMessage) {
            statusMessage.style.display = 'block';
            statusMessage.style.background = '#e6f2ff';
            statusMessage.style.color = '#0066cc';
            statusMessage.style.borderRadius = '6px';
            statusMessage.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                Saving decision and updating precedent memory...
            `;
        }
        
        try {
            // Prepare data for saving
            const precedentData = {
                case_id: this.currentCase.case_id || this.currentCaseId,
                case_title: this.currentCase.case_title || 'Untitled Case',
                claim_type: this.currentCase.claim_type,
                state: this.currentCase.state,
                claim_amount: this.currentCase.claim_amount || 0,
                damage_type: this.currentCase.damage_type,
                relevant_pdfs: this.currentCase.relevant_pdfs || [],
                summary: this.currentCase.summary || `Case ${decision} by agent`,
                agent_notes: notes,
                status: decision,
                decision_reason: notes || `Case ${decision} based on policy review`
            };
            
            // Save to precedent memory
            const response = await fetch(`${this.backendUrl}/save_precedent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(precedentData)
            });
            
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`✅ Decision saved:`, result);
            
            // Update status message
            if (statusMessage) {
                if (decision === 'approved') {
                    statusMessage.style.background = '#d4edda';
                    statusMessage.style.color = '#155724';
                    statusMessage.innerHTML = `
                        <i class="fas fa-check-circle"></i>
                        <strong>Case Approved!</strong> Saved to precedent memory. Redirecting...
                    `;
                } else {
                    statusMessage.style.background = '#f8d7da';
                    statusMessage.style.color = '#721c24';
                    statusMessage.innerHTML = `
                        <i class="fas fa-times-circle"></i>
                        <strong>Case Rejected!</strong> Decision saved to precedent memory. Redirecting...
                    `;
                }
            }
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'cases.html';
            }, 2000);
            
        } catch (error) {
            console.error("❌ Error saving decision:", error);
            
            // Re-enable buttons
            if (approveBtn) approveBtn.disabled = false;
            if (rejectBtn) rejectBtn.disabled = false;
            
            // Show error message
            if (statusMessage) {
                statusMessage.style.background = '#f8d7da';
                statusMessage.style.color = '#721c24';
                statusMessage.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Error:</strong> Could not save decision. ${error.message}
                `;
            }
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 Approval page DOM loaded");
    try {
        window.approvalManager = new CaseApprovalManager();
        console.log("🎉 Approval manager started");
    } catch (error) {
        console.error("💥 Failed to start approval manager:", error);
        alert("Failed to initialize approval page. Check console for details.");
    }
});