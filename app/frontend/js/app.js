// ============================================
// COMMON JAVASCRIPT FUNCTIONS FOR ALL PAGES
// ============================================

// ===== 1. LOGIN PAGE FUNCTIONS =====
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    const loginBtn = document.getElementById('loginBtn');
    
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Stop page reload
        
        // Get form values
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Simple validation
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        
        // Show loading state
        if (loginBtn) {
            const originalText = loginBtn.innerHTML;
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<div class="spinner"></div> Logging in...';
        }
        
        // Simulate login process
        setTimeout(function() {
            // Store user info
            localStorage.setItem('currentUser', username);
            
            // Redirect to dashboard
            window.location.href = "cases.html";
        }, 1000);
    });
    
    // Allow Enter key to submit form
    document.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
}

// ===== 2. DASHBOARD PAGE FUNCTIONS =====
function initDashboard() {
    // Set current user from localStorage
    const currentUser = localStorage.getItem('currentUser') || 'Agent';
    const userNameElement = document.getElementById('userName');
    const userInitialElement = document.getElementById('userInitial');
    
    if (userNameElement) userNameElement.textContent = currentUser;
    if (userInitialElement) userInitialElement.textContent = currentUser.charAt(0).toUpperCase();
    
    // ========== SIDEBAR SWITCHING ==========
    const sidebarItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            sidebarItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.remove('active'));
            
            // Show selected section
            const sectionId = this.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) targetSection.classList.add('active');
            
            // If showing cases section, load cases
            if (sectionId === 'all-cases') {
                loadCases();
            }
        });
    });
    
    // ========== USER DROPDOWN ==========
    const userBtn = document.querySelector('.user-btn');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    if (userBtn && dropdownMenu) {
        userBtn.addEventListener('click', function() {
            dropdownMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (userBtn && dropdownMenu) {
                if (!userBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
                    dropdownMenu.classList.remove('show');
                }
            }
        });
    }
    
    // ========== LOGOUT FUNCTIONALITY ==========
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }
    
    // ========== SEARCH FUNCTIONALITY ==========
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Simple search functionality
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#casesTableBody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
    
    // Load cases when page loads
    loadCases();
}

