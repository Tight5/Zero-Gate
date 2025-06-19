import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Development mode check
const isDevelopment = process.env.NODE_ENV === "development";

if (!isDevelopment && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    if (isDevelopment) {
      // Return mock config for development
      return {
        issuer: 'https://dev.replit.com',
        authorization_endpoint: '/api/login',
        token_endpoint: '/api/token',
        userinfo_endpoint: '/api/userinfo'
      };
    }
    
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  if (isDevelopment) {
    // Use memory store for development
    return session({
      secret: 'development-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Allow non-HTTPS in development
        maxAge: sessionTtl,
      },
    });
  }

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: any
) {
  if (isDevelopment) {
    user.claims = {
      sub: 'dev-user-123',
      email: 'developer@zerogate.dev',
      first_name: 'Developer',
      last_name: 'User',
      profile_image_url: null,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    user.access_token = 'dev-access-token';
    user.expires_at = user.claims.exp;
    return;
  }

  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (isDevelopment) {
    // Development mode authentication
    app.get("/api/login", (req, res) => {
      const user = {
        claims: {
          sub: 'dev-user-123',
          email: 'developer@zerogate.dev',
          first_name: 'Developer',
          last_name: 'User',
          profile_image_url: null,
          exp: Math.floor(Date.now() / 1000) + 3600
        }
      };
      
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.redirect('/');
        }
        res.redirect('/dashboard');
      });
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect('/');
      });
    });

    passport.serializeUser((user: any, cb) => cb(null, user));
    passport.deserializeUser((user: any, cb) => cb(null, user));
    
    return;
  }

  // Production Replit Auth setup
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: any,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (isDevelopment) {
    // Development mode bypass
    if (!req.user) {
      const user = {
        claims: {
          sub: 'dev-user-123',
          email: 'developer@zerogate.dev',
          first_name: 'Developer',
          last_name: 'User'
        }
      };
      req.user = user;
    }
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};