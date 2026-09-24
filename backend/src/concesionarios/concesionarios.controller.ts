import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ConcesionariosService } from './concesionarios.service';
import { CreateConcesionarioDto } from './dto/create-concesionario.dto';
import { UpdateConcesionarioDto } from './dto/update-concesionario.dto';
import { ChangeConcesionarioPasswordDto } from './dto/change-concesionario-password.dto';
import { UpdateConcesionarioConditionsDto } from './dto/update-concesionario-conditions.dto';

@Controller('api/concesionarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConcesionariosController {
  constructor(private readonly concesionariosService: ConcesionariosService) {}

  // Abierto a cualquier rol autenticado (sales/credit/mechanic lo usan para
  // el selector "Concesionario dueño" del formulario de vehículos) — el
  // service solo agrega el email/estado del usuario de login cuando el
  // requester es admin.
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.concesionariosService.findAll(user).then((data) => ({ data }));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.concesionariosService.findOne(id, user).then((data) => ({ data }));
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

  @Put(':id/password')
  @Roles('admin', 'super_admin')
  changePassword(@Param('id') id: string, @Body() dto: ChangeConcesionarioPasswordDto) {
    return this.concesionariosService
      .changePassword(id, dto)
      .then(() => ({ message: 'Contraseña actualizada correctamente' }));
  }

  @Get(':id/conditions')
  @Roles('admin', 'super_admin')
  getConditions(@Param('id') id: string) {
    return this.concesionariosService.getConditions(id).then((data) => ({ data }));
  }

  @Put(':id/conditions')
  @Roles('admin', 'super_admin')
  upsertConditions(@Param('id') id: string, @Body() dto: UpdateConcesionarioConditionsDto) {
    return this.concesionariosService.upsertConditions(id, dto).then((data) => ({ data }));
  }
}
