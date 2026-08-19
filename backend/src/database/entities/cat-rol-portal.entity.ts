import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ schema: 'logistika', name: 'cat_rol_portal' })
export class CatRolPortal {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;
}
