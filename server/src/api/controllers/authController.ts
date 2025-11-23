import { Request, Response } from 'express';
import { db } from '../../db';
import { users, tenants } from '../../db/schemas';
import { eq, and } from 'drizzle-orm';
import { AuthService } from '../../services/AuthService';

/**
 * POST /auth/login
 * Authenticate user and issue access + refresh tokens
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { tenantCode, email, password } = req.body;

    // Validate required fields
    if (!tenantCode || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: tenantCode, email, password',
      });
    }

    // Find tenant by code
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, tenantCode))
      .limit(1);

    if (!tenant) {
      return res.status(401).json({
        error: 'Invalid tenant code',
      });
    }

    // CRITICAL SECURITY: Find user by email AND validate tenant association
    // This prevents cross-tenant account takeover
    // System users (tenantId IS NULL) can log in with any tenant code
    // Tenant users (tenantId = tenant.id) can only log in with their tenant
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // CRITICAL: Validate tenant association BEFORE password check
    // This prevents cross-tenant access
    if (user.accessScope !== 'system' && user.tenantId !== tenant.id) {
      return res.status(401).json({
        error: 'Invalid email or password', // Generic error to prevent enumeration
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account is inactive. Please contact your administrator.',
      });
    }

    // Validate password
    const isPasswordValid = await AuthService.comparePassword(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      accessScope: user.accessScope,
      tenantId: user.tenantId,
      businessLineId: user.businessLineId,
      branchId: user.branchId,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const refreshToken = AuthService.generateRefreshToken(tokenPayload);

    // TOKEN ROTATION SECURITY: Invalidate all previous refresh tokens
    // This prevents token reuse attacks and ensures only the latest token is valid
    await AuthService.deleteAllUserTokens(user.id);
    
    // Store new refresh token in database
    await AuthService.storeRefreshToken(user.id, refreshToken);

    // Update last login time
    await AuthService.updateLastLogin(user.id);

    // Return tokens and user data
    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessScope: user.accessScope,
        tenantId: user.tenantId,
        businessLineId: user.businessLineId,
        branchId: user.branchId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Internal server error during login',
    });
  }
};

/**
 * POST /auth/refresh
 * Issue new access token using refresh token
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required',
      });
    }

    // Validate refresh token from database
    const userId = await AuthService.validateRefreshToken(refreshToken);

    if (!userId) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
      });
    }

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'User not found or inactive',
      });
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      accessScope: user.accessScope,
      tenantId: user.tenantId,
      businessLineId: user.businessLineId,
      branchId: user.branchId,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const newRefreshToken = AuthService.generateRefreshToken(tokenPayload);

    // TOKEN ROTATION SECURITY: Delete old refresh token
    // This prevents token reuse attacks - each refresh invalidates the previous token
    await AuthService.deleteRefreshToken(refreshToken);
    
    // Store new refresh token
    await AuthService.storeRefreshToken(user.id, newRefreshToken);

    return res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      error: 'Internal server error during token refresh',
    });
  }
};

/**
 * POST /auth/logout
 * Delete refresh token from database
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required',
      });
    }

    // Delete refresh token
    await AuthService.deleteRefreshToken(refreshToken);

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      error: 'Internal server error during logout',
    });
  }
};
