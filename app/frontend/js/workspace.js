// workspace.js - USER INPUT VERSION with PDF PORT FIX
console.log("🚀 Appian Knowledge Assistant JS loaded");

class AppianKnowledgeAssistant {
    constructor() {
        this.backendUrl = 'http://localhost:5000/api';
        this.currentCase = {};
        console.log("✅ Assistant initialized");
        this.initialize();
    }

    initialize() {
        console.log("🔄 Setting up event listeners...");
        
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
        
        // Check backend connection
        this.checkBackendConnection();
        
        // Load available PDFs
        this.loadAvailablePDFs();
    }

    setupEventListeners() {
        console.log("🔗 Connecting form elements...");
        
        // Analyze button
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleUserInput();
            });
            console.log("✅ Analyze button connected");
        }
        
        // Clear button
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearForm();
            });
            console.log("✅ Clear button connected");
        }
        
        // Form inputs for real-time validation
        const inputs = ['claim-type', 'state', 'claim-amount', 'policy-number', 'damage-type'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.validateForm());
            }
        });
    }

    handleUserInput() {
        console.log("👤 Processing user input...");
        
        // Get values from form
        const claimType = document.getElementById('claim-type').value;
        const state = document.getElementById('state').value;
        const claimAmount = document.getElementById('claim-amount').value;
        const policyNumber = document.getElementById('policy-number').value;
        const damageType = document.getElementById('damage-type').value;
        
        // Validate required fields
        if (!claimType || !state) {
            this.showError("⚠️ Please select Claim Type and State");
            return;
        }
        
        // Create case object from user input
        this.currentCase = {
            "Claim Type": claimType,
            "State": state,
            "Claim Amount": claimAmount ? `$${parseInt(claimAmount).toLocaleString()}` : "Not specified",
            "Policy Number": policyNumber || "Not provided",
            "Damage Type": damageType || "Not specified",
            "Date Filed": new Date().toLocaleDateString('en-US', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            }),
            "Case ID": `CASE-${Date.now().toString().slice(-6)}`
        };
        
        console.log("📝 User case data:", this.currentCase);
        
        // Show active case
        this.displayActiveCase();
        
        // Start analysis
        this.analyzeCase();
    }

    displayActiveCase() {
        const container = document.getElementById('case-details');
        const displaySection = document.getElementById('active-case-display');
        
        if (!container || !displaySection) return;
        
        let html = '';
        for (const [key, value] of Object.entries(this.currentCase)) {
            if (value) {
                html += `<p><strong>${key}:</strong> ${value}</p>`;
            }
        }
        
        container.innerHTML = html;
        displaySection.style.display = 'block';
    }

    validateForm() {
        const claimType = document.getElementById('claim-type').value;
        const state = document.getElementById('state').value;
        const analyzeBtn = document.getElementById('analyze-btn');
        
        if (analyzeBtn) {
            analyzeBtn.disabled = !(claimType && state);
            analyzeBtn.style.opacity = (claimType && state) ? '1' : '0.6';
        }
    }

    clearForm() {
        console.log("🗑️ Clearing form...");
        
        document.getElementById('claim-type').value = '';
        document.getElementById('state').value = '';
        document.getElementById('claim-amount').value = '';
        document.getElementById('policy-number').value = '';
        document.getElementById('damage-type').value = '';
        
        // Hide results sections
        document.getElementById('active-case-display').style.display = 'none';
        document.getElementById('search-summary').style.display = 'none';
        document.getElementById('case-context-summary').style.display = 'none';
        document.getElementById('suggested-actions').style.display = 'none';
        document.getElementById('precedents-section').style.display = 'none';
        document.getElementById('policies-section').style.display = 'none';
        
        // Reset policies container
        const policiesContainer = document.getElementById('policies-container');
        if (policiesContainer) {
            policiesContainer.innerHTML = '<p class="initial-message">Form cleared. Enter new case details.</p>';
        }
        
        this.showMessage("Form cleared. Enter new case details.");
    }

    async analyzeCase() {
        console.log("🔍 Starting case analysis with user input...");
        
        if (!this.currentCase || Object.keys(this.currentCase).length === 0) {
            this.showError("No case data available. Please fill the form.");
            return;
        }
        
        try {
            this.showLoading(true, `Searching for "${this.currentCase['Claim Type']}" policies...`);
            
            console.log("📤 Sending to backend:", this.currentCase);
            
            const response = await fetch(`${this.backendUrl}/analyze-case`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    case_data: this.currentCase 
                })
            });

            console.log(`📡 Response status: ${response.status}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log("✅ Backend response received:", data);
            
            // Show all result sections
            this.showResultSections();
            
            // Update UI with results
            this.updateCaseContext(data.case_context || {});
            this.updatePrecedents(data.precedents || []);
            this.updatePolicies(data.policies || []);
            this.updateSuggestedActions(data.suggested_actions || []);
            
            // Show search summary
            this.showSearchSummary(data);
            
            console.log("🎉 Analysis completed successfully");
            
        } catch (error) {
            console.error("❌ Analysis failed:", error);
            this.showError(`Analysis failed: ${error.message}. Please try again.`);
            
            // Show fallback data
            this.useFallbackData();
        } finally {
            this.showLoading(false);
        }
    }

    showResultSections() {
        // Show all result sections
        const sections = [
            'case-context-summary',
            'suggested-actions', 
            'precedents-section',
            'policies-section',
            'search-summary'
        ];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'block';
            }
        });
    }

    showSearchSummary(data) {
        const container = document.getElementById('results-summary');
        const section = document.getElementById('search-summary');
        
        if (!container || !section) return;
        
        const policiesCount = data.policies?.length || 0;
        const precedentsCount = data.precedents?.length || 0;
        const queries = data.search_info?.queries_used || [];
        
        let html = `
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-number">${policiesCount}</span>
                    <span class="summary-label">PDF Excerpts Found</span>
                </div>
                <div class="summary-item">
                    <span class="summary-number">${precedentsCount}</span>
                    <span class="summary-label">Similar Cases</span>
                </div>
                <div class="summary-item">
                    <span class="summary-number">${queries.length}</span>
                    <span class="summary-label">Search Terms Used</span>
                </div>
            </div>
        `;
        
        if (queries.length > 0) {
            html += `<p class="search-terms"><strong>Searched for:</strong> ${queries.join(', ')}</p>`;
        }
        
        container.innerHTML = html;
        section.style.display = 'block';
    }

    updateCaseContext(context) {
        console.log("📋 Updating case context:", context);
        const container = document.getElementById('context-content');
        const section = document.getElementById('case-context-summary');
        
        if (!container || !section) return;
        
        if (!context || Object.keys(context).length === 0) {
            container.innerHTML = '<p>No context extracted.</p>';
            return;
        }
        
        let html = '<ul>';
        for (const [key, value] of Object.entries(context)) {
            if (value) {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                html += `<li><strong>${formattedKey}:</strong> ${value}</li>`;
            }
        }
        html += '</ul>';
        
        container.innerHTML = html;
        section.style.display = 'block';
    }

    updatePrecedents(precedents) {
        console.log(`📂 Updating ${precedents.length} precedents`);
        const container = document.getElementById('precedents-container');
        const section = document.getElementById('precedents-section');
        
        if (!container || !section) return;
        
        if (!precedents || precedents.length === 0) {
            container.innerHTML = '<div class="no-data"><p>No similar historical cases found.</p></div>';
            section.style.display = 'block';
            return;
        }
        
        let html = '';
        precedents.forEach(precedent => {
            const statusClass = precedent.status === 'approved' ? 'approved' : 'rejected';
            const similarityPercent = Math.round((precedent.similarity_score || 0) * 100);
            
            html += `
                <div class="precedent ${statusClass}">
                    <div class="precedent-header">
                        <span class="case-id"><strong>${precedent.case_id || 'Unknown'}</strong></span>
                        <span class="status-badge ${statusClass}">${precedent.status?.toUpperCase() || 'UNKNOWN'}</span>
                        <span class="similarity">${similarityPercent}% match</span>
                    </div>
                    <p class="decision">${precedent.decision_reason || 'No decision reason available'}</p>
                    ${precedent.claim_amount ? `
                        <div class="case-details">
                            <small>Amount: $${precedent.claim_amount.toLocaleString()} • Type: ${precedent.claim_type || 'Unknown'} • State: ${precedent.state || 'Unknown'}</small>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
        section.style.display = 'block';
    }

    updatePolicies(policies) {
    console.log(`📜 Updating ${policies?.length || 0} policies from PDFs`);
    
    const container = document.getElementById('policies-container');
    if (!container) return;
    
    if (!policies || policies.length === 0) {
        container.innerHTML = '<div class="no-data"><p>No relevant policies found in documents.</p></div>';
        return;
    }
    
    let html = '';
    policies.forEach((policy, index) => {
        const criticalClass = policy.critical ? 'critical' : '';
        const relevancePercent = Math.round((policy.relevance_score || 0) * 100);
        const policyNumber = index + 1;
        
        // SIMPLIFIED: Always use localhost:5000 for PDFs (Flask backend)
        let pdfUrl = '';
        let pdfFilename = '';
        
        // Option 1: Use pdf_url if provided by backend
        if (policy.pdf_url) {
            pdfUrl = policy.pdf_url;
            // Extract filename from URL
            const urlParts = pdfUrl.split('/');
            pdfFilename = urlParts[urlParts.length - 1];
        } 
        // Option 2: Extract from source/filename
        else if (policy.source || policy.filename) {
            const source = policy.source || policy.filename;
            // Extract just filename from any path
            pdfFilename = source.split(/[\\\/]/).pop();
            // Force PDF extension if missing
            if (!pdfFilename.toLowerCase().endsWith('.pdf')) {
                pdfFilename += '.pdf';
            }
            // Always use localhost:5000
            pdfUrl = `http://localhost:5000/api/documents/${encodeURIComponent(pdfFilename)}`;
        }
        // Option 3: Fallback
        else {
            pdfFilename = 'document.pdf';
            pdfUrl = `http://localhost:5000/api/documents/${pdfFilename}`;
        }
        
        const pageNum = policy.page || 1;
        
        html += `
            <div class="policy ${criticalClass}" data-index="${index}">
                <div class="policy-header">
                    <span class="policy-number">${policyNumber}️⃣</span>
                    <span class="relevance ${relevancePercent > 80 ? 'relevance-high' : relevancePercent > 60 ? 'relevance-medium' : 'relevance-low'}">
                        ${relevancePercent}% relevant
                    </span>
                    ${policy.critical ? '<span class="critical-badge">CRITICAL</span>' : ''}
                </div>
                <p class="policy-content">${policy.content || 'No content available'}</p>
                <div class="citation">
                    <small><strong>Source:</strong> ${pdfFilename}</small>
                    <small><strong>Page:</strong> ${pageNum}</small>
                </div>
                <div class="pdf-link">
                    <div style="display: flex; gap: 10px; margin: 10px 0; flex-wrap: wrap;">
                        <!-- PDF Link 1: Direct link -->
                        <a href="${pdfUrl}" 
                           target="_blank" 
                           style="padding: 8px 12px; background: #4299e1; color: white; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
                            📄 Open ${pdfFilename}
                        </a>
                        
                        <!-- PDF Link 2: Test button -->
                        <button onclick="testDirectPDF('${pdfUrl}', '${pdfFilename}')" 
                                style="padding: 8px 12px; background: #718096; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            🔍 Test PDF Link
                        </button>
                    </div>
                    
                    <small style="display: block; color: #666; margin-top: 5px;">
                        Serving from: <code>localhost:5000</code> | File: <code>${pdfFilename}</code>
                    </small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    console.log(`✅ Updated policies container with ${policies.length} items`);
}

    addPDFViewerStyles() {
        if (!document.getElementById('pdf-viewer-styles')) {
            const style = document.createElement('style');
            style.id = 'pdf-viewer-styles';
            style.textContent = `
                .pdf-actions {
                    display: flex;
                    gap: 8px;
                    margin: 10px 0;
                    flex-wrap: wrap;
                }
                .pdf-btn {
                    padding: 8px 12px;
                    background: #4299e1;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                .pdf-btn:hover {
                    background: #3182ce;
                    transform: translateY(-1px);
                }
                .test-btn {
                    background: #718096;
                }
                .test-btn:hover {
                    background: #4a5568;
                }
                .pdf-viewer-container {
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-top: 10px;
                }
                .pdf-viewer-header {
                    background: #f7fafc;
                    padding: 8px 12px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 14px;
                    color: #4a5568;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .pdf-viewer-footer {
                    background: #f7fafc;
                    padding: 8px 12px;
                    border-top: 1px solid #e2e8f0;
                    font-size: 12px;
                    color: #718096;
                    text-align: center;
                }
                .port-info {
                    display: block;
                    margin-top: 5px;
                    color: #718096;
                    font-size: 12px;
                }
                .citation {
                    background: #f8f9fa;
                    padding: 8px 12px;
                    border-radius: 4px;
                    margin: 8px 0;
                    border-left: 3px solid #4299e1;
                }
                .relevance-high {
                    color: #e53e3e;
                    font-weight: bold;
                }
                .relevance-medium {
                    color: #d69e2e;
                    font-weight: bold;
                }
                .relevance-low {
                    color: #38a169;
                    font-weight: bold;
                }
                .critical-badge {
                    background: #e53e3e;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-left: 8px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    updateSuggestedActions(actions) {
        console.log(`🚀 Updating ${actions.length} suggested actions`);
        const container = document.getElementById('actions-content');
        const section = document.getElementById('suggested-actions');
        
        if (!container || !section) return;
        
        if (!actions || actions.length === 0) {
            container.innerHTML = '<p>No specific actions suggested.</p>';
            section.style.display = 'block';
            return;
        }
        
        let html = '<ul class="actions-list">';
        actions.forEach(action => {
            const isWarning = action.includes('⚠️') || action.toLowerCase().includes('critical') || action.toLowerCase().includes('required');
            const icon = isWarning ? '⚠️' : '✓';
            html += `<li class="${isWarning ? 'action-warning' : 'action-success'}">${icon} ${action}</li>`;
        });
        html += '</ul>';
        
        container.innerHTML = html;
        section.style.display = 'block';
    }

    async checkBackendConnection() {
        try {
            const response = await fetch(`${this.backendUrl}/health`);
            const data = await response.json();
            
            const statusElement = document.getElementById('backend-status');
            if (statusElement) {
                statusElement.textContent = `Backend: Connected ✓ (Port 5000)`;
                statusElement.style.color = '#48bb78';
            }
            
            console.log("✅ Backend connected:", data);
            return true;
        } catch (error) {
            console.error("❌ Backend not connected:", error);
            
            const statusElement = document.getElementById('backend-status');
            if (statusElement) {
                statusElement.textContent = `Backend: Not connected ✗ (Check port 5000)`;
                statusElement.style.color = '#f56565';
            }
            
            this.showError("Cannot connect to Flask backend server on port 5000. Make sure Flask is running.");
            return false;
        }
    }

    async loadAvailablePDFs() {
    try {
        const response = await fetch(`${this.backendUrl}/list-pdfs`);
        const data = await response.json();
        
        const pdfCount = data.pdf_count || 0;
        const pdfList = data.pdfs || [];
        
        // Update PDF count display
        const countElement = document.getElementById('pdf-count');
        if (countElement) {
            countElement.textContent = `📄 ${pdfCount} PDFs loaded | Port: 5000`;
        }
        
        // Show PDF list
        const container = document.getElementById('pdf-list-container');
        const section = document.getElementById('pdf-list-section');
        
        if (container && section && pdfList.length > 0) {
            let html = '<p><strong>Available PDFs:</strong></p><div style="display: flex; flex-direction: column; gap: 5px; margin-top: 10px;">';
            pdfList.forEach((pdf, index) => {
                const pdfUrl = `http://localhost:5000/api/documents/${encodeURIComponent(pdf.filename)}`;
                html += `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 5px; border-bottom: 1px solid #eee;">
                        <span>${index + 1}. ${pdf.filename}</span>
                        <a href="${pdfUrl}" 
                           target="_blank" 
                           style="padding: 4px 8px; background: #4299e1; color: white; border-radius: 3px; text-decoration: none; font-size: 12px;">
                            Open
                        </a>
                    </div>
                `;
            });
            html += '</div>';
            
            container.innerHTML = html;
            section.style.display = 'block';
        }
        
    } catch (error) {
        console.error("❌ Could not load PDF list:", error);
    }
}


    useFallbackData() {
        console.log("🔄 Using fallback data");
        
        const claimType = this.currentCase['Claim Type'] || 'Insurance';
        
        // Show result sections
        this.showResultSections();
        
        // Update with fallback data
        this.updatePolicies([{
            content: `This would show actual content from your ${claimType} policy PDFs. Make sure PDFs are in the correct folder and contain searchable text.`,
            source: 'car_policy.pdf',
            page: 1,
            relevance_score: 0.8,
            citation: 'PDF document (Page 1)',
            pdf_url: 'http://localhost:5000/api/documents/car_policy.pdf'
        }]);
        
        this.updateCaseContext(this.currentCase);
        this.updateSuggestedActions([
            "✓ Check that PDFs are in app/backend/data/documents/ folder",
            "✓ Ensure PDFs have extractable text (not scanned images)",
            `✓ PDFs should contain information about "${claimType}" claims`,
            "✓ Backend Flask server should be running on port 5000"
        ]);
    }

    showLoading(show, message = "Processing...") {
        const loader = document.getElementById('loading-indicator');
        const details = document.getElementById('loading-details');
        
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
        
        if (details && message) {
            details.textContent = message;
        }
    }

    showError(message) {
        console.error("🚨 Error:", message);
        
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.innerHTML = `
                <div class="error-content">
                    <strong>⚠️ Error:</strong> ${message}
                </div>
            `;
            errorDiv.style.display = 'block';
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 10000);
        }
    }

    showMessage(message) {
        const lastUpdated = document.getElementById('last-updated');
        if (lastUpdated) {
            lastUpdated.textContent = message;
            lastUpdated.style.color = '#4299e1';
        }
    }
}
// Add to your initialize() method or as a global function
async function checkAllPDFsInFolder() {
    try {
        console.log("📁 Checking all PDFs in documents folder...");
        
        const response = await fetch('http://localhost:5000/api/list-pdfs');
        const data = await response.json();
        
        console.log("📦 Available PDFs:", data);
        
        if (data.pdfs && data.pdfs.length > 0) {
            console.log(`📊 Found ${data.pdfs.length} PDFs:`);
            data.pdfs.forEach((pdf, index) => {
                console.log(`${index + 1}. ${pdf.filename} (${Math.round(pdf.size / 1024)} KB)`);
            });
            
            // Test the first PDF
            if (data.pdfs[0]) {
                const firstPdf = data.pdfs[0];
                const pdfUrl = `http://localhost:5000/api/documents/${encodeURIComponent(firstPdf.filename)}`;
                console.log(`🔗 Testing first PDF: ${pdfUrl}`);
                testPDFLink(pdfUrl, firstPdf.filename);
            }
        } else {
            console.error("❌ No PDFs found in documents folder");
            alert("No PDFs found in backend/data/documents/ folder!\n\nPlease add PDF files like:\n- car_policy.pdf\n- EV_policy.pdf\n- flood_insurance.pdf");
        }
    } catch (error) {
        console.error("❌ Error checking PDFs:", error);
    }
}

