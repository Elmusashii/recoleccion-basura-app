import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import routesRoutes from './routes/routes.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import fleetRoutes from './routes/fleet.routes.js';
import usersRoutes from './routes/users.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

// 1. Middlewares de Seguridad y Utilidades
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (herramientas de prueba, curl, SSR o Postman)
      if (!origin) return callback(null, true);

      // Comprobar orígenes locales / configurados
      const isAllowedLocal = allowedOrigins.includes(origin);

      // Comprobar si proviene de un túnel dinámico de Cloudflare (*.trycloudflare.com)
      const isCloudflareTunnel = /^https?:\/\/([a-zA-Z0-9-]+\.)*trycloudflare\.com(?::\d+)?$/.test(origin);

      if (isAllowedLocal || isCloudflareTunnel) {
        return callback(null, true);
      }

      // Permitir de forma permisiva en desarrollo para evitar bloqueos
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Limitador de peticiones para prevenir abusos (DDoS / Spam de denuncias)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // límite de 200 peticiones por IP por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta nuevamente en 15 minutos.'
  }
});
app.use('/api/', limiter);

// 3. Ruta de Chequeo de Salud del Sistema (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    app: 'App de Rutas y Denuncias Municipales - Asunción',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 4. Montaje de Rutas de la API
app.use('/api/routes', routesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/users', usersRoutes);

// 5. Manejo de Errores y Rutas no Encontradas
app.use(notFoundHandler);
app.use(errorHandler);

// 6. Inicio del Servidor
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 SERVIDOR MUNICIPAL DE ASUNCIÓN ACTIVO`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend Permitido (CORS): ${CLIENT_URL}`);
  console.log(`🕒 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('====================================================');
});

export default app;
