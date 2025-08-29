// server.js - Complete backend API for practice-centric system

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uuxtywqbyyczpjptzmvg.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1eHR5d3FieXljenBqcHR6bXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjExNTksImV4cCI6MjA3MDMzNzE1OX0.2c6mAfSSK0D7i2LtaMP11LlvGqKgvjmgTg4BI722wUo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
// Add to top of server.js
const emailWebhook = require('./email-webhook');
const { sendWeeklyEmails } = require('./email-service');

// Add webhook route
 app.use('/api', emailWebhook);

// Add manual trigger endpoint for testing
app.post('/api/admin/send-weekly-emails', async (req, res) => {
    try {
        await sendWeeklyEmails();
        res.json({ success: true, message: 'Weekly emails sent' });
    } catch (error) {
        console.error('Error sending emails:', error);
        res.status(500).json({ error: 'Failed to send emails' });
    }
});

// Add endpoint to update practice email
app.put('/api/practices/:id/email', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, email_notifications_enabled } = req.body;
        
        const { data, error } = await supabase
            .from('practices')
            .update({ 
                email,
                email_notifications_enabled,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error updating practice email:', error);
        res.status(500).json({ error: 'Failed to update email settings' });
    }
});

// ============================================
// PRACTICES ENDPOINTS
// ============================================

// GET all practices with their specialties and availability
app.get('/api/practices', async (req, res) => {
  try {
    // Get all practices with their details
    const { data: practices, error } = await supabase
      .from('practices')
      .select(`
        *,
        practice_specialties (
          specialty_id,
          specialties (
            id,
            code,
            name
          )
        ),
        appointments (
          specialty_id,
          next_available,
          last_checked
        ),
        doctor_practices (
          doctor_id,
          doctors (
            id,
            name,
            title
          )
        )
      `)
      .order('name');

    if (error) throw error;

    // Transform the data to a cleaner format
    const transformedPractices = practices.map(practice => {
      // Group specialties with their availability
      const specialtiesMap = {};
      
      // Add all specialties for this practice
      practice.practice_specialties?.forEach(ps => {
        const specialty = ps.specialties;
        specialtiesMap[specialty.id] = {
          id: specialty.id,
          code: specialty.code,
          name: specialty.name,
          next_available: null
        };
      });

      // Add appointment dates to specialties
      practice.appointments?.forEach(appt => {
        if (specialtiesMap[appt.specialty_id]) {
          specialtiesMap[appt.specialty_id].next_available = appt.next_available;
        }
      });

      // Get unique doctors
      const doctors = practice.doctor_practices?.map(dp => dp.doctors) || [];

      return {
        id: practice.id,
        name: practice.name,
        address: practice.address,
        city: practice.city,
        state: practice.state,
        zip_code: practice.zip_code,
        phone: practice.phone,
        latitude: practice.latitude,
        longitude: practice.longitude,
        website: practice.website,
        accepts_new_patients: practice.accepts_new_patients,
        specialties: Object.values(specialtiesMap),
        doctors: doctors,
        created_at: practice.created_at,
        updated_at: practice.updated_at
      };
    });

    res.json(transformedPractices);
  } catch (error) {
    console.error('Error fetching practices:', error);
    res.status(500).json({ error: 'Failed to fetch practices' });
  }
});