// You can call this from console or add a button
window.checkAllPDFsInFolder = checkAllPDFsInFolder;

// ===== GLOBAL HELPER FUNCTIONS FOR PDF HANDLING =====

function openPDFInNewTab(pdfUrl) {
    console.log(`Opening PDF in new tab: ${pdfUrl}`);
    
    // Test if URL is accessible first
    testPDFLink(pdfUrl);
    
    // Open in new tab after a short delay
    setTimeout(() => {
        const newWindow = window.open(pdfUrl, '_blank');
        
        // If popup blocked, show alternative
        if (!newWindow || newWindow.closed) {
            showPopupBlockedMessage(pdfUrl);
        }
    }, 500);
}

function showPopupBlockedMessage(pdfUrl) {
    // Create a temporary message
    const tempDiv = document.createElement('div');
    tempDiv.id = 'popup-blocked-message';
    tempDiv.innerHTML = `
        <div style="position:fixed; top:20px; right:20px; background:#fff3cd; 
                    padding:15px; border:1px solid #ffeaa7; border-radius:4px; 
                    z-index:1000; max-width:400px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <strong>⚠️ Pop-up Blocked</strong>
            <p>Right-click and "Open link in new tab":</p>
            <a href="${pdfUrl}" target="_blank" 
               style="color:#4299e1; word-break:break-all; display:block; margin:10px 0; padding:8px; background:#f8f9fa; border-radius:3px;">
               ${pdfUrl}
            </a>
            <div style="display:flex; gap:10px;">
                <button onclick="copyToClipboard('${pdfUrl}')" 
                        style="padding:5px 10px; background:#4299e1; color:white; border:none; border-radius:3px; cursor:pointer;">
                    Copy Link
                </button>
                <button onclick="document.getElementById('popup-blocked-message').remove()" 
                        style="padding:5px 10px; background:#f56565; color:white; border:none; border-radius:3px; cursor:pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(tempDiv);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
    });
}

function togglePDFViewer(viewerId, pdfUrl) {
    const viewer = document.getElementById(viewerId);
    if (!viewer) return;
    
    if (viewer.style.display === 'none' || viewer.style.display === '') {
        viewer.style.display = 'block';
        
        // Create better error handling
        const iframe = viewer.querySelector('iframe');
        if (iframe) {
            iframe.onload = function() {
                console.log("✅ PDF iframe loaded for:", pdfUrl);
                showPDFStatus(viewerId, 'success', 'PDF loaded successfully');
            };
            
            iframe.onerror = function() {
                console.error("❌ PDF iframe failed to load:", pdfUrl);
                showPDFStatus(viewerId, 'error', `Failed to load PDF: ${pdfUrl}`);
            };
            
            // Force reload with timestamp to avoid cache issues
            const timestamp = new Date().getTime();
            const separator = iframe.src.includes('?') ? '&' : '?';
            iframe.src = pdfUrl + separator + '_t=' + timestamp;
        }
        
        // Test the link
        testPDFLink(pdfUrl);
    } else {
        viewer.style.display = 'none';
    }
}

function showPDFStatus(viewerId, type, message) {
    const viewer = document.getElementById(viewerId);
    if (!viewer) return;
    
    const statusDiv = document.createElement('div');
    statusDiv.className = `pdf-status pdf-status-${type}`;
    statusDiv.innerHTML = message;
    
    viewer.appendChild(statusDiv);
    
    setTimeout(() => {
        if (statusDiv.parentNode) {
            statusDiv.parentNode.removeChild(statusDiv);
        }
    }, 5000);
}

function closePDFViewer(viewerId) {
    const viewer = document.getElementById(viewerId);
    if (viewer) {
        viewer.style.display = 'none';
    }
}

// Global function to test PDF links
window.testPDFLink = function(url, filename = 'PDF') {
    console.log(`🔗 Testing PDF link for ${filename}:`, url);
    
    // Create or get status div
    let statusDiv = document.getElementById('pdf-test-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'pdf-test-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1001;
            max-width: 400px;
            border-left: 4px solid orange;
            font-family: monospace;
            font-size: 12px;
        `;
        document.body.appendChild(statusDiv);
    }
    
    statusDiv.innerHTML = `
        <div style="color:orange; font-weight:bold;">⏳ Testing: ${filename}</div>
        <div style="margin-top:5px; word-break:break-all;">${url}</div>
    `;
    
    // Test with fetch
    fetch(url, { method: 'HEAD' })
        .then(response => {
            console.log(`PDF test response for ${filename}:`, response.status, response.statusText);
            
            if (response.ok) {
                statusDiv.innerHTML = `
                    <div style="color:green; font-weight:bold;">✅ ${filename} ACCESSIBLE</div>
                    <div style="margin-top:5px; word-break:break-all;">
                        <a href="${url}" target="_blank" style="color:#4299e1;">${url}</a>
                    </div>
                    <div style="margin-top:5px; font-size:11px;">
                        Status: ${response.status} ${response.statusText}<br>
                        Content-Type: ${response.headers.get('content-type') || 'unknown'}
                    </div>
                    <button onclick="window.open('${url}', '_blank')" 
                            style="margin-top:10px; padding:5px 10px; background:#38a169; color:white; border:none; border-radius:3px; cursor:pointer;">
                        Open Now
                    </button>
                `;
                statusDiv.style.borderLeftColor = 'green';
            } else {
                statusDiv.innerHTML = `
                    <div style="color:red; font-weight:bold;">❌ ${filename} NOT FOUND</div>
                    <div style="margin-top:5px; word-break:break-all;">${url}</div>
                    <div style="margin-top:5px; font-size:11px;">
                        Status: ${response.status} ${response.statusText}<br>
                        <strong>Common issues:</strong>
                        <ul style="margin:5px 0; padding-left:15px;">
                            <li>PDF file not in backend/data/documents/</li>
                            <li>Wrong filename case (car_policy.pdf vs Car_Policy.pdf)</li>
                            <li>Spaces in filename need encoding</li>
                        </ul>
                    </div>
                `;
                statusDiv.style.borderLeftColor = 'red';
            }
            
            // Hide status after 8 seconds
            setTimeout(() => {
                statusDiv.style.opacity = '0';
                statusDiv.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    if (statusDiv.parentNode) {
                        statusDiv.parentNode.removeChild(statusDiv);
                    }
                }, 500);
            }, 8000);
        })
        .catch(error => {
            console.error(`PDF test failed for ${filename}:`, error);
            statusDiv.innerHTML = `
                <div style="color:red; font-weight:bold;">❌ CONNECTION FAILED</div>
                <div style="margin-top:5px; word-break:break-all;">${url}</div>
                <div style="margin-top:5px; font-size:11px;">
                    Error: ${error.message}<br>
                    <strong>Check:</strong>
                    <ul style="margin:5px 0; padding-left:15px;">
                        <li>Flask running on port 5000? (python app.py)</li>
                        <li>CORS issues? Check Flask CORS settings</li>
                        <li>Network firewall blocking port 5000?</li>
                    </ul>
                </div>
            `;
            statusDiv.style.borderLeftColor = 'red';
            
            // Hide status after 8 seconds
            setTimeout(() => {
                statusDiv.style.opacity = '0';
                statusDiv.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    if (statusDiv.parentNode) {
                        statusDiv.parentNode.removeChild(statusDiv);
                    }
                }, 500);
            }, 8000);
        });
};

