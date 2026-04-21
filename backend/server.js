import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureUploadsStorageReady } from './utils/uploadsPath.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDistCandidates = [
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(__dirname, './dist')
];

const frontendDistPath = frontendDistCandidates.find((candidatePath) => (
  fs.existsSync(path.join(candidatePath, 'index.html'))
));

const hasFrontendBuild = Boolean(frontendDistPath);
const frontendIndexPath = hasFrontendBuild
  ? path.join(frontendDistPath, 'index.html')
  : null;
const uploadStorage = ensureUploadsStorageReady();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS policy blocked this origin'));
  },
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadStorage.uploadsPath));

if (!uploadStorage.usesLegacyPath) {
  app.use('/uploads', express.static(uploadStorage.legacyUploadsPath));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res) => {
    res.sendFile(frontendIndexPath);
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'IRFWARDROBE API',
      status: 'OK',
      message: 'Frontend build not found. Build frontend to serve the website from this domain.'
    });
  });

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
}

app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  const statusCode = err?.message?.includes('CORS') ? 403 : 500;
  res.status(statusCode).json({ message: err.message || 'Internal server error' });
});

const getDbNameFromUri = (uri) => {
  if (!uri) return '';

  try {
    const parsed = new URL(uri);
    return decodeURIComponent(parsed.pathname.replace(/^\//, '')).trim();
  } catch {
    const uriWithoutQuery = uri.split('?')[0] || '';
    return decodeURIComponent(uriWithoutQuery.substring(uriWithoutQuery.lastIndexOf('/') + 1)).trim();
  }
};

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || (process.env.USE_REMOTE === 'true'
      ? process.env.MONGODB_URI_REMOTE
      : process.env.MONGODB_URI_LOCAL);

    if (!mongoURI) {
      throw new Error('MongoDB URI is not configured in environment variables');
    }

    const normalizedDbName = (
      process.env.MONGODB_DB_NAME?.trim() ||
      getDbNameFromUri(mongoURI) ||
      'irfwardrobe'
    ).toLowerCase();

    await mongoose.connect(mongoURI, {
      dbName: normalizedDbName
    });

    const connectionSource = process.env.MONGODB_URI
      ? 'MONGODB_URI'
      : process.env.USE_REMOTE === 'true'
        ? 'Remote'
        : 'Local';

    console.log(`MongoDB Connected Successfully (${connectionSource}, db: ${normalizedDbName})`);
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadStorage.uploadsPath}`);

  if (!uploadStorage.usesLegacyPath) {
    console.log(`Legacy uploads fallback: ${uploadStorage.legacyUploadsPath}`);
    if (uploadStorage.migratedCount > 0) {
      console.log(`Migrated ${uploadStorage.migratedCount} legacy upload file(s) to persistent storage.`);
    }
  }

  if (hasFrontendBuild) {
    console.log(`Serving frontend from ${frontendDistPath}`);
  } else {
    console.log('Frontend build not found at ../frontend/dist or ./dist');
  }
});
