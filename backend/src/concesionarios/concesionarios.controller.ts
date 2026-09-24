import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConcesionariosService } from './concesionarios.service';
import { CreateConcesionarioDto } from './dto/create-concesionario.dto';
import { UpdateConcesionarioDto } from './dto/update-concesionario.dto';

@Controller('api/concesionarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConcesionariosController {
  constructor(private readonly concesionariosService: ConcesionariosService) {}

  @Get()
  findAll() {
    return this.concesionariosService.findAll().then((data) => ({ data }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.concesionariosService.findOne(id).then((data) => ({ data }));
  }

  @Post()
  @Roles('admin', 'super_admin')
  create(@Body() dto: CreateConcesionarioDto) {
    return this.concesionariosService.create(dto).then((data) => ({ data }));
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  update(@Param('id') id: string, @Body() dto: UpdateConcesionarioDto) {
    return this.concesionariosService.update(id, dto).then((data) => ({ data }));
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  remove(@Param('id') id: string) {
    return this.concesionariosService.remove(id).then(() => ({ message: 'Concesionario eliminado correctamente' }));
  }
}
