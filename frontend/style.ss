/* Design System */
:root {
    --primary: #4F46E5;
    --primary-light: #6366F1;
    --primary-dark: #4338CA;
    --accent: #EC4899;
    --success: #10B981;
    --warning: #F59E0B;
    
    --bg-base: #FAFBFC;
    --bg-white: #FFFFFF;
    --bg-light: #F3F4F6;
    --bg-accent: #EEF2FF;
    
    --text-primary: #1F2937;
    --text-secondary: #6B7280;
    --text-muted: #9CA3AF;
    
    --border: #E5E7EB;
    --border-light: #F3F4F6;
    
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 10px 15px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 20px 25px rgba(0, 0, 0, 0.1);
    
    --radius: 12px;
    --radius-lg: 16px;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    background: var(--bg-base);
    color: var(--text-primary);
    line-height: 1.6;
    font-size: 16px;
}

/* Navigation */
.navbar {
    background: var(--bg-white);
    border-bottom: 1px solid var(--border-light);
    position: sticky;
    top: 0;
    z-index: 100;
}

.nav-wrapper {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.brand-text {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
}

.brand-badge {
    background: var(--accent);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.05em;
}

.nav-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.status-dot {
    width: 8px;
    height: 8px;
    background: var(--success);
    border-radius: 50%;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Hero Section */
.hero-section {
    background: linear-gradient(180deg, var(--bg-white) 0%, var(--bg-accent) 100%);
    padding: 3rem 2rem 4rem;
}

.hero-content {
    max-width: 900px;
    margin: 0 auto;
    text-align: center;
}

.hero-title {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 1rem;
    color: var(--text-primary);
}

.text-accent {
    color: var(--primary);
}

.hero-subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin-bottom: 2.5rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

/* Search Container */
.search-container {
    display: flex;
    gap: 1rem;
    background: var(--bg-white);
    padding: 0.75rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    max-width: 700px;
    margin: 0 auto;
}

.search-select {
    flex: 1;
    padding: 0.875rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.9375rem;
    color: var(--text-primary);
    background: var(--bg-white);
    cursor: pointer;
    transition: all 0.2s;
}

.search-select:hover {
    border-color: var(--primary-light);
}

.search-select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.search-button {
    padding: 0.875rem 1.5rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.search-button:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow);
}

.search-button:active {
    transform: translateY(0);
}

/* Filter Bar */
.filter-bar {
    background: var(--bg-white);
    border-bottom: 1px solid var(--border-light);
    padding: 1rem 2rem;
    position: sticky;
    top: 65px;
    z-index: 90;
}

.filter-container {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
}

.filter-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
}

.filter-buttons {
    display: flex;
    gap: 0.5rem;
    flex: 1;
}

.filter-btn {
    padding: 0.5rem 1rem;
    background: var(--bg-light);
    border: 1px solid var(--border-light);
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
}

.filter-btn:hover {
    background: var(--bg-accent);
    border-color: var(--primary-light);
    color: var(--primary);
}

.filter-btn.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
}

.results-count {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-left: auto;
}

/* Results Section */
.results-section {
    padding: 2rem;
    min-height: 60vh;
}

.results-container {
    max-width: 1400px;
    margin: 0 auto;
}

.results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.25rem;
}

/* Doctor Cards */
.doctor-card {
    background: var(--bg-white);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    transition: all 0.2s;
    cursor: pointer;
}

.doctor-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-light);
}

.card-header {
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 1rem;
}

.doctor-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.specialty-tag {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: var(--bg-accent);
    color: var(--primary);
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
}

.card-body {
    margin-bottom: 1rem;
}

.info-row {
    display: flex;
    align-items: start;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.info-label {
    font-weight: 500;
    color: var(--text-primary);
    min-width: 70px;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light);
}

.availability-section {
    display: flex;
    flex-direction: column;
}

.availability-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: var(--success);
    color: white;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.availability-badge.soon {
    background: var(--warning);
}

.availability-badge.later {
    background: var(--primary-light);
}

.availability-badge .dot {
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    opacity: 0.8;
}

.appointment-date {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
}

.appointment-relative {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
}

.call-button {
    padding: 0.625rem 1.25rem;
    background: var(--text-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.call-button:hover {
    background: var(--primary);
    transform: scale(1.02);
}

/* Loading State */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-state p {
    color: var(--text-secondary);
    font-size: 0.9375rem;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: var(--bg-white);
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
}

.empty-state h3 {
    font-size: 1.25rem;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.empty-state p {
    color: var(--text-secondary);
    font-size: 0.9375rem;
}

/* Footer */
.footer {
    background: var(--text-primary);
    color: white;
    padding: 2rem;
    margin-top: 4rem;
}

.footer-content {
    max-width: 1400px;
    margin: 0 auto;
    text-align: center;
}

.footer-content p {
    font-size: 0.875rem;
    opacity: 0.9;
}

.footer-content p:first-child {
    margin-bottom: 0.25rem;
}

/* Utilities */
.hidden {
    display: none !important;
}

/* Responsive Design */
@media (max-width: 768px) {
    .hero-title {
        font-size: 2rem;
    }
    
    .search-container {
        flex-direction: column;
    }
    
    .filter-container {
        justify-content: center;
    }
    
    .filter-buttons {
        order: 2;
        width: 100%;
        justify-content: center;
    }
    
    .results-count {
        order: 3;
        width: 100%;
        text-align: center;
        margin-left: 0;
        margin-top: 0.5rem;
    }
    
    .results-grid {
        grid-template-columns: 1fr;
    }
    
    .card-footer {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }
    
    .call-button {
        width: 100%;
        text-align: center;
    }
}