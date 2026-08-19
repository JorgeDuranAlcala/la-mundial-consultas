import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compania } from '../database/entities/compania.entity';
import { ConfiguracionController } from './configuracion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Compania])],
  controllers: [ConfiguracionController],
})
export class ConfiguracionModule {}
