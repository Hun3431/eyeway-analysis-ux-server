import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정 (환경 변수 기반)
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8080'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  
  // 전역 Validation Pipe 설정
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // DTO에 정의되지 않은 속성 제거
    forbidNonWhitelisted: true, // 정의되지 않은 속성이 있으면 에러
    transform: true, // 자동 타입 변환
  }));

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('눈길 UX/UI 분석 API')
    .setDescription('AI 기반 웹페이지 UX 분석 서비스 API 문서')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT 토큰을 입력하세요',
        in: 'header',
      },
      'access-token',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(process.env.PORT ?? 8080);
  console.log(`🚀 서버가 http://localhost:${process.env.PORT ?? 8080} 에서 실행 중입니다`);
  console.log(`📚 Swagger 문서: http://localhost:${process.env.PORT ?? 8080}/api`);
}
bootstrap();
