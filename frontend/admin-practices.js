// admin-practices.js - Practice Management Admin Panel

// ============================================
// AUTHENTICATION AND INITIALIZATION
// ============================================

// Supabase configuration
const SUPABASE_URL = 'https://uuxtywqbyyczpjptzmvg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1eHR5d3FieXljenBqcHR6bXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjExNTksImV4cCI6MjA3MDMzNzE1OX0.2c6mAfSSK0D7i2LtaMP11LlvGqKgvjmgTg4BI722wUo';

// Backend API configuration
const API_URL = 'https://medical-appointments-api-n3yu.onrender.com/api';

// Global variables
let allPractices = [];
let allDoctors = [];
let allSpecialties = [];
let currentTab = 'practices';
let supabaseClient = null;

// Initialize authentication and dashboard
window.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase client
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Check if user is authenticated
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // Not authenticated, redirect to login
        alert('Please login to access the admin dashboard');
        window.location.href = 'admin-login.html';
        return;
    }
    
    // User is authenticated
    console.log('Admin authenticated:', session.user.email);
    
    // Add logout button to navigation
    addLogoutButton();
    
    // Initialize the dashboard
    initializeDashboard();
});

// Add logout button to navigation
function addLogoutButton() {
    const navWrapper = document.querySelector('.nav-wrapper');
    if (navWrapper && !document.getElementById('logoutBtn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.cssText = `
            background: #ef4444;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            margin-left: 1rem;
        `;
        logoutBtn.onclick = async () => {
            if (confirm('Are you sure you want to logout?')) {
                await supabaseClient.auth.signOut();
                window.location.href = 'admin-login.html';
            }
        };
        navWrapper.appendChild(logoutBtn);
    }
}

// Initialize dashboard
async function initializeDashboard() {
    await loadAllData();
    setupEventListeners();
    updateStats();
}

// ============================================
// DATA LOADING
// ============================================

async function loadAllData() {
    showLoading();
    try {
        // Load all data in parallel
        const [practicesRes, doctorsRes, specialtiesRes] = await Promise.all([
            fetch(`${API_URL}/practices`),
            fetch(`${API_URL}/doctors`),
            fetch(`${API_URL}/specialties`)
        ]);
        
        allPractices = await practicesRes.json();
        allDoctors = await doctorsRes.json();
        allSpecialties = await specialtiesRes.json();
        
        console.log('Loaded data:', { 
            practices: allPractices.length, 
            doctors: allDoctors.length, 
            specialties: allSpecialties.length 
        });
        
        // Display initial data
        displayPractices();
        loadSpecialtyCheckboxes();
        loadPracticeCheckboxes();
        loadAppointmentPracticeSelect();
        
        hideLoading();
    } catch (error) {
        console.error('Error loading data:', error);
        hideLoading();
        alert('Error loading data. Please refresh the page.');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Add Practice Form
    const addPracticeForm = document.getElementById('addPracticeForm');
    if (addPracticeForm) {
        addPracticeForm.addEventListener('submit', handleAddPractice);
    }
    
    // Add Doctor Form
    const addDoctorForm = document.getElementById('addDoctorForm');
    if (addDoctorForm) {
        addDoctorForm.addEventListener('submit', handleAddDoctor);
    }
    
    // Edit Practice Form
    const editPracticeForm = document.getElementById('editPracticeForm');
    if (editPracticeForm) {
        editPracticeForm.addEventListener('submit', handleEditPractice);
    }
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterPractices);
    }
}

// ============================================
// TAB MANAGEMENT
// ============================================

function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    // Load tab-specific data
    if (tab === 'doctors') {
        displayDoctors();
    } else if (tab === 'appointments') {
        loadAppointmentPracticeSelect();
    }
}

// ============================================
// PRACTICES MANAGEMENT
// ============================================

function displayPractices(practices = allPractices) {
    const tbody = document.getElementById('practicesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = practices.map(practice => {
        const specialties = practice.specialties || [];
        const doctors = practice.doctors || [];
        
        return `
            <tr>
                <td class="practice-name">${practice.name}</td>
                <td>
                    ${practice.address}<br>
                    <span style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${practice.city}, ${practice.state} ${practice.zip_code}
                    </span>
                </td>
                <td>${practice.phone}</td>
                <td>
                    <div class="specialty-badges">
                        ${specialties.map(s => 
                            `<span class="specialty-badge">${s.name}</span>`
                        ).join('')}
                    </div>
                </td>
                <td>${doctors.length} doctors</td>
                <td>
                    <button class="btn-small btn-edit" onclick="editPractice(${practice.id})">
                        Edit
                    </button>
                    <button class="btn-small btn-appointments" onclick="managePracticeAppointments(${practice.id})">
                        Appointments
                    </button>
                    <button class="btn-small btn-delete" onclick="deletePractice(${practice.id}, '${practice.name.replace(/'/g, "\\'")}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterPractices() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    const filtered = allPractices.filter(practice => 
        practice.name.toLowerCase().includes(searchTerm) ||
        practice.city.toLowerCase().includes(searchTerm) ||
        practice.phone.includes(searchTerm)
    );
    
    displayPractices(filtered);
}

async function handleAddPractice(e) {
    e.preventDefault();
    showLoading();
    
    try {
        // Get form data
        const formData = {
            name: document.getElementById('practiceName').value,
            address: document.getElementById('practiceAddress').value,
            city: document.getElementById('practiceCity').value,
            state: document.getElementById('practiceState').value || 'NC',
            zip_code: document.getElementById('practiceZip').value,
            phone: document.getElementById('practicePhone').value,
            website: document.getElementById('practiceWebsite').value || null,
            accepts_new_patients: document.getElementById('practiceAccepting').value === 'true',
            specialties: getCheckedSpecialties('specialtiesCheckboxes')
        };
        
        // Geocode address
        const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}`;
        const coords = await geocodeAddress(fullAddress);
        if (coords) {
            formData.latitude = coords.lat;
            formData.longitude = coords.lng;
        }
        
        // Send to API
        const response = await fetch(`${API_URL}/practices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Failed to add practice');
        
        // Success
        document.getElementById('addPracticeMessage').textContent = '✓ Practice added successfully!';
        document.getElementById('addPracticeForm').reset();
        
        // Reload data
        await loadAllData();
        updateStats();
        
        setTimeout(() => {
            document.getElementById('addPracticeMessage').textContent = '';
            switchTab('practices');
        }, 2000);
        
    } catch (error) {
        console.error('Error adding practice:', error);
        alert('Error adding practice. Please try again.');
    } finally {
        hideLoading();
    }
}

