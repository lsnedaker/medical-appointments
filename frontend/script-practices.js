// script-practices.js - Practice-centric frontend logic

// API Configuration
const API_URL = 'https://medical-appointments-api-n3yu.onrender.com/api';

// State
let allPractices = [];
let allSpecialties = [];
let userLocation = null;
let searchRadius = 25;
let selectedSpecialty = '';
let sortMethod = 'balanced';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupRadiusSlider();
    setupDateInputs();
    loadInitialData();
});

// Setup date inputs with today as minimum
function setupDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    if (dateFrom) {
        dateFrom.min = today;
        dateFrom.value = today;
        dateFrom.addEventListener('change', () => {
            // Update dateTo minimum when dateFrom changes
            if (dateTo && dateFrom.value) {
                dateTo.min = dateFrom.value;
                if (dateTo.value && dateTo.value < dateFrom.value) {
                    dateTo.value = dateFrom.value;
                }
            }
            // Re-filter if we have results
            if (userLocation && allPractices.length > 0) {
                filterAndDisplay();
            }
        });
    }
    
    if (dateTo) {
        dateTo.min = today;
        // Set default to 3 months from now
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        dateTo.value = threeMonths.toISOString().split('T')[0];
        
        dateTo.addEventListener('change', () => {
            // Re-filter if we have results
            if (userLocation && allPractices.length > 0) {
                filterAndDisplay();
            }
        });
    }
}

// Clear date filter
function clearDateFilter() {
    const today = new Date().toISOString().split('T')[0];
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    if (dateFrom) dateFrom.value = today;
    if (dateTo) {
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        dateTo.value = threeMonths.toISOString().split('T')[0];
    }
    
    if (userLocation && allPractices.length > 0) {
        filterAndDisplay();
    }
}

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
    
    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            sortMethod = e.target.dataset.sort;
            if (userLocation && allPractices.length > 0) {
                filterAndDisplay();
            }
        });
    });
}

// Setup radius slider
function setupRadiusSlider() {
    const slider = document.getElementById('radiusSlider');
    const valueDisplay = document.getElementById('radiusValue');
    const sliderFill = document.querySelector('.slider-fill');
    
    const radiusValues = {
        '1': 5,
        '2': 25,
        '3': 100,
        '4': 250,
        '5': 500,
        '6': 99999
    };
    
    const stepPercentages = {
        '1': 0,
        '2': 20,
        '3': 40,
        '4': 60,
        '5': 80,
        '6': 100
    };
    
    function updateSlider() {
        const position = slider.value;
        const actualRadius = radiusValues[position];
        const percentage = stepPercentages[position];
        
        if (sliderFill) {
            sliderFill.style.width = `${percentage}%`;
        }
        
        if (actualRadius === 99999) {
            searchRadius = 99999;
            valueDisplay.textContent = 'Nationwide (Max)';
        } else {
            searchRadius = actualRadius;
            valueDisplay.textContent = `${actualRadius} miles`;
        }
    }
    
    slider.addEventListener('input', () => {
        updateSlider();
        if (userLocation && allPractices.length > 0) {
            filterAndDisplay();
        }
    });
    
    updateSlider();
}

// Load initial data
async function loadInitialData() {
    try {
        // Load practices
        const practicesResponse = await fetch(`${API_URL}/practices`);
        allPractices = await practicesResponse.json();
        console.log(`Loaded ${allPractices.length} practices`);
        
        // Load specialties for filter pills
        const specialtiesResponse = await fetch(`${API_URL}/specialties`);
        allSpecialties = await specialtiesResponse.json();
        
        // Create specialty filter pills
        createSpecialtyFilters();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load practice data. Please refresh the page.');
    }
}

// Create specialty filter pills
function createSpecialtyFilters() {
    const container = document.getElementById('specialtyFilters');
    
    // Add click handler to the existing "All Specialties" pill
    const existingAllPill = container.querySelector('[data-specialty=""]');
    if (existingAllPill) {
        existingAllPill.addEventListener('click', handleSpecialtyFilter);
    }
    
    // Add pills for each specialty
    allSpecialties.forEach(specialty => {
        const pill = document.createElement('button');
        pill.className = 'specialty-pill';
        pill.dataset.specialty = specialty.code;
        pill.textContent = specialty.name;
        pill.addEventListener('click', handleSpecialtyFilter);
        container.appendChild(pill);
    });
}

