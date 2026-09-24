import { Body, Controller, Get, HttpCode, Ip, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Controller('api/inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.inquiriesService.findAll().then((data) => ({ data }));
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  create(@Body() dto: CreateInquiryDto, @Ip() ip: string) {
    return this.inquiriesService
      .create(dto, ip)
      .then((data) => ({ data, message: 'Consulta enviada correctamente' }));
  }
}
