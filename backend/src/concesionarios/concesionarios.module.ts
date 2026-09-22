import { Module } from '@nestjs/common';
import { ConcesionariosController } from './concesionarios.controller';
import { ConcesionariosService } from './concesionarios.service';

@Module({
  controllers: [ConcesionariosController],
  providers: [ConcesionariosService],
})
export class ConcesionariosModule {}
