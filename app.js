import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use('/assets', express.static(path.join(__dirname, 'frontend/assets')));
app.get('/monitor', (req, res) => res.sendFile(path.join(__dirname, 'frontend/monitor.html')));
export default app;