import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { monitorEngineStart } from './monitor/monitorEngine.js';
import { subscriptionManager } from './monitor/subscriptionManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// استاتیک مسیر assets و frontend
app.use('/assets', express.static(path.join(__dirname, 'frontend/assets')));
app.use(express.static(path.join(__dirname, 'frontend')));

// ریدایرکت Root به صفحه مانیتور تا خطای Cannot GET / حذف شود
app.get('/', (req, res) => {
  return res.redirect('/monitor');
});

// مسیر صفحه مانیتور
app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/monitor.html'));
});

// اتصال فرانت‌اند
io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id);
});

// شروع مانیتورینگ
monitorEngineStart(io);
subscriptionManager(io);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});