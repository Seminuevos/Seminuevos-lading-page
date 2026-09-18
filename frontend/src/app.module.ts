import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ViewsModule } from './views/views.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ViewsModule],
})
export class AppModule {}