function editPractice(practiceId) {
    const practice = allPractices.find(p => p.id === practiceId);
    if (!practice) return;
    
    // Populate edit form
    document.getElementById('editPracticeId').value = practice.id;
    document.getElementById('editName').value = practice.name;
    document.getElementById('editAddress').value = practice.address;
    document.getElementById('editCity').value = practice.city;
    document.getElementById('editState').value = practice.state || 'NC';
    document.getElementById('editZip').value = practice.zip_code;
    document.getElementById('editPhone').value = practice.phone;
    document.getElementById('editWebsite').value = practice.website || '';
    document.getElementById('editAccepting').value = practice.accepts_new_patients ? 'true' : 'false';
    
    // Load and check specialties
    loadEditSpecialtyCheckboxes(practice.specialties);
    
    // Show modal
    document.getElementById('editPracticeModal').style.display = 'flex';
}

async function handleEditPractice(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const practiceId = document.getElementById('editPracticeId').value;
        
        const formData = {
            name: document.getElementById('editName').value,
            address: document.getElementById('editAddress').value,
            city: document.getElementById('editCity').value,
            state: document.getElementById('editState').value,
            zip_code: document.getElementById('editZip').value,
            phone: document.getElementById('editPhone').value,
            website: document.getElementById('editWebsite').value || null,
            accepts_new_patients: document.getElementById('editAccepting').value === 'true',
            specialties: getCheckedSpecialties('editSpecialtiesCheckboxes')
        };
        
        // Geocode new address
        const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}`;
        const coords = await geocodeAddress(fullAddress);
        if (coords) {
            formData.latitude = coords.lat;
            formData.longitude = coords.lng;
        }
        
        const response = await fetch(`${API_URL}/practices/${practiceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Failed to update practice');
        
        closeEditModal();
        await loadAllData();
        updateStats();
        alert('Practice updated successfully!');
        
    } catch (error) {
        console.error('Error updating practice:', error);
        alert('Error updating practice. Please try again.');
    } finally {
        hideLoading();
    }
}

