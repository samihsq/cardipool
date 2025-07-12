import './config.js'; // This MUST be the first import
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';

import pool from './db.js';
import passport, { strategy, spCert } from './auth.js'; // Import the strategy and spCert
import authRouter, { requireAuth, addUserInfo } from './routes/auth.js';
import carpoolRouter from './routes/carpools.js';
import tagsRouter from './routes/tags.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Session store using PostgreSQL
const PgSession = connectPgSimple(session);

// --- Production-Ready CORS and Session Configuration ---

// Determine the correct frontend URL based on Vercel's environment variables
const getFrontendUrl = () => {
  // VERCEL_PROJECT_PRODUCTION_URL is the one we want for the live site
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // VERCEL_URL is the raw deployment URL, good for previews
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.FRONTEND_URL || 'http://localhost:5173';
};

const frontendUrl = getFrontendUrl();
const isProduction = process.env.NODE_ENV === 'production';

// In production, we trust the Vercel proxy. This is required for secure cookies.
if (isProduction) {
  app.set('trust proxy', 1);
}

// CORS options that explicitly allow credentials from our frontend
const corsOptions = {
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Use true for complex nested objects in SAML

// Session configuration
const sessionConfig = {
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
};

if (isProduction) {
  sessionConfig.cookie.secure = true; // Only send cookie over HTTPS
  sessionConfig.cookie.sameSite = 'none'; // Required for cross-site cookie sending with secure
}

app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// --- End of new configuration ---

// Add user info to all requests (optional, doesn't require auth)
app.use(addUserInfo);

// --- NEW SAML ROUTES ---

// Metadata endpoint for Stanford registration
app.get('/auth/metadata', (req, res) => {
  // Strip the PEM headers/footers and all whitespace from the cert
  const certData = spCert
    .replace(/-----(BEGIN|END) CERTIFICATE-----/g, '')
    .replace(/\s/g, '');

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

  res.type('application/xml');
  res.status(200).send(metadata);
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
  (req, res, next) => {
    passport.authenticate('saml', (err, user, info) => {
      if (err) {
        // Pass catastrophic errors to the global error handler.
        // No response has been sent yet, so this is safe.
        return next(err);
      }
      if (!user) {
        // Handle authentication failure (e.g., invalid SAML response).
        // We manually redirect to a login error page.
        // You might want to log `info` for debugging.
        console.error('SAML authentication failed:', info);
        return res.redirect('/#/login-error?message=auth_failed');
      }
      // If we get here, authentication was successful.
      // Manually log the user into the session.
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        // On successful login, redirect to the dashboard.
        const returnTo = req.session.returnTo || '/#/dashboard';
        delete req.session.returnTo; // Clean up session
        return res.redirect(returnTo);
      });
    })(req, res, next);
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

if (process.env.NODE_ENV !== 'production') {
  // Proxy to frontend dev server - MUST BE LAST
  // Proxy all non-API requests to the Vite dev server
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying for HMR
    logLevel: 'silent'
  }));
}

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
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export the Express API for Vercel/serverless deployment
export default app; 