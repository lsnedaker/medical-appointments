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

// Perform search based on entered location
async function performSearch() {
    const locationInput = document.getElementById('locationInput').value.trim();
    
    if (!locationInput) {
        showError('Please enter a location or use your current location');
        return;
    }
    
    showLoading();
    
    // Check if it's a zip code
    if (/^\d{5}$/.test(locationInput)) {
        // Handle zip code
        const coords = getZipCodeCoordinates(locationInput);
        if (coords) {
            userLocation = {
                lat: coords.lat,
                lng: coords.lng,
                display: `${locationInput} (${coords.city})`
            };
            hideError();
            filterAndDisplay();
        } else {
            hideLoading();
            showError('Zip code not found in our coverage area');
        }
    } else {
        // Try to geocode the address
        await geocodeAddress(locationInput);
    }
}

// Get coordinates for known zip codes
function getZipCodeCoordinates(zipCode) {
    const zipCoords = {
        '28557': { lat: 34.7227, lng: -76.8583, city: 'Morehead City' },
        '28516': { lat: 34.7199, lng: -76.6649, city: 'Beaufort' },
        '28570': { lat: 34.7607, lng: -76.9419, city: 'Newport' },
        '28532': { lat: 34.9024, lng: -76.8793, city: 'Havelock' },
        '28584': { lat: 34.8960, lng: -76.7280, city: 'Cedar Point' },
        '28577': { lat: 34.7091, lng: -76.1769, city: 'Sea Level' },
        '28533': { lat: 34.6573, lng: -77.0733, city: 'Cape Carteret' },
        '28594': { lat: 34.6907, lng: -77.0766, city: 'Emerald Isle' },
        '28531': { lat: 34.7254, lng: -76.5835, city: 'Harkers Island' }
    };
    
    return zipCoords[zipCode] || null;
}

// Geocode address (simplified - in production, use a real geocoding API)
async function geocodeAddress(address) {
    // For this demo, we'll do simple city matching
    const cityCoords = {
        'morehead city': { lat: 34.7227, lng: -76.8583 },
        'beaufort': { lat: 34.7199, lng: -76.6649 },
        'newport': { lat: 34.7607, lng: -76.9419 },
        'havelock': { lat: 34.9024, lng: -76.8793 },
        'cedar point': { lat: 34.8960, lng: -76.7280 },
        'sea level': { lat: 34.7091, lng: -76.1769 },
        'cape carteret': { lat: 34.6573, lng: -77.0733 },
        'emerald isle': { lat: 34.6907, lng: -77.0766 },
        'harkers island': { lat: 34.7254, lng: -76.5835 },
        'atlantic beach': { lat: 34.6990, lng: -76.7402 },
        'pine knoll shores': { lat: 34.6957, lng: -76.8074 },
        'swansboro': { lat: 34.6879, lng: -77.1191 }
    };
    
    const searchTerm = address.toLowerCase().replace(/[,\s]+nc.*$/i, '').trim();
    
    for (const [city, coords] of Object.entries(cityCoords)) {
        if (searchTerm.includes(city) || city.includes(searchTerm)) {
            userLocation = {
                lat: coords.lat,
                lng: coords.lng,
                display: address
            };
            hideError();
            filterAndDisplay();
            return;
        }
    }
    
    // If no match found
    hideLoading();
    showError('Location not found. Try entering a city name or zip code in Eastern NC.');
}

// Filter and display results
function filterAndDisplay() {
    if (!userLocation) return;
    
    showLoading();
    
    // Calculate distances for all doctors
    const doctorsWithDistance = allDoctors.map(doctor => {
        const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            doctor.latitude || getDefaultLatitude(doctor.city),
            doctor.longitude || getDefaultLongitude(doctor.city)
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

// Get default coordinates for cities
function getDefaultLatitude(city) {
    const coords = {
        'Morehead City': 34.7227,
        'Beaufort': 34.7199,
        'Newport': 34.7607,
        'Havelock': 34.9024
    };
    return coords[city] || 34.7227; // Default to Morehead City
}

function getDefaultLongitude(city) {
    const coords = {
        'Morehead City': -76.8583,
        'Beaufort': -76.6649,
        'Newport': -76.9419,
        'Havelock': -76.8793
    };
    return coords[city] || -76.8583; // Default to Morehead City
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