import { useState, useEffect } from 'react';
import { Modal, Card, Descriptions, Tag, Input, Select, Button, Space, message } from 'antd';
import { SaveOutlined, EditOutlined } from '@ant-design/icons';
import { HistoryRecord } from '../types';
import { historyService } from '../services/historyService';
import StatisticsCards from './StatisticsCards';
import DataTable from './DataTable';
import Charts from './Charts';
import AISuggestions from './AISuggestions';

const { TextArea } = Input;
const { Option } = Select;

interface HistoryDetailProps {
  visible: boolean;
  record: HistoryRecord | null;
  onClose: () => void;
}

export default function HistoryDetail({ visible, record, onClose }: HistoryDetailProps) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [trainingType, setTrainingType] = useState('');
  const [environment, setEnvironment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (record) {
      setNotes(record.notes || '');
      setTrainingType(record.trainingType || '');
      setEnvironment(record.environment || '');
      setTags(record.tags || []);
      setAllTags(historyService.getAllTags());
    }
  }, [record]);

  const handleSave = () => {
    if (!record) return;
    
    const updated = historyService.updateRecord(record.id, {
      notes,
      trainingType,
      environment,
      tags,
    });

    if (updated) {
      message.success('保存成功');
      setEditing(false);
    } else {
      message.error('保存失败');
    }
  };

  if (!record) return null;

  return (
    <Modal
      title="历史记录详情"
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={
        <Space>
          {editing ? (
            <>
              <Button onClick={() => setEditing(false)}>取消</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                保存
              </Button>
            </>
          ) : (
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
              编辑
            </Button>
          )}
        </Space>
      }
    >
      <div className="space-y-4">
        <Card title="基本信息">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="分析时间">
              {new Date(record.timestamp).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="训练类型">
              {editing ? (
                <Select
                  style={{ width: '100%' }}
                  value={trainingType}
                  onChange={setTrainingType}
                  allowClear
                  mode="tags"
                  options={allTags.map(tag => ({ value: tag, label: tag }))}
                />
              ) : (
                trainingType || '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="环境信息" span={2}>
              {editing ? (
                <Input
                  style={{ width: '100%' }}
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  placeholder="添加环境信息"
                />
              ) : (
                environment || '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="标签" span={2}>
              {editing ? (
                <Select
                  mode="tags"
                  style={{ width: '100%' }}
                  value={tags}
                  onChange={setTags}
                  placeholder="添加标签"
                  options={allTags.map(tag => ({ value: tag, label: tag }))}
                />
              ) : tags && tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <Tag key={tag} color="blue">{tag}</Tag>
                  ))}
                </div>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {editing ? (
                <TextArea
                  style={{ width: '100%' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="添加备注"
                />
              ) : (
                notes || '-'
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <StatisticsCards result={record.analysisResult} />
        <Charts result={record.analysisResult} />
        <DataTable data={record.analysisResult.rawData} />
        <AISuggestions result={record.analysisResult} />
      </div>
    </Modal>
  );
}
