const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const errorMiddleware = require('./middleware/error.middleware');
const { setupSwagger } = require('./swagger');

// Route modules
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const projectRoutes = require('./modules/projects/projects.routes');
const taskRoutes = require('./modules/tasks/tasks.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');

const app = express();

// ─── Security & Utility Middleware ──────────────────────────────
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

// ─── Global Rate Limiter ─────────────────────────────────────────
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' },
  })
);

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Health Check ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Swagger Docs ────────────────────────────────────────────────
setupSwagger(app);

// ─── 404 Handler ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ status: 404, code: 'NOT_FOUND', message: 'Route not found' });
});

// ─── Global Error Handler ────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
