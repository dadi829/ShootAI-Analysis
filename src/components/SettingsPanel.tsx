import { useEffect, useState } from 'react';
import { Card, Select, Button, Space, Badge, Divider, Alert } from 'antd';
import { SettingOutlined, CloudServerOutlined, ExperimentOutlined, ReloadOutlined } from '@ant-design/icons';
import { Model } from '../services/backendApiService';
import { aiService } from '../services/aiService';
import styled from 'styled-components';

const { Option } = Select;

// 使用css函数和属性传递方式，避免直接在DOM上传递自定义属性
const StatusDot = styled.div<{ $isOnline: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.$isOnline ? '#10b981' : '#ef4444'};
  box-shadow: 0 0 10px ${props => props.$isOnline ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'};
  animation: pulse 2s infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const StatusLabel = styled.span`
  font-weight: 500;
  color: #cbd5e1;
  margin-left: 8px;
`;

const ModelIcon = styled.span<{ $variant: 'mock' | 'other' }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$variant === 'mock' 
    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(249, 115, 22, 0.15) 100%)' 
    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(124, 58, 237, 0.15) 100%)'};
  margin-right: 12px;
  font-size: 16px;
`;

const ModelStatus = styled.span<{ $isAvailable: boolean }>`
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  background: ${props => props.$isAvailable 
    ? 'rgba(16, 185, 129, 0.15)' 
    : 'rgba(148, 163, 184, 0.15)'};
  color: ${props => props.$isAvailable ? '#10b981' : '#94a3b8'};
  font-weight: 600;
`;

const InfoCard = styled.div`
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
`;

const InfoIcon = styled.span`
  font-size: 18px;
  margin-right: 8px;
`;

const InfoText = styled.span`
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.6;
`;

interface SettingsPanelProps {
  onModelChange?: () => void;
}

export default function SettingsPanel({ onModelChange }: SettingsPanelProps) {
  const [models, setModels] = useState<Model[]>([
    { id: 'mock', name: '模拟数据', available: true }
  ]);
  const [currentModel, setCurrentModel] = useState('mock');
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkBackendAndLoadModels();
  }, []);

  const checkBackendAndLoadModels = async () => {
    setChecking(true);
    try {
      await aiService.init();
      setModels(aiService.getModels());
      setCurrentModel(aiService.getCurrentModel());
      setBackendAvailable(true);
    } catch (error) {
      setBackendAvailable(false);
    } finally {
      setChecking(false);
    }
  };

  const handleModelChange = (value: string) => {
    const selectedModel = models.find(m => m.id === value);
    if (selectedModel && selectedModel.available) {
      aiService.setModel(value);
      setCurrentModel(value);
      if (onModelChange) {
        onModelChange();
      }
    }
  };

  const handleRefresh = () => {
    checkBackendAndLoadModels();
  };

  return (
    <Card
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 600 }}>
          <SettingOutlined style={{ fontSize: '18px' }} />
          AI模型设置
        </span>
      }
      className="galaxy-card mb-4"
      style={{ marginBottom: '20px', borderRadius: '20px', border: '1px solid rgba(148, 163, 184, 0.15)' }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <Space size="middle">
            <CloudServerOutlined style={{ fontSize: '20px', color: '#6366f1' }} />
            <StatusDot $isOnline={backendAvailable} />
            <StatusLabel>
              {backendAvailable ? '后端已连接' : '后端未连接'}
            </StatusLabel>
          </Space>
          <Button
            icon={<ReloadOutlined spin={checking} />}
            onClick={handleRefresh}
            loading={checking}
            size="small"
            style={{
              borderRadius: '8px',
              background: 'rgba(51, 65, 85, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              color: '#f8fafc'
            }}
          >
            刷新
          </Button>
        </div>

        {!backendAvailable && (
          <Alert
            message="后端服务未运行"
            description="请确保后端API服务器已启动（运行于 http://localhost:3002）。在此期间，您可以使用模拟数据模式。"
            type="warning"
            showIcon
            style={{ borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
          />
        )}

        <Divider style={{ margin: '16px 0', borderColor: 'rgba(148, 163, 184, 0.15)' }} />

        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '14px', display: 'block', marginBottom: '12px' }}>
            选择AI模型:
          </span>
          <Select
            value={currentModel}
            onChange={handleModelChange}
            style={{ width: '100%' }}
            placeholder="请选择AI模型"
            loading={checking}
            size="large"
            styles={{
              popup: {
                root: {
                  background: 'rgba(30, 41, 59, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '8px'
                }
              }
            }}
            listItemHeight={56}
          >
            {models.map(model => (
              <Option
                key={model.id}
                value={model.id}
                disabled={!model.available}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <Space>
                    <ModelIcon $variant={model.id === 'mock' ? 'mock' : 'other'}>
                      {model.id === 'mock' ? <ExperimentOutlined /> : <CloudServerOutlined />}
                    </ModelIcon>
                    <span style={{ color: '#f8fafc', fontWeight: 500 }}>{model.name}</span>
                  </Space>
                  <ModelStatus $isAvailable={model.available}>
                    {model.available ? '可用' : '不可用'}
                  </ModelStatus>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        <InfoCard>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <InfoIcon>💡</InfoIcon>
            <InfoText>
              API密钥安全存储在后端服务器，不会暴露到前端。模拟数据模式无需API密钥，可立即使用。
            </InfoText>
          </div>
        </InfoCard>
      </Space>
    </Card>
  );
}
