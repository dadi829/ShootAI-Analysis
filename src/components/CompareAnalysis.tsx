import { Modal, Card, Table, Row, Col, Statistic, Space } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { HistoryRecord } from '../types';
import dayjs from 'dayjs';

interface CompareAnalysisProps {
  visible: boolean;
  records: HistoryRecord[];
  onClose: () => void;
}

export default function CompareAnalysis({ visible, records, onClose }: CompareAnalysisProps) {
  if (!records || records.length === 0) {
    return null;
  }

  const statisticsColumns = [
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric',
      width: 150,
    },
    ...records.map((record, index) => ({
      title: dayjs(record.timestamp).format('MM-DD HH:mm'),
      dataIndex: `value${index}`,
      key: `value${index}`,
      width: 150,
    })),
  ];

  const statisticsData = [
    {
      metric: '总分',
      ...records.reduce((acc, record, index) => ({
        ...acc,
        [`value${index}`]: record.analysisResult.statistics.totalScore,
      }), {}),
    },
    {
      metric: '平均分',
      ...records.reduce((acc, record, index) => ({
        ...acc,
        [`value${index}`]: record.analysisResult.statistics.averageScore.toFixed(2),
      }), {}),
    },
    {
      metric: '最高分',
      ...records.reduce((acc, record, index) => ({
        ...acc,
        [`value${index}`]: record.analysisResult.statistics.highestScore,
      }), {}),
    },
    {
      metric: '最低分',
      ...records.reduce((acc, record, index) => ({
        ...acc,
        [`value${index}`]: record.analysisResult.statistics.lowestScore,
      }), {}),
    },
    {
      metric: '射击次数',
      ...records.reduce((acc, record, index) => ({
        ...acc,
        [`value${index}`]: record.analysisResult.statistics.totalShots,
      }), {}),
    },
    {
      metric: '平均间隔',
      ...records.reduce((acc, record, index) => ({
        ...acc,
        [`value${index}`]: record.analysisResult.statistics.averageInterval.toFixed(2),
      }), {}),
    },
  ];

  const scoresChartOption = {
    title: {
      text: '总分对比',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: records.map((_, i) => `第${i + 1}次`),
      bottom: 10,
    },
    xAxis: {
      type: 'category',
      data: records.map((_, i) => `第${i + 1}次`),
    },
    yAxis: {
      type: 'value',
      name: '分数',
    },
    series: [
      {
        name: '总分',
        type: 'bar',
        data: records.map(record => record.analysisResult.statistics.totalScore),
        itemStyle: {
          color: '#1890ff',
        },
      },
    ],
  };

  const averageScoresChartOption = {
    title: {
      text: '平均分对比',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: records.map((_, i) => `第${i + 1}次`),
      bottom: 10,
    },
    xAxis: {
      type: 'category',
      data: records.map((_, i) => `第${i + 1}次`),
    },
    yAxis: {
      type: 'value',
      name: '分数',
    },
    series: [
      {
        name: '平均分',
        type: 'line',
        data: records.map(record => record.analysisResult.statistics.averageScore),
        itemStyle: {
          color: '#52c41a',
        },
      },
    ],
  };

  const trendChartOption = {
    title: {
      text: '各次射击分数趋势对比',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: records.map((_, i) => `第${i + 1}次`),
      bottom: 10,
    },
    xAxis: {
      type: 'category',
      data: records[0].analysisResult.rawData.map((_, i) => `第${i + 1}发`),
    },
    yAxis: {
      type: 'value',
      name: '分数',
      min: 0,
      max: 11,
    },
    series: records.map((record, index) => ({
      name: `第${index + 1}次`,
      type: 'line',
      data: record.analysisResult.rawData.map(d => d.score),
      smooth: true,
    })),
  };

  return (
    <Modal
      title={<BarChartOutlined className="mr-2" />}
      open={visible}
      onCancel={onClose}
      width={1400}
      footer={null}
    >
      <div className="space-y-4">
        <Card title="快速对比">
          <Row gutter={[16, 16]}>
            {records.map((record, index) => (
              <Col key={record.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  size="small"
                  title={dayjs(record.timestamp).format('MM-DD HH:mm')}
                  className="text-center"
                >
                  <Space direction="vertical" className="w-full">
                    <Statistic
                      title="总分"
                      value={record.analysisResult.statistics.totalScore}
                      valueStyle={{ color: '#1890ff' }}
                    />
                    <Statistic
                      title="平均分"
                      value={record.analysisResult.statistics.averageScore}
                      precision={2}
                      valueStyle={{ color: '#52c41a' }}
                    />
                    <Statistic
                      title="趋势"
                      value={record.analysisResult.trend.isImproving ? '提升' : '稳定'}
                      valueStyle={{ 
                        color: record.analysisResult.trend.isImproving ? '#52c41a' : '#faad14' 
                      }}
                    />
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        <Card title="详细指标对比">
          <Table
            columns={statisticsColumns}
            dataSource={statisticsData}
            pagination={false}
            size="small"
          />
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="总分对比">
              <ReactECharts option={scoresChartOption} style={{ height: 300 }} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="平均分对比">
              <ReactECharts option={averageScoresChartOption} style={{ height: 300 }} />
            </Card>
          </Col>
        </Row>

        <Card title="各次射击分数趋势">
          <ReactECharts option={trendChartOption} style={{ height: 400 }} />
        </Card>
      </div>
    </Modal>
  );
}
