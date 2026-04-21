import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, Table, Button, Space, Popconfirm, Input, Select, DatePicker, Row, Col, Tooltip } from 'antd';
import { HistoryOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined, BarChartOutlined } from '@ant-design/icons';
import { HistoryRecord, HistoryFilter } from '../types';
import { historyService } from '../services/historyService';
import dayjs from 'dayjs';
import styled from 'styled-components';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

const HistoryCard = styled(Card)`
  border-radius: 20px !important;
  border: 1px solid rgba(148, 163, 184, 0.15) !important;
  background: rgba(30, 41, 59, 0.7) !important;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
  transition: all 0.3s ease;

  .ant-card-head {
    border-bottom: 1px solid rgba(148, 163, 184, 0.15) !important;
    background: rgba(15, 23, 42, 0.3) !important;
  }
`;

const FilterContainer = styled.div`
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.1);
`;

const ActionButton = styled(Button)`
  border-radius: 10px !important;
  border: 1px solid rgba(148, 163, 184, 0.2) !important;
  background: rgba(51, 65, 85, 0.8) !important;
  color: #cbd5e1 !important;
  transition: all 0.3s ease !important;
  
  &:hover {
    border-color: rgba(99, 102, 241, 0.5) !important;
    background: rgba(99, 102, 241, 0.2) !important;
    color: #a5b4fc !important;
    transform: translateY(-2px);
  }
`;

const PrimaryButton = styled(Button)`
  border-radius: 10px !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
  transition: all 0.3s ease !important;
  
  &:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5) !important;
  }
`;

interface HistoryListProps {
  onViewRecord?: (record: HistoryRecord) => void;
  onCompareRecords?: (records: HistoryRecord[]) => void;
  selectedRecords?: string[];
}

