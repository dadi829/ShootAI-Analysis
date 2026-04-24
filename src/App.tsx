import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, List, Image, Button, Pagination, Modal, message, Typography, Spin, Empty, Tag, Row, Col, Upload, Descriptions } from 'antd';
import { DeleteOutlined, PictureOutlined, HistoryOutlined, ReloadOutlined, RobotOutlined, UploadOutlined, CheckCircleFilled, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './App.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const BACKEND_URL = 'http://localhost:3002';

interface ShotRecord {
  id: string;
  filename: string;
  originalFilename: string;
  uploadedAt: string;
  url: string;
}

const LiveUploadPage = () => {
  const [records, setRecords] = useState<ShotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const fetchRecords = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/records?page=${pageNum}&pageSize=${pageSize}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setTotal(data.total);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
      message.error('获取记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (record: ShotRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      onOk: async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/records/${record.id}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            message.success('删除成功');
            fetchRecords(page);
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      }
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>📱 实时上传</Title>
        <Button icon={<ReloadOutlined />} onClick={() => fetchRecords(page)} loading={loading}>
          刷新列表
        </Button>
      </div>

      <Spin spinning={loading}>
        {records.length === 0 ? (
          <Empty description="暂无上传记录，等待 Android 端上传..." />
        ) : (
          <>
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4 }}
              dataSource={records}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    hoverable
                    cover={
                      <Image
                        src={`${BACKEND_URL}${item.url}`}
                        alt={item.filename}
                        preview={false}
                        style={{ cursor: 'pointer', height: 200, objectFit: 'cover' }}
                        onClick={() => setPreviewImage(`${BACKEND_URL}${item.url}`)}
                      />
                    }
                    actions={[
                      <Button type="link" size="small" onClick={() => setPreviewImage(`${BACKEND_URL}${item.url}`)}>
                        查看大图
                      </Button>,
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item)}>
                        删除
                      </Button>
                    ]}
                  >
                    <Card.Meta
                      title={<Text type="secondary" ellipsis>{item.filename}</Text>}
                      description={
                        <div style={{ fontSize: '12px' }}>
                          <div>📅 {dayjs(item.uploadedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                          <div>✅ 已接收</div>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
            
            {total > pageSize && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Pagination
                  current={page}
                  total={total}
                  pageSize={pageSize}
                  onChange={(p) => fetchRecords(p)}
                />
              </div>
            )}
          </>
        )}
      </Spin>

      <Modal
        open={!!previewImage}
        footer={null}
        onCancel={() => setPreviewImage(null)}
        width="80%"
      >
        {previewImage && <Image src={previewImage} alt="截图" style={{ width: '100%' }} />}
      </Modal>
    </div>
  );
};

interface AnalysisData {
  success: boolean;
  shot?: {
    ring: number;
    position: { x: number; y: number };
    trajectory: {
      red: { direction: string; stability: string; hasStraightSegment: boolean };
      blue: { length: string; hasSuddenShift: boolean; quality: string };
      green: { stable: boolean; hasJump: boolean };
    };
  };
  summary?: {
    stabilityRating: string;
    triggerControlRating: string;
    followThroughRating: string;
    mainIssue: string;
    suggestion: string;
  };
  error?: string;
  rawContent?: string;
}

const ratingColorMap: Record<string, string> = { '优': 'green', '良': 'blue', '中': 'orange', '差': 'red' };

