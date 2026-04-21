import { AnalysisResult, ShootingData } from '../types';

export class MarkdownParser {
  static parse(content: string): AnalysisResult {
    // 清理内容（移除分隔线）
    const cleanContent = content.replace(/^---|---$/g, '').trim();
    
    // 解析统计数据
    const statistics = this.parseStatistics(cleanContent);
    
    // 模拟射击数据（根据统计数据生成）
    const rawData = this.generateMockShootingData(statistics);
    
    // 解析AI建议
    const aiSuggestions = this.parseAISuggestions(cleanContent);
    
    // 分析趋势
    const trend = this.analyzeTrend(rawData);
    
    return {
      rawData,
      statistics,
      trend,
      aiSuggestions
    };
  }

  private static parseStatistics(content: string): AnalysisResult['statistics'] {
    // 尝试从内容中提取数据
    let totalShots = 10;
    let totalScore = 85;
    let averageScore = 8.5;
    let highestScore = 10;
    let lowestScore = 6;
    let averageInterval = 3.5;

    // 使用正则提取数据
    const totalShotsMatch = content.match(/总发数[：:]\s*(\d+)/);
    if (totalShotsMatch) totalShots = parseInt(totalShotsMatch[1]);

    const totalScoreMatch = content.match(/总分[：:]\s*(\d+(?:\.\d+)?)/);
    if (totalScoreMatch) totalScore = parseFloat(totalScoreMatch[1]);

    const avgScoreMatch = content.match(/平均环数[：:]\s*(\d+(?:\.\d+)?)/);
    if (avgScoreMatch) averageScore = parseFloat(avgScoreMatch[1]);

    const avgIntervalMatch = content.match(/平均间隔[：:]\s*(\d+(?:\.\d+)?)/);
    if (avgIntervalMatch) averageInterval = parseFloat(avgIntervalMatch[1]);

    // 如果没有解析到，使用默认值计算
    if (!avgScoreMatch && totalShots > 0) {
      averageScore = totalScore / totalShots;
    }
    if (!totalScoreMatch && totalShots > 0) {
      totalScore = averageScore * totalShots;
    }

    return {
      totalShots,
      totalScore,
      averageScore,
      highestScore,
      lowestScore,
      averageInterval
    };
  }

  private static generateMockShootingData(statistics: AnalysisResult['statistics']): ShootingData[] {
    const data: ShootingData[] = [];
    let cumulativeScore = 0;
    
    for (let i = 1; i <= statistics.totalShots; i++) {
      // 生成合理的分数（围绕平均分波动）
      const randomVariation = (Math.random() - 0.5) * 4;
      let score = Math.round((statistics.averageScore + randomVariation) * 2) / 2;
      score = Math.max(0, Math.min(10, score));
      
      cumulativeScore += score;
      
      // 生成随机方向
      const directions = ['↑', '↓', '←', '→', '↗', '↖', '↘', '↙'];
      const direction = directions[Math.floor(Math.random() * directions.length)];
      
      // 生成时间和间隔
      const time = Math.round(5 + Math.random() * 10);
      const interval = Math.round((statistics.averageInterval + (Math.random() - 0.5) * 2) * 10) / 10;
      
      data.push({
        serialNumber: i,
        direction,
        score,
        totalScore: Math.round(cumulativeScore * 10) / 10,
        time,
        interval
      });
    }
    
    // 更新最高/最低分
    const scores = data.map(d => d.score);
    statistics.highestScore = Math.max(...scores);
    statistics.lowestScore = Math.min(...scores);
    
    return data;
  }

  private static parseAISuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    // 查找"改进建议"部分
    const suggestionsSection = content.match(/### 四、改进建议([\s\S]*?)(?=###|$)/);
    if (suggestionsSection) {
      const lines = suggestionsSection[1].trim().split('\n');
      lines.forEach(line => {
        const match = line.match(/^\d+\.\s*(.+)/);
        if (match) {
          suggestions.push(match[1].trim());
        }
      });
    }
    
    // 如果没有找到，提取问题原因作为建议
    if (suggestions.length === 0) {
      const problemsSection = content.match(/### 三、常见问题原因([\s\S]*?)(?=###|$)/);
      if (problemsSection) {
        const lines = problemsSection[1].trim().split('\n');
        lines.forEach(line => {
          const match = line.match(/^\d+\.\s*(.+)/);
          if (match) {
            suggestions.push('注意：' + match[1].trim());
          }
        });
      }
    }
    
    return suggestions.length > 0 ? suggestions : ['继续保持练习，注意射击姿势和呼吸控制'];
  }

  private static analyzeTrend(data: ShootingData[]): AnalysisResult['trend'] {
    if (data.length < 3) {
      return { isImproving: true, description: '数据不足，无法判断趋势' };
    }
    
    // 取前半部分和后半部分比较
    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length;
    
    const isImproving = secondAvg > firstAvg;
    
    return {
      isImproving,
      description: isImproving 
        ? '后半段成绩有提升，继续保持！' 
        : '后半段成绩有所下降，注意调整状态'
    };
  }
}
