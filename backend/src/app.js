const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const { checkDatabaseConnection } = require('./config/database');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const stationRoutes = require('./routes/station.routes');
const weatherRoutes = require('./routes/weather.routes');
const energyRoutes = require('./routes/energy.routes');
const renewableRoutes = require('./routes/renewable.routes');
const generatorRoutes = require('./routes/generator.routes');
const batteryRoutes = require('./routes/battery.routes');
const criticalLoadRoutes = require('./routes/criticalLoad.routes');
const alertRoutes = require('./routes/alert.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const simulationRoutes = require('./routes/simulation.routes');

// Future AI Services Placeholders
const forecastService = require('./services/forecast.service');
const optimizationService = require('./services/optimization.service');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        env.CLIENT_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
      ];
      if (allowedOrigins.includes(origin) || !env.IS_PROD) {
        return callback(null, true);
      }
      callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.IS_PROD ? 'combined' : 'dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Base / Health check endpoint
app.get('/api/health', async (req, res) => {
  const isDbConnected = await checkDatabaseConnection();
  res.status(200).json({
    success: true,
    message: 'POLAR-EMS backend is healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: isDbConnected ? 'connected' : 'disconnected',
  });
});

// Mount Core Microgrid API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/renewable', renewableRoutes);
app.use('/api/generators', generatorRoutes);
app.use('/api/batteries', batteryRoutes);
app.use('/api/critical-loads', criticalLoadRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/simulation', simulationRoutes);

// Conceptual Future AI/ML Placeholders (Phase 2 integration routes)
app.get('/api/forecast/:stationId', async (req, res) => {
  const response = await forecastService.getLoadForecast(req.params.stationId);
  res.status(200).json({ success: true, data: response });
});

app.get('/api/optimization/:stationId', async (req, res) => {
  const response = await optimizationService.getOptimalDispatch(req.params.stationId);
  res.status(200).json({ success: true, data: response });
});

// 404 Catch-all handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
