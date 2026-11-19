import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import healthRoutes from './routes/health.routes';
import notificationRoutes from './routes/notification.routes';
import nurseRoutes from './routes/nurse.routes';
import patientRoutes from './routes/patient.routes';
import publicRoutes from './routes/public.routes';
import { sendError } from './utils/response';

export function createApp() {
  const app = express();

  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        // Allow Tailscale / local network dev origins cleanly if wildcard or localhost
        if (
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('http://100.')
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: '2mb' }));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api', publicRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/patient', patientRoutes);
  app.use('/api/doctor', doctorRoutes);
  app.use('/api/nurse', nurseRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((_req, res) => {
    return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy đường dẫn API');
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
