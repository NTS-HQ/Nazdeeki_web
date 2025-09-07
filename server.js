const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const {OAuth2Client} = require('google-auth-library');

const app = express();
const PORT = 3000;
const CSV_FILE = path.join(__dirname, 'emails.csv');
const USER_FEEDBACK_FILE = path.join(__dirname, 'user_feedback.csv');
const SELLER_FEEDBACK_FILE = path.join(__dirname, 'seller_feedback.csv');

// Replace with your Google OAuth client ID
const GOOGLE_CLIENT_ID = '858424434372-q21o2qfqn4c6o2ls72ns52tc92ljtq20.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, 'email,name,signup_method,timestamp\n');
}

if (!fs.existsSync(USER_FEEDBACK_FILE)) {
    fs.writeFileSync(
        USER_FEEDBACK_FILE,
        'feedback,timestamp\n'
    );
}

if (!fs.existsSync(SELLER_FEEDBACK_FILE)) {
    fs.writeFileSync(
        SELLER_FEEDBACK_FILE,
        'feedback,timestamp\n'
    );
}

app.post('/api/subscribe', (req, res) => {
    const { email, name = '', method = 'manual' } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    const existingData = fs.readFileSync(CSV_FILE, 'utf8');
    if (existingData.includes(email)) {
        return res.status(400).json({ error: 'Email already subscribed' });
    }

    const timestamp = new Date().toISOString();
    // Ensure proper CSV formatting with newline
    const csvRow = `"${email}","${name}","${method}","${timestamp}"\n`;
    
    // Append to file, ensuring each entry is on a new line
    fs.appendFileSync(CSV_FILE, csvRow, 'utf8');
    
    const count = getEmailCount();
    res.json({ success: true, count });
});

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
        const existingData = fs.readFileSync(CSV_FILE, 'utf8');
        if (existingData.includes(email)) {
            return res.status(400).json({ error: 'Email already subscribed' });
        }

        // Save to CSV
        const timestamp = new Date().toISOString();
        // Ensure proper CSV formatting with newline
        const csvRow = `"${email}","${name}","google","${timestamp}"\n`;
        
        // Append to file, ensuring each entry is on a new line
        fs.appendFileSync(CSV_FILE, csvRow, 'utf8');
        
        const count = getEmailCount();
        res.json({ success: true, count, name });
        
    } catch (error) {
        console.error('Google signup error:', error);
        res.status(400).json({ error: 'Invalid Google token' });
    }
});

app.get('/api/count', (req, res) => {
    const count = getEmailCount();
    res.json({ count });
});

app.post('/api/feedback', (req, res) => {
    try {
        let audienceType = '';
        let freeText = '';

        // Support JSON, urlencoded and raw-string bodies; accept common field aliases
        if (typeof req.body === 'string') {
            // Try to parse JSON string; if fails, treat entire body as feedback text
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

        const timestamp = new Date().toISOString();
        const row = [csvEscape(String(freeText).trim()), csvEscape(timestamp)].join(',') + '\n';

        if (audienceType === 'seller') {
            fs.appendFileSync(SELLER_FEEDBACK_FILE, row, 'utf8');
        } else {
            fs.appendFileSync(USER_FEEDBACK_FILE, row, 'utf8');
        }
        return res.json({ success: true });
    } catch (error) {
        console.error('Feedback error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

function getEmailCount() {
    try {
        const data = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = data.trim().split('\n');
        return Math.max(0, lines.length - 1);
    } catch (error) {
        return 0;
    }
}

function csvEscape(value) {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});