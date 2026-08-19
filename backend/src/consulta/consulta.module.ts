import { Module } from '@nestjs/common';
import { LaMundialModule } from '../la-mundial/la-mundial.module';
import { ConsultaController } from './consulta.controller';

@Module({
  imports: [LaMundialModule],
  controllers: [ConsultaController],
})
export class ConsultaModule {}
