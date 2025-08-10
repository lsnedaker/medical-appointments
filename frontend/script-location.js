// API Configuration
const API_URL = 'https://medical-appointments-api-n3yu.onrender.com/api';

// State
let allDoctors = [];
let userLocation = null;
let searchRadius = 25; // Default to 25 miles
let sortMethod = 'balanced';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupRadiusSlider();
    loadInitialData();
});

// Setup event listeners
function setupEventListeners() {
    // Search button
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    
    // Use location button
    document.getElementById('useLocationBtn').addEventListener('click', getUserLocation);
    
    // Enter key on location input
    document.getElementById('locationInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Specialty filter
    document.getElementById('specialtySelect').addEventListener('change', () => {
        if (userLocation) filterAndDisplay();
    });
    
    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            sortMethod = e.target.dataset.sort;
            if (userLocation && allDoctors.length > 0) {
                filterAndDisplay();
            }
        });
    });
}

// Setup radius slider - FIXED FOR PERFECT ALIGNMENT
// Setup radius slider - FIXED WITH CUSTOM TRACK FOR PERFECT CENTERING
function setupRadiusSlider() {
    const slider = document.getElementById('radiusSlider');
    const valueDisplay = document.getElementById('radiusValue');
    const sliderFill = document.querySelector('.slider-fill');
    
    // Define the actual radius values for each position
    const radiusValues = {
        '1': 5,
        '2': 25,
        '3': 100,
        '4': 250,
        '5': 500,
        '6': 99999 // Nationwide
    };
    
    // Calculate percentage position for each step (6 positions = 0%, 20%, 40%, 60%, 80%, 100%)
    const stepPercentages = {
        '1': 0,
        '2': 20,
        '3': 40,
        '4': 60,
        '5': 80,
        '6': 100
    };
    
    // Update slider visual position and value
    function updateSlider() {
        const position = slider.value;
        const actualRadius = radiusValues[position];
        const percentage = stepPercentages[position];
        
        // Update the custom fill track width
        if (sliderFill) {
            sliderFill.style.width = `${percentage}%`;
        }
        
        // Update the display text
        if (actualRadius === 99999) {
            searchRadius = 99999; // Nationwide
            valueDisplay.textContent = 'Nationwide (Max)';
        } else {
            searchRadius = actualRadius;
            valueDisplay.textContent = `${actualRadius} miles`;
        }
    }
    
    // Initialize
    slider.min = '1';
    slider.max = '6';
    slider.value = '2'; // Default to 25 miles
    updateSlider();
    
    // Handle slider input
    slider.addEventListener('input', (e) => {
        updateSlider();
        
        // Re-filter if we have results
        if (userLocation && allDoctors.length > 0) {
            filterAndDisplay();
        }
    });
    
    // Ensure slider snaps to discrete positions
    slider.addEventListener('change', (e) => {
        // Force snap to nearest position
        const value = Math.round(parseFloat(e.target.value));
        if (value !== parseFloat(e.target.value)) {
            e.target.value = value;
            updateSlider();
        }
    });
    
    // Set initial state
    searchRadius = 25;
}

// Load initial data
async function loadInitialData() {
    try {
        const response = await fetch(`${API_URL}/appointments`);
        allDoctors = await response.json();
        console.log(`Loaded ${allDoctors.length} doctors`);
    } catch (error) {
        console.error('Error loading doctors:', error);
        showError('Failed to load doctor data. Please refresh the page.');
    }
}

// Get user's current location
function getUserLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    showLoading();
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                display: 'Your Current Location'
            };
            document.getElementById('locationInput').value = 'Current Location';
            hideError();
            filterAndDisplay();
        },
        (error) => {
            hideLoading();
            showError('Unable to get your location. Please enter an address manually.');
        }
    );
}

// Eastern NC zip codes (keeping for quick lookup)
function getEasternNCZipCodes() {
    return {
        // Carteret County
        '28557': { lat: 34.7227, lng: -76.8583, city: 'Morehead City', state: 'NC' },
        '28516': { lat: 34.7649, lng: -76.8188, city: 'Beaufort', state: 'NC' },
        '28570': { lat: 34.7804, lng: -76.8480, city: 'Newport', state: 'NC' },
        '28531': { lat: 34.7785, lng: -76.6216, city: 'Harkers Island', state: 'NC' },
        // Craven County
        '28532': { lat: 34.9021, lng: -77.0330, city: 'Havelock', state: 'NC' },
        '28560': { lat: 35.1085, lng: -77.0441, city: 'New Bern', state: 'NC' },
        // Add more as needed...
    };
}

