import { Card, Row, Col } from 'antd';
import ReactECharts from 'echarts-for-react';
import { AnalysisResult } from '../types';

interface ChartsProps {
  result: AnalysisResult;
}

export default function Charts({ result }: ChartsProps) {
  const { rawData } = result;

  const scoreOption = {
    title: {
      text: '分数变化趋势',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: rawData.map(d => `第${d.serialNumber}发`),
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 10.9,
    },
    series: [
      {
        name: '分数',
        type: 'line',
        data: rawData.map(d => d.score),
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#1890ff',
        },
        itemStyle: {
          color: '#1890ff',
        },
        areaStyle: {
          color: 'rgba(24, 144, 255, 0.1)',
        },
        markLine: {
          data: [
            { type: 'average', name: '平均值' },
          ],
        },
      },
    ],
  };

  const intervalOption = {
    title: {
      text: '射击间隔变化',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: rawData.map(d => `第${d.serialNumber}发`),
    },
    yAxis: {
      type: 'value',
      name: '秒',
    },
    series: [
      {
        name: '间隔',
        type: 'bar',
        data: rawData.map(d => d.interval),
        itemStyle: {
          color: '#52c41a',
        },
      },
    ],
  };

  const scoreDistributionOption = {
    title: {
      text: '分数分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
    },
    xAxis: {
      type: 'category',
      data: ['0-3', '4-5', '6-7', '8-9', '10'],
    },
    yAxis: {
      type: 'value',
      name: '次数',
    },
    series: [
      {
        name: '次数',
        type: 'bar',
        data: calculateScoreDistribution(rawData),
        itemStyle: {
          color: (params: any) => {
            const colors = ['#ff4d4f', '#faad14', '#1890ff', '#52c41a', '#fadb14'];
            return colors[params.dataIndex];
          },
        },
      },
    ],
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card className="mb-4">
            <ReactECharts option={scoreOption} style={{ height: '300px' }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="mb-4">
            <ReactECharts option={intervalOption} style={{ height: '300px' }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card className="mb-4">
            <ReactECharts option={scoreDistributionOption} style={{ height: '300px' }} />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function calculateScoreDistribution(data: any[]) {
  const distribution = [0, 0, 0, 0, 0];
  data.forEach(d => {
    if (d.score <= 3) distribution[0]++;
    else if (d.score <= 5) distribution[1]++;
    else if (d.score <= 7) distribution[2]++;
    else if (d.score <= 9) distribution[3]++;
    else distribution[4]++;
  });
  return distribution;
}
