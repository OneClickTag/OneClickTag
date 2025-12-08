import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import {
  FirebaseAuthDto,
  CreateTenantDto,
  LoginResponseDto,
  JwtAuthDto,
} from '../dto';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('firebase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Firebase ID token' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid Firebase token' })
  @ApiBody({ type: FirebaseAuthDto })
  async authenticateWithFirebase(
    @Body() firebaseAuthDto: FirebaseAuthDto,
  ): Promise<LoginResponseDto> {
    return this.authService.authenticateWithFirebase(firebaseAuthDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiBody({ type: JwtAuthDto })
  async refreshToken(@Body() jwtAuthDto: JwtAuthDto): Promise<LoginResponseDto> {
    return this.authService.refreshToken(jwtAuthDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getUserProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
  })
  @ApiResponse({ status: 409, description: 'Domain already taken' })
  @ApiBody({ type: CreateTenantDto })
  async createTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createTenantDto: CreateTenantDto,
  ) {
    return this.authService.createTenant(createTenantDto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (client-side token invalidation)' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  async logout() {
    // JWT tokens are stateless, so logout is handled client-side
    // This endpoint exists for consistency and future enhancements
    return { message: 'Logout successful' };
  }
}