// Test all PDFs function
window.testAllPDFs = function() {
    console.log("🧪 Testing all PDF links...");
    
    // Get all PDF URLs from the page
    const pdfLinks = document.querySelectorAll('.pdf-btn');
    console.log(`Found ${pdfLinks.length} PDF links`);
    
    if (pdfLinks.length === 0) {
        alert("No PDF links found on the page");
        return;
    }
    
    // Test each one
    let accessible = 0;
    let failed = 0;
    
    pdfLinks.forEach((btn, index) => {
        setTimeout(() => {
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr) {
                // Extract URL from onclick
                const urlMatch = onclickAttr.match(/openPDFInNewTab\('([^']+)'\)/);
                if (urlMatch && urlMatch[1]) {
                    console.log(`Testing PDF ${index + 1}: ${urlMatch[1]}`);
                    testPDFLink(urlMatch[1]);
                }
            }
        }, index * 1000); // Stagger tests by 1 second
    });
    
    console.log(`Started testing ${pdfLinks.length} PDF links`);
};

// Initialize when page loads
console.log("🏁 Starting application...");
console.log("Frontend: localhost:8000 | Backend: localhost:5000");

window.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM fully loaded");
    try {
        window.knowledgeAssistant = new AppianKnowledgeAssistant();
        console.log("🎉 Assistant started successfully");
        
        // Add connection info to console
        console.log("%c🌐 Connection Info:", "color: blue; font-weight: bold");
        console.log("Frontend: http://localhost:8000");
        console.log("Backend API: http://localhost:5000/api");
        console.log("PDF Files: http://localhost:5000/api/documents/[filename]");
        
        // Test backend connection immediately
        console.log("🔗 Testing backend connection...");
        fetch('http://localhost:5000/api/health')
            .then(response => response.json())
            .then(data => {
                console.log("✅ Backend health:", data);
                
                if (data.pdf_search && data.documents_loaded > 0) {
                    console.log(`✅ ${data.documents_loaded} PDF documents ready for search`);
                } else {
                    console.warn("⚠️ No PDF documents loaded. Check backend/data/documents/ folder");
                }
            })
            .catch(error => {
                console.error("❌ Backend not reachable:", error);
                alert("⚠️ Cannot connect to Flask backend on port 5000\n\nPlease run: python app.py");
            });
        
    } catch (error) {
        console.error("💥 Failed to start assistant:", error);
        alert("Failed to initialize application. Check console for details.");
    }
});

