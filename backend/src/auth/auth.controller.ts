import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupPortalDto, VerificarSignupDto } from './dto/signup.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from './interfaces/auth-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('signup/verificar')
  verificarSignup(@Body() dto: VerificarSignupDto) {
    return this.authService.verificarSignup(dto);
  }

  @Public()
  @Post('signup')
  signupPortal(@Body() dto: SignupPortalDto) {
    return this.authService.signupPortal(dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }
}
