import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { SettingsModule } from './settings/settings.module';
import { SecurityLogModule } from './security-log/security-log.module';
import { PublicModule } from './public/public.module';
import { EmailModule } from './email/email.module';
import { ScrapeModule } from './scrape/scrape.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    SupabaseModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    InquiriesModule,
    SettingsModule,
    SecurityLogModule,
    PublicModule,
    EmailModule,
    ScrapeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
