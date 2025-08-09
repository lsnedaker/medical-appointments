// API Configuration
const API_URL = 'http://localhost:3001/api';

// DOM Elements
const searchBtn = document.getElementById('searchBtn');
const specialtySelect = document.getElementById('specialtySelect');
const locationSelect = document.getElementById('locationSelect');
const resultsGrid = document.getElementById('resultsGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const resultsCount = document.getElementById('resultsCount');

// Filter pills
let activeFilter = 'all';
let currentResults = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeFilters();
    searchDoctors();
});

// Search functionality
searchBtn.addEventListener('click', searchDoctors);
specialtySelect.addEventListener('change', searchDoctors);
locationSelect.addEventListener('change', searchDoctors);

function initializeFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeFilter = e.target.dataset.filter;
            applyQuickFilter();
        });
    });
}

async function searchDoctors() {
    const selectedSpecialty = specialtySelect.value;
    const selectedLocation = locationSelect.value;
    
    showLoading();
    
    try {
        // Build query string
        const params = new URLSearchParams();
        if (selectedSpecialty) params.append('specialty', selectedSpecialty);
        if (selectedLocation && selectedLocation !== 'all') params.append('zipCode', selectedLocation);
        
        // Fetch from backend
        const response = await fetch(`${API_URL}/appointments?${params}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch appointments');
        }
        
        const data = await response.json();
        
        currentResults = data;
        applyQuickFilter();
    } catch (error) {
        console.error('Error fetching appointments:', error);
        showError();
    }
}

function applyQuickFilter() {
    let displayDoctors = [...currentResults];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch(activeFilter) {
        case 'today':
            displayDoctors = displayDoctors.filter(doc => {
                const apptDate = new Date(doc.next_available);
                return apptDate.toDateString() === today.toDateString();
            });
            break;
        case 'week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            displayDoctors = displayDoctors.filter(doc => {
                const apptDate = new Date(doc.next_available);
                return apptDate <= weekFromNow;
            });
            break;
        case 'urgent':
            displayDoctors = displayDoctors.filter(doc => 
                doc.specialty === 'primary-care'
            );
            break;
        case 'specialist':
            displayDoctors = displayDoctors.filter(doc => 
                doc.specialty !== 'primary-care'
            );
            break;
    }
    
    displayResults(displayDoctors);
}

function showLoading() {
    loadingState.classList.remove('hidden');
    resultsGrid.classList.add('hidden');
    emptyState.classList.add('hidden');
    resultsCount.textContent = '';
}

function showError() {
    loadingState.classList.add('hidden');
    resultsGrid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.innerHTML = `
        <h3>Connection Error</h3>
        <p>Unable to fetch appointments. Please make sure the backend server is running.</p>
    `;
}

function displayResults(doctors) {
    // Hide loading
    loadingState.classList.add('hidden');
    
    // Update results count
    resultsCount.textContent = `${doctors.length} appointments found`;
    
    if (doctors.length === 0) {
        resultsGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = `
            <h3>No appointments found</h3>
            <p>Try adjusting your filters or check back tomorrow for updated availability</p>
        `;
        return;
    }
    
    // Show grid
    emptyState.classList.add('hidden');
    resultsGrid.classList.remove('hidden');
    
    // Create cards
    resultsGrid.innerHTML = doctors.map((doctor, index) => {
        const daysUntil = getDaysUntilAppointment(doctor.next_available);
        const availabilityClass = daysUntil <= 3 ? '' : daysUntil <= 14 ? 'soon' : 'later';
        const availabilityText = daysUntil === 0 ? 'Today' : 
                                daysUntil === 1 ? 'Tomorrow' : 
                                daysUntil <= 3 ? 'This Week' : 
                                'Available';
        
        // Build full address
        const fullAddress = `${doctor.address}, ${doctor.city}, NC ${doctor.zip_code}`;
        
        return `
            <div class="doctor-card">
                <div class="card-header">
                    <h3 class="doctor-name">${doctor.name}</h3>
                    <span class="specialty-tag">${formatSpecialty(doctor.specialty)}</span>
                </div>
                
                <div class="card-body">
                    <div class="info-row">
                        <span class="info-label">Location:</span>
                        <span>${doctor.city}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Address:</span>
                        <span>${fullAddress}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Phone:</span>
                        <span>${doctor.phone}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Updated:</span>
                        <span>${getTimeAgo(doctor.last_checked)}</span>
                    </div>
                </div>
                
                <div class="card-footer">
                    <div class="availability-section">
                        <div class="availability-badge ${availabilityClass}">
                            <span class="dot"></span>
                            ${availabilityText}
                        </div>
                        <div class="appointment-date">${formatDateShort(doctor.next_available)}</div>
                        <div class="appointment-relative">${getDaysFromNow(doctor.next_available)}</div>
                    </div>
                    <button class="call-button" onclick="callOffice('${doctor.phone}')">
                        Call Office
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function formatSpecialty(specialty) {
    const specialtyMap = {
        'primary-care': 'Primary Care',
        'cardiology': 'Cardiology',
        'dermatology': 'Dermatology',
        'endocrinology': 'Endocrinology',
        'ent': 'ENT',
        'nephrology': 'Nephrology',
        'neurology': 'Neurology',
        'obgyn': 'OB/GYN',
        'ophthalmology': 'Ophthalmology',
        'orthopedics': 'Orthopedics',
        'pediatrics': 'Pediatrics',
        'psychiatry': 'Psychiatry',
        'pulmonology': 'Pulmonology',
        'rheumatology': 'Rheumatology'
    };
    return specialtyMap[specialty] || specialty;
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
}

function getDaysFromNow(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days away`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} away`;
    return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''} away`;
}

function getDaysUntilAppointment(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDateShort(dateString);
}

function callOffice(phone) {
    // In production, this would integrate with click-to-call
    // For mobile devices, uncomment the next line:
    // window.location.href = `tel:${phone.replace(/\D/g, '')}`;
    
    // For now, show alert
    alert(`Call ${phone} to schedule your appointment`);
}