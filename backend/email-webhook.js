// email-webhook.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const chrono = require('chrono-node'); // For parsing dates from natural language

 const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_KEY
 );

// Webhook endpoint for Resend/SendGrid incoming emails
router.post('/webhook/email-reply', async (req, res) => {
    try {
        const { 
            from,
            subject,
            text,
            headers
        } = req.body;

        // Extract practice ID and specialty from headers or subject
        const practiceId = extractPracticeId(subject, text);
        const specialtyCode = extractSpecialtyCode(subject, text);

        if (!practiceId || !specialtyCode) {
            console.error('Could not identify practice or specialty from email');
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Parse the response
        const parsedResponse = parseEmailResponse(text);

        if (parsedResponse.action === 'UNSUBSCRIBE') {
            await handleUnsubscribe(practiceId);
        } else if (parsedResponse.action === 'UPDATE') {
            await updateAvailability(practiceId, specialtyCode, parsedResponse.date);
        }

        // Log the response
        await supabase
            .from('email_logs')
            .insert({
                practice_id: practiceId,
                email_type: 'reply_received',
                response_content: text,
                response_received_at: new Date().toISOString()
            });

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error processing email webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Parse email response to extract date
function parseEmailResponse(text) {
    const cleanText = text.trim().toLowerCase();
    
    // Check for unsubscribe
    if (cleanText.includes('unsubscribe')) {
        return { action: 'UNSUBSCRIBE' };
    }
    
    // Check for no availability
    if (cleanText.includes('none') || cleanText.includes('no availability')) {
        return { action: 'UPDATE', date: null };
    }
    
    // Try to parse date using chrono
    const parsedDate = chrono.parseDate(text);
    if (parsedDate) {
        return { action: 'UPDATE', date: parsedDate.toISOString() };
    }
    
    // Try regex patterns for common date formats
    const datePatterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
        /(\d{4})-(\d{2})-(\d{2})/,         // YYYY-MM-DD
    ];
    
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            // Parse and validate the date
            const date = new Date(match[0]);
            if (!isNaN(date.getTime())) {
                return { action: 'UPDATE', date: date.toISOString() };
            }
        }
    }
    
    return { action: 'UNKNOWN' };
}

// Extract practice ID from email content
function extractPracticeId(subject, text) {
    // Look for "Practice ID: XXX" in the email
    const match = text.match(/Practice ID:\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
}

// Extract specialty code from email content
function extractSpecialtyCode(subject, text) {
    // Look for "Specialty Code: XXX" in the email
    const match = text.match(/Specialty Code:\s*([\w-]+)/i);
    return match ? match[1] : null;
}

// Handle unsubscribe request
async function handleUnsubscribe(practiceId) {
    await supabase
        .from('practices')
        .update({ email_notifications_enabled: false })
        .eq('id', practiceId);
}

// Update availability in database
async function updateAvailability(practiceId, specialtyCode, date) {
    // Get specialty ID
    const { data: specialty } = await supabase
        .from('specialties')
        .select('id')
        .eq('code', specialtyCode)
        .single();

    if (!specialty) {
        console.error('Specialty not found:', specialtyCode);
        return;
    }

    // Update or insert appointment
    await supabase
        .from('appointments')
        .upsert({
            practice_id: practiceId,
            specialty_id: specialty.id,
            next_available: date,
            last_checked: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'practice_id,specialty_id'
        });
}

module.exports = router;