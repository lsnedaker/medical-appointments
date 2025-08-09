const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.json({ status: 'Medical Appointments API is running!' });
});


// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend connected!' });
});

// Get all appointments
app.get('/api/appointments', async (req, res) => {
  try {
    const { specialty, zipCode } = req.query;
    
    let query = supabase
      .from('doctor_appointments')
      .select('*')
      .order('next_available', { ascending: true });

    // Apply filters if provided
    if (specialty) {
      query = query.eq('specialty', specialty);
    }
    
    if (zipCode && zipCode !== 'all') {
      query = query.eq('zip_code', zipCode);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Add a new doctor
app.post('/api/doctors', async (req, res) => {
  try {
    const { name, specialty, address, city, zip_code, phone } = req.body;
    
    const { data, error } = await supabase
      .from('doctors')
      .insert([{ name, specialty, address, city, zip_code, phone }])
      .select();

    if (error) throw error;
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error adding doctor:', error);
    res.status(500).json({ error: 'Failed to add doctor' });
  }
});

// Update appointment availability
app.post('/api/appointments', async (req, res) => {
  try {
    const { doctor_id, next_available } = req.body;
    
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ 
        doctor_id, 
        next_available,
        last_checked: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('Connected to Supabase!');
});