const AIAnalysisPage = () => {
  const [records, setRecords] = useState<ShotRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ShotRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/records?page=1&pageSize=50`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleAnalyze = async () => {
    if (!selectedRecord) {
      messageApi.warning('请先选择一张图片');
      return;
    }
    setLoading(true);
    setAnalysisData(null);
    setDebugInfo('请求中...');
    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze/trajectory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: selectedRecord.id })
      });
      const data = await res.json();
      const debugStr = `status=${res.status}, success=${data.success}, hasAnalysis=${!!data.analysis}, analysisSuccess=${data.analysis?.success}, hasShot=${!!data.analysis?.shot}, hasSummary=${!!data.analysis?.summary}`;
      setDebugInfo(debugStr);
      
      if (data.success && data.analysis) {
        setAnalysisData(data.analysis);
        if (data.analysis.success) {
          messageApi.success('AI 分析完成！');
        } else {
          messageApi.warning(data.analysis.error || '分析未成功');
        }
      } else {
        messageApi.error(`分析失败: ${data.error || '未知'} | ${debugStr}`);
      }
    } catch (error: any) {
      setDebugInfo(`异常: ${error.message}`);
      messageApi.error(`连接服务器失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAnalyze = async (file: File) => {
    setLoading(true);
    setAnalysisData(null);
    setSelectedRecord(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${BACKEND_URL}/api/analyze/trajectory/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysisData(data.analysis);
        if (data.analysis.success) {
          messageApi.success('AI 分析完成！');
        } else {
          messageApi.warning(data.analysis.error || '分析未成功');
        }
      } else {
        messageApi.error(data.error || '分析失败');
      }
    } catch (error) {
      console.error('分析失败:', error);
      messageApi.error('连接服务器失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMockTest = async () => {
    setLoading(true);
    setAnalysisData(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAnalysisData({
        success: true,
        shot: {
          ring: 9,
          position: { x: 48, y: 45 },
          trajectory: {
            red: { direction: '从下往上偏左入靶', stability: '稳定', hasStraightSegment: false },
            blue: { length: '短', hasSuddenShift: false, quality: '良好' },
            green: { stable: true, hasJump: false }
          }
        },
        summary: {
          stabilityRating: '良',
          triggerControlRating: '优',
          followThroughRating: '良',
          mainIssue: '红色段入靶方向偏左，建议调整据枪姿势',
          suggestion: '注意举枪入靶时保持自然指向，避免过度修正'
        }
      });
      messageApi.success('Mock 分析完成！');
    } catch (error) {
      console.error('Mock测试失败:', error);
      messageApi.error('Mock 分析失败！');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {contextHolder}

      <Title level={3}>🤖 AI 轨迹分析</Title>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={14}>
          <Card title="📷 选择轨迹图片" extra={<Button size="small" icon={<ReloadOutlined />} onClick={fetchRecords} loading={recordsLoading}>刷新</Button>}>
            <Spin spinning={recordsLoading}>
              {records.length === 0 ? (
                <Empty description="暂无图片，请先在「实时上传」页面上传" />
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <Row gutter={[8, 8]}>
                    {records.map((item) => (
                      <Col key={item.id} span={6}>
                        <div
                          onClick={() => {
                            setSelectedRecord(item);
                            setAnalysisData(null);
                          }}
                          style={{
                            position: 'relative',
                            cursor: 'pointer',
                            border: selectedRecord?.id === item.id ? '3px solid #1890ff' : '2px solid #d9d9d9',
                            borderRadius: 8,
                            overflow: 'hidden',
                            transition: 'border-color 0.2s'
                          }}
                        >
                          <img
                            src={`${BACKEND_URL}${item.url}`}
                            alt={item.filename}
                            style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                          />
                          {selectedRecord?.id === item.id && (
                            <CheckCircleFilled style={{ position: 'absolute', top: 4, right: 4, fontSize: 20, color: '#1890ff' }} />
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Spin>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleAnalyze}
                loading={loading}
                disabled={!selectedRecord}
              >
                开始 AI 分析
              </Button>
              <Button onClick={handleMockTest} loading={loading}>
                Mock 测试
              </Button>
              <Upload
                showUploadList={false}
                beforeUpload={(file) => { handleUploadAnalyze(file); return false; }}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} loading={loading}>本地上传分析</Button>
              </Upload>
            </div>
          </Card>
        </Col>

        <Col span={10}>
          {selectedRecord && (
            <Card title="📷 图片预览" style={{ marginBottom: 16 }}>
              <Image
                src={`${BACKEND_URL}${selectedRecord.url}`}
                alt="预览"
                style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }}
              />
            </Card>
          )}

          {debugInfo && (
            <div style={{ marginBottom: 16, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              🔍 调试信息: {debugInfo}
            </div>
          )}

          {analysisData && (
            <Card title="📋 分析结果">
              {analysisData.success ? (
                <>
                  {analysisData.shot ? (
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="命中环数">
                        <Tag color="blue" style={{ fontSize: 16, padding: '2px 12px' }}>{analysisData.shot.ring} 环</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="弹孔位置">
                        X: {analysisData.shot.position?.x}, Y: {analysisData.shot.position?.y}
                      </Descriptions.Item>
                    </Descriptions>
                  ) : null}

                  {analysisData.summary && (
                    <>
                      <div style={{ marginTop: 16 }}>
                        <Title level={5}>轨迹分析</Title>
                        <Row gutter={[8, 8]}>
                          <Col span={8}>
                            <Card size="small" style={{ textAlign: 'center', borderColor: '#ff4d4f' }}>
                              <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>🔴 稳定性</div>
                              <Tag color={ratingColorMap[analysisData.summary.stabilityRating] || 'default'} style={{ marginTop: 4 }}>
                                {analysisData.summary.stabilityRating}
                              </Tag>
                              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                {analysisData.shot?.trajectory?.red?.stability || '未检测'}
                              </div>
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card size="small" style={{ textAlign: 'center', borderColor: '#1890ff' }}>
                              <div style={{ color: '#1890ff', fontWeight: 'bold' }}>🔵 扳机控制</div>
                              <Tag color={ratingColorMap[analysisData.summary.triggerControlRating] || 'default'} style={{ marginTop: 4 }}>
                                {analysisData.summary.triggerControlRating}
                              </Tag>
                              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                {analysisData.shot?.trajectory?.blue?.quality || '未检测'}
                              </div>
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card size="small" style={{ textAlign: 'center', borderColor: '#52c41a' }}>
                              <div style={{ color: '#52c41a', fontWeight: 'bold' }}>🟢 跟进</div>
                              <Tag color={ratingColorMap[analysisData.summary.followThroughRating] || 'default'} style={{ marginTop: 4 }}>
                                {analysisData.summary.followThroughRating}
                              </Tag>
                              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                {analysisData.shot?.trajectory?.green?.stable ? '稳定' : '不稳定'}
                              </div>
                            </Card>
                          </Col>
                        </Row>
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <Title level={5}>⚠️ 主要问题</Title>
                        <Text>{analysisData.summary?.mainIssue || '无'}</Text>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <Title level={5}>💡 改进建议</Title>
                        <Text type="success">{analysisData.summary?.suggestion || '无'}</Text>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div>
                  <Tag color="red">分析失败</Tag>
                  <Text type="secondary">{analysisData.error || '未知错误'}</Text>
                  {analysisData.rawContent && (
                    <pre style={{ marginTop: 8, fontSize: 12, background: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                      {analysisData.rawContent}
                    </pre>
                  )}
                </div>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

const HistoryPage = () => {
  const [records, setRecords] = useState<ShotRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchRecords = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/records?page=${pageNum}&pageSize=10`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setTotal(data.total);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (record: ShotRecord) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/records/${record.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        message.success('删除成功');
        fetchRecords(page);
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  return (
    <div>
      <Title level={3}>📚 历史记录</Title>
      
      <List
        loading={loading}
        dataSource={records}
        locale={{ emptyText: '暂无历史记录' }}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button type="link" size="small" onClick={() => setPreviewImage(`${BACKEND_URL}${item.url}`)}>
                查看
              </Button>,
              <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(item)}>
                删除
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={<Image src={`${BACKEND_URL}${item.url}`} alt="缩略图" width={80} height={60} style={{ objectFit: 'cover', borderRadius: 4 }} />}
              title={<Text>{item.filename}</Text>}
              description={<Text type="secondary">{dayjs(item.uploadedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>}
            />
          </List.Item>
        )}
      />
      
      {total > 0 && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Pagination
            current={page}
            total={total}
            pageSize={10}
            onChange={(p) => fetchRecords(p)}
          />
        </div>
      )}

      <Modal
        open={!!previewImage}
        footer={null}
        onCancel={() => setPreviewImage(null)}
        width="80%"
      >
        {previewImage && <Image src={previewImage} alt="截图" style={{ width: '100%' }} />}
      </Modal>
    </div>
  );
};

const App: React.FC = () => {
  const [activeKey, setActiveKey] = useState('live');

  const tabItems = [
    { key: 'live', icon: <PictureOutlined />, label: '实时上传' },
    { key: 'ai', icon: <RobotOutlined />, label: 'AI分析入口' },
    { key: 'history', icon: <HistoryOutlined />, label: '历史记录' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0, marginRight: 32 }}>🎯 射击成绩管理</Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[activeKey]}
          items={tabItems}
          onClick={({ key }) => setActiveKey(key)}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>

      <Content style={{ padding: '24px', margin: 0, minHeight: 280 }}>
        {activeKey === 'live' && <LiveUploadPage />}
        {activeKey === 'ai' && <AIAnalysisPage />}
        {activeKey === 'history' && <HistoryPage />}
      </Content>
    </Layout>
  );
};

export default App;