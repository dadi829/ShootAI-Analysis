import { useState, useEffect } from 'react';
import { Layout, Button, message, Upload, ConfigProvider, theme, Radio, Progress, List, Card } from 'antd';
import { CameraOutlined, UploadOutlined, BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import './App.css';

const { Header, Content, Footer } = Layout;

const galaxyTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#6366f1',
    colorBgContainer: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    colorBorder: 'rgba(148, 163, 184, 0.2)',
    colorText: '#f8fafc',
    colorTextSecondary: '#cbd5e1',
  },
};

const API_URL = 'http://192.168.31.175:3003';

function AppContent() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [actionType, setActionType] = useState<'upload' | 'analyze'>('upload');
  const [aiModel, setAiModel] = useState('mock');
  
  // 历史截图列表
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 页面加载时获取历史截图
  useEffect(() => {
    loadScreenshots();
  }, []);

  const loadScreenshots = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_URL}/api/screenshots`);
      const data = await response.json();
      if (data.success) {
        setScreenshots(data.screenshots);
      }
    } catch (error) {
      console.error('获取截图列表失败:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScreenshotUrl(null);
    setAnalysisResult(null);
    setAnalysisProgress(0);
    return false;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      message.warning('请先选择一张图片!');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('screenshot', selectedFile);

    try {
      const response = await fetch(`${API_URL}/api/screenshot`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setScreenshotUrl(data.url);
        message.success('截图已同步到网站!');
        // 刷新历史列表
        loadScreenshots();
      } else {
        message.error(data.error || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败，请检查服务器是否启动');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      message.warning('请先选择一张图片!');
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress(10);
    const formData = new FormData();
    formData.append('screenshot', selectedFile);
    formData.append('model', aiModel);

    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setAnalysisProgress(90);

      const data = await response.json();

      if (data.success) {
        setScreenshotUrl(data.url);
        setAnalysisResult(data.analysis);
        setAnalysisProgress(100);
        message.success('AI分析完成!');
        // 刷新历史列表
        loadScreenshots();
      } else {
        message.error(data.error || '分析失败');
      }
    } catch (error) {
      console.error('分析失败:', error);
      message.error('分析失败，请检查服务器是否启动');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setScreenshotUrl(null);
    setAnalysisResult(null);
    setAnalysisProgress(0);
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <span className="logo-icon">🎯</span>
            <h1 className="header-title">截图同步与AI分析系统</h1>
          </div>
        </div>
      </Header>

      <Content className="app-content">
        <div className="screenshot-container">
          <div className="action-selector">
            <Radio.Group 
              value={actionType} 
              onChange={(e) => setActionType(e.target.value)}
              className="action-radio-group"
            >
              <Radio.Button value="upload">
                <UploadOutlined /> 仅同步截图
              </Radio.Button>
              <Radio.Button value="analyze">
                <BarChartOutlined /> 同步并AI分析
              </Radio.Button>
            </Radio.Group>

            {actionType === 'analyze' && (
              <div className="model-selector">
                <span>AI模型：</span>
                <Radio.Group 
                  value={aiModel} 
                  onChange={(e) => setAiModel(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="mock">模拟数据</Radio.Button>
                  <Radio.Button value="openai">OpenAI GPT-4V</Radio.Button>
                </Radio.Group>
              </div>
            )}
          </div>

          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={handleFileSelect}
            className="upload-area"
          >
            <div className="upload-placeholder">
              {previewUrl ? (
                <img src={previewUrl} alt="预览" className="preview-image" />
              ) : (
                <>
                  <CameraOutlined className="upload-icon" />
                  <p className="upload-text">点击选择截图</p>
                  <p className="upload-hint">支持 PNG, JPG, JPEG, WEBP 格式</p>
                </>
              )}
            </div>
          </Upload>

          <div className="action-buttons">
            <Button
              type="primary"
              size="large"
              icon={uploading || analyzing ? undefined : actionType === 'upload' ? <UploadOutlined /> : <BarChartOutlined />}
              onClick={actionType === 'upload' ? handleUpload : handleAnalyze}
              disabled={!selectedFile || uploading || analyzing}
              loading={uploading || analyzing}
              className="primary-btn"
            >
              {uploading && '同步中...'}
              {analyzing && '分析中...'}
              {!uploading && !analyzing && actionType === 'upload' && '同步到网站'}
              {!uploading && !analyzing && actionType === 'analyze' && '同步并分析'}
            </Button>

            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={loadScreenshots}
              loading={loadingHistory}
              className="secondary-btn"
            >
              刷新历史
            </Button>

            {selectedFile && (
              <Button
                size="large"
                onClick={handleClear}
                className="secondary-btn"
              >
                重新选择
              </Button>
            )}
          </div>

          {analyzing && (
            <div className="progress-container">
              <Progress 
                percent={analysisProgress} 
                status="active"
                strokeColor="#6366f1"
                style={{ marginTop: '16px' }}
              />
              <p className="progress-text">{actionType === 'analyze' ? 'AI分析中...' : '同步中...'}</p>
            </div>
          )}

          {screenshotUrl && (
            <div className="success-message">
              <p>截图已同步成功！</p>
              <a href={screenshotUrl} target="_blank" rel="noopener noreferrer">
                查看截图
              </a>
            </div>
          )}

          {analysisResult && (
            <div className="analysis-result">
              <h3 className="analysis-title">AI分析结果</h3>
              <pre className="analysis-content">{analysisResult}</pre>
            </div>
          )}

          {/* 历史截图列表 */}
          {screenshots.length > 0 && (
            <div className="history-section">
              <h3 className="history-title">📷 历史截图</h3>
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3 }}
                dataSource={screenshots}
                loading={loadingHistory}
                renderItem={(item) => (
                  <List.Item>
                    <Card 
                      hoverable
                      cover={<img src={item.url} alt={item.filename} style={{ maxHeight: 200, objectFit: 'contain', padding: 16 }} />}
                      className="screenshot-card"
                    >
                      <Card.Meta title={item.filename} />
                    </Card>
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>
      </Content>

      <Footer className="app-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>✨</span>
          <span>截图同步与AI分析系统 ©{new Date().getFullYear()}</span>
          <span>✨</span>
        </div>
      </Footer>
    </Layout>
  );
}

function App() {
  return (
    <ConfigProvider theme={galaxyTheme}>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;
