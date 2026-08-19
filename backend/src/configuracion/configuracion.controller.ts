import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Compania } from '../database/entities/compania.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(
    @InjectRepository(Compania)
    private readonly companiaRepo: Repository<Compania>,
  ) {}

  @Public()
  @Get('companias')
  async listCompanias(@Query('activo') activo?: string) {
    const where =
      activo === 'true' ? { activo: true } : activo === 'false' ? { activo: false } : {};
    return this.companiaRepo.find({ where, order: { nombre: 'ASC' } });
  }
}
