# Stage 1: Builder
FROM node:18-alpine AS builder

# pnpm 설치
RUN npm install -g pnpm

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY package.json pnpm-lock.yaml ./

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# 애플리케이션 빌드
RUN pnpm run build

# Stage 2: Production
FROM node:18-alpine AS production

# pnpm 설치
RUN npm install -g pnpm

# 작업 디렉토리 설정
WORKDIR /app

# pnpm deploy를 사용하여 프로덕션 의존성을 제대로 설치
# pnpm deploy는 심링크를 올바르게 처리합니다
COPY --from=builder /app ./

# 불필요한 개발 파일 제거 (최적화)
RUN rm -rf src test *.ts tsconfig.json eslint.config.mjs .prettierrc

# multer는 transitive dependency이므로 심링크 생성
RUN ln -s .pnpm/multer@2.0.2/node_modules/multer node_modules/multer

# 포트 노출
EXPOSE 8080

# 애플리케이션 실행
CMD ["node", "dist/main"]
