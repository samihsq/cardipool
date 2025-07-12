import './config.js'; // This MUST be the first import
import passport from 'passport';
import { Strategy as SamlStrategy } from '@node-saml/passport-saml';
import pool from './db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Construct an absolute path to the .env file to ensure it's always found.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Helper function to format a certificate from a one-line env var
const formatCert = (cert) => {
  if (!cert) return null;

  // If it's already a full PEM with newlines, just return it
  if (cert.startsWith('-----BEGIN CERTIFICATE-----') && cert.includes('\\n')) {
    return cert.replace(/\\n/g, '\n');
  }
  
  // Clean up the cert string: remove PEM headers/footers and any newlines/whitespace
  const certBody = cert
    .replace(/-----(BEGIN|END) CERTIFICATE-----/g, '')
    .replace(/\s/g, '');

  // Split the body into 64-character chunks
  const chunks = certBody.match(/.{1,64}/g) || [];
  
  // Re-assemble the full PEM-formatted certificate
  return [
    '-----BEGIN CERTIFICATE-----',
    ...chunks,
    '-----END CERTIFICATE-----'
  ].join('\n');
};

// Load IdP certificate(s) from file path
let idpCertValue = null; // This will hold either a single PEM string or an array of them.
try {
  // Default to certs/stanford_all.pem, which should contain all possible IdP signing certs
  const certPathEnv = process.env.STANFORD_CERT_PATH || 'certs/stanford_all.pem';
  const absCertPath = path.resolve(__dirname, certPathEnv);
  if (fs.existsSync(absCertPath)) {
    const fileContent = fs.readFileSync(absCertPath, 'utf-8');
    
    // Use a regex to find all PEM certificate blocks in the file. This is robust.
    const pemRegex = /-----BEGIN CERTIFICATE-----[\s\S\n]*?-----END CERTIFICATE-----/g;
    const certs = fileContent.match(pemRegex);

    if (certs) {
        // passport-saml can take a single PEM string or an array of them.
        idpCertValue = certs.length > 1 ? certs : certs[0];
    }
  }
} catch (err) {
  console.error('Failed to load IdP certificate file:', err);
}

// Load private key from file path
let privateKey = null;
try {
    const keyPath = process.env.SAML_PRIVATE_KEY_PATH || 'certs/saml_private.key';
    const absKeyPath = path.resolve(__dirname, keyPath);
    if (fs.existsSync(absKeyPath)) {
        privateKey = fs.readFileSync(absKeyPath, 'utf-8');
    } else if (process.env.SAML_PRIVATE_KEY) {
        // Fallback to environment variable for Vercel deployment
        privateKey = process.env.SAML_PRIVATE_KEY.replace(/\\n/g, '\n');
    }
} catch(err) {
    console.error('Failed to load SAML private key:', err);
}

// Load our app's public certificate for signing
let spCert = null;
try {
    const certPath = process.env.SAML_SP_CERT_PATH || 'certs/saml_sp.pem';
    const absCertPath = path.resolve(__dirname, certPath);
    if (fs.existsSync(absCertPath)) {
        spCert = fs.readFileSync(absCertPath, 'utf-8');
    } else if (process.env.SAML_SP_CERT) {
        // Fallback to environment variable for Vercel deployment
        spCert = process.env.SAML_SP_CERT.replace(/\\n/g, '\n');
    }
} catch(err) {
    console.error('Failed to load SAML SP certificate:', err);
}


// Configuration for the Stanford production SAML IdP
const stanfordEntryPoint = 'https://login.stanford.edu/idp/profile/SAML2/Redirect/SSO';
const stanfordIssuer = 'https://idp.stanford.edu/';

const samlCallbackPath = process.env.SAML_CALLBACK_PATH || '/auth/saml/callback';

const strategy = new SamlStrategy({
  // URL that goes from the Service Provider to the Identity Provider
  entryPoint: stanfordEntryPoint,
  // URL that goes from the Identity Provider to the Service Provider
  callbackUrl: `${process.env.APP_BASE_URL}${samlCallbackPath}`,
  // The issuer string is the unique identifier for our application
  issuer: process.env.APP_BASE_URL,
  // Use the loaded cert(s) from file, or fall back to env vars.
  idpCert: idpCertValue || formatCert(process.env.SAML_CERT || process.env.STANFORD_CERT),
  // Legacy field name used by some versions of passport-saml
  cert: idpCertValue || formatCert(process.env.SAML_CERT || process.env.STANFORD_CERT),
  // Private key for decrypting SAML responses
  privateKey: privateKey,
  // Our app's public certificate for signing and metadata
  signingCert: spCert,
  // Private key used to decrypt encrypted assertions
  decryptionPvk: privateKey,
  // Set the signature and digest algorithms to match the IdP
  signatureAlgorithm: 'sha256',
  digestAlgorithm: 'sha256',
  // Force use HTTP-Redirect binding for the AuthnRequest
  authnRequestBinding: 'HTTP-Redirect',
  // Don't validate the in_response_to field
  validateInResponseTo: 'never',
  // Omit the NameIDPolicy and RequestedAuthnContext from the SAML request
  identifierFormat: null,
  disableRequestedAuthnContext: true,
  // Require the AuthnResponse to be signed
  wantAuthnResponseSigned: true,
}, async (profile, done) => {
  try {
    const sunetId = profile['urn:oid:0.9.2342.19200300.100.1.1']; // uid
    const email = profile['urn:oid:0.9.2342.19200300.100.1.3']; // mail
    const firstName = profile['urn:oid:2.5.4.42']; // givenName
    const lastName = profile['urn:oid:2.5.4.4']; // sn
    const displayName = profile['urn:oid:2.16.840.1.113730.3.1.241']; // displayName
    
    if (!sunetId) {
      return done(new Error('No SUNet ID provided in SAML response'));
    }
    
    let userResult = await pool.query('SELECT * FROM users WHERE sunet_id = $1', [sunetId]);
    let user;
    
    if (userResult.rows.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO users (sunet_id, email, first_name, last_name, display_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
        [sunetId, email, firstName, lastName, displayName]
      );
      user = insertResult.rows[0];
    } else {
      const updateResult = await pool.query(
        `UPDATE users SET email = $2, first_name = $3, last_name = $4, display_name = $5, updated_at = NOW()
         WHERE sunet_id = $1 RETURNING *`,
        [sunetId, email, firstName, lastName, displayName]
      );
      user = updateResult.rows[0];
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
});

passport.use(strategy);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

export default passport;
export { strategy, spCert }; 