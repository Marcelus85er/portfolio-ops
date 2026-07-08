
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const { 
    S3Client, 
    PutObjectCommand, 
    ListObjectsV2Command, 
    HeadObjectCommand, 
    DeleteObjectCommand 
} = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// 1. PostgreSQL Database Setup
// ==========================================
const db = new Pool({
    user: process.env.DB_USER || 'admin',
    host: process.env.DB_HOST || 'postgres', 
    database: process.env.DB_NAME || 'portfolio', 
    password: process.env.DB_PASSWORD || 'supersecurepassword123',
    port: 5432,
});

db.connect()
    .then(client => {
        console.log('✅ Connected to PostgreSQL Database');
        return client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url VARCHAR(512),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `).then(() => {
            console.log('✅ Postgres "projects" table ready.');
            client.release();
        });
    })
    .catch(err => console.error('❌ Database connection error', err.stack));

// ==========================================
// 2. MinIO (S3) Storage Setup
// ==========================================
const s3Client = new S3Client({
    region: 'us-east-1', 
    endpoint: process.env.S3_ENDPOINT || 'http://minio:9000', 
    forcePathStyle: true, 
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'admin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'supersecurepassword123'
    }
});

// ==========================================
// NEW: Advanced Multer Configuration
// ==========================================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB hard limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',    // PDF Documents
            'text/plain',         // TXT Documents
            'application/msword', // DOC Documents (Older Word)
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX Documents (Modern Word)
            'audio/mpeg',         // MP3 Audio
            'audio/mp4',          // M4A Audio (Standard)
            'audio/x-m4a',        // M4A Audio (Alternate)
            'video/mp4',          // MP4 Video
            'video/x-matroska'    // MKV Video
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type! Only images, documents (PDF/TXT/DOC/DOCX), and audio/video are allowed.'), false);
        }
    }
});

// ==========================================
// 3. Antivirus Scanner (Mock ClamAV)
// ==========================================
const scanForViruses = async (buffer, filename) => {
    const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    
    if (filename.toLowerCase().includes('virus') || buffer.toString().includes(eicarString)) {
        return false; // Infected
    }
    return true; // Clean
};

// ==========================================
// --- API ROUTES ---
// ==========================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'API is running beautifully!' });
});

// Upload Single File
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const isClean = await scanForViruses(req.file.buffer, req.file.originalname);
        if (!isClean) {
            console.warn(`⚠️ AV Alert: Blocked infected file -> ${req.file.originalname}`);
            res.set('x-virus-infected', 'true');
            return res.status(409).json({ error: 'Conflict: The target resource is in an infected state.' });
        }

        const fileName = `${Date.now()}-${req.file.originalname}`;
        
        await s3Client.send(new PutObjectCommand({
            Bucket: 'portfolio-assets',
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        }));

        const fileUrl = `${process.env.S3_PUBLIC_URL || 'http://localhost:9001'}/portfolio-assets/${fileName}`;
        res.json({ message: 'File uploaded successfully!', url: fileUrl });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload file. Ensure it is under 50MB and an allowed type.' });
    }
});

// Bulk Upload Files
app.post('/api/upload/bulk', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files provided' });

        const uploadedUrls = [];

        for (const file of req.files) {
            const isClean = await scanForViruses(file.buffer, file.originalname);
            if (!isClean) {
                res.set('x-virus-infected', 'true');
                return res.status(409).json({ error: `Conflict: File ${file.originalname} is infected. Batch aborted.` });
            }

            const fileName = `${Date.now()}-${file.originalname}`;
            await s3Client.send(new PutObjectCommand({
                Bucket: 'portfolio-assets',
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));

            uploadedUrls.push(`${process.env.S3_PUBLIC_URL || 'http://localhost:9001'}/portfolio-assets/${fileName}`);
        }

        res.json({ message: `${req.files.length} files uploaded successfully!`, urls: uploadedUrls });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload bulk files' });
    }
});

// List all files in bucket
app.get('/api/files', async (req, res) => {
    try {
        const data = await s3Client.send(new ListObjectsV2Command({ Bucket: 'portfolio-assets' }));
        const files = data.Contents ? data.Contents.map(item => ({
            filename: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
            url: `${process.env.S3_PUBLIC_URL || 'http://localhost:9001'}/portfolio-assets/${item.Key}`
        })) : [];
        res.json({ files });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

app.get('/api/files/:filename/metadata', async (req, res) => {
    try {
        const data = await s3Client.send(new HeadObjectCommand({
            Bucket: 'portfolio-assets',
            Key: req.params.filename
        }));
        res.json({
            filename: req.params.filename,
            contentType: data.ContentType,
            size: data.ContentLength,
            lastModified: data.LastModified
        });
    } catch (error) {
        console.error(error);
        res.status(404).json({ error: 'File not found' });
    }
});

app.delete('/api/files/:filename', async (req, res) => {
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: 'portfolio-assets',
            Key: req.params.filename
        }));
        res.json({ message: `File ${req.params.filename} deleted successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// --- POSTGRES DATABASE ROUTES ---

app.post('/api/projects', async (req, res) => {
    const { title, description, image_url } = req.body;
    try {
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const result = await db.query(
            'INSERT INTO projects (title, description, image_url) VALUES ($1, $2, $3) RETURNING *',
            [title, description, image_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create project in database' });
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Backend API running on port ${port}`);
});
