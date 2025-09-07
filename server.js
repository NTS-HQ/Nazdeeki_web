require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const {OAuth2Client} = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:OTpRWzCKVGPRXBymjjluRlyAzqsfueSj@turntable.proxy.rlwy.net:49122/railway';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Replace with your Google OAuth client ID
const GOOGLE_CLIENT_ID = '858424434372-q21o2qfqn4c6o2ls72ns52tc92ljtq20.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Initialize database tables
async function initializeDatabase() {
    console.log('Connecting to database:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));
    try {
        // Test connection first
        const client = await pool.connect();
        console.log('Database connection successful!');
        client.release();
        
        // Create emails table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS emails (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                signup_method VARCHAR(50),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create user_feedback table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_feedback (
                id SERIAL PRIMARY KEY,
                feedback TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create seller_feedback table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS seller_feedback (
                id SERIAL PRIMARY KEY,
                feedback TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Database tables initialized successfully!');
    } catch (error) {
        console.error('Database initialization failed:', error);
    }
}

// Call database initialization
initializeDatabase();

// Subscribe endpoint
app.post('/api/subscribe', async (req, res) => {
    const { email, name = '', method = 'manual' } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    try {
        // Check if email already exists
        const existingUser = await pool.query('SELECT email FROM emails WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already subscribed' });
        }

        // Insert new email
        await pool.query(
            'INSERT INTO emails (email, name, signup_method) VALUES ($1, $2, $3)',
            [email, name, method]
        );

        // Get updated count
        const countResult = await pool.query('SELECT COUNT(*) FROM emails');
        const count = parseInt(countResult.rows[0].count);

        res.json({ success: true, count });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Google signup endpoint
app.post('/api/google-signup', async (req, res) => {
    try {
        const { credential } = req.body;
        
        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name || '';
        
        // Check if email already exists
        const existingUser = await pool.query('SELECT email FROM emails WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already subscribed' });
        }

        // Insert new email
        await pool.query(
            'INSERT INTO emails (email, name, signup_method) VALUES ($1, $2, $3)',
            [email, name, 'google']
        );

        // Get updated count
        const countResult = await pool.query('SELECT COUNT(*) FROM emails');
        const count = parseInt(countResult.rows[0].count);

        res.json({ success: true, count, name });
        
    } catch (error) {
        console.error('Google signup error:', error);
        res.status(400).json({ error: 'Invalid Google token' });
    }
});

// Get count endpoint
app.get('/api/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM emails');
        const count = parseInt(result.rows[0].count);
        res.json({ count });
    } catch (error) {
        console.error('Count error:', error);
        res.json({ count: 0 });
    }
});

// Feedback endpoint
app.post('/api/feedback', async (req, res) => {
    try {
        let audienceType = '';
        let freeText = '';

        // Support JSON, urlencoded and raw-string bodies
        if (typeof req.body === 'string') {
            try {
                const parsed = JSON.parse(req.body);
                audienceType = parsed.audienceType || '';
                freeText = parsed.freeText || parsed.feedback || parsed.message || '';
            } catch {
                freeText = req.body;
            }
        } else {
            audienceType = (req.body && (req.body.audienceType || '')) || '';
            freeText = (req.body && (req.body.freeText || req.body.feedback || req.body.message || '')) || '';
        }

        if (!audienceType) {
            return res.status(400).json({ error: 'audienceType required' });
        }
        if (!freeText || String(freeText).trim().length === 0) {
            return res.status(400).json({ error: 'feedback text required' });
        }

        // Insert feedback into appropriate table
        const table = audienceType === 'seller' ? 'seller_feedback' : 'user_feedback';
        await pool.query(`INSERT INTO ${table} (feedback) VALUES ($1)`, [String(freeText).trim()]);

        res.json({ success: true });
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export endpoints (bonus feature)
app.get('/api/export/emails', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, name, signup_method, timestamp FROM emails ORDER BY timestamp DESC');
        
        let csvContent = 'email,name,signup_method,timestamp\n';
        result.rows.forEach(row => {
            csvContent += `"${row.email}","${row.name}","${row.signup_method}","${row.timestamp}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="emails.csv"');
        res.send(csvContent);
    } catch (error) {
        res.status(500).json({ error: 'Export failed' });
    }
});

app.get('/api/export/user-feedback', async (req, res) => {
    try {
        const result = await pool.query('SELECT feedback, timestamp FROM user_feedback ORDER BY timestamp DESC');
        
        let csvContent = 'feedback,timestamp\n';
        result.rows.forEach(row => {
            csvContent += `"${row.feedback}","${row.timestamp}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="user_feedback.csv"');
        res.send(csvContent);
    } catch (error) {
        res.status(500).json({ error: 'Export failed' });
    }
});

app.get('/api/export/seller-feedback', async (req, res) => {
    try {
        const result = await pool.query('SELECT feedback, timestamp FROM seller_feedback ORDER BY timestamp DESC');
        
        let csvContent = 'feedback,timestamp\n';
        result.rows.forEach(row => {
            csvContent += `"${row.feedback}","${row.timestamp}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="seller_feedback.csv"');
        res.send(csvContent);
    } catch (error) {
        res.status(500).json({ error: 'Export failed' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
