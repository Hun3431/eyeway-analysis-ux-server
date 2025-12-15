import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('인증 (Authentication)')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor) // password 필드 제외
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ 
    summary: '회원가입',
    description: '새로운 사용자를 등록합니다. 기본 상태는 "승인 대기(pending)"이며, 관리자의 승인 후 로그인이 가능합니다. (현재는 편의상 토큰이 반환되지만 로그인 시 차단될 수 있습니다)',
  })
  @ApiResponse({ 
    status: 201, 
    description: '회원가입 성공 (승인 대기 상태)',
    schema: {
      example: {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@eyeway.com',
          name: '홍길동',
          age: 25,
          status: 'pending',
          createdAt: '2025-12-13T08:00:00.000Z',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 409, description: '이미 존재하는 이메일' })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '로그인',
    description: '이메일과 비밀번호로 로그인합니다. "승인됨(approved)" 상태인 계정만 로그인이 가능합니다.',
  })
  @ApiResponse({ 
    status: 200, 
    description: '로그인 성공',
    schema: {
      example: {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@eyeway.com',
          name: '홍길동',
          status: 'approved',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: '이메일/비밀번호 불일치 또는 승인 대기 계정' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('check-email/:email')
  @ApiOperation({ 
    summary: '이메일 중복 확인',
    description: '회원가입 전 이메일 중복 여부를 확인합니다.',
  })
  @ApiParam({ 
    name: 'email', 
    description: '확인할 이메일 주소',
    example: 'user@eyeway.com',
  })
  @ApiResponse({ 
    status: 200, 
    description: '중복 확인 결과',
    schema: {
      example: { available: true },
    },
  })
  async checkEmail(@Param('email') email: string) {
    return this.authService.checkEmailAvailability(email);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '로그아웃',
    description: '로그아웃합니다. JWT는 stateless이므로 클라이언트에서 토큰을 삭제해야 합니다.',
  })
  @ApiResponse({ 
    status: 200, 
    description: '로그아웃 성공',
    schema: {
      example: { message: '로그아웃되었습니다' },
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async logout() {
    // JWT는 stateless이므로 서버에서 할 일 없음
    // 클라이언트에서 토큰 삭제 필요
    return { message: '로그아웃되었습니다' };
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: '회원탈퇴',
    description: '사용자 계정을 삭제합니다. 관련된 모든 분석 데이터도 함께 삭제됩니다.',
  })
  @ApiResponse({ 
    status: 200, 
    description: '회원탈퇴 성공',
    schema: {
      example: { message: '계정이 삭제되었습니다' },
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async deleteAccount(@Request() req) {
    await this.authService.deleteAccount(req.user.id);
    return { message: '계정이 삭제되었습니다' };
  }
}
