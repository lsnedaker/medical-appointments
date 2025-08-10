// API Configuration
const API_URL = 'https://medical-appointments-api-n3yu.onrender.com/api';

// State
let allDoctors = [];
let userLocation = null;
let searchRadius = 10;
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

// Setup radius slider
function setupRadiusSlider() {
    const slider = document.getElementById('radiusSlider');
    const valueDisplay = document.getElementById('radiusValue');
    
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        searchRadius = parseInt(value);
        valueDisplay.textContent = `${value} miles`;
        
        // Update slider fill
        const percent = ((value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.setProperty('--value', `${percent}%`);
        
        // Re-filter if we have results
        if (userLocation && allDoctors.length > 0) {
            filterAndDisplay();
        }
    });
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

// ADD THIS FUNCTION - Define zip code coordinates for Eastern NC
function getZipCodeCoordinates(zipCode) {
    // Eastern NC zip codes with their coordinates and city names
    const zipCodes = {
        // Carteret County
        '28557': { lat: 34.7227, lng: -76.8583, city: 'Morehead City' },
        '28516': { lat: 34.7649, lng: -76.8188, city: 'Beaufort' },
        '28570': { lat: 34.7804, lng: -76.8480, city: 'Newport' },
        '28531': { lat: 34.7785, lng: -76.6216, city: 'Harkers Island' },
        '28511': { lat: 34.6879, lng: -76.5713, city: 'Atlantic' },
        '28520': { lat: 34.9082, lng: -76.6866, city: 'Cedar Point' },
        '28528': { lat: 34.8965, lng: -76.5516, city: 'Gloucester' },
        '28581': { lat: 34.8696, lng: -76.5666, city: 'Smyrna' },
        '28594': { lat: 34.6601, lng: -76.5260, city: 'Sea Level' },
        
        // Craven County
        '28532': { lat: 34.9021, lng: -77.0330, city: 'Havelock' },
        '28560': { lat: 35.1085, lng: -77.0441, city: 'New Bern' },
        '28561': { lat: 35.1085, lng: -77.0441, city: 'New Bern' },
        '28562': { lat: 35.1085, lng: -77.0441, city: 'New Bern' },
        '28563': { lat: 35.1085, lng: -77.0441, city: 'New Bern' },
        '28564': { lat: 35.1085, lng: -77.0441, city: 'New Bern' },
        
        // Onslow County
        '28540': { lat: 34.7540, lng: -77.4019, city: 'Jacksonville' },
        '28544': { lat: 34.6583, lng: -77.4560, city: 'Camp Lejeune' },
        '28546': { lat: 34.7540, lng: -77.4019, city: 'Jacksonville' },
        '28547': { lat: 34.7226, lng: -77.2305, city: 'Camp Lejeune' },
        '28584': { lat: 34.5780, lng: -77.3172, city: 'Swansboro' },
        '28539': { lat: 34.5780, lng: -77.3172, city: 'Hubert' },
        '28574': { lat: 34.9079, lng: -77.2338, city: 'Richlands' },
        '28585': { lat: 34.7061, lng: -77.1241, city: 'Sneads Ferry' },
        
        // Pender County
        '28443': { lat: 34.5516, lng: -77.8830, city: 'Hampstead' },
        '28445': { lat: 34.2268, lng: -77.8664, city: 'Holly Ridge' },
        '28457': { lat: 34.4579, lng: -77.5538, city: 'Maple Hill' },
        '28460': { lat: 34.3718, lng: -77.7563, city: 'Rocky Point' },
        '28464': { lat: 34.5710, lng: -77.8358, city: 'Surf City' },
        '28478': { lat: 34.5379, lng: -78.2736, city: 'Wallace' },
        
        // Jones County
        '28571': { lat: 35.0048, lng: -77.3520, city: 'Pollocksville' },
        '28580': { lat: 34.9965, lng: -77.5811, city: 'Trenton' },
        '28526': { lat: 34.8532, lng: -77.4463, city: 'Maysville' },
        
        // Pamlico County
        '28571': { lat: 35.0048, lng: -77.3520, city: 'Oriental' },
        '28510': { lat: 35.2057, lng: -76.6977, city: 'Arapahoe' },
        '28515': { lat: 35.1816, lng: -76.6196, city: 'Bayboro' },
        '28529': { lat: 35.1465, lng: -76.8008, city: 'Grantsboro' },
        '28552': { lat: 35.0343, lng: -76.6238, city: 'Oriental' },
        '28555': { lat: 35.0879, lng: -76.7274, city: 'Minnesott Beach' },
        '28587': { lat: 35.2679, lng: -76.5710, city: 'Stonewall' },
        '28589': { lat: 35.3607, lng: -76.5952, city: 'Vandemere' },
        
        // Lenoir County
        '28501': { lat: 35.2730, lng: -77.5814, city: 'Kinston' },
        '28502': { lat: 35.2730, lng: -77.5814, city: 'Kinston' },
        '28503': { lat: 35.2730, lng: -77.5814, city: 'Kinston' },
        '28504': { lat: 35.2730, lng: -77.5814, city: 'Kinston' },
        '28523': { lat: 35.1454, lng: -77.8647, city: 'Deep Run' },
        '28538': { lat: 35.3765, lng: -77.7083, city: 'Hookerton' },
        '28543': { lat: 35.4051, lng: -77.5861, city: 'La Grange' },
        '28572': { lat: 35.2121, lng: -77.7552, city: 'Pink Hill' },
        
        // Duplin County
        '28518': { lat: 34.9957, lng: -78.0542, city: 'Beulaville' },
        '28525': { lat: 35.0524, lng: -77.9061, city: 'Faison' },
        '28365': { lat: 35.1341, lng: -78.1897, city: 'Mount Olive' },
        '28349': { lat: 34.8366, lng: -77.9408, city: 'Kenansville' },
        '28466': { lat: 35.0057, lng: -78.3164, city: 'Rose Hill' },
        '28453': { lat: 34.7366, lng: -78.1808, city: 'Magnolia' },
        '28398': { lat: 35.1957, lng: -78.1033, city: 'Warsaw' },
        '28327': { lat: 35.0168, lng: -78.0039, city: 'Calypso' },
        '28341': { lat: 34.9693, lng: -77.9436, city: 'Greenevers' },
        '28444': { lat: 34.8321, lng: -78.0239, city: 'Chinquapin' },
        '28435': { lat: 34.7360, lng: -78.0344, city: 'Teachey' }
    };
    
    return zipCodes[zipCode] || null;
}

// Perform search based on entered location
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
        // Handle zip code
        const coords = getZipCodeCoordinates(locationInput);
        if (coords) {
            userLocation = {
                lat: coords.lat,
                lng: coords.lng,
                display: `${coords.city}, NC ${locationInput}`
            };
            hideError();
            filterAndDisplay();
        } else {
            // If zip code not in our list, try geocoding it
            await geocodeAddress(locationInput);
        }
    } else {
        // Try to geocode the address
        await geocodeAddress(locationInput);
    }
}

// Geocode address using Google Maps API
async function geocodeAddress(address) {
    return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        
        // Add state if not included
        if (!address.toLowerCase().includes(', nc') && !address.toLowerCase().includes(',nc')) {
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

// Filter and display results
function filterAndDisplay() {
    if (!userLocation) return;
    
    showLoading();
    
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
    hideLoading();
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

// Display results
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

// Update results header
function updateResultsHeader(count) {
    const header = document.getElementById('resultsHeader');
    header.style.display = 'block';
    
    document.getElementById('resultCount').textContent = count;
    document.getElementById('searchRadius').textContent = searchRadius;
    document.getElementById('searchLocation').textContent = userLocation.display;
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

// UI helpers
function showLoading() {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('resultsGrid').style.display = 'none';
    document.getElementById('emptyState').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loadingState').classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('locationError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('locationError').style.display = 'none';
}