async function deletePractice(practiceId, practiceName) {
    if (!confirm(`Are you sure you want to delete ${practiceName}? This will also delete all associated appointments.`)) {
        return;
    }
    
    showLoading();
    try {
        const response = await fetch(`${API_URL}/practices/${practiceId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete practice');
        
        await loadAllData();
        updateStats();
        alert('Practice deleted successfully');
        
    } catch (error) {
        console.error('Error deleting practice:', error);
        alert('Error deleting practice. Please try again.');
    } finally {
        hideLoading();
    }
}

// ============================================
// DOCTORS MANAGEMENT
// ============================================

function displayDoctors() {
    const container = document.getElementById('doctorsList');
    if (!container) return;
    
    container.innerHTML = allDoctors.map(doctor => {
        const practices = doctor.doctor_practices?.map(dp => dp.practices?.name).filter(Boolean) || [];
        const specialties = doctor.doctor_specialties?.map(ds => ds.specialties?.name).filter(Boolean) || [];
        
        return `
            <div style="padding: 1rem; background: #f8f9ff; border-radius: 8px; margin-bottom: 0.5rem;">
                <strong>${doctor.name}, ${doctor.title}</strong>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    Practices: ${practices.join(', ') || 'None'}
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    Specialties: ${specialties.join(', ') || 'None'}
                </div>
                <button class="btn-small btn-delete" style="margin-top: 0.5rem;" 
                        onclick="deleteDoctor(${doctor.id}, '${doctor.name.replace(/'/g, "\\'")}')">
                    Delete
                </button>
            </div>
        `;
    }).join('');
}

async function handleAddDoctor(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const formData = {
            name: document.getElementById('doctorName').value,
            title: document.getElementById('doctorTitle').value,
            is_accepting_patients: true,
            practice_ids: getCheckedPractices(),
            specialties: getCheckedSpecialties('doctorSpecialtiesCheckboxes')
        };
        
        const response = await fetch(`${API_URL}/doctors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Failed to add doctor');
        
        document.getElementById('addDoctorForm').reset();
        await loadAllData();
        displayDoctors();
        updateStats();
        alert('Doctor added successfully!');
        
    } catch (error) {
        console.error('Error adding doctor:', error);
        alert('Error adding doctor. Please try again.');
    } finally {
        hideLoading();
    }
}

async function deleteDoctor(doctorId, doctorName) {
    if (!confirm(`Are you sure you want to delete ${doctorName}?`)) {
        return;
    }
    
    showLoading();
    try {
        const response = await fetch(`${API_URL}/doctors/${doctorId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete doctor');
        
        await loadAllData();
        displayDoctors();
        updateStats();
        alert('Doctor deleted successfully');
        
    } catch (error) {
        console.error('Error deleting doctor:', error);
        alert('Error deleting doctor. Please try again.');
    } finally {
        hideLoading();
    }
}

// ============================================
// APPOINTMENTS MANAGEMENT
// ============================================

function managePracticeAppointments(practiceId) {
    // Switch to appointments tab and select this practice
    switchTab('appointments');
    document.getElementById('appointmentPracticeSelect').value = practiceId;
    loadPracticeAppointments();
}

function loadAppointmentPracticeSelect() {
    const select = document.getElementById('appointmentPracticeSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Choose a practice...</option>' +
        allPractices.map(p => 
            `<option value="${p.id}">${p.name}</option>`
        ).join('');
}

async function loadPracticeAppointments() {
    const practiceId = document.getElementById('appointmentPracticeSelect').value;
    if (!practiceId) {
        document.getElementById('appointmentsContainer').innerHTML = '';
        return;
    }
    
    const practice = allPractices.find(p => p.id == practiceId);
    if (!practice) return;
    
    const container = document.getElementById('appointmentsContainer');
    
    container.innerHTML = `
        <h3 style="margin-bottom: 1rem;">Appointment Availability for ${practice.name}</h3>
        <div class="appointments-grid">
            ${practice.specialties.map(specialty => {
                const appointmentDate = specialty.next_available ? 
                    new Date(specialty.next_available).toISOString().split('T')[0] : '';
                
                return `
                    <div class="appointment-card">
                        <div class="appointment-specialty">${specialty.name}</div>
                        <input type="date" 
                               class="appointment-date-input" 
                               id="appt-${practiceId}-${specialty.id}"
                               value="${appointmentDate}"
                               min="${new Date().toISOString().split('T')[0]}">
                        <button class="btn-small btn-appointments" 
                                onclick="updateAppointment(${practiceId}, '${specialty.code}', '${specialty.name}')">
                            Update
                        </button>
                        <span id="msg-${practiceId}-${specialty.id}" 
                              style="display: block; margin-top: 0.5rem; color: #10b981; font-size: 0.75rem;"></span>
                    </div>
                `;
            }).join('')}
        </div>
        <button class="btn-primary" style="margin-top: 1.5rem;" onclick="saveAllAppointments(${practiceId})">
            Save All Updates
        </button>
    `;
}

async function updateAppointment(practiceId, specialtyCode, specialtyName) {
    const specialty = allSpecialties.find(s => s.code === specialtyCode);
    if (!specialty) return;
    
    const dateInput = document.getElementById(`appt-${practiceId}-${specialty.id}`);
    const msgSpan = document.getElementById(`msg-${practiceId}-${specialty.id}`);
    
    try {
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                practice_id: practiceId,
                specialty_code: specialtyCode,
                next_available: dateInput.value
            })
        });
        
        if (!response.ok) throw new Error('Failed to update');
        
        msgSpan.textContent = '✓ Updated';
        setTimeout(() => {
            msgSpan.textContent = '';
        }, 3000);
        
        // Update local data
        const practice = allPractices.find(p => p.id == practiceId);
        if (practice) {
            const spec = practice.specialties.find(s => s.code === specialtyCode);
            if (spec) {
                spec.next_available = dateInput.value;
            }
        }
        
        updateStats();
        
    } catch (error) {
        console.error('Error updating appointment:', error);
        msgSpan.textContent = 'Error';
        msgSpan.style.color = '#ef4444';
    }
}

async function saveAllAppointments(practiceId) {
    const practice = allPractices.find(p => p.id == practiceId);
    if (!practice) return;
    
    showLoading();
    let updateCount = 0;
    
    for (const specialty of practice.specialties) {
        const dateInput = document.getElementById(`appt-${practiceId}-${specialty.id}`);
        if (dateInput && dateInput.value) {
            try {
                await fetch(`${API_URL}/appointments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        practice_id: practiceId,
                        specialty_code: specialty.code,
                        next_available: dateInput.value
                    })
                });
                updateCount++;
            } catch (error) {
                console.error(`Error updating ${specialty.name}:`, error);
            }
        }
    }
    
    hideLoading();
    await loadAllData();
    updateStats();
    alert(`Successfully updated ${updateCount} appointments!`);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function loadSpecialtyCheckboxes() {
    const containers = ['specialtiesCheckboxes', 'doctorSpecialtiesCheckboxes'];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = allSpecialties.map(specialty => `
                <div class="checkbox-item">
                    <input type="checkbox" 
                           id="${containerId}-${specialty.code}" 
                           value="${specialty.code}">
                    <label for="${containerId}-${specialty.code}">${specialty.name}</label>
                </div>
            `).join('');
        }
    });
}

