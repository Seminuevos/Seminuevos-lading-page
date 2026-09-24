import { Body, Controller, Get, HttpCode, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser, JwtPayload } from './interfaces/jwt-payload.interface';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Ip() ip: string) {
    const user = this.tryDecodeUser(req);
    await this.authService.logout(user, ip);
    return { message: 'Sesión cerrada correctamente' };
  }

  private tryDecodeUser(req: Request): AuthenticatedUser | null {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) return null;
    try {
      const payload = this.jwtService.verify<JwtPayload>(header.slice(7).trim());
      return { id: payload.sub, email: payload.email, role: payload.role, full_name: payload.full_name };
    } catch {
      return null;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }
}
