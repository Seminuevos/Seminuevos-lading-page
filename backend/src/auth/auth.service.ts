import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { SecurityLogService } from '../security-log/security-log.service';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser, JwtPayload } from './interfaces/jwt-payload.interface';
import { toSafeUser } from '../users/entities/agency-user.entity';

export interface LoginResult {
  token: string;
  user: ReturnType<typeof toSafeUser>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly securityLog: SecurityLogService,
  ) {}

  async login(dto: LoginDto, ip: string): Promise<LoginResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.password_hash) {
      await this.securityLog.log({
        event_type: 'LOGIN_FAILED',
        severity: 'warning',
        details: `Intento de login para correo no registrado o sin contraseña configurada: ${email}`,
        ip_address: ip,
      });
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Cuenta suspendida. Contacta al administrador.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      await this.securityLog.log({
        event_type: 'LOGIN_FAILED',
        severity: 'warning',
        details: `Contraseña incorrecta para: ${email}`,
        ip_address: ip,
        user_id: user.id,
      });
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    const token = this.jwtService.sign(payload);

    await this.securityLog.log({
      event_type: 'LOGIN_SUCCESS',
      severity: 'info',
      details: `Login exitoso: ${user.full_name} [${user.role}]`,
      ip_address: ip,
      user_id: user.id,
    });

    return { token, user: toSafeUser(user) };
  }

  async logout(user: AuthenticatedUser | null, ip: string): Promise<void> {
    if (!user) return;
    await this.securityLog.log({
      event_type: 'LOGOUT',
      severity: 'info',
      details: `Logout: ${user.full_name} [${user.role}]`,
      ip_address: ip,
      user_id: user.id,
    });
  }
}