function loadEditSpecialtyCheckboxes(practiceSpecialties = []) {
    const container = document.getElementById('editSpecialtiesCheckboxes');
    if (!container) return;
    
    const practiceCodes = practiceSpecialties.map(s => s.code);
    
    container.innerHTML = allSpecialties.map(specialty => `
        <div class="checkbox-item">
            <input type="checkbox" 
                   id="editSpecialtiesCheckboxes-${specialty.code}" 
                   value="${specialty.code}"
                   ${practiceCodes.includes(specialty.code) ? 'checked' : ''}>
            <label for="editSpecialtiesCheckboxes-${specialty.code}">${specialty.name}</label>
        </div>
    `).join('');
}

function loadPracticeCheckboxes() {
    const container = document.getElementById('practiceCheckboxes');
    if (container) {
        container.innerHTML = allPractices.map(practice => `
            <div class="checkbox-item">
                <input type="checkbox" 
                       id="practice-${practice.id}" 
                       value="${practice.id}">
                <label for="practice-${practice.id}">${practice.name}</label>
            </div>
        `).join('');
    }
}

function getCheckedSpecialties(containerId) {
    const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function getCheckedPractices() {
    const checkboxes = document.querySelectorAll('#practiceCheckboxes input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

async function geocodeAddress(address) {
    return new Promise((resolve) => {
        try {
            const geocoder = new google.maps.Geocoder();
            
            geocoder.geocode({ address: address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng()
                    });
                } else {
                    console.warn('Geocoding failed for address:', address);
                    resolve(null);
                }
            });
        } catch (error) {
            console.warn('Geocoder error:', error);
            resolve(null);
        }
    });
}

function updateStats() {
    // Count statistics
    const totalPractices = allPractices.length;
    const totalDoctors = allDoctors.length;
    const totalSpecialties = allSpecialties.length;
    
    // Count appointments available today
    const today = new Date().toDateString();
    let appointmentsToday = 0;
    
    allPractices.forEach(practice => {
        practice.specialties?.forEach(specialty => {
            if (specialty.next_available) {
                const apptDate = new Date(specialty.next_available).toDateString();
                if (apptDate === today) {
                    appointmentsToday++;
                }
            }
        });
    });
    
    // Update display
    document.getElementById('totalPractices').textContent = totalPractices;
    document.getElementById('totalDoctors').textContent = totalDoctors;
    document.getElementById('totalSpecialties').textContent = totalSpecialties;
    document.getElementById('appointmentsToday').textContent = appointmentsToday;
}

function closeEditModal() {
    document.getElementById('editPracticeModal').style.display = 'none';
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Make functions globally available
window.switchTab = switchTab;
window.editPractice = editPractice;
window.deletePractice = deletePractice;
window.deleteDoctor = deleteDoctor;
window.managePracticeAppointments = managePracticeAppointments;
window.loadPracticeAppointments = loadPracticeAppointments;
window.updateAppointment = updateAppointment;
window.saveAllAppointments = saveAllAppointments;
window.closeEditModal = closeEditModal;