const HistoryList = forwardRef<{ loadData: () => void }, HistoryListProps>(({
  onViewRecord,
  onCompareRecords,
  selectedRecords = []
}, ref) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HistoryRecord[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>({});
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allTrainingTypes, setAllTrainingTypes] = useState<string[]>([]);

  useImperativeHandle(ref, () => ({
    loadData
  }));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    const data = historyService.getAllRecords();
    const tags = historyService.getAllTags();
    const types = historyService.getAllTrainingTypes();
    
    setRecords(data.sort((a, b) => b.timestamp - a.timestamp));
    setFilteredRecords(data.sort((a, b) => b.timestamp - a.timestamp));
    setAllTags(tags);
    setAllTrainingTypes(types);
    setLoading(false);
  };

  const applyFilter = (newFilter: HistoryFilter) => {
    setFilter(newFilter);
    const filtered = historyService.filterRecords(newFilter);
    setFilteredRecords(filtered);
  };

  const handleDelete = (id: string) => {
    const success = historyService.deleteRecord(id);
    if (success) {
      setSelectedRowKeys(prev => prev.filter(key => key !== id));
      loadData();
    }
  };

  const handleView = (record: HistoryRecord) => {
    if (onViewRecord) {
      onViewRecord(record);
    }
  };

  const handleCompare = () => {
    if (onCompareRecords && selectedRowKeys.length > 0) {
      const selected = filteredRecords.filter(r => selectedRowKeys.includes(r.id));
      onCompareRecords(selected);
    }
  };

  const handleExport = (recordsToExport?: HistoryRecord[]) => {
    const data = recordsToExport || filteredRecords;
    if (data.length === 0) {
      return;
    }
    
    const filename = `射击数据分析_${dayjs().format('YYYYMMDDHHmmss')}.csv`;
    historyService.downloadCSV(filename, data);
  };

  const handleSearch = (value: string) => {
    applyFilter({ ...filter, keyword: value });
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      applyFilter({
        ...filter,
        dateRange: {
          start: dates[0].valueOf(),
          end: dates[1].valueOf()
        }
      });
    } else {
      const { dateRange, ...rest } = filter;
      applyFilter(rest);
    }
  };

  const handleTrainingTypeChange = (value: string) => {
    if (value) {
      applyFilter({ ...filter, trainingType: value });
    } else {
      const { trainingType, ...rest } = filter;
      applyFilter(rest);
    }
  };

  const handleTagChange = (values: string[]) => {
    if (values.length > 0) {
      applyFilter({ ...filter, tags: values });
    } else {
      const { tags, ...rest } = filter;
      applyFilter(rest);
    }
  };

  const handleScoreRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    const currentFilter = { ...filter };
    
    if (type === 'min') {
      currentFilter.minScore = numValue;
    } else {
      currentFilter.maxScore = numValue;
    }
    
    applyFilter(currentFilter);
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: number) => (
        <div>
          <div style={{ color: '#f8fafc', fontWeight: 600 }}>
            {dayjs(timestamp).format('YYYY-MM-DD')}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>
            {dayjs(timestamp).format('HH:mm:ss')}
          </div>
        </div>
      ),
    },
    {
      title: '训练类型',
      dataIndex: 'trainingType',
      key: 'trainingType',
      width: 140,
      render: (type: string) => (
        type ? (
          <span style={{
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#a5b4fc',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {type}
          </span>
        ) : <span style={{ color: '#64748b' }}>-</span>
      ),
    },
    {
      title: '总分',
      dataIndex: ['analysisResult', 'statistics', 'totalScore'],
      key: 'totalScore',
      width: 100,
      render: (score: number) => (
        <span style={{
          color: '#60a5fa',
          fontWeight: 700,
          fontSize: '16px'
        }}>
          {score}
        </span>
      ),
    },
    {
      title: '平均分',
      dataIndex: ['analysisResult', 'statistics', 'averageScore'],
      key: 'averageScore',
      width: 100,
      render: (score: number) => score.toFixed(2),
    },
    {
      title: '最高/最低',
      key: 'highLow',
      width: 130,
      render: (_: any, record: HistoryRecord) => (
        <div>
          <span style={{ color: '#4ade80', fontWeight: 700, marginRight: '8px' }}>
            {record.analysisResult.statistics.highestScore}
          </span>
          <span style={{ color: '#64748b' }}>/</span>
          <span style={{ color: '#f87171', fontWeight: 700, marginLeft: '8px' }}>
            {record.analysisResult.statistics.lowestScore}
          </span>
        </div>
      ),
    },
    {
      title: '射击次数',
      dataIndex: ['analysisResult', 'statistics', 'totalShots'],
      key: 'totalShots',
      width: 110,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        tags ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {tags.slice(0, 3).map(tag => (
              <span key={tag} style={{
                background: 'rgba(124, 58, 237, 0.2)',
                color: '#c4b5fd',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {tag}
              </span>
            ))}
            {tags.length > 3 && <span style={{ color: '#64748b', fontSize: '12px' }}>+{tags.length - 3}</span>}
          </div>
        ) : <span style={{ color: '#64748b' }}>-</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: HistoryRecord) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <ActionButton
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true, style: { borderRadius: '8px' } }}
            cancelButtonProps={{ style: { borderRadius: '8px' } }}
          >
            <Tooltip title="删除">
              <ActionButton
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  return (
    <HistoryCard
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 600 }}>
          <HistoryOutlined style={{ fontSize: '18px' }} />
          历史记录
        </span>
      }
      extra={
        <Space size="middle">
          <PrimaryButton
            type="primary"
            icon={<BarChartOutlined />}
            disabled={selectedRowKeys.length < 2}
            onClick={handleCompare}
            size="small"
          >
            对比分析
          </PrimaryButton>
          <ActionButton
            icon={<DownloadOutlined />}
            onClick={() => handleExport()}
            size="small"
          >
            导出数据
          </ActionButton>
          {selectedRowKeys.length > 0 && (
            <ActionButton
              icon={<DownloadOutlined />}
              onClick={() => {
                const selected = filteredRecords.filter(r => selectedRowKeys.includes(r.id));
                handleExport(selected);
              }}
              size="small"
            >
              导出选中
            </ActionButton>
          )}
        </Space>
      }
    >
      <FilterContainer>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              showTime
              onChange={handleDateRangeChange}
              placeholder={['开始日期', '结束日期']}
              size="large"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择训练类型"
              allowClear
              onChange={handleTrainingTypeChange}
              size="large"
            >
              {allTrainingTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Input
              type="number"
              placeholder="最低总分"
              onChange={(e) => handleScoreRangeChange('min', e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Input
              type="number"
              placeholder="最高总分"
              onChange={(e) => handleScoreRangeChange('max', e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="选择标签"
              allowClear
              onChange={handleTagChange}
              size="large"
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="搜索备注"
              onSearch={handleSearch}
              allowClear
              size="large"
            />
          </Col>
        </Row>
      </FilterContainer>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredRecords}
        rowSelection={rowSelection}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        scroll={{ x: 1200 }}
        style={{
          '--ant-table-row-hover-bg': 'rgba(99, 102, 241, 0.08)'
        } as React.CSSProperties}
      />
    </HistoryCard>
  );
});

HistoryList.displayName = 'HistoryList';

export default HistoryList;