// Handle specialty filter selection
function handleSpecialtyFilter(e) {
    // Remove active class from all pills
    document.querySelectorAll('.specialty-pill').forEach(pill => {
        pill.classList.remove('active');
    });
    
    // Add active class to clicked pill
    e.target.classList.add('active');
    
    // Update selected specialty
    selectedSpecialty = e.target.dataset.specialty;
    
    // Re-filter if we have results
    if (userLocation && allPractices.length > 0) {
        filterAndDisplay();
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
    
    if (userLocation && 
        (locationInput === 'Current Location' || 
         locationInput === userLocation.display)) {
        filterAndDisplay();
        return;
    }
    
    showLoading();
    
    // Check if it's a zip code
    if (/^\d{5}$/.test(locationInput)) {
        await geocodeAddress(locationInput);
    } else {
        await geocodeAddress(locationInput);
    }
}

// Geocode address using Google Maps API
async function geocodeAddress(address) {
    return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        
        const isZipCode = /^\d{5}$/.test(address);
        if (!isZipCode && 
            !address.toLowerCase().includes(', ') && 
            !address.match(/\b[A-Z]{2}\b/)) {
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

// Filter and display practices
function filterAndDisplay() {
    if (!userLocation) {
        hideLoading();
        return;
    }
    
    showLoading();
    
    setTimeout(() => {
        // Get date filter values
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;
        
        // Calculate distances for all practices
        const practicesWithDistance = allPractices.map(practice => {
            if (!practice.latitude || !practice.longitude) {
                return {
                    ...practice,
                    distance: 999999
                };
            }
            
            const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                practice.latitude,
                practice.longitude
            );
            
            // Filter specialties by date range if specified
            let filteredSpecialties = practice.specialties;
            if (fromDate || toDate) {
                filteredSpecialties = practice.specialties.map(specialty => {
                    if (!specialty.next_available) return specialty;
                    
                    const availDate = new Date(specialty.next_available);
                    if (fromDate && availDate < fromDate) {
                        return { ...specialty, next_available: null, filtered_out: true };
                    }
                    if (toDate && availDate > toDate) {
                        return { ...specialty, next_available: null, filtered_out: true };
                    }
                    return specialty;
                });
            }
            
            // Calculate earliest availability across filtered specialties
            let earliestDate = null;
            let earliestSpecialty = null;
            
            filteredSpecialties.forEach(specialty => {
                if (specialty.next_available && !specialty.filtered_out) {
                    const date = new Date(specialty.next_available);
                    if (!earliestDate || date < earliestDate) {
                        earliestDate = date;
                        earliestSpecialty = specialty;
                    }
                }
            });
            
            return {
                ...practice,
                specialties: filteredSpecialties,
                distance: distance,
                earliestDate: earliestDate,
                earliestSpecialty: earliestSpecialty
            };
        });
        
        // Filter by radius
        let filteredPractices = practicesWithDistance.filter(p => p.distance <= searchRadius);
        
        // Filter by specialty if selected
        if (selectedSpecialty) {
            filteredPractices = filteredPractices.filter(practice => 
                practice.specialties.some(s => s.code === selectedSpecialty && !s.filtered_out)
            );
        }
        
        // Filter out practices with no available appointments in date range
        if (dateFrom || dateTo) {
            filteredPractices = filteredPractices.filter(practice => 
                practice.specialties.some(s => s.next_available && !s.filtered_out)
            );
        }
        
        // Sort based on selected method
        filteredPractices = sortPractices(filteredPractices, sortMethod);
        
        // Display results
        displayResults(filteredPractices);
        updateResultsHeader(filteredPractices.length);
        
        hideLoading();
    }, 100);
}

// Sort practices
function sortPractices(practices, method) {
    switch(method) {
        case 'distance':
            return practices.sort((a, b) => a.distance - b.distance);
        
        case 'soonest':
            return practices.sort((a, b) => {
                // Practices with no availability go to the end
                if (!a.earliestDate && !b.earliestDate) return 0;
                if (!a.earliestDate) return 1;
                if (!b.earliestDate) return -1;
                return a.earliestDate - b.earliestDate;
            });
        
        case 'balanced':
        default:
            return practices.sort((a, b) => {
                // Calculate a balanced score
                const maxDistance = Math.max(...practices.map(p => p.distance === 999999 ? 0 : p.distance));
                
                let scoreA = 0;
                let scoreB = 0;
                
                // Distance component (40%)
                if (a.distance !== 999999) {
                    scoreA += (1 - a.distance / maxDistance) * 0.4;
                }
                if (b.distance !== 999999) {
                    scoreB += (1 - b.distance / maxDistance) * 0.4;
                }
                
                // Availability component (60%)
                if (a.earliestDate) {
                    const daysA = Math.ceil((a.earliestDate - new Date()) / (1000 * 60 * 60 * 24));
                    scoreA += (1 - Math.min(daysA, 30) / 30) * 0.6;
                }
                if (b.earliestDate) {
                    const daysB = Math.ceil((b.earliestDate - new Date()) / (1000 * 60 * 60 * 24));
                    scoreB += (1 - Math.min(daysB, 30) / 30) * 0.6;
                }
                
                return scoreB - scoreA; // Higher score = better
            });
    }
}

// Display results
function displayResults(practices) {
    const grid = document.getElementById('resultsGrid');
    
    if (practices.length === 0) {
        grid.style.display = 'none';
        document.getElementById('emptyState').classList.remove('hidden');
        return;
    }
    
    document.getElementById('emptyState').classList.add('hidden');
    grid.style.display = 'grid';
    
    grid.innerHTML = practices.map(practice => {
        // Filter specialties if needed
        let displaySpecialties = practice.specialties;
        if (selectedSpecialty) {
            displaySpecialties = practice.specialties.filter(s => s.code === selectedSpecialty);
        }
        
        // Sort specialties by availability
        displaySpecialties.sort((a, b) => {
            if (!a.next_available && !b.next_available) return 0;
            if (!a.next_available) return 1;
            if (!b.next_available) return -1;
            return new Date(a.next_available) - new Date(b.next_available);
        });
        
        return `
            <div class="practice-card">
                ${practice.distance !== 999999 ? `
                    <div class="distance-badge">
                        📍 ${practice.distance.toFixed(1)} mi
                    </div>
                ` : ''}
                
                <div class="practice-header">
                    <h3 class="practice-name">
                        ${practice.name}
                        ${practice.accepts_new_patients ? 
                            '<span class="practice-badge">✓ Accepting</span>' : ''}
                    </h3>
                    <div class="practice-info">
                        <div class="practice-info-item">
                            📍 ${practice.address}, ${practice.city}
                        </div>
                        <div class="practice-info-item">
                            📞 ${practice.phone}
                        </div>
                    </div>
                </div>
                
                <div class="specialties-section">
                    <div class="specialties-title">Available Specialties</div>
                    <div class="specialty-list">
                        ${displaySpecialties.map(specialty => {
                            const availabilityClass = getAvailabilityClass(specialty.next_available);
                            return `
                                <div class="specialty-item ${availabilityClass}">
                                    <span class="specialty-name">${specialty.name}</span>
                                    <div class="specialty-availability">
                                        ${specialty.next_available ? `
                                            <span class="availability-date">
                                                ${formatDate(specialty.next_available)}
                                            </span>
                                            <span class="availability-relative">
                                                ${getRelativeTime(specialty.next_available)}
                                            </span>
                                        ` : `
                                            <span class="no-availability">Call for availability</span>
                                        `}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                ${practice.doctors && practice.doctors.length > 0 ? `
                    <div class="doctors-section">
                        <div class="doctors-title">Providers</div>
                        <div class="doctors-list">
                            ${practice.doctors.map(doctor => 
                                `<span class="doctor-tag">${doctor.name}, ${doctor.title}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="practice-footer">
                    <div class="contact-info">
                        <span class="phone-number">${practice.phone}</span>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">
                            Call to schedule
                        </span>
                    </div>
                    <button class="call-practice-btn" onclick="callPractice('${practice.phone}')">
                        Call Now
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
    
    let description = '';
    if (searchRadius > 9000) {
        description = `Nationwide from ${userLocation.display}`;
    } else {
        description = `Within ${searchRadius} miles of ${userLocation.display}`;
    }
    
    if (selectedSpecialty) {
        const specialty = allSpecialties.find(s => s.code === selectedSpecialty);
        if (specialty) {
            description += ` • ${specialty.name} specialists`;
        }
    }
    
    document.getElementById('searchDescription').textContent = description;
}

// Utility functions
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
}

function getRelativeTime(dateString) {
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

function getAvailabilityClass(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'available-today';
    if (diffDays <= 7) return 'available-soon';
    return '';
}

function callPractice(phone) {
    // For mobile devices, this would open the dialer
    // window.location.href = `tel:${phone.replace(/\D/g, '')}`;
    alert(`Call ${phone} to schedule your appointment`);
}

// UI helpers
function showLoading() {
    const loadingState = document.getElementById('loadingState');
    const resultsGrid = document.getElementById('resultsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) {
        loadingState.classList.remove('hidden');
        loadingState.style.display = 'flex';
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
        loadingState.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('locationError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    hideLoading();
}

function hideError() {
    const errorDiv = document.getElementById('locationError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Make functions available globally
window.callPractice = callPractice;
window.handleSpecialtyFilter = handleSpecialtyFilter;
window.clearDateFilter = clearDateFilter;