import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Compania } from '../database/entities/compania.entity';
import { Proveedor } from '../database/entities/proveedor.entity';
import { UsuarioPortal } from '../database/entities/usuario-portal.entity';
import { UsuarioRol } from '../database/entities/usuario-rol.entity';
import { LaMundialMockService } from '../la-mundial/la-mundial-mock.service';
import { LoginDto } from './dto/login.dto';
import {
  PerfilAsegurado,
  SignupPortalDto,
  SignupPortalTipo,
  VerificarSignupDto,
} from './dto/signup.dto';
import { AuthUser } from './interfaces/auth-user.interface';
import { signJwt, verifyJwt } from './jwt.util';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly laMundial: LaMundialMockService,
    @InjectRepository(Compania)
    private readonly companiaRepo: Repository<Compania>,
    @InjectRepository(Proveedor)
    private readonly proveedorRepo: Repository<Proveedor>,
    @InjectRepository(UsuarioPortal)
    private readonly usuarioRepo: Repository<UsuarioPortal>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepo: Repository<UsuarioRol>,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usuarioRepo.findOne({
      where: { username: dto.username.trim().toLowerCase() },
      relations: { roles: true },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    user.ultimoAccesoEn = new Date();
    await this.usuarioRepo.save(user);

    const roles = user.roles?.map((r) => r.rolCodigo) ?? [];
    const authUser = this.toAuthUser(user, roles);
    const token = this.signToken(authUser);

    return { token, user: this.serializeUser(user, roles) };
  }

  async verificarSignup(dto: VerificarSignupDto) {
    await this.assertCompaniaActiva(dto.companiaId);
    const identity = await this.resolveIdentity(dto);
    await this.assertNoExistingAccount(dto.tipo, identity.serialpersona, dto.companiaId);

    const perfil =
      dto.tipo === SignupPortalTipo.ASEGURADO
        ? (dto.perfilAsegurado ?? PerfilAsegurado.TITULAR)
        : undefined;

    return {
      elegible: true,
      mensaje: this.mensajeVerificacion(dto.tipo, perfil),
      tipo: dto.tipo,
      perfilAsegurado: perfil,
      identidad: identity,
    };
  }

  async signupPortal(dto: SignupPortalDto) {
    const compania = await this.assertCompaniaActiva(dto.companiaId);
    const identity = await this.resolveIdentity(dto);
    await this.assertNoExistingAccount(dto.tipo, identity.serialpersona, dto.companiaId);

    const normalizedEmail = dto.email.trim().toLowerCase();
    const confirmEmail = dto.confirmEmail?.trim().toLowerCase();
    if (confirmEmail && confirmEmail !== normalizedEmail) {
      throw new BadRequestException('El correo electrónico y su confirmación no coinciden');
    }

    await this.assertEmailAvailable(normalizedEmail, dto.companiaId);

    const normalizedUsername = dto.username.trim().toLowerCase();
    const existing = await this.usuarioRepo.findOneBy({ username: normalizedUsername });
    if (existing) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    const rolCodigo = dto.tipo;
    const proveedorId =
      dto.tipo === SignupPortalTipo.PROVEEDOR_SERVICIOS
        ? await this.resolveProveedorId(identity)
        : undefined;

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const newUser = this.usuarioRepo.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      nombreCompleto: identity.nombreCompleto.trim() || normalizedUsername,
      telefono: identity.telefono?.trim() ?? null,
      proveedorId: proveedorId ?? null,
      companiaId: compania.id,
      rmsSerialpersona: identity.serialpersona,
      activo: true,
    });

    const saved = await this.usuarioRepo.save(newUser);
    await this.usuarioRolRepo.save(
      this.usuarioRolRepo.create({ usuarioId: saved.id, rolCodigo }),
    );

    const authUser = this.toAuthUser(saved, [rolCodigo]);
    const token = this.signToken(authUser);

    return {
      token,
      user: this.serializeUser(saved, [rolCodigo]),
      identidad: identity,
    };
  }

  async getProfile(userId: number) {
    const user = await this.usuarioRepo.findOne({
      where: { id: userId },
      relations: { roles: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const roles = user.roles?.map((r) => r.rolCodigo) ?? [];
    return this.serializeUser(user, roles);
  }

  verifyToken(token: string): AuthUser {
    const payload = verifyJwt(token, this.jwtSecret());
    return {
      id: payload.sub,
      username: payload.username ?? '',
      roles: payload.roles ?? [],
      companiaId: payload.companiaId,
    };
  }

  private jwtSecret(): string {
    return this.config.get<string>('JWT_SECRET') ?? 'la-mundial-consultas-dev-secret';
  }

  private signToken(user: AuthUser): string {
    return signJwt(
      {
        sub: user.id,
        username: user.username,
        roles: user.roles,
        companiaId: user.companiaId,
      },
      this.jwtSecret(),
    );
  }

  private toAuthUser(user: UsuarioPortal, roles: string[]): AuthUser {
    return {
      id: user.id,
      username: user.username,
      roles,
      companiaId: user.companiaId ?? undefined,
    };
  }

  private serializeUser(user: UsuarioPortal, roles: string[]) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nombreCompleto: user.nombreCompleto,
      telefono: user.telefono,
      proveedorId: user.proveedorId,
      companiaId: user.companiaId,
      rmsSerialpersona: user.rmsSerialpersona,
      activo: user.activo,
      ultimoAccesoEn: user.ultimoAccesoEn,
      roles,
    };
  }

  private async assertCompaniaActiva(companiaId: number) {
    const compania = await this.companiaRepo.findOne({
      where: { id: companiaId, activo: true },
    });
    if (!compania) {
      throw new NotFoundException('La compañía seleccionada no existe o no está activa');
    }
    return compania;
  }

  private async resolveIdentity(dto: VerificarSignupDto) {
    const nac = dto.nacionalidad.toUpperCase();

    if (dto.tipo === SignupPortalTipo.PROVEEDOR_SERVICIOS) {
      const proveedor = this.laMundial.findProveedor(nac, dto.cedrif, dto.correlativo);
      if (!proveedor) {
        throw new NotFoundException(
          `No se encontró proveedor ${nac}-${dto.cedrif} en La Mundial. Verifique la cédula o RIF.`,
        );
      }
      return this.mapPersona(proveedor);
    }

    const perfil = dto.perfilAsegurado ?? PerfilAsegurado.TITULAR;

    if (perfil === PerfilAsegurado.BENEFICIARIO) {
      if (!dto.titularNacionalidad || dto.titularCedrif == null) {
        throw new BadRequestException('Debe indicar la cédula del titular');
      }
      const titular = this.laMundial.findTitular(
        dto.titularNacionalidad.toUpperCase(),
        dto.titularCedrif,
      );
      if (!titular) {
        throw new NotFoundException(
          'No se encontró el asegurado titular. Verifique la cédula.',
        );
      }
      const benef = this.laMundial.findBeneficiario(
        nac,
        dto.cedrif,
        dto.titularNacionalidad.toUpperCase(),
        dto.titularCedrif,
      );
      if (!benef) {
        throw new NotFoundException(
          `No se encontró el beneficiario ${nac}-${dto.cedrif} en La Mundial.`,
        );
      }
      return this.mapPersona(benef);
    }

    const titular = this.laMundial.findTitular(nac, dto.cedrif);
    if (!titular) {
      throw new NotFoundException(
        `No se encontró el asegurado titular ${nac}-${dto.cedrif} en La Mundial. Verifique la cédula.`,
      );
    }
    return this.mapPersona(titular);
  }

  private mapPersona(persona: {
    serialpersona: string;
    nacionalidad: string;
    cedrif: string;
    correlativo: string;
    nombreCompleto: string;
    email: string | null;
    telefono: string | null;
    numrif: string | null;
  }) {
    return {
      serialpersona: persona.serialpersona,
      nacionalidad: persona.nacionalidad,
      cedrif: persona.cedrif,
      correlativo: persona.correlativo,
      nombreCompleto: persona.nombreCompleto,
      email: persona.email,
      telefono: persona.telefono,
      numrif: persona.numrif,
    };
  }

  private async assertNoExistingAccount(
    tipo: SignupPortalTipo,
    serialpersona: string,
    companiaId: number,
  ) {
    const existing = await this.usuarioRepo.findOne({
      where: { rmsSerialpersona: serialpersona, companiaId },
    });
    if (existing) {
      throw new ConflictException(
        tipo === SignupPortalTipo.PROVEEDOR_SERVICIOS
          ? 'Ya existe una cuenta de proveedor para este RIF/cédula.'
          : 'Ya existe una cuenta registrada para esta cédula.',
      );
    }
  }

  private async assertEmailAvailable(email: string, companiaId: number) {
    const existing = await this.usuarioRepo.findOne({
      where: { email, companiaId },
    });
    if (existing) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }
  }

  private async resolveProveedorId(identity: { serialpersona: string; nombreCompleto: string; numrif: string | null }) {
    const existing = await this.proveedorRepo.findOne({
      where: { codigoExterno: identity.serialpersona },
    });
    if (existing) return existing.id;

    const created = await this.proveedorRepo.save(
      this.proveedorRepo.create({
        codigoExterno: identity.serialpersona,
        nombre: identity.nombreCompleto,
        rif: identity.numrif,
        activo: true,
      }),
    );
    return created.id;
  }

  private mensajeVerificacion(tipo: SignupPortalTipo, perfil?: PerfilAsegurado) {
    if (tipo === SignupPortalTipo.PROVEEDOR_SERVICIOS) {
      return 'Proveedor verificado en La Mundial.';
    }
    if (perfil === PerfilAsegurado.BENEFICIARIO) {
      return 'Beneficiario verificado en La Mundial.';
    }
    return 'Asegurado titular verificado en La Mundial.';
  }
}
