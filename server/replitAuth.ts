import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";

// Development authentication bypass
export function setupDevelopmentAuth(app: Express) {
  console.log("Setting up development authentication bypass");
  
  // Simple development session
  app.use(session({
    secret: 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Allow non-HTTPS in development
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Development auth routes
  app.get('/api/login', (req, res) => {
    res.redirect('/');
  });

  app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
}

// Production authentication would go here
export async function setupProductionAuth(app: Express) {
  // TODO: Implement full Replit Auth when ready for production
  console.log("Production auth not yet implemented, using development fallback");
  setupDevelopmentAuth(app);
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // In development, always allow access
  if (process.env.NODE_ENV === "development") {
    // Inject development user
    (req as any).user = {
      claims: {
        sub: 'dev-user-1',
        email: 'admin@tight5digital.com',
        first_name: 'Admin',
        last_name: 'User',
      }
    };
    return next();
  }

  // Production authentication logic would go here
  return next();
};

// Setup auth based on environment
export async function setupAuth(app: Express) {
  if (process.env.NODE_ENV === "development") {
    setupDevelopmentAuth(app);
  } else {
    await setupProductionAuth(app);
  }
}