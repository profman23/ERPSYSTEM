import helmet from 'helmet';
import cors from 'cors';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Auto-detect Replit origin from environment variables
const getReplitOrigin = (): string | null => {
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.dev`;
  }
  return null;
};

// Build allowed origins list: Replit origin + custom origins from env + localhost fallback
const replitOrigin = getReplitOrigin();
const customOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').filter(o => o !== '*')
  : [];

// Get CLIENT_URL from environment or use defaults
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5501';

export const allowedOrigins = [
  ...(replitOrigin ? [replitOrigin] : []),
  ...customOrigins,
  clientUrl,
  'http://localhost:5501',
  'http://localhost:5500',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5501',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
].filter(Boolean);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Allow all .replit.dev domains for Replit environment
    if (origin.endsWith('.replit.dev')) {
      callback(null, true);
      return;
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`❌ CORS Rejected Origin: ${origin}`);
      console.error(`✅ Allowed Origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
});
