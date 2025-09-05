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
app.use(express.static(__dirname));

if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, 'email,name,signup_method,timestamp\n');
}

if (!fs.existsSync(USER_FEEDBACK_FILE)) {
    fs.writeFileSync(
        USER_FEEDBACK_FILE,
        'platforms,problemCategories,improvements,orderFrequency,qrComfort,preOrderDineIn,city,contactEmail,contactPhone,freeText,consent,timestamp\n'
    );
}

if (!fs.existsSync(SELLER_FEEDBACK_FILE)) {
    fs.writeFileSync(
        SELLER_FEEDBACK_FILE,
        'platforms,problemCategories,sustainableFeePct,payoutTime,gaslessInterest,loyaltyInterest,opsNeeds,supplyBottlenecks,itemsImpacted,city,contactName,contactEmail,contactPhone,freeText,consent,timestamp\n'
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
        const {
            audienceType = '',
            platforms = [],
            problemCategories = [],
            improvements = [],
            orderFrequency = '',
            qrComfort = '',
            preOrderDineIn = '',
            city = '',
            contactEmail = '',
            contactPhone = '',
            contactName = '',
            sustainableFeePct = '',
            payoutTime = '',
            gaslessInterest = '',
            loyaltyInterest = '',
            opsNeeds = [],
            supplyBottlenecks = [],
            itemsImpacted = '',
            freeText = '',
            consent = false
        } = req.body || {};

        if (!audienceType) {
            return res.status(400).json({ error: 'audienceType required' });
        }

        if (audienceType === 'seller' && !contactEmail && !contactPhone) {
            return res.status(400).json({ error: 'Contact email or phone required' });
        }

        const timestamp = new Date().toISOString();

        if (audienceType === 'seller') {
            const rowSeller = [
                csvEscape(Array.isArray(platforms) ? platforms.join(';') : platforms),
                csvEscape(Array.isArray(problemCategories) ? problemCategories.join(';') : problemCategories),
                csvEscape(sustainableFeePct),
                csvEscape(payoutTime),
                csvEscape(gaslessInterest),
                csvEscape(loyaltyInterest),
                csvEscape(Array.isArray(opsNeeds) ? opsNeeds.join(';') : opsNeeds),
                csvEscape(Array.isArray(supplyBottlenecks) ? supplyBottlenecks.join(';') : supplyBottlenecks),
                csvEscape(itemsImpacted),
                csvEscape(city),
                csvEscape(contactName),
                csvEscape(contactEmail),
                csvEscape(contactPhone),
                csvEscape(freeText),
                csvEscape(consent ? 'yes' : 'no'),
                csvEscape(timestamp)
            ].join(',') + '\n';
            fs.appendFileSync(SELLER_FEEDBACK_FILE, rowSeller, 'utf8');
        } else {
            const rowUser = [
                csvEscape(Array.isArray(platforms) ? platforms.join(';') : platforms),
                csvEscape(Array.isArray(problemCategories) ? problemCategories.join(';') : problemCategories),
                csvEscape(Array.isArray(improvements) ? improvements.join(';') : improvements),
                csvEscape(orderFrequency),
                csvEscape(qrComfort),
                csvEscape(preOrderDineIn),
                csvEscape(city),
                csvEscape(contactEmail),
                csvEscape(contactPhone),
                csvEscape(freeText),
                csvEscape(consent ? 'yes' : 'no'),
                csvEscape(timestamp)
            ].join(',') + '\n';
            fs.appendFileSync(USER_FEEDBACK_FILE, rowUser, 'utf8');
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