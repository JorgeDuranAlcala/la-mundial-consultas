import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UsuarioPortal } from './usuario-portal.entity';
import { CatRolPortal } from './cat-rol-portal.entity';

@Entity({ schema: 'logistika', name: 'usuario_rol' })
export class UsuarioRol {
  @PrimaryColumn({ name: 'usuario_id' })
  usuarioId: number;

  @PrimaryColumn({ name: 'rol_codigo' })
  rolCodigo: string;

  @ManyToOne(() => UsuarioPortal)
  @JoinColumn({ name: 'usuario_id' })
  usuario: UsuarioPortal;

  @ManyToOne(() => CatRolPortal)
  @JoinColumn({ name: 'rol_codigo' })
  rol: CatRolPortal;
}
