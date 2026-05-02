import express from 'express';
import HealthRouter from './routes/health.route.js';
import UserRouter from './routes/user.routes.js';
import MonitorRouter from './routes/monitor.route.js';
import Middleware from './app.middleware.js';
import LogsRouter from './routes/logs.route.js';
// import { analyzeIncident } from './services/ai.services.js';

const app = express();

Middleware(app);

app.use('/api/health', HealthRouter);
app.use('/api/auth', UserRouter);
app.use('/api/monitor', MonitorRouter);
app.use('/api/logs', LogsRouter);

/**
 * Example of using Mistral API to analyze an incident log
 * This is a test function to demonstrate how to call the analyzeIncident service
 * with a sample log input. In a real application, you would call this service
 * from an appropriate controller or service layer when analyzing real incident logs.
 */
//   const checkMistral = async()=>{
//     const logs = `2024-06-01T12:00:00Z ERROR [server] Failed to connect to database
//   2024-06-01T12:00:01Z ERROR [server] Database connection timeout
//   2024-06-01T12:00:02Z INFO [server] Retrying database connection
//   2024-06-01T12:00:03Z ERROR [server] Failed to connect to database after retry
//   2024-06-01T12:00:04Z INFO [server] Incident escalated to on-call engineer`;

//     const analysis = await analyzeIncident(logs);
//     console.log(analysis);
//   }

//   checkMistral();

export default app;
