import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initializeSocket } from './realtime/socket';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './api/routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Veterinary ERP Server - Phase 1' });
});

initializeSocket(httpServer);

app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🏥 Veterinary ERP SaaS - Phase 1 Foundation`);
});
