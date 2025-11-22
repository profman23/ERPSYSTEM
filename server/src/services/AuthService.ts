import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, authTokens } from '../db/schemas';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';

interface JWTPayload {
  userId: string;
  role: string;
  accessScope: string;
  tenantId: string | null;
  businessLineId: string | null;
  branchId: string | null;
}

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access token (15 minutes)
   */
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate refresh token (30 days)
   */
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Verify and decode token
   */
  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  }

  /**
   * Store refresh token in database
   */
  static async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    await db.insert(authTokens).values({
      userId,
      refreshToken,
      expiresAt,
    });
  }

  /**
   * Validate refresh token from database
   */
  static async validateRefreshToken(refreshToken: string): Promise<string | null> {
    const [token] = await db
      .select()
      .from(authTokens)
      .where(eq(authTokens.refreshToken, refreshToken))
      .limit(1);

    if (!token) {
      return null;
    }

    // Check if token is expired
    if (new Date() > token.expiresAt) {
      // Delete expired token
      await db.delete(authTokens).where(eq(authTokens.id, token.id));
      return null;
    }

    return token.userId;
  }

  /**
   * Delete refresh token (logout)
   */
  static async deleteRefreshToken(refreshToken: string): Promise<void> {
    await db.delete(authTokens).where(eq(authTokens.refreshToken, refreshToken));
  }

  /**
   * Delete all refresh tokens for a user
   */
  static async deleteAllUserTokens(userId: string): Promise<void> {
    await db.delete(authTokens).where(eq(authTokens.userId, userId));
  }

  /**
   * Update user's last login time
   */
  static async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }
}
