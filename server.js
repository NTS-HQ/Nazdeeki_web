const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const {OAuth2Client} = require('google-auth-library');
const { google } = require('googleapis');

const app = express();
const PORT = 3000;
const CSV_FILE = path.join(__dirname, 'emails.csv');
const USER_FEEDBACK_FILE = path.join(__dirname, 'user_feedback.csv');
const SELLER_FEEDBACK_FILE = path.join(__dirname, 'seller_feedback.csv');
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '11PRs7X6ZJFNQkPZXepJ6E7qJ0hyd5KPa_Xuz1QKceqk';

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

// Google Sheets client for waitlist emails only
const SERVICE_ACCOUNT_KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'nazdeeki-maps-d9c8e0c53f72.json');
const sheetsAuth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function getSheetsClient() {
    const auth = await sheetsAuth.getClient();
    return google.sheets({ version: 'v4', auth });
}

async function appendWaitlistRow(email, name, method, timestamp) {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
        range: 'A:D',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [[email, name, method, timestamp]] }
    });
}

async function emailExistsInSheet(email) {
    const sheets = await getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
        range: 'A:A'
    });
    const rows = resp.data.values || [];
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const cell = (rows[i] && rows[i][0]) ? String(rows[i][0]).trim().toLowerCase() : '';
        if (cell && cell === String(email).trim().toLowerCase()) return true;
    }
    return false;
}

async function getWaitlistCountFromSheet() {
    const sheets = await getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
        range: 'A:A'
    });
    const rows = resp.data.values || [];
    return Math.max(0, rows.length - 1);
}

app.post('/api/subscribe', async (req, res) => {
    try {
        const { email, name = '', method = 'manual' } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email required' });
        }
        const exists = await emailExistsInSheet(email);
        if (exists) {
            return res.status(400).json({ error: 'Email already subscribed' });
        }
        const timestamp = new Date().toISOString();
        await appendWaitlistRow(email, name, method, timestamp);
        const count = await getWaitlistCountFromSheet();
        return res.json({ success: true, count });
    } catch (error) {
        console.error('Subscribe error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
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
        
        // Check if email already exists (Google Sheets)
        const exists = await emailExistsInSheet(email);
        if (exists) {
            return res.status(400).json({ error: 'Email already subscribed' });
        }

        // Append to Google Sheets
        const timestamp = new Date().toISOString();
        await appendWaitlistRow(email, name, 'google', timestamp);
        const count = await getWaitlistCountFromSheet();
        res.json({ success: true, count, name });
        
    } catch (error) {
        console.error('Google signup error:', error);
        res.status(400).json({ error: 'Invalid Google token' });
    }
});

app.get('/api/count', async (req, res) => {
    try {
        const count = await getWaitlistCountFromSheet();
        res.json({ count });
    } catch (error) {
        console.error('Count error:', error);
        res.json({ count: 0 });
    }
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

// getEmailCount no longer used (replaced by Google Sheets)

function csvEscape(value) {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});