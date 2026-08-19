import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compania } from '../database/entities/compania.entity';
import { Proveedor } from '../database/entities/proveedor.entity';
import { UsuarioPortal } from '../database/entities/usuario-portal.entity';
import { UsuarioRol } from '../database/entities/usuario-rol.entity';
import { LaMundialModule } from '../la-mundial/la-mundial.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compania, Proveedor, UsuarioPortal, UsuarioRol]),
    LaMundialModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
