import { Controller, Get, Header, Render } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ViewModel {
  apiBaseUrl: string;
}

@Controller()
export class ViewsController {
  constructor(private readonly config: ConfigService) {}

  private model(): ViewModel {
    return { apiBaseUrl: this.config.get<string>('API_BASE_URL') ?? '' };
  }

  @Get()
  @Render('index')
  index() {
    return this.model();
  }

  @Get('catalogo')
  @Render('catalogo')
  catalogo() {
    return this.model();
  }

  @Get('vehiculo')
  @Render('vehiculo')
  vehiculo() {
    return this.model();
  }

  @Get('servicios')
  @Render('servicios')
  servicios() {
    return this.model();
  }

  @Get('nosotros')
  @Render('nosotros')
  nosotros() {
    return this.model();
  }

  @Get('calculadora')
  @Render('calculadora')
  calculadora() {
    return this.model();
  }

  @Get('estimator')
  @Render('estimator')
  estimator() {
    return this.model();
  }

  @Get('postulacion')
  @Render('postulacion')
  postulacion() {
    return this.model();
  }

  // Panel de operaciones — sin indexar, protegido con login JWT en el cliente
  // (llama a /api/auth/login del backend). Ver también supabase-config.js.
  @Get('sm-op')
  @Header('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Render('sm-op')
  smOp() {
    return this.model();
  }
}
