import { backendApiService, Model } from './backendApiService';

export class AIService {
  private currentModel: string = 'mock';
  private models: Model[] = [
    { id: 'mock', name: '模拟数据', available: true }
  ];

  async init(): Promise<void> {
    try {
      const result = await backendApiService.getModels();
      this.models = result.models;
    } catch (error) {
      console.warn('获取模型列表失败，使用默认模型');
    }
  }

  getModels(): Model[] {
    return this.models;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setModel(modelId: string): void {
    if (this.models.find(m => m.id === modelId)) {
      this.currentModel = modelId;
    }
  }

  async analyzeImage(
    imageFile: File,
    onProgress?: (progress: number) => void,
    onContent?: (content: string) => void
  ): Promise<string> {
    return await backendApiService.analyzeImage(imageFile, this.currentModel, onProgress, onContent);
  }
}

export const aiService = new AIService();