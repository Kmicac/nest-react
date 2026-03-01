import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';

import { AuditAction } from '../audit-log/audit-action.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UserService } from '../user/user.service';
import { LoginDto, LoginResponseDto } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly SECRET = process.env.JWT_SECRET;
  private readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(
    loginDto: LoginDto,
    request: Request,
    response: Response,
  ): Promise<LoginResponseDto> {
    const { username, password } = loginDto;
    const user = await this.userService.findByUsername(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      await this.auditLogService.recordSafe({
        actorUsername: username,
        action: AuditAction.AuthLogin,
        entityType: 'auth',
        status: 'FAIL',
        message: 'Invalid username or password',
        ip: this.resolveRequestIp(request),
        userAgent: this.resolveUserAgent(request),
      });

      throw new HttpException(
        'Invalid username or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!user.isActive) {
      await this.auditLogService.recordSafe({
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        action: AuditAction.AuthLogin,
        entityType: 'auth',
        status: 'FAIL',
        message: 'Account is disabled',
        ip: this.resolveRequestIp(request),
        userAgent: this.resolveUserAgent(request),
      });

      throw new HttpException('Account is disabled', HttpStatus.UNAUTHORIZED);
    }

    const { id, firstName, lastName, role } = user;

    const accessToken = await this.jwtService.signAsync(
      { username, firstName, lastName, role },
      { subject: id, expiresIn: '15m', secret: this.SECRET },
    );

    /* Generates a refresh token and stores it in a httponly cookie */
    const refreshToken = await this.jwtService.signAsync(
      { username, firstName, lastName, role },
      { subject: id, expiresIn: '1y', secret: this.REFRESH_SECRET },
    );

    await this.userService.setRefreshToken(id, refreshToken);

    response.cookie('refresh-token', refreshToken, { httpOnly: true });

    await this.auditLogService.recordSafe({
      actorUserId: id,
      actorUsername: username,
      actorRole: role,
      action: AuditAction.AuthLogin,
      entityType: 'auth',
      entityId: id,
      status: 'SUCCESS',
      message: 'User logged in',
      ip: this.resolveRequestIp(request),
      userAgent: this.resolveUserAgent(request),
    });

    return { token: accessToken, user };
  }

  /* Because JWT is a stateless authentication, this function removes the refresh token from the cookies and the database */
  async logout(request: Request, response: Response): Promise<boolean> {
    const userId = request.user['userId'];
    const username = request.user['username'];
    const role = request.user['role'];

    await this.userService.setRefreshToken(userId, null);
    response.clearCookie('refresh-token');

    await this.auditLogService.recordSafe({
      actorUserId: userId,
      actorUsername: username,
      actorRole: role,
      action: AuditAction.AuthLogout,
      entityType: 'auth',
      entityId: userId,
      status: 'SUCCESS',
      message: 'User logged out',
      ip: this.resolveRequestIp(request),
      userAgent: this.resolveUserAgent(request),
    });

    return true;
  }

  async refresh(
    refreshToken: string,
    request: Request,
    response: Response,
  ): Promise<LoginResponseDto> {
    if (!refreshToken) {
      await this.auditLogService.recordSafe({
        action: AuditAction.AuthRefreshFail,
        entityType: 'auth',
        status: 'FAIL',
        message: 'Refresh token required',
        ip: this.resolveRequestIp(request),
        userAgent: this.resolveUserAgent(request),
      });

      throw new HttpException('Refresh token required', HttpStatus.BAD_REQUEST);
    }

    let decoded: any;

    try {
      decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.REFRESH_SECRET,
      });
    } catch (error) {
      response.clearCookie('refresh-token');

      await this.auditLogService.recordSafe({
        action: AuditAction.AuthRefreshFail,
        entityType: 'auth',
        status: 'FAIL',
        message: 'Refresh token is not valid',
        ip: this.resolveRequestIp(request),
        userAgent: this.resolveUserAgent(request),
      });

      throw new HttpException(
        'Refresh token is not valid',
        HttpStatus.FORBIDDEN,
      );
    }

    const userId = decoded?.sub;

    if (!userId) {
      response.clearCookie('refresh-token');

      await this.auditLogService.recordSafe({
        action: AuditAction.AuthRefreshFail,
        entityType: 'auth',
        status: 'FAIL',
        message: 'Refresh token has no subject',
        ip: this.resolveRequestIp(request),
        userAgent: this.resolveUserAgent(request),
      });

      throw new HttpException(
        'Refresh token is not valid',
        HttpStatus.FORBIDDEN,
      );
    }

    const user = await this.userService.findById(userId);
    const { firstName, lastName, username, id, role } = user;

    if (!user.refreshToken || typeof user.refreshToken !== 'string') {
      response.clearCookie('refresh-token');

      await this.auditLogService.recordSafe({
        actorUserId: id,
        actorUsername: username,
        actorRole: role,
        action: AuditAction.AuthRefreshFail,
        entityType: 'auth',
        entityId: id,
        status: 'FAIL',
        message: 'Stored refresh token is missing',
        ip: this.resolveRequestIp(request),
        userAgent: this.resolveUserAgent(request),
      });

      throw new HttpException(
        'Refresh token is not valid',
        HttpStatus.FORBIDDEN,
      );
    }

    const isTokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isTokenMatch) {
      response.clearCookie('refresh-token');
      await this.userService.setRefreshToken(id, null);

      await this.auditLogService.recordSafe({
        actorUserId: id,
        actorUsername: username,
        actorRole: role,
        action: AuditAction.AuthRefreshFail,
        entityType: 'auth',
        entityId: id,
        status: 'FAIL',
        message: 'Refresh token hash mismatch',
        ip: this.resolveRequestIp(request),
        userAgent: this.resolveUserAgent(request),
      });

      throw new HttpException(
        'Refresh token is not valid',
        HttpStatus.FORBIDDEN,
      );
    }

    const accessToken = await this.jwtService.signAsync(
      { username, firstName, lastName, role },
      { subject: id, expiresIn: '15m', secret: this.SECRET },
    );

    await this.auditLogService.recordSafe({
      actorUserId: id,
      actorUsername: username,
      actorRole: role,
      action: AuditAction.AuthRefresh,
      entityType: 'auth',
      entityId: id,
      status: 'SUCCESS',
      message: 'Access token refreshed',
      ip: this.resolveRequestIp(request),
      userAgent: this.resolveUserAgent(request),
    });

    return { token: accessToken, user };
  }

  private resolveRequestIp(request?: Request): string {
    if (!request) {
      return null;
    }

    const forwardedFor = request.headers?.['x-forwarded-for'];

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip || null;
  }

  private resolveUserAgent(request?: Request): string {
    if (!request) {
      return null;
    }

    const userAgent = request.headers?.['user-agent'];

    if (Array.isArray(userAgent)) {
      return userAgent[0] || null;
    }

    return userAgent || null;
  }
}
