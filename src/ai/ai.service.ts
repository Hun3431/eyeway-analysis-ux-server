import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzeUX(
    filePath: string,
    userIntent: string,
    imageWidth: number,
    imageHeight: number,
  ): Promise<string> {
    try {
      console.log('🔍 AI 분석 시작:', { filePath, userIntent, imageWidth, imageHeight });
      
      // 프롬프트 템플릿 로드
      const promptTemplate = await this.loadPromptTemplate();
      
      // 이미지 파일 읽기
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(filePath);

      console.log('📷 이미지 정보:', { mimeType, size: imageBuffer.length, width: imageWidth, height: imageHeight });

      // 프롬프트 생성 (이미지 크기 정보 포함)
      const prompt = promptTemplate
        .replace('{USER_INTENT}', userIntent)
        .replace('{IMAGE_WIDTH}', imageWidth.toString())
        .replace('{IMAGE_HEIGHT}', imageHeight.toString());

      // Gemini 2.5 API 호출 (이미지 포함)
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

      const text = response.text;

      if (!text) {
        throw new Error('AI로부터 응답을 받지 못했습니다');
      }

      console.log('✅ AI 분석 완료, 결과 길이:', text.length);

      return text;
    } catch (error) {
      console.error('❌ AI 분석 오류:', error);
      console.error('오류 상세:', error.message);
      if (error.response) {
        console.error('API 응답 오류:', JSON.stringify(error.response, null, 2));
      }
      throw new Error(`AI 분석 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  private async loadPromptTemplate(): Promise<string> {
    const promptPath = path.join(process.cwd(), 'prompts', 'ux-analysis.txt');
    return await fs.readFile(promptPath, 'utf-8');
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/png';
  }
}
