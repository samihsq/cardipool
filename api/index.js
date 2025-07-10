import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';

import pool from './db.js';
import passport from './auth.js';
import authRouter, { requireAuth, addUserInfo } from './routes/auth.js';
import carpoolRouter from './routes/carpools.js';
import tagsRouter from './routes/tags.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Session store using PostgreSQL
const PgSession = connectPgSimple(session);

// Configure CORS for Vercel and authentication
const corsOptions = {
  origin: process.env.VERCEL_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware setup
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Required for SAML POST callbacks

// Session configuration
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Add user info to all requests (optional, doesn't require auth)
app.use(addUserInfo);

// --- NEW SAML ROUTES ---

// Metadata endpoint for Stanford registration
app.get('/auth/metadata', (req, res) => {
  const publicCert = process.env.SAML_PUBLIC_CERT || '';
  // Remove the -----BEGIN CERTIFICATE----- and -----END CERTIFICATE----- headers/footers
  // and any newlines, as required by the XML format.
  const certData = publicCert.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s/g, '');

  const metadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="${process.env.APP_BASE_URL}">
  <SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${certData}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>
    <KeyDescriptor use="encryption">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${certData}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${process.env.APP_BASE_URL}/auth/saml/callback" index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
  
  res.set('Content-Type', 'application/xml');
  res.send(metadata);
});

// Route to start the SAML authentication process
app.get(
  '/auth/login',
  (req, res, next) => {
    // Save the desired return URL (e.g., /dashboard) in the session
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo;
    }
    next();
  },
  passport.authenticate('saml', { failureRedirect: '/login-error', failureFlash: false })
);

// Callback route where the IdP sends the SAML response
app.post(
  '/auth/saml/callback',
  passport.authenticate('saml', { failureRedirect: '/login-error', failureFlash: false }),
  (req, res) => {
    // Redirect to dashboard after successful auth
    res.redirect('/#/dashboard');
  }
);

// Route to check login status
app.get('/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false, user: null });
  }
});


// Logout endpoint
app.post('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    req.session.destroy(() => {
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

// --- END NEW SAML ROUTES ---

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    authenticated: req.isAuthenticated(),
    user: req.user ? req.user.sunet_id : null
  });
});

// Remove the old, broken auth router
// app.use('/auth', authRouter);

// Protected API routes (require authentication)
app.use('/api/carpools', requireAuth, carpoolRouter);
app.use('/api/tags', tagsRouter); // Tags can be public for now

// API user info endpoint
app.get('/api/user', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    sunetId: req.user.sunet_id,
    email: req.user.email,
    displayName: req.user.display_name,
    firstName: req.user.first_name,
    lastName: req.user.last_name,
    affiliation: req.user.affiliation,
    department: req.user.department
  });
});

// Login error page
app.get('/login-error', (req, res) => {
  res.status(401).json({ 
    error: 'Authentication failed',
    message: 'There was an error during Stanford SSO authentication. Please try again.'
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve React build files (add this when you deploy)
// app.use(express.static('build'));

// Proxy to frontend dev server - MUST BE LAST
// Proxy all non-API requests to the Vite dev server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying for HMR
  logLevel: 'silent'
}));

// Global error handler
app.use((error, req, res, next) => {
  console.error('Application error:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Only start the server if not in Vercel (for local development)
if (!process.env.VERCEL && !process.env.LAMBDA_TASK_ROOT) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth metadata: http://localhost:${PORT}/auth/metadata`);
    console.log(`🎓 Stanford SSO: http://localhost:${PORT}/auth/login`);
  });
}

// Export the Express API for Vercel/serverless deployment
export default app; 