// Add global error handler
window.addEventListener('error', function(event) {
    console.error("Global error:", event.error);
});

// Add PDF status styles
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .pdf-status {
            padding: 10px;
            margin: 5px 0;
            border-radius: 4px;
            font-size: 12px;
        }
        .pdf-status-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .pdf-status-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .pdf-list li {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
    `;
    document.head.appendChild(style);
    // Simple direct PDF testing
window.testDirectPDF = function(pdfUrl, filename) {
    console.log(`Testing PDF: ${filename}`);
    console.log(`URL: ${pdfUrl}`);
    
    // Open in new tab
    const newTab = window.open(pdfUrl, '_blank');
    
    // If blocked, show message
    if (!newTab) {
        alert(`Pop-up blocked! Please allow pop-ups or right-click and "Open link in new tab" for:\n\n${pdfUrl}`);
        
        // Create visible link
        const linkDiv = document.createElement('div');
        linkDiv.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            background: #fff3cd;
            padding: 15px;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        linkDiv.innerHTML = `
            <strong>📄 PDF Link for ${filename}</strong>
            <p style="margin: 10px 0; word-break: break-all;">
                <a href="${pdfUrl}" target="_blank" style="color: #4299e1;">
                    ${pdfUrl}
                </a>
            </p>
            <button onclick="this.parentElement.remove()" 
                    style="padding: 5px 10px; background: #f56565; color: white; border: none; border-radius: 3px; cursor: pointer;">
                Close
            </button>
        `;
        document.body.appendChild(linkDiv);
    }
};
});