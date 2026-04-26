import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, List, Image, Button, Pagination, Modal, message, Typography, Spin, Empty, Tag, Row, Col, Upload, Descriptions, Progress, Collapse } from 'antd';
import { DeleteOutlined, PictureOutlined, HistoryOutlined, ReloadOutlined, RobotOutlined, UploadOutlined, CheckCircleFilled, ThunderboltOutlined, BulbOutlined, WarningOutlined, CheckOutlined, FireOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './App.css';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const BACKEND_URL = 'http://localhost:3002';

interface ShotRecord {
  id: string;
  filename: string;
  originalFilename: string;
  uploadedAt: string;
  url: string;
  analysis?: any;
  analyzedAt?: string;
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
      },
    });
  };

  const getStatusTag = (item: ShotRecord) => {
    if (item.analysis) {
      const data = item.analysis;
      const ring = data.metadata?.hit_ring;
      const score = data.overall_assessment?.comprehensive_score;
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {ring && <Tag color="blue">🎯 {ring}环</Tag>}
          {score && <Tag color="green">⭐ {score}/10</Tag>}
          {!ring && !score && <Tag color="green">🤖 已分析</Tag>}
        </div>
      );
    }
    return <Tag color="default">✅ 已接收</Tag>;
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
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      title={<Text type="secondary" ellipsis>{item.filename}</Text>}
                      description={
                        <div style={{ fontSize: '12px' }}>
                          <div>📅 {dayjs(item.uploadedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                          <div style={{ marginTop: 4 }}>{getStatusTag(item)}</div>
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

const AIAnalysisPage = () => {
  const [records, setRecords] = useState<ShotRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ShotRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<any>(null);
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

  const handleAnalyze = async () => {
    if (!selectedRecord) {
      messageApi.warning('请先选择一张图片');
      return;
    }
    setLoading(true);
    setAnalysisData(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze/trajectory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: selectedRecord.id })
      });
      const data = await res.json();
      
      if (data.success && data.analysis) {
        setAnalysisData(data.analysis);
        if (data.analysis.success === false) {
          messageApi.warning(data.analysis.error || '分析未成功');
        } else {
          messageApi.success('AI 分析完成！');
        }
      } else {
        messageApi.error(`分析失败: ${data.error || '未知'}`);
      }
    } catch (error: any) {
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
        if (data.analysis.success === false) {
          messageApi.warning(data.analysis.error || '分析未成功');
        } else {
          messageApi.success('AI 分析完成！');
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

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'green';
    if (rating >= 6) return 'blue';
    if (rating >= 4) return 'orange';
    return 'red';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'red';
    if (priority === 'medium') return 'orange';
    return 'green';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') return <FireOutlined />;
    if (priority === 'medium') return <WarningOutlined />;
    return <BulbOutlined />;
  };

  const renderAnalysis = (data: any) => {
    const overall = data.overall_assessment;
    const trajectory = data.trajectory_analysis;
    const pressure = data.trigger_pressure_analysis;
    const suggestions = data.improvement_suggestions;
    const meta = data.metadata;
    const score = overall?.comprehensive_score ?? 0;
    const controlScore = pressure?.control_score ?? 0;

    return (
      <>
        {meta && (
          <Card title="📊 射击数据" style={{ marginBottom: 16 }} size="small">
            <Row gutter={[16, 8]}>
              {meta.firearm_type && <Col span={8}>枪型: <Tag color="blue">{meta.firearm_type}</Tag></Col>}
              {meta.shot_distance && <Col span={8}>射击距离: <Tag color="blue">{meta.shot_distance}m</Tag></Col>}
              {meta.hit_ring && <Col span={8}>着弹环数: <Tag color="red" style={{ fontSize: 16 }}>{meta.hit_ring} 环</Tag></Col>}
              {meta.hit_coordinates?.horizontal !== undefined && (
                <Col span={8}>水平坐标: <Tag color="purple">{meta.hit_coordinates.horizontal}</Tag></Col>
              )}
              {meta.hit_coordinates?.vertical !== undefined && (
                <Col span={8}>垂直坐标: <Tag color="purple">{meta.hit_coordinates.vertical}</Tag></Col>
              )}
              {meta.deviation_distance && <Col span={8}>偏离靶心: <Tag color="orange">{meta.deviation_distance}mm</Tag></Col>}
            </Row>
            {data.confidence_level && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">分析置信度: </Text>
                <Progress percent={Math.round(data.confidence_level * 100)} size="small" style={{ width: 120 }} />
              </div>
            )}
          </Card>
        )}

        {overall && (
          <Card title="🎯 整体评价" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ marginRight: 24 }}>
                <Progress
                  type="circle"
                  percent={score * 10}
                  strokeColor={getRatingColor(score)}
                  format={() => `${score}/10`}
                  width={80}
                />
              </div>
              <div>
                <Paragraph strong>{overall.summary}</Paragraph>
                {overall.strengths && overall.strengths.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong>✅ 优势点:</Text>
                    {overall.strengths.map((s: string, i: number) => (
                      <Tag key={i} color="green" style={{ marginLeft: 4, marginTop: 4 }}>{s}</Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {trajectory && (
          <Card title="🔍 轨迹分析" style={{ marginBottom: 16 }}>
            <Collapse defaultActiveKey={['pre_full', 'pre_05s', 'post', 'deviation']}>
              {trajectory.pre_fire_full && (
                <Panel header={`🔴 完整瞄准轨迹 - ${trajectory.pre_fire_full.status}`} key="pre_full">
                  {trajectory.pre_fire_full.advantages?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ color: '#52c41a' }}>优势:</Text>
                      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {trajectory.pre_fire_full.advantages.map((a: string, i: number) => (
                          <li key={i}><Text type="success">{a}</Text></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {trajectory.pre_fire_full.issues?.length > 0 ? (
                    <div>
                      <Text strong style={{ color: '#ff4d4f' }}>问题:</Text>
                      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {trajectory.pre_fire_full.issues.map((issue: string, i: number) => (
                          <li key={i}><Text type="danger">{issue}</Text></li>
                        ))}
                      </ul>
                    </div>
                  ) : <Text type="secondary">无明显问题</Text>}
                </Panel>
              )}
              {trajectory.pre_fire_05s && (
                <Panel header={`🔵 击发前0.5秒 - ${trajectory.pre_fire_05s.status}`} key="pre_05s">
                  {trajectory.pre_fire_05s.advantages?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ color: '#52c41a' }}>优势:</Text>
                      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {trajectory.pre_fire_05s.advantages.map((a: string, i: number) => (
                          <li key={i}><Text type="success">{a}</Text></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {trajectory.pre_fire_05s.issues?.length > 0 ? (
                    <div>
                      <Text strong style={{ color: '#ff4d4f' }}>问题:</Text>
                      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {trajectory.pre_fire_05s.issues.map((issue: string, i: number) => (
                          <li key={i}><Text type="danger">{issue}</Text></li>
                        ))}
                      </ul>
                    </div>
                  ) : <Text type="secondary">无明显问题</Text>}
                </Panel>
              )}
              {trajectory.post_fire && (
                <Panel header={`🟢 击发后复位 - ${trajectory.post_fire.status}`} key="post">
                  {trajectory.post_fire.advantages?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ color: '#52c41a' }}>优势:</Text>
                      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {trajectory.post_fire.advantages.map((a: string, i: number) => (
                          <li key={i}><Text type="success">{a}</Text></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {trajectory.post_fire.issues?.length > 0 ? (
                    <div>
                      <Text strong style={{ color: '#ff4d4f' }}>问题:</Text>
                      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {trajectory.post_fire.issues.map((issue: string, i: number) => (
                          <li key={i}><Text type="danger">{issue}</Text></li>
                        ))}
                      </ul>
                    </div>
                  ) : <Text type="secondary">无明显问题</Text>}
                </Panel>
              )}
              {trajectory.deviation_analysis && (
                <Panel header="📍 偏差分析" key="deviation">
                  <div>
                    <Text strong>偏差方向: </Text>
                    <Tag>{trajectory.deviation_analysis.direction}</Tag>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text strong>根本原因: </Text>
                    <Text>{trajectory.deviation_analysis.root_cause}</Text>
                  </div>
                </Panel>
              )}
            </Collapse>
          </Card>
        )}

        {pressure && (
          <Card title="🎛️ 扳机压力分析" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <Tag color={getRatingColor(controlScore)} style={{ fontSize: 16, padding: '4px 16px' }}>
                控制评分: {controlScore}/10
              </Tag>
            </div>
            <Paragraph>
              <Text strong>曲线特征: </Text>{pressure.curve_features}
            </Paragraph>
            {pressure.key_issues?.length > 0 && (
              <div>
                <Text strong>关键问题:</Text>
                <ul style={{ margin: 8, paddingLeft: 20 }}>
                  {pressure.key_issues.map((issue: string, i: number) => (
                    <li key={i}><Text type="warning">{issue}</Text></li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {suggestions && suggestions.length > 0 && (
          <Card title="💪 改进建议" style={{ marginBottom: 16 }}>
            <List
              dataSource={suggestions}
              renderItem={(item: any) => (
                <List.Item style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <Tag icon={getPriorityIcon(item.priority)} color={getPriorityColor(item.priority)} style={{ fontSize: 14 }}>
                        {item.priority === 'high' ? '高优先级' : item.priority === 'medium' ? '中优先级' : '低优先级'}
                      </Tag>
                      <Text strong style={{ marginLeft: 8 }}>{item.title || item.description}</Text>
                    </div>
                    <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 4 }}>
                      <Text type="secondary">📝 练习方法: {item.practice_method}</Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        )}
      </>
    );
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
                            setAnalysisData(item.analysis || null);
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
                          {item.analysis && (
                            <div style={{
                              position: 'absolute',
                              bottom: 4,
                              right: 4,
                              background: 'rgba(82,196,26,0.9)',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 12
                            }}>
                              <CheckOutlined />
                            </div>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Spin>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleAnalyze}
                loading={loading}
                disabled={!selectedRecord}
              >
                开始 AI 分析
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

          {analysisData && (
            <Spin spinning={loading}>
              <Card title="📋 分析结果">
                {analysisData.success === false ? (
                  <div>
                    <Tag color="red">分析失败</Tag>
                    <Text type="secondary">{analysisData.error || '未知错误'}</Text>
                  </div>
                ) : (
                  <>
                    {renderAnalysis(analysisData)}
                  </>
                )}
              </Card>
            </Spin>
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
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
      },
    });
  };

  const getRingDisplay = (record: ShotRecord) => {
    if (record.analysis) {
      const data = record.analysis;
      const ring = data.metadata?.hit_ring;
      const score = data.overall_assessment?.comprehensive_score;

      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {ring && <Tag color="blue">🎯 {ring} 环</Tag>}
          {score && <Tag color="green">⭐ {score}/10</Tag>}
          {!ring && !score && <Tag color="green">🤖 已分析</Tag>}
        </div>
      );
    }
    return <Tag color="default">⏳ 未分析</Tag>;
  };

  const getAnalysisSummary = (record: ShotRecord) => {
    if (!record.analysis) return null;
    const data = record.analysis;

    if (data.overall_assessment) {
      return (
        <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          {data.overall_assessment.summary && (
            <div style={{ marginBottom: 8 }}>
              <Text strong>📝 总评: </Text>
              <Text>{data.overall_assessment.summary}</Text>
            </div>
          )}
          {data.overall_assessment.strengths?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <Text strong>✅ 优势: </Text>
              {data.overall_assessment.strengths.map((s: string, i: number) => <Tag key={i} color="green" style={{ marginLeft: 4, marginTop: 4 }}>{s}</Tag>)}
            </div>
          )}
          {data.improvement_suggestions?.[0] && (
            <div>
              <Text strong>💡 首要建议: </Text>
              <Text type="success">{data.improvement_suggestions[0].title || data.improvement_suggestions[0].description}</Text>
            </div>
          )}
        </div>
      );
    }

    return null;
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
              </Button>,
            ]}
            onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
            style={{ cursor: 'pointer' }}
          >
            <List.Item.Meta
              avatar={<Image src={`${BACKEND_URL}${item.url}`} alt="缩略图" width={80} height={60} style={{ objectFit: 'cover', borderRadius: 4 }} />}
              title={
                <div>
                  <Text>{item.filename}</Text>
                  <div style={{ marginTop: 4 }}>{getRingDisplay(item)}</div>
                </div>
              }
              description={
                <div>
                  <Text type="secondary">📅 {dayjs(item.uploadedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                  {item.analyzedAt && (
                    <Text type="secondary" style={{ marginLeft: 12 }}>🤖 {dayjs(item.analyzedAt).format('HH:mm:ss')}</Text>
                  )}
                </div>
              }
            />
            {expandedRow === item.id && getAnalysisSummary(item)}
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
