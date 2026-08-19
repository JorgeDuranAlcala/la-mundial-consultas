import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { UsuarioRol } from './usuario-rol.entity';
import { Compania } from './compania.entity';

@Entity({ schema: 'logistika', name: 'usuario_portal' })
export class UsuarioPortal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'citext', unique: true })
  username: string;

  @Column({ type: 'citext', nullable: true })
  email: string | null;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ name: 'nombre_completo', type: 'varchar', length: 200, nullable: true })
  nombreCompleto: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ name: 'proveedor_id', type: 'bigint', nullable: true })
  proveedorId: number | null;

  @ManyToOne(() => Proveedor, { nullable: true })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor | null;

  @Column({ name: 'compania_id', type: 'bigint', nullable: true })
  companiaId: number | null;

  @ManyToOne(() => Compania, { nullable: true })
  @JoinColumn({ name: 'compania_id' })
  compania: Compania | null;

  @Column({ name: 'rms_serialpersona', type: 'varchar', length: 50, nullable: true })
  rmsSerialpersona: string | null;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => UsuarioRol, (ur) => ur.usuario)
  roles: UsuarioRol[];

  @Column({ name: 'ultimo_acceso_en', type: 'timestamptz', nullable: true })
  ultimoAccesoEn: Date | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
