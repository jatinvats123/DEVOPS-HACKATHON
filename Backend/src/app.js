import express from 'express';
import HealthRouter from './routes/health.route.js';
import UserRouter from './routes/user.routes.js';
import MonitorRouter from './routes/monitor.route.js';
import AlertRouter from './routes/alert.route.js';
import Middleware from './app.middleware.js';
import LogsRouter from './routes/logs.route.js';
import IncidentRouter from './routes/incident.route.js';
import metricsRouter from './routes/metrics.route.js';

const app = express();

Middleware(app);

app.use('/api/health', HealthRouter);
app.use('/api/auth', UserRouter);
app.use('/api/monitor', MonitorRouter);
app.use('/api/alerts', AlertRouter);
app.use('/api/logs', LogsRouter);
app.use('/api/incidents', IncidentRouter);
app.use('/api/metrics', metricsRouter);

export default app;
