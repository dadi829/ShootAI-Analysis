import { Card, Row, Col, Statistic } from 'antd';
import { TrophyOutlined, ArrowUpOutlined, ArrowDownOutlined, ClockCircleOutlined, BarChartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { AnalysisResult } from '../types';

interface StatisticsCardsProps {
  result: AnalysisResult;
}

export default function StatisticsCards({ result }: StatisticsCardsProps) {
  const { statistics, trend } = result;

  return (
    <Card title="📈 统计数据" className="mb-4">
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card className="shadow-sm">
            <Statistic
              title="平均分"
              value={statistics.averageScore}
              precision={2}
              prefix={<BarChartOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card className="shadow-sm">
            <Statistic
              title="最高分"
              value={statistics.highestScore}
              precision={1}
              prefix={<TrophyOutlined className="text-yellow-500" />}
              valueStyle={{ color: '#fadb14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card className="shadow-sm">
            <Statistic
              title="最低分"
              value={statistics.lowestScore}
              precision={1}
              prefix={<ArrowDownOutlined className="text-red-500" />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card className="shadow-sm">
            <Statistic
              title="总分"
              value={statistics.totalScore}
              precision={1}
              prefix={<ThunderboltOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card className="shadow-sm">
            <Statistic
              title="射击次数"
              value={statistics.totalShots}
              prefix="🎯"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card className="shadow-sm">
            <Statistic
              title="平均间隔"
              value={statistics.averageInterval}
              precision={2}
              suffix="s"
              prefix={<ClockCircleOutlined className="text-purple-500" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
      <Card className="mt-4 bg-gray-50">
        <div className="flex items-center">
          {trend.isImproving ? (
            <ArrowUpOutlined className="text-2xl text-green-500 mr-3" />
          ) : (
            <ArrowDownOutlined className="text-2xl text-red-500 mr-3" />
          )}
          <div>
            <div className="font-bold text-lg">
              趋势分析: {trend.isImproving ? '稳步提升 ✓' : '需要关注 ⚠️'}
            </div>
            <div className="text-gray-600">{trend.description}</div>
          </div>
        </div>
      </Card>
    </Card>
  );
}
