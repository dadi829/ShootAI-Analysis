import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, List, Image, Button, Pagination, Modal, message, Typography, Spin, Empty } from 'antd';
import { DeleteOutlined, PictureOutlined, HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './App.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const BACKEND_URL = 'http://localhost:3002';

interface Record {
  id: string;
  filename: string;
  originalFilename: string;
  uploadedAt: string;
  url: string;
}

const Dashboard: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/records?pageSize=10`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // 每 5 秒刷新一次
    const interval = setInterval(fetchRecords, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>📱 最新上传</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchRecords} loading={loading}>刷新</Button>
      </div>
      
      <Spin spinning={loading}>
        {records.length === 0 ? (
          <Empty description="暂无上传记录，等待 Android 端上传..." />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={records}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  cover={<Image src={`${BACKEND_URL}${item.url}`} alt="截图" preview={false} onClick={() => setPreviewImage(`${BACKEND_URL}${item.url}`)} style={{ cursor: 'pointer', height: 200, objectFit: 'cover' }} />}
                  actions={[
                    <Button type="link" size="small" onClick={() => setPreviewImage(`${BACKEND_URL}${item.url}`)}>查看大图</Button>
                  ]}
                >
                  <Card.Meta
                    title={<Text type="secondary" ellipsis>{item.filename}</Text>}
                    description={<Text type="secondary">{dayjs(item.uploadedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>}
                  />
                </Card>
              </List.Item>
            )}
          />
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

const History: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; record: Record | null }>({ open: false, record: null });

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

  const handleDelete = async () => {
    if (!deleteConfirm.record) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/records/${deleteConfirm.record.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        message.success('删除成功');
        setDeleteConfirm({ open: false, record: null });
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
              <Button type="link" size="small" onClick={() => setPreviewImage(`${BACKEND_URL}${item.url}`)}>查看</Button>,
              <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => setDeleteConfirm({ open: true, record: item })}>删除</Button>
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

      <Modal
        title="确认删除"
        open={deleteConfirm.open}
        onOk={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, record: null })}
        okText="删除"
        okType="danger"
      >
        <p>确定要删除这条记录吗？</p>
      </Modal>
    </div>
  );
};

const App: React.FC = () => {
  const [current, setCurrent] = useState('dashboard');

  const menuItems = [
    { key: 'dashboard', icon: <PictureOutlined />, label: '首页' },
    { key: 'history', icon: <HistoryOutlined />, label: '历史记录' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0, marginRight: 32 }}>🎯 射击成绩管理</Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[current]}
          items={menuItems}
          onClick={({ key }) => setCurrent(key)}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      
      <Layout>
        <Content style={{ padding: '24px', margin: 0, minHeight: 280 }}>
          {current === 'dashboard' && <Dashboard />}
          {current === 'history' && <History />}
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
