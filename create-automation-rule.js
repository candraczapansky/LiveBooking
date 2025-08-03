import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'beautybook',
  user: 'postgres',
  password: 'password'
});

async function createAutomationRule() {
  try {
    await client.connect();
    console.log('Database connected');

    // Check if automation rule already exists
    const existingRule = await client.query(
      "SELECT * FROM automation_rules WHERE trigger = 'booking_confirmation' AND type = 'email'"
    );

    if (existingRule.rows.length > 0) {
      console.log('Booking confirmation email rule already exists:', existingRule.rows[0]);
      return;
    }

    // Create booking confirmation email rule
    const insertResult = await client.query(`
      INSERT INTO automation_rules (
        name, type, trigger, timing, template, subject, active, sent_count, last_run, custom_trigger_name
      ) VALUES (
        'Booking Confirmation Email',
        'email',
        'booking_confirmation',
        'immediately',
        'Hi {client_name},\n\nYour appointment has been confirmed!\n\nService: {service_name}\nDate: {appointment_date}\nTime: {appointment_time}\nStaff: {staff_name}\n\nWe look forward to seeing you!\n\nBest regards,\nGlo Head Spa',
        'Appointment Confirmation - Glo Head Spa',
        true,
        0,
        null,
        null
      ) RETURNING *
    `);

    console.log('Created automation rule:', insertResult.rows[0]);
    console.log('✅ Booking confirmation email rule created successfully!');

  } catch (error) {
    console.error('Error creating automation rule:', error);
  } finally {
    await client.end();
  }
}

createAutomationRule(); 