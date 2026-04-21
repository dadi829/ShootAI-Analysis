import { Card, List, Typography } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { AnalysisResult } from '../types';

const { Title, Paragraph } = Typography;

interface AISuggestionsProps {
  result: AnalysisResult;
}

export default function AISuggestions({ result }: AISuggestionsProps) {
  return (
    <Card title="💡 AI智能建议" className="mb-4">
      <List
        itemLayout="horizontal"
        dataSource={result.aiSuggestions}
        renderItem={(suggestion, index) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <BulbOutlined className="text-blue-500" />
                </div>
              }
              title={<span className="font-medium">建议 {index + 1}</span>}
              description={<span className="text-gray-700">{suggestion}</span>}
            />
          </List.Item>
        )}
      />
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <Title level={5} className="mb-2">📝 备注</Title>
        <Paragraph className="mb-0 text-gray-600">
          以上建议由AI基于数据分析生成，仅供参考。请结合实际情况和教练指导进行训练。
        </Paragraph>
      </div>
    </Card>
  );
}
