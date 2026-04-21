import { useState } from 'react';
import { Modal, Form, Input, Select, Button, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { AnalysisResult } from '../types';
import { historyService } from '../services/historyService';
import styled from 'styled-components';

const { TextArea } = Input;
const { Option } = Select;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    background: rgba(30, 41, 59, 0.95) !important;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(148, 163, 184, 0.15) !important;
    border-radius: 20px !important;
    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5) !important;
  }

  .ant-modal-header {
    background: rgba(15, 23, 42, 0.4) !important;
    border-bottom: 1px solid rgba(148, 163, 184, 0.15) !important;
    border-radius: 20px 20px 0 0 !important;
  }

  .ant-modal-title {
    color: #f8fafc !important;
    font-weight: 600 !important;
  }

  .ant-modal-close-x {
    color: #94a3b8 !important;
  }
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  border-radius: 12px !important;
  height: 44px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
  transition: all 0.3s ease !important;
  
  &:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5) !important;
  }
`;

const CancelButton = styled(Button)`
  border-radius: 12px !important;
  height: 44px !important;
  font-weight: 500 !important;
  background: rgba(51, 65, 85, 0.8) !important;
  border: 1px solid rgba(148, 163, 184, 0.2) !important;
  color: #cbd5e1 !important;
  transition: all 0.3s ease !important;
  
  &:hover {
    border-color: rgba(99, 102, 241, 0.5) !important;
    background: rgba(99, 102, 241, 0.2) !important;
    color: #a5b4fc !important;
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: #cbd5e1 !important;
    font-weight: 500;
  }

  .ant-input, .ant-select-selector {
    background: rgba(15, 23, 42, 0.6) !important;
    border: 1px solid rgba(148, 163, 184, 0.2) !important;
    color: #f8fafc !important;
    border-radius: 10px !important;
  }

  .ant-input:focus, .ant-select-focused .ant-select-selector {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
  }

  .ant-select-arrow {
    color: #94a3b8 !important;
  }

  .ant-select-dropdown {
    background: rgba(30, 41, 59, 0.95) !important;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(148, 163, 184, 0.15) !important;
    border-radius: 12px !important;
  }

  .ant-select-item-option-selected {
    background: rgba(99, 102, 241, 0.2) !important;
  }
`;

interface SaveRecordModalProps {
  visible: boolean;
  analysisResult: AnalysisResult | null;
  imageUrl?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function SaveRecordModal({
  visible,
  analysisResult,
  imageUrl,
  onClose,
  onSave
}: SaveRecordModalProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [allTags, setAllTags] = useState<string[]>(historyService.getAllTags());

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (!analysisResult) return;

      setSaving(true);
      
      historyService.saveRecord(
        analysisResult,
        imageUrl,
        values.notes,
        values.trainingType,
        values.environment,
        values.tags
      );

      setAllTags(historyService.getAllTags());
      onSave();
      onClose();
      form.resetFields();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const tagOptions = allTags.map(tag => ({ value: tag, label: tag }));

  return (
    <StyledModal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SaveOutlined style={{ fontSize: '18px' }} />
          保存分析结果
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={520}
    >
      <StyledForm
        form={form}
        layout="vertical"
        initialValues={{
          tags: [],
        }}
      >
        <Form.Item
          name="trainingType"
          label="训练类型"
        >
          <Select
            mode="tags"
            placeholder="选择或输入训练类型"
            options={tagOptions}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="environment"
          label="环境信息"
        >
          <Input 
            placeholder="例如：室内/室外/比赛/训练" 
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="tags"
          label="标签"
        >
          <Select
            mode="tags"
            placeholder="添加标签"
            options={tagOptions}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="备注"
        >
          <TextArea
            rows={4}
            placeholder="添加备注信息"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space size="middle" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <CancelButton onClick={onClose}>
              取消
            </CancelButton>
            <SaveButton
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              保存
            </SaveButton>
          </Space>
        </Form.Item>
      </StyledForm>
    </StyledModal>
  );
}