// GET single practice by ID
app.get('/api/practices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: practice, error } = await supabase
      .from('practices')
      .select(`
        *,
        practice_specialties (
          specialty_id,
          specialties (
            id,
            code,
            name
          )
        ),
        appointments (
          specialty_id,
          next_available,
          last_checked
        ),
        doctor_practices (
          doctor_id,
          is_primary_location,
          doctors (
            id,
            name,
            title,
            doctor_specialties (
              specialty_id,
              is_primary,
              specialties (
                id,
                code,
                name
              )
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!practice) {
      return res.status(404).json({ error: 'Practice not found' });
    }

    // Transform the data
    const specialtiesMap = {};
    
    practice.practice_specialties?.forEach(ps => {
      const specialty = ps.specialties;
      specialtiesMap[specialty.id] = {
        id: specialty.id,
        code: specialty.code,
        name: specialty.name,
        next_available: null,
        doctors: []
      };
    });

    practice.appointments?.forEach(appt => {
      if (specialtiesMap[appt.specialty_id]) {
        specialtiesMap[appt.specialty_id].next_available = appt.next_available;
      }
    });

    // Add doctors to their specialties
    practice.doctor_practices?.forEach(dp => {
      const doctor = dp.doctors;
      doctor.doctor_specialties?.forEach(ds => {
        if (specialtiesMap[ds.specialty_id]) {
          specialtiesMap[ds.specialty_id].doctors.push({
            id: doctor.id,
            name: doctor.name,
            title: doctor.title,
            is_primary_specialty: ds.is_primary
          });
        }
      });
    });

    const result = {
      id: practice.id,
      name: practice.name,
      address: practice.address,
      city: practice.city,
      state: practice.state,
      zip_code: practice.zip_code,
      phone: practice.phone,
      latitude: practice.latitude,
      longitude: practice.longitude,
      website: practice.website,
      accepts_new_patients: practice.accepts_new_patients,
      specialties: Object.values(specialtiesMap),
      created_at: practice.created_at,
      updated_at: practice.updated_at
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching practice:', error);
    res.status(500).json({ error: 'Failed to fetch practice' });
  }
});

// POST create new practice
app.post('/api/practices', async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      state,
      zip_code,
      phone,
      latitude,
      longitude,
      website,
      accepts_new_patients,
      specialties, // Array of specialty codes
      doctors // Array of doctor IDs
    } = req.body;

    // Insert the practice
    const { data: practice, error: practiceError } = await supabase
      .from('practices')
      .insert({
        name,
        address,
        city,
        state: state || 'NC',
        zip_code,
        phone,
        latitude,
        longitude,
        website,
        accepts_new_patients: accepts_new_patients !== undefined ? accepts_new_patients : true
      })
      .select()
      .single();

    if (practiceError) throw practiceError;

    // Add specialties if provided
    if (specialties && specialties.length > 0) {
      // Get specialty IDs from codes
      const { data: specialtyData, error: specError } = await supabase
        .from('specialties')
        .select('id, code')
        .in('code', specialties);

      if (specError) throw specError;

      const practiceSpecialties = specialtyData.map(spec => ({
        practice_id: practice.id,
        specialty_id: spec.id
      }));

      const { error: psError } = await supabase
        .from('practice_specialties')
        .insert(practiceSpecialties);

      if (psError) throw psError;
    }

    // Link doctors if provided
    if (doctors && doctors.length > 0) {
      const doctorPractices = doctors.map(doctorId => ({
        doctor_id: doctorId,
        practice_id: practice.id,
        is_primary_location: false
      }));

      const { error: dpError } = await supabase
        .from('doctor_practices')
        .insert(doctorPractices);

      if (dpError) throw dpError;
    }

    res.status(201).json(practice);
  } catch (error) {
    console.error('Error creating practice:', error);
    res.status(500).json({ error: 'Failed to create practice' });
  }
});

// PUT update practice
app.put('/api/practices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove specialties and doctors from updates - handle separately
    const { specialties, doctors, ...practiceUpdates } = updates;

    // Update practice basic info
    const { data: practice, error } = await supabase
      .from('practices')
      .update({
        ...practiceUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update specialties if provided
    if (specialties !== undefined) {
      // Remove existing specialties
      await supabase
        .from('practice_specialties')
        .delete()
        .eq('practice_id', id);

      // Add new specialties
      if (specialties.length > 0) {
        const { data: specialtyData, error: specError } = await supabase
          .from('specialties')
          .select('id, code')
          .in('code', specialties);

        if (specError) throw specError;

        const practiceSpecialties = specialtyData.map(spec => ({
          practice_id: id,
          specialty_id: spec.id
        }));

        const { error: psError } = await supabase
          .from('practice_specialties')
          .insert(practiceSpecialties);

        if (psError) throw psError;
      }
    }

    res.json(practice);
  } catch (error) {
    console.error('Error updating practice:', error);
    res.status(500).json({ error: 'Failed to update practice' });
  }
});

// DELETE practice
app.delete('/api/practices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('practices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting practice:', error);
    res.status(500).json({ error: 'Failed to delete practice' });
  }
});

// ============================================
// APPOINTMENTS ENDPOINTS
// ============================================

// GET all appointments with practice and specialty details
app.get('/api/appointments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        practices (
          id,
          name,
          address,
          city,
          state,
          zip_code,
          phone,
          latitude,
          longitude
        ),
        specialties (
          id,
          code,
          name
        )
      `)
      .order('next_available');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// POST/PUT update or create appointment for practice + specialty
app.post('/api/appointments', async (req, res) => {
  try {
    const { practice_id, specialty_code, next_available } = req.body;

    // Get specialty ID from code
    const { data: specialty, error: specError } = await supabase
      .from('specialties')
      .select('id')
      .eq('code', specialty_code)
      .single();

    if (specError) throw specError;

    // Upsert appointment (update if exists, insert if not)
    const { data, error } = await supabase
      .from('appointments')
      .upsert({
        practice_id,
        specialty_id: specialty.id,
        next_available,
        last_checked: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'practice_id,specialty_id'
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// ============================================
// DOCTORS ENDPOINTS
// ============================================

// GET all doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        *,
        doctor_practices (
          practice_id,
          is_primary_location,
          practices (
            id,
            name,
            city
          )
        ),
        doctor_specialties (
          specialty_id,
          is_primary,
          specialties (
            id,
            code,
            name
          )
        )
      `)
      .order('name');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// POST create new doctor
app.post('/api/doctors', async (req, res) => {
  try {
    const {
      name,
      title,
      is_accepting_patients,
      practice_ids, // Array of practice IDs
      specialties // Array of specialty codes
    } = req.body;

    // Insert doctor
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .insert({
        name,
        title: title || 'MD',
        is_accepting_patients: is_accepting_patients !== undefined ? is_accepting_patients : true
      })
      .select()
      .single();

    if (doctorError) throw doctorError;

    // Link to practices
    if (practice_ids && practice_ids.length > 0) {
      const doctorPractices = practice_ids.map((practice_id, index) => ({
        doctor_id: doctor.id,
        practice_id,
        is_primary_location: index === 0 // First practice is primary
      }));

      const { error: dpError } = await supabase
        .from('doctor_practices')
        .insert(doctorPractices);

      if (dpError) throw dpError;
    }

    // Add specialties
    if (specialties && specialties.length > 0) {
      const { data: specialtyData, error: specError } = await supabase
        .from('specialties')
        .select('id, code')
        .in('code', specialties);

      if (specError) throw specError;

      const doctorSpecialties = specialtyData.map((spec, index) => ({
        doctor_id: doctor.id,
        specialty_id: spec.id,
        is_primary: index === 0 // First specialty is primary
      }));

      const { error: dsError } = await supabase
        .from('doctor_specialties')
        .insert(doctorSpecialties);

      if (dsError) throw dsError;
    }

    res.status(201).json(doctor);
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ error: 'Failed to create doctor' });
  }
});

// PUT update doctor
app.put('/api/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { practice_ids, specialties, ...doctorUpdates } = updates;

    // Update doctor basic info
    const { data: doctor, error } = await supabase
      .from('doctors')
      .update({
        ...doctorUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update practices if provided
    if (practice_ids !== undefined) {
      // Remove existing practices
      await supabase
        .from('doctor_practices')
        .delete()
        .eq('doctor_id', id);

      // Add new practices
      if (practice_ids.length > 0) {
        const doctorPractices = practice_ids.map((practice_id, index) => ({
          doctor_id: id,
          practice_id,
          is_primary_location: index === 0
        }));

        await supabase
          .from('doctor_practices')
          .insert(doctorPractices);
      }
    }

    // Update specialties if provided
    if (specialties !== undefined) {
      // Remove existing specialties
      await supabase
        .from('doctor_specialties')
        .delete()
        .eq('doctor_id', id);

      // Add new specialties
      if (specialties.length > 0) {
        const { data: specialtyData } = await supabase
          .from('specialties')
          .select('id, code')
          .in('code', specialties);

        const doctorSpecialties = specialtyData.map((spec, index) => ({
          doctor_id: id,
          specialty_id: spec.id,
          is_primary: index === 0
        }));

        await supabase
          .from('doctor_specialties')
          .insert(doctorSpecialties);
      }
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ error: 'Failed to update doctor' });
  }
});

// DELETE doctor
app.delete('/api/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
});

// ============================================
// SPECIALTIES ENDPOINTS
// ============================================

// GET all specialties
app.get('/api/specialties', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({ error: 'Failed to fetch specialties' });
  }
});

// ============================================
// SEARCH ENDPOINTS
// ============================================

// GET practices by location and specialty
app.get('/api/search', async (req, res) => {
  try {
    const { 
      lat, 
      lng, 
      radius = 25, 
      specialty,
      sort = 'balanced' // 'distance', 'availability', 'balanced'
    } = req.query;

    // Get all practices with availability
    let query = supabase
      .from('practice_availability')
      .select('*');

    // Filter by specialty if provided
    if (specialty) {
      query = query.eq('specialty_code', specialty);
    }

    const { data, error } = await query;

    if (error) throw error;

    // If coordinates provided, calculate distances
    if (lat && lng) {
      const practicesWithDistance = data.map(practice => {
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(practice.latitude),
          parseFloat(practice.longitude)
        );
        return {
          ...practice,
          distance
        };
      });

      // Filter by radius
      const filtered = practicesWithDistance.filter(p => p.distance <= parseFloat(radius));

      // Sort results
      let sorted;
      switch (sort) {
        case 'distance':
          sorted = filtered.sort((a, b) => a.distance - b.distance);
          break;
        case 'availability':
          sorted = filtered.sort((a, b) => {
            if (!a.next_available) return 1;
            if (!b.next_available) return -1;
            return new Date(a.next_available) - new Date(b.next_available);
          });
          break;
        case 'balanced':
        default:
          sorted = filtered.sort((a, b) => {
            // Weighted score: 60% availability, 40% distance
            const scoreA = getBalancedScore(a);
            const scoreB = getBalancedScore(b);
            return scoreA - scoreB;
          });
      }

      res.json(sorted);
    } else {
      // No location provided, just return all
      res.json(data);
    }
  } catch (error) {
    console.error('Error searching practices:', error);
    res.status(500).json({ error: 'Failed to search practices' });
  }
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function getBalancedScore(practice) {
  const distanceScore = practice.distance / 100; // Normalize to 0-1 range
  
  let availabilityScore = 1;
  if (practice.next_available) {
    const daysUntil = Math.ceil((new Date(practice.next_available) - new Date()) / (1000 * 60 * 60 * 24));
    availabilityScore = daysUntil / 30; // Normalize to 0-1 range (30 days max)
  }
  
  return (availabilityScore * 0.6) + (distanceScore * 0.4);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});