// Perform search based on entered location - UPDATED
async function performSearch() {
    const locationInput = document.getElementById('locationInput').value.trim();
    
    if (!locationInput) {
        showError('Please enter a location or use your current location');
        return;
    }
    
    // Don't reset the location if we already have one and the input hasn't changed
    if (userLocation && 
        (locationInput === 'Current Location' || 
         locationInput === userLocation.display)) {
        // Just re-filter with existing location
        filterAndDisplay();
        return;
    }
    
    showLoading();
    
    // Check if it's a zip code (5 digits)
    if (/^\d{5}$/.test(locationInput)) {
        // First check our local Eastern NC database for speed
        const easternNCZips = getEasternNCZipCodes();
        if (easternNCZips[locationInput]) {
            const coords = easternNCZips[locationInput];
            userLocation = {
                lat: coords.lat,
                lng: coords.lng,
                display: `${coords.city}, ${coords.state} ${locationInput}`
            };
            hideError();
            filterAndDisplay();
        } else {
            // For any zip code not in our local database, use Google Geocoding
            // This handles ALL US zip codes
            await geocodeAddress(locationInput);
        }
    } else {
        // For non-zip code input, use geocoding
        await geocodeAddress(locationInput);
    }
}

// Geocode address using Google Maps API - UPDATED
async function geocodeAddress(address) {
    return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        
        // Only add NC if it's not a zip code and doesn't already have a state
        const isZipCode = /^\d{5}$/.test(address);
        if (!isZipCode && 
            !address.toLowerCase().includes(', ') && 
            !address.match(/\b[A-Z]{2}\b/)) {
            // If no state specified and not a zip, default to NC
            address += ', NC';
        }
        
        geocoder.geocode({ address: address }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                userLocation = {
                    lat: location.lat(),
                    lng: location.lng(),
                    display: results[0].formatted_address
                };
                hideError();
                filterAndDisplay();
            } else {
                hideLoading();
                showError('Location not found. Please try a different address or zip code.');
            }
            resolve();
        });
    });
}

// Also update the filterAndDisplay function to ensure loading is hidden after displaying results:
function filterAndDisplay() {
    if (!userLocation) {
        hideLoading();
        return;
    }
    
    showLoading();
    
    // Add a small delay to show the loading spinner
    setTimeout(() => {
        const doctorsWithDistance = allDoctors.map(doctor => {
            // Skip doctors without coordinates
            if (!doctor.latitude || !doctor.longitude) {
                return {
                    ...doctor,
                    distance: 999, // Put at end if no coordinates
                    daysUntil: getDaysUntilAppointment(doctor.next_available)
                };
            }
            
            const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                doctor.latitude,
                doctor.longitude
            );
            
            return {
                ...doctor,
                distance: distance,
                daysUntil: getDaysUntilAppointment(doctor.next_available)
            };
        });
        
        // Filter by radius
        let filteredDoctors = doctorsWithDistance.filter(doc => doc.distance <= searchRadius);
        
        // Filter by specialty if selected
        const selectedSpecialty = document.getElementById('specialtySelect').value;
        if (selectedSpecialty) {
            filteredDoctors = filteredDoctors.filter(doc => doc.specialty === selectedSpecialty);
        }
        
        // Sort based on selected method
        filteredDoctors = sortDoctors(filteredDoctors, sortMethod);
        
        // Display results
        displayResults(filteredDoctors);
        updateResultsHeader(filteredDoctors.length);
        
        // IMPORTANT: Ensure loading is hidden after everything is done
        hideLoading();
    }, 100); // Small delay to ensure loading spinner shows
}

