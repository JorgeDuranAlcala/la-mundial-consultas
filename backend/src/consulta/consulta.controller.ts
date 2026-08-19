import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { LaMundialMockService } from '../la-mundial/la-mundial-mock.service';

@Controller('la-mundial')
export class ConsultaController {
  constructor(private readonly laMundial: LaMundialMockService) {}

  @Get('consulta')
  consultar(
    @Query('nacionalidad') nacionalidad: string,
    @Query('cedrif') cedrif: string,
  ) {
    if (!nacionalidad?.trim() || !cedrif?.trim()) {
      throw new BadRequestException('Indique nacionalidad y cedrif');
    }
    const ced = Number(cedrif.replace(/\D/g, ''));
    if (!Number.isFinite(ced) || ced <= 0) {
      throw new BadRequestException('Cédula inválida');
    }
    return this.laMundial.consultarAsegurado(nacionalidad.trim(), ced);
  }
}