// ===== 3. LOAD CASES FUNCTION =====
function loadCases() {
    const casesData = [
        { 
            id: 'CASE-1001', 
            title: 'Car Accident Insurance Claim', 
            status: 'Open', 
            priority: 'High', 
            updated: '2024-01-15',
            claimType: 'Car Insurance',
            state: 'California',
            amount: '$45,000',
            damage: 'Collision'
        },
        { 
            id: 'CASE-1002', 
            title: 'EV Battery Damage Claim', 
            status: 'In Progress', 
            priority: 'High', 
            updated: '2024-01-14',
            claimType: 'EV Insurance',
            state: 'Texas',
            amount: '$65,000',
            damage: 'Battery Failure'
        },
        { 
            id: 'CASE-1003', 
            title: 'Flood Damage Home Insurance', 
            status: 'Open', 
            priority: 'Medium', 
            updated: '2024-01-13',
            claimType: 'Flood Insurance',
            state: 'Florida',
            amount: '$85,000',
            damage: 'Water Damage'
        },
        { 
            id: 'CASE-1004', 
            title: 'Health Insurance Medical Claim', 
            status: 'Closed', 
            priority: 'Medium', 
            updated: '2024-01-12',
            claimType: 'Health Insurance',
            state: 'New York',
            amount: '$25,000',
            damage: 'Medical'
        },
        { 
            id: 'CASE-1005', 
            title: 'Motor Car Theft Insurance Claim', 
            status: 'Open', 
            priority: 'High', 
            updated: '2024-01-11',
            claimType: 'Car Insurance',
            state: 'Illinois',
            amount: '$35,000',
            damage: 'Theft'
        },
        { 
            id: 'CASE-1006', 
            title: 'High-Value Car Insurance Claim', 
            status: 'Open', 
            priority: 'High', 
            updated: '2024-01-10',
            claimType: 'Car Insurance',
            state: 'California',
            amount: '$120,000',
            damage: 'Total Loss'
        },
        { 
            id: 'CASE-1007', 
            title: 'EV Charging Station Fire', 
            status: 'In Progress', 
            priority: 'Critical', 
            updated: '2024-01-09',
            claimType: 'EV Insurance',
            state: 'Arizona',
            amount: '$95,000',
            damage: 'Fire Damage'
        },
        { 
            id: 'CASE-1007', 
            title: 'Private Car Accident Claim', 
            status: 'In Progress', 
            priority: 'Critical', 
            updated: '2024-01-09',
            claimType: 'Car Insurance',
            state: 'Delhi',
            amount: '$95,000',
            damage: 'Accident'
        }
    ];
    
    const tableBody = document.getElementById('casesTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    casesData.forEach(caseItem => {
        const row = document.createElement('tr');
        row.dataset.caseData = JSON.stringify(caseItem);
        
        // Format date
        const date = new Date(caseItem.updated);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        row.innerHTML = `
            <td>
                <a href="#" class="case-id" onclick="goToCaseDetail('${caseItem.id}')">
                    ${caseItem.id}
                </a>
            </td>
            <td>${caseItem.title}</td>
            <td>
                <span class="status-badge status-${caseItem.status.toLowerCase().replace(' ', '-')}">
                    ${caseItem.status}
                </span>
            </td>
            <td>
                <span class="priority-badge priority-${caseItem.priority.toLowerCase()}">
                    ${caseItem.priority}
                </span>
            </td>
            <td>${formattedDate}</td>
            <td>
                <button class="view-case-btn" onclick="goToCaseDetail('${caseItem.id}')">
                    View Case
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// ===== 4. GO TO CASE DETAIL FUNCTION =====
function goToCaseDetail(caseId) {
    console.log("📤 Opening case:", caseId);
    
    // Get the row that was clicked
    const btn = event.target;
    const row = btn.closest('tr');
    
    if (!row || !row.dataset.caseData) {
        console.error('No case data found for row');
        alert('Error: Case data not found');
        return;
    }
    
    // Parse the case data from data attribute
    const caseData = JSON.parse(row.dataset.caseData);
    
    console.log('📤 Sending case data to workspace:', caseData);
    
    // Store ALL case data for the workspace
    const fullCaseData = {
        caseId: caseData.id,
        title: caseData.title,
        status: caseData.status,
        priority: caseData.priority,
        claimType: caseData.claimType,
        state: caseData.state,
        claimAmount: caseData.amount,
        damageType: caseData.damage,
        policyNumber: 'POL-' + Math.floor(10000 + Math.random() * 90000),
        dateFiled: caseData.updated,
        timestamp: Date.now()
    };
    
    localStorage.setItem('currentCase', JSON.stringify(fullCaseData));
    
    // Show loading
    const originalText = btn.textContent;
    btn.textContent = 'Analyzing...';
    btn.disabled = true;
    
    // Navigate with ALL parameters
    setTimeout(() => {
        const params = new URLSearchParams({
            caseId: caseData.id,
            type: encodeURIComponent(caseData.claimType),
            state: encodeURIComponent(caseData.state),
            amount: encodeURIComponent(caseData.amount),
            damage: encodeURIComponent(caseData.damage),
            search: 'auto',
            t: Date.now()
        }).toString();
        
        window.location.href = `case-workspace.html?${params}`;
    }, 800);
}

// ===== 5. INITIALIZATION FUNCTION =====
function initPage() {
    // Check which page we're on and initialize accordingly
    const currentPage = window.location.pathname.split('/').pop();
    
    switch(currentPage) {
        case 'index.html':
        case '':
            initLogin();
            break;
            
        case 'cases.html':
            initDashboard();
            break;
    }
}

// ===== 6. START EVERYTHING WHEN PAGE LOADS =====
document.addEventListener('DOMContentLoaded', initPage);