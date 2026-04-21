import { Table, Card } from 'antd';
import { ShootingData } from '../types';

interface DataTableProps {
  data: ShootingData[];
}

export default function DataTable({ data }: DataTableProps) {
  const columns = [
    {
      title: '序号',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 80,
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (score: number) => (
        <span className={score >= 9 ? 'text-green-600 font-bold' : score < 6 ? 'text-red-500' : ''}>
          {score}
        </span>
      ),
    },
    {
      title: '总分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 100,
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 100,
    },
    {
      title: '间隔',
      dataIndex: 'interval',
      key: 'interval',
      width: 100,
    },
  ];

  return (
    <Card title="📊 原始数据" className="mb-4">
      <Table
        columns={columns}
        dataSource={data}
        rowKey="serialNumber"
        pagination={false}
        size="small"
      />
    </Card>
  );
}
