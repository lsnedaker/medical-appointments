// API Configuration
const API_URL = 'https://medical-appointments-api-n3yu.onrender.com/api';

// State
let allDoctors = [];
let filteredLocation = 'all';

// Specialty display names and colors
const specialtyConfig = {
    'primary-care': { 
        name: 'Primary Care', 
        icon: '🩺', 
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: 'Family medicine, internal medicine, general practice'
    },
    'cardiology': { 
        name: 'Cardiology', 
        icon: '❤️', 
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        description: 'Heart and cardiovascular specialists'
    },
    'dermatology': { 
        name: 'Dermatology', 
        icon: '🔬', 
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        description: 'Skin, hair, and nail specialists'
    },
    'endocrinology': { 
        name: 'Endocrinology', 
        icon: '🔄', 
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        description: 'Hormone and metabolism specialists'
    },
    'ent': { 
        name: 'ENT', 
        icon: '👂', 
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        description: 'Ear, nose, and throat specialists'
    },
    'nephrology': { 
        name: 'Nephrology', 
        icon: '🫘', 
        gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        description: 'Kidney specialists'
    },
    'neurology': { 
        name: 'Neurology', 
        icon: '🧠', 
        gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        description: 'Brain and nervous system specialists'
    },
    'obgyn': { 
        name: 'OB/GYN', 
        icon: '👶', 
        gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        description: "Women's health specialists"
    },
    'ophthalmology': { 
        name: 'Ophthalmology', 
        icon: '👁️', 
        gradient: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
        description: 'Eye and vision specialists'
    },
    'orthopedics': { 
        name: 'Orthopedics', 
        icon: '🦴', 
        gradient: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)',
        description: 'Bone, joint, and muscle specialists'
    },
    'pediatrics': { 
        name: 'Pediatrics', 
        icon: '🧸', 
        gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        description: "Children's health specialists"
    },
    'psychiatry': { 
        name: 'Psychiatry', 
        icon: '🧘', 
        gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
        description: 'Mental health specialists'
    },
    'pulmonology': { 
        name: 'Pulmonology', 
        icon: '🫁', 
        gradient: 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)',
        description: 'Lung and respiratory specialists'
    },
    'rheumatology': { 
        name: 'Rheumatology', 
        icon: '🦵', 
        gradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
        description: 'Arthritis and autoimmune specialists'
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupLocationFilters();
    loadAppointments();
});

// Setup location filter buttons
function setupLocationFilters() {
    const buttons = document.querySelectorAll('.location-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update filter and reload
            filteredLocation = e.target.dataset.location;
            displaySpecialties();
        });
    });

    // Setup modal close
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('doctorModal').addEventListener('click', (e) => {
        if (e.target.id === 'doctorModal') closeModal();
    });
}

// Load all appointments
async function loadAppointments() {
    try {
        const response = await fetch(`${API_URL}/appointments`);
        allDoctors = await response.json();
        
        displaySpecialties();
        updateStats();
        document.getElementById('loadingState').classList.add('hidden');
    } catch (error) {
        console.error('Error loading appointments:', error);
        document.getElementById('loadingState').innerHTML = `
            <p style="color: var(--danger);">Error loading appointments. Please refresh the page.</p>
        `;
    }
}

// Display specialties grouped
function displaySpecialties() {
    const grid = document.getElementById('specialtyGrid');
    
    // Filter by location if needed
    let doctors = allDoctors;
    if (filteredLocation !== 'all') {
        doctors = allDoctors.filter(d => d.zip_code === filteredLocation);
    }
    
    // Group doctors by specialty
    const specialtyGroups = {};
    doctors.forEach(doctor => {
        if (!specialtyGroups[doctor.specialty]) {
            specialtyGroups[doctor.specialty] = [];
        }
        specialtyGroups[doctor.specialty].push(doctor);
    });
    
    // Sort each specialty group by next available date
    Object.keys(specialtyGroups).forEach(specialty => {
        specialtyGroups[specialty].sort((a, b) => 
            new Date(a.next_available) - new Date(b.next_available)
        );
    });
    
    // Create specialty cards
    const specialtyCards = Object.keys(specialtyConfig).map(specialty => {
        const config = specialtyConfig[specialty];
        const doctors = specialtyGroups[specialty] || [];
        
        if (doctors.length === 0) {
            return createEmptySpecialtyCard(specialty, config);
        }
        
        return createSpecialtyCard(specialty, config, doctors);
    }).join('');
    
    grid.innerHTML = specialtyCards;
    
    // Add click handlers
    document.querySelectorAll('.specialty-card').forEach(card => {
        if (!card.classList.contains('empty')) {
            card.addEventListener('click', () => {
                const specialty = card.dataset.specialty;
                showDoctorModal(specialty, specialtyGroups[specialty]);
            });
        }
    });
}

