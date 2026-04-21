const API_BASE_URL = 'http://localhost:3002/api';

export interface Model {
  id: string;
  name: string;
  available: boolean;
}

export class BackendApiService {
  private abortController: AbortController | null = null;
  private progressInterval: NodeJS.Timeout | null = null;

  async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error('健康检查失败');
    return response.json();
  }

  async getModels(): Promise<{ models: Model[] }> {
    const response = await fetch(`${API_BASE_URL}/models`);
    if (!response.ok) throw new Error('获取模型列表失败');
    return response.json();
  }

  private startSmoothProgress(
    onProgress: (progress: number) => void,
    startProgress: number,
    targetProgress: number,
    duration: number
  ): () => void {
    const startTime = Date.now();
    const startP = startProgress;
    const endP = targetProgress;
    
    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentProgress = startP + (endP - startP) * progress;
      onProgress(currentProgress);
      
      if (progress >= 1) {
        this.stopProgress();
      }
    }, 50);
    
    return () => this.stopProgress();
  }

  private stopProgress(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  // SSE流式分析
  async analyzeImageStream(
    imageFile: File,
    modelId: string,
    onProgress?: (progress: number) => void,
    onContent?: (content: string) => void
  ): Promise<string> {
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('model', modelId);
    formData.append('stream', 'true');

    if (onProgress) {
      onProgress(0.05);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败: ${response.status}`);
      }

      // 处理SSE响应
      if (!response.body) {
        throw new Error('无法获取响应流');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let finalContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // 解析SSE数据
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice('data: '.length);
            try {
              const json = JSON.parse(data);
              
              switch (json.type) {
                case 'content':
                  finalContent += json.data;
                  if (onContent) {
                    onContent(finalContent);
                  }
                  break;
                case 'progress':
                  if (onProgress) {
                    onProgress(json.data / 100);
                  }
                  break;
                case 'done':
                  this.stopProgress();
                  if (onProgress) {
                    onProgress(1.0);
                  }
                  return json.data;
                case 'error':
                  throw new Error(json.data);
              }
            } catch (e) {
              console.error('解析SSE数据失败:', e);
            }
          }
        }
      }
      
      return finalContent;
    } catch (error) {
      this.stopProgress();
      throw error;
    }
  }

  async analyzeImage(
    imageFile: File,
    modelId: string,
    onProgress?: (progress: number) => void,
    onContent?: (content: string) => void
  ): Promise<string> {
    // 直接使用传统请求
    return this.analyzeImageLegacy(imageFile, modelId, onProgress);
  }

  // 传统分析方法（后备）
  async analyzeImageLegacy(
    imageFile: File,
    modelId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('model', modelId);
    formData.append('stream', 'false');

    if (onProgress) {
      onProgress(0.05);
      // 开始平滑进度（从5%到80%，预计8秒）
      this.startSmoothProgress(onProgress, 0.05, 0.8, 8000);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
        signal: this.abortController.signal
      });

      clearTimeout(timeoutId);
      this.stopProgress();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败: ${response.status}`);
      }

      if (onProgress) {
        onProgress(0.9);
        // 快速完成剩余进度
        await new Promise(resolve => setTimeout(resolve, 200));
        onProgress(1.0);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      clearTimeout(timeoutId);
      this.stopProgress();
      throw error;
    }
  }

  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.stopProgress();
  }
}

export const backendApiService = new BackendApiService();