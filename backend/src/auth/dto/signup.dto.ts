import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum SignupPortalTipo {
  ASEGURADO = 'ASEGURADO',
  PROVEEDOR_SERVICIOS = 'PROVEEDOR_SERVICIOS',
}

export enum PerfilAsegurado {
  TITULAR = 'TITULAR',
  BENEFICIARIO = 'BENEFICIARIO',
}

export class VerificarSignupDto {
  @IsInt()
  companiaId: number;

  @IsEnum(SignupPortalTipo)
  tipo: SignupPortalTipo;

  @IsString()
  @IsNotEmpty()
  nacionalidad: string;

  @IsInt()
  cedrif: number;

  @IsInt()
  correlativo: number;

  @IsOptional()
  @IsEnum(PerfilAsegurado)
  perfilAsegurado?: PerfilAsegurado;

  @IsOptional()
  @IsString()
  titularNacionalidad?: string;

  @IsOptional()
  @IsInt()
  titularCedrif?: number;
}

export class SignupPortalDto extends VerificarSignupDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEmail()
  confirmEmail?: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
