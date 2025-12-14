import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('UX 분석 (Analysis)')
@Controller('analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @ApiOperation({ 
    summary: '새 UX 분석 생성',
    description: '웹페이지/앱 파일을 업로드하고 사용자 의도를 입력하여 AI 기반 UX 분석을 시작합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'userIntent'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '분석할 이미지 파일 (PNG, JPG, JPEG, GIF, WebP, 최대 10MB)',
        },
        userIntent: {
          type: 'string',
          description: '사용자가 달성하고자 하는 목표',
          example: '사용자가 3단계 이내로 회원가입을 완료할 수 있도록 하고 싶습니다',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 201,
    description: '분석 생성 성공 (AI 분석은 백그라운드에서 진행됩니다)',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        filePath: 'uploads/1702468800-123456789.png',
        userIntent: '사용자가 3단계 이내로 회원가입을 완료할 수 있도록 하고 싶습니다',
        status: 'processing',
        createdAt: '2025-12-13T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: '파일이 없거나 지원하지 않는 형식 (이미지만 가능)' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // 이미지 파일만 허용
        const allowedTypes = /png|jpg|jpeg|gif|webp/;
        const extName = allowedTypes.test(extname(file.originalname).toLowerCase());
        const mimeType = allowedTypes.test(file.mimetype);

        if (extName && mimeType) {
          return cb(null, true);
        } else {
          cb(new Error('이미지 파일만 업로드 가능합니다 (PNG, JPG, JPEG, GIF, WebP)'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 제한
      },
    }),
  )
  async create(
    @Request() req,
    @Body() createAnalysisDto: CreateAnalysisDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.analysisService.create(req.user.id, createAnalysisDto, file);
  }

  @Get()
  @ApiOperation({ 
    summary: '내 분석 목록 조회',
    description: '로그인한 사용자의 모든 분석 보고서를 조회합니다.',
  })
  @ApiResponse({ 
    status: 200,
    description: '분석 목록 조회 성공',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          filePath: 'uploads/1702468800-123456789.png',
          userIntent: '사용자가 3단계 이내로 회원가입을 완료할 수 있도록',
          status: 'completed',
          aiAnalysisResult: '# UX 분석 보고서...',
          highlights: [
            {
              id: 1,
              element: '로그인 버튼',
              issue: '대비가 낮아 가독성 저하',
              severity: 'high',
              coordinates: { x: 100, y: 200, width: 150, height: 50 },
            },
            {
              id: 2,
              element: '검색창',
              issue: '터치 영역이 너무 작음',
              severity: 'medium',
              coordinates: { x: 300, y: 50, width: 200, height: 40 },
            },
          ],
          createdAt: '2025-12-13T08:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async findAll(@Request() req) {
    return this.analysisService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: '분석 상세 조회',
    description: '특정 분석 보고서의 상세 정보를 조회합니다. AI 분석이 완료되면 결과를 확인할 수 있습니다.',
  })
  @ApiParam({
    name: 'id',
    description: '분석 UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ 
    status: 200,
    description: '분석 상세 조회 성공',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        filePath: 'uploads/1702468800-123456789.png',
        userIntent: '사용자가 3단계 이내로 회원가입을 완료할 수 있도록',
        status: 'completed',
        aiAnalysisResult: '# UX 분석 보고서\n\n## 1. 사용자 의도 달성도...',
        highlights: [
          {
            id: 1,
            element: '로그인 버튼',
            issue: '대비가 낮아 가독성 저하',
            severity: 'high',
            coordinates: {
              x: 100,
              y: 200,
              width: 150,
              height: 50,
            },
          },
          {
            id: 2,
            element: '검색창',
            issue: '터치 영역이 너무 작음',
            severity: 'medium',
            coordinates: {
              x: 300,
              y: 50,
              width: 200,
              height: 40,
            },
          },
        ],
        createdAt: '2025-12-13T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: '분석 보고서를 찾을 수 없음' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.analysisService.findOne(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: '분석 삭제',
    description: '특정 분석 보고서와 업로드된 파일을 삭제합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '삭제할 분석 UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ 
    status: 200,
    description: '분석 삭제 성공',
    schema: {
      example: { message: '분석 보고서가 삭제되었습니다' },
    },
  })
  @ApiResponse({ status: 404, description: '분석 보고서를 찾을 수 없음' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async remove(@Request() req, @Param('id') id: string) {
    await this.analysisService.remove(id, req.user.id);
    return { message: '분석 보고서가 삭제되었습니다' };
  }
}
