// email-service.js
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use service key for backend operations
);

// Weekly email sender
async function sendWeeklyEmails() {
    try {
        // Get all practices with email addresses that are enabled
        const { data: practices, error } = await supabase
            .from('practices')
            .select(`
                *,
                practice_specialties (
                    specialties (
                        id,
                        code,
                        name
                    )
                )
            `)
            .eq('email_notifications_enabled', true)
            .not('email', 'is', null);

        if (error) throw error;

        for (const practice of practices) {
            // Check if email was sent this week
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            if (practice.last_email_sent && new Date(practice.last_email_sent) > oneWeekAgo) {
                continue; // Skip if already sent this week
            }

            // Send email for each specialty
            for (const ps of practice.practice_specialties) {
                const specialty = ps.specialties;
                await sendAvailabilityEmail(practice, specialty);
            }

            // Update last_email_sent
            await supabase
                .from('practices')
                .update({ last_email_sent: new Date().toISOString() })
                .eq('id', practice.id);
        }
    } catch (error) {
        console.error('Error sending weekly emails:', error);
    }
}

// Send individual email
async function sendAvailabilityEmail(practice, specialty) {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #5B5FFF;">Weekly Availability Update Request</h2>
            
            <p>Hi ${practice.name},</p>
            
            <p>This is your weekly reminder to update your next available appointment for:</p>
            
            <div style="background: #f8f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2D3436; margin: 0;">${specialty.name}</h3>
            </div>
            
            <p><strong>Simply reply to this email with the next available date</strong> in one of these formats:</p>
            <ul>
                <li>MM/DD/YYYY (e.g., 03/15/2024)</li>
                <li>Month Day, Year (e.g., March 15, 2024)</li>
                <li>Relative dates (e.g., "next Tuesday", "in 2 weeks")</li>
            </ul>
            
            <p>Or reply with "NONE" if no appointments are currently available.</p>
            
            <hr style="border: none; border-top: 1px solid #e9ecff; margin: 30px 0;">
            
            <p style="color: #636E72; font-size: 12px;">
                Practice ID: ${practice.id}<br>
                Specialty Code: ${specialty.code}<br>
                <em>This information helps us process your response automatically.</em>
            </p>
            
            <p style="color: #636E72; font-size: 12px;">
                To stop receiving these emails, reply with "UNSUBSCRIBE".
            </p>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: practice.email,
            subject: `Availability Update: ${specialty.name} - ${practice.name}`,
            html: emailBody,
            headers: {
                'X-Practice-ID': practice.id.toString(),
                'X-Specialty-Code': specialty.code
            }
        });

        if (error) throw error;

        // Log the email
        await supabase
            .from('email_logs')
            .insert({
                practice_id: practice.id,
                email_type: 'weekly_availability_request'
            });

    } catch (error) {
        console.error(`Error sending email to ${practice.email}:`, error);
    }
}

// Schedule weekly emails (every Monday at 9 AM)
cron.schedule('0 9 * * 1', () => {
    console.log('Running weekly email job...');
    sendWeeklyEmails();
});

module.exports = { sendWeeklyEmails, sendAvailabilityEmail };