// Create specialty card with availability
function createSpecialtyCard(specialty, config, doctors) {
    const nextAvailable = doctors[0].next_available;
    const daysUntil = getDaysUntilAppointment(nextAvailable);
    const availabilityClass = daysUntil === 0 ? 'today' : daysUntil <= 7 ? 'soon' : '';
    
    // Group by practice
    const practiceGroups = {};
    doctors.forEach(doc => {
        const practice = doc.practice || 'Independent';
        if (!practiceGroups[practice]) {
            practiceGroups[practice] = [];
        }
        practiceGroups[practice].push(doc);
    });
    
    const practiceCount = Object.keys(practiceGroups).length;
    const doctorCount = doctors.length;
    
    return `
        <div class="specialty-card ${availabilityClass}" data-specialty="${specialty}">
            <div class="specialty-header" style="background: ${config.gradient}">
                <span class="specialty-icon">${config.icon}</span>
                <h3 class="specialty-name">${config.name}</h3>
            </div>
            <div class="specialty-body">
                <div class="next-available">
                    <span class="label">Next Available:</span>
                    <span class="date-large">${formatDateShort(nextAvailable)}</span>
                    <span class="date-relative">${getDaysFromNow(nextAvailable)}</span>
                </div>
                <div class="specialty-stats">
                    <div class="stat">
                        <span class="stat-num">${doctorCount}</span>
                        <span class="stat-text">doctors</span>
                    </div>
                    <div class="stat">
                        <span class="stat-num">${practiceCount}</span>
                        <span class="stat-text">locations</span>
                    </div>
                </div>
                <div class="availability-preview">
                    ${getAvailabilityPreview(doctors)}
                </div>
                <button class="view-all-btn">View All Appointments →</button>
            </div>
        </div>
    `;
}

// Create empty specialty card
function createEmptySpecialtyCard(specialty, config) {
    return `
        <div class="specialty-card empty" data-specialty="${specialty}">
            <div class="specialty-header" style="background: ${config.gradient}; opacity: 0.5;">
                <span class="specialty-icon">${config.icon}</span>
                <h3 class="specialty-name">${config.name}</h3>
            </div>
            <div class="specialty-body">
                <p class="no-doctors">No doctors available in this area</p>
            </div>
        </div>
    `;
}

// Get availability preview for next few appointments
function getAvailabilityPreview(doctors) {
    const preview = doctors.slice(0, 3).map(doc => {
        const date = formatDateShort(doc.next_available);
        const name = doc.name.replace(', MD', '');
        return `<div class="preview-item">
            <span class="preview-date">${date}</span>
            <span class="preview-name">${name}</span>
        </div>`;
    }).join('');
    
    if (doctors.length > 3) {
        return preview + `<div class="preview-more">+${doctors.length - 3} more appointments</div>`;
    }
    
    return preview;
}

// Show modal with all doctors for a specialty
function showDoctorModal(specialty, doctors) {
    const modal = document.getElementById('doctorModal');
    const config = specialtyConfig[specialty];
    
    document.getElementById('modalSpecialty').innerHTML = `
        <span style="font-size: 2rem; margin-right: 0.5rem;">${config.icon}</span>
        ${config.name} Appointments
    `;
    
    // Group by practice
    const practiceGroups = {};
    doctors.forEach(doc => {
        const practice = doc.practice || 'Independent Practice';
        if (!practiceGroups[practice]) {
            practiceGroups[practice] = [];
        }
        practiceGroups[practice].push(doc);
    });
    
    // Create doctor list grouped by practice
    const doctorList = Object.entries(practiceGroups).map(([practice, docs]) => {
        const practiceHtml = docs.map(doc => `
            <div class="modal-doctor-card">
                <div class="modal-doctor-info">
                    <h4>${doc.name}</h4>
                    <p class="doctor-practice">${practice}</p>
                    <p class="doctor-address">${doc.address}, ${doc.city}, NC ${doc.zip_code}</p>
                    <p class="doctor-phone">${doc.phone}</p>
                </div>
                <div class="modal-appointment-info">
                    <div class="appointment-date-large">${formatDateShort(doc.next_available)}</div>
                    <div class="appointment-relative">${getDaysFromNow(doc.next_available)}</div>
                    <button class="call-btn" onclick="callOffice('${doc.phone}')">
                        Call to Schedule
                    </button>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="practice-group">
                <h3 class="practice-title">${practice} (${docs.length} doctor${docs.length > 1 ? 's' : ''})</h3>
                ${practiceHtml}
            </div>
        `;
    }).join('');
    
    document.getElementById('modalDoctorList').innerHTML = doctorList;
    modal.classList.remove('hidden');
}

// Close modal
function closeModal() {
    document.getElementById('doctorModal').classList.add('hidden');
}

// Update statistics
function updateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    
    const todayCount = allDoctors.filter(d => {
        const apptDate = new Date(d.next_available);
        return apptDate.toDateString() === today.toDateString();
    }).length;
    
    const weekCount = allDoctors.filter(d => {
        const apptDate = new Date(d.next_available);
        return apptDate <= weekFromNow;
    }).length;
    
    document.getElementById('totalDoctors').textContent = allDoctors.length;
    document.getElementById('availableToday').textContent = todayCount;
    document.getElementById('availableWeek').textContent = weekCount;
    
    const lastUpdate = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
    document.getElementById('lastUpdated').textContent = lastUpdate;
    document.getElementById('lastUpdatedNav').innerHTML = `<span class="status-dot"></span> Updated ${lastUpdate}`;
}

// Utility functions
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
    
    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''}`;
    return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''}`;
}

function getDaysUntilAppointment(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function callOffice(phone) {
    // For mobile devices:
    // window.location.href = `tel:${phone.replace(/\D/g, '')}`;
    
    // For now:
    alert(`Call ${phone} to schedule your appointment`);
}