// Sort doctors based on method
function sortDoctors(doctors, method) {
    switch(method) {
        case 'distance':
            return doctors.sort((a, b) => a.distance - b.distance);
        
        case 'availability':
            return doctors.sort((a, b) => a.daysUntil - b.daysUntil);
        
        case 'balanced':
        default:
            // Weighted scoring: 70% availability, 30% distance
            return doctors.sort((a, b) => {
                // Normalize scores (0-1 range)
                const maxDistance = Math.max(...doctors.map(d => d.distance));
                const maxDays = Math.max(...doctors.map(d => d.daysUntil));
                
                const scoreA = (a.daysUntil / maxDays) * 0.7 + (a.distance / maxDistance) * 0.3;
                const scoreB = (b.daysUntil / maxDays) * 0.7 + (b.distance / maxDistance) * 0.3;
                
                return scoreA - scoreB;
            });
    }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Radius of Earth in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

// Display results - UPDATED TO SHOW SPECIALTY AND FULL DATE
function displayResults(doctors) {
    const grid = document.getElementById('resultsGrid');
    
    if (doctors.length === 0) {
        grid.style.display = 'none';
        document.getElementById('emptyState').classList.remove('hidden');
        return;
    }
    
    document.getElementById('emptyState').classList.add('hidden');
    grid.style.display = 'grid';
    
    grid.innerHTML = doctors.map((doctor, index) => {
        const relevanceClass = index < 3 ? '' : index < 10 ? 'medium' : 'low';
        
        return `
            <div class="doctor-card-enhanced">
                <div class="relevance-score ${relevanceClass}"></div>
                <div class="card-top-row">
                    <div class="doctor-main-info">
                        <h3 class="doctor-name">${doctor.name}</h3>
                        <span class="specialty-tag">${formatSpecialty(doctor.specialty)}</span>
                    </div>
                    <div class="distance-availability">
                        <div class="distance-badge">
                            📍 ${doctor.distance} mi
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                    <div class="info-row">
                        <span class="info-label">Specialty:</span>
                        <span style="font-weight: 600; color: var(--primary);">${formatSpecialty(doctor.specialty)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Practice:</span>
                        <span>${doctor.practice || 'Not specified'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Location:</span>
                        <span>${doctor.address}, ${doctor.city}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Phone:</span>
                        <span>${doctor.phone}</span>
                    </div>
                </div>
                
                <div class="card-footer">
                    <div class="availability-section">
                        <div class="appointment-date" style="font-size: 1.1rem; font-weight: 700;">
                            ${formatDateWithYear(doctor.next_available)}
                        </div>
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

// Update results header - FIXED FOR NATIONWIDE
function updateResultsHeader(count) {
    const header = document.getElementById('resultsHeader');
    header.style.display = 'block';
    
    document.getElementById('resultCount').textContent = count;
    
    // Create the location text element if it doesn't exist
    const searchLocationSpan = document.getElementById('searchLocation');
    const radiusSpan = document.getElementById('searchRadius');
    
    // Display appropriate radius text
    if (searchRadius > 9000) {
        // For nationwide search
        radiusSpan.textContent = 'Nationwide';
        // Update the parent element's text
        radiusSpan.parentElement.innerHTML = `<span id="resultCount">${count}</span> Appointments Found <span style="font-weight: 600;">Nationwide</span> from <span id="searchLocation">${userLocation.display}</span>`;
    } else {
        // For radius-based search
        radiusSpan.parentElement.innerHTML = `<span id="resultCount">${count}</span> Appointments Found Within <span id="searchRadius">${searchRadius}</span> miles of <span id="searchLocation">${userLocation.display}</span>`;
    }
}

// Utility functions
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

// NEW FUNCTION - Format date with year
function formatDateWithYear(dateString) {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
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
    alert(`Call ${phone} to schedule your appointment`);
}

// UI helpers - FIXED LOADING SPINNER
function showLoading() {
    const loadingState = document.getElementById('loadingState');
    const resultsGrid = document.getElementById('resultsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) {
        loadingState.classList.remove('hidden');
        loadingState.style.display = 'flex'; // Ensure it's visible
    }
    
    if (resultsGrid) {
        resultsGrid.style.display = 'none';
    }
    
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
}

function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    
    if (loadingState) {
        loadingState.classList.add('hidden');
        loadingState.style.display = 'none'; // Force hide with display none
    }
}

function showError(message) {
    const errorDiv = document.getElementById('locationError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    hideLoading(); // Make sure loading is hidden when showing error
}

function hideError() {
    const errorDiv = document.getElementById('locationError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}