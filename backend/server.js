import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

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

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || (process.env.USE_REMOTE === 'true'
      ? process.env.MONGODB_URI_REMOTE
      : process.env.MONGODB_URI_LOCAL);

    if (!mongoURI) {
      throw new Error('MongoDB URI is not configured in environment variables');
    }
    
    await mongoose.connect(mongoURI);
    const connectionSource = process.env.MONGODB_URI
      ? 'MONGODB_URI'
      : process.env.USE_REMOTE === 'true'
        ? 'Remote'
        : 'Local';

    console.log(`MongoDB Connected Successfully (${connectionSource})`);
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (hasFrontendBuild) {
    console.log(`Serving frontend from ${frontendDistPath}`);
  } else {
    console.log('Frontend build not found at ../frontend/dist');
  }
});
