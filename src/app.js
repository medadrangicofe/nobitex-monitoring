import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Static files for frontend
app.use('/assets', express.static(path.join(__dirname, 'frontend/assets')));

// Root route (API style)
app.get('/', (req, res) => {
  res.json({ status: 'API is running', monitor: '/monitor' });
});

// Monitor UI
app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/monitor.html'));
});

// Export app (important for deployment on platforms like Render)
export default app;