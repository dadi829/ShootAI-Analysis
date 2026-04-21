import { useState, useRef, useEffect } from 'react';
import { Layout, Button, message, Row, Col, Tabs, Progress, Alert, ConfigProvider, theme, App as AntApp } from 'antd';
import { UploadOutlined, SaveOutlined, HistoryOutlined } from '@ant-design/icons';
import ImageUploader from './components/ImageUploader';
import AnalysisResults from './components/AnalysisResults';
import SettingsPanel from './components/SettingsPanel';
import HistoryList from './components/HistoryList';
import HistoryDetail from './components/HistoryDetail';
import CompareAnalysis from './components/CompareAnalysis';
import SaveRecordModal from './components/SaveRecordModal';
import GalaxyBackground from './components/GalaxyBackground';
import CurveLoader from './components/CurveLoader';
import { HistoryRecord, AnalysisResult } from './types';
import { aiService } from './services/aiService';
import { MarkdownParser } from './services/markdownParser';
import './App.css';

const { Header, Content, Footer } = Layout;

// 自定义Ant Design主题
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
  components: {
    Card: {
      headerBg: 'rgba(30, 41, 59, 0.6)',
    },
    Button: {
      borderRadius: 12,
      borderRadiusLG: 16,
    },
  },
};

// 图片压缩函数
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (file.size <= 2 * 1024 * 1024) { // 小于2MB直接返回
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDimension = 1920;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('压缩失败'));
              }
            },
            file.type === 'image/jpeg' || file.type === 'image/jpg' ? 'image/jpeg' : 'image/png',
            0.85
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
  });
};

function AppContent() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisContent, setAnalysisContent] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [historyDetailVisible, setHistoryDetailVisible] = useState(false);
  const [compareVisible, setCompareVisible] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<HistoryRecord | null>(null);
  const [selectedCompareRecords, setSelectedCompareRecords] = useState<HistoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>('analyze');
  const historyListRef = useRef<{ loadData: () => void }>(null);

  const handleAnalyze = async () => {
    if (!selectedFile) {
      message.warning('请先选择一张图片!');
      return;
    }

    setLoading(true);
    setProgress(5);
    setAnalysisContent('');
    setAnalysisResult(null);
    setError(null);

    try {
      const compressedFile = await compressImage(selectedFile);
      
      const result = await aiService.analyzeImage(
        compressedFile,
        (p) => {
          setProgress(Math.round(p * 100));
        }
      );

      setAnalysisContent(result);
      const parsedResult = MarkdownParser.parse(result);
      setAnalysisResult(parsedResult);
    } catch (error) {
      console.error('分析失败:', error);
      const errorMessage = error instanceof Error ? error.message : '分析失败，请重试';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setAnalysisContent('');
    setAnalysisResult(null);
    setImageUrl(undefined);
    setError(null);
    setLoading(false);
    setProgress(0);
  };

  const resetAnalysisState = () => {
    setAnalysisContent('');
    setAnalysisResult(null);
    setError(null);
  };

  const handleSaveClick = () => {
    if (!analysisContent || !analysisResult) return;
    setSaveModalVisible(true);
  };

  const handleSaveComplete = () => {
    message.success('保存成功!');
    if (historyListRef.current) {
      historyListRef.current.loadData();
    }
  };

  const handleViewHistory = (record: HistoryRecord) => {
    setSelectedHistoryRecord(record);
    setHistoryDetailVisible(true);
  };

  const handleCompareRecords = (records: HistoryRecord[]) => {
    setSelectedCompareRecords(records);
    setCompareVisible(true);
  };

  const tabItems = [
    {
      key: 'analyze',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <UploadOutlined />
          智能分析
        </span>
      ),
    },
    {
      key: 'history',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <HistoryOutlined />
          历史记录
        </span>
      ),
    },
  ];

  const analysisContentComponent = (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={10}>
        <SettingsPanel onModelChange={resetAnalysisState} />
        <ImageUploader
          selectedFile={selectedFile}
          onImageSelected={setSelectedFile}
          onImageCleared={handleClear}
        />
        <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <CurveLoader text="AI分析中" />
              <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>
                  处理进度: {progress}%
                </div>
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <Alert
              message="分析失败"
              description={error}
              type="error"
              showIcon
              action={
                <Button 
                  size="small" 
                  danger 
                  onClick={handleAnalyze}
                  style={{ borderRadius: '8px' }}
                >
                  重试
                </Button>
              }
              style={{ 
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            />
          )}
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              type="primary"
              size="large"
              icon={loading ? undefined : <UploadOutlined />}
              onClick={handleAnalyze}
              disabled={!selectedFile || loading}
              style={{ 
                flex: 1, 
                minWidth: '140px',
                height: '48px',
                fontSize: '15px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              className="galaxy-btn-primary"
            >
              {loading ? '分析中...' : '开始AI分析'}
            </Button>
            
            {analysisContent && (
              <>
                <Button
                  size="large"
                  icon={<SaveOutlined />}
                  onClick={handleSaveClick}
                  style={{ 
                    height: '48px',
                    fontSize: '15px',
                    fontWeight: 500,
                    background: 'rgba(51, 65, 85, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    color: '#f8fafc'
                  }}
                >
                  保存记录
                </Button>
                
                <Button
                  size="large"
                  onClick={handleClear}
                  style={{ 
                    height: '48px',
                    fontSize: '15px',
                    fontWeight: 500,
                    background: 'rgba(51, 65, 85, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    color: '#f8fafc'
                  }}
                >
                  重新上传
                </Button>
              </>
            )}
          </div>
        </div>
      </Col>

      <Col xs={24} lg={14}>
        <AnalysisResults content={analysisContent} isLoading={loading} />
      </Col>
    </Row>
  );

  return (
    <>
      <GalaxyBackground />
      <Layout className="app-layout">
        <Header className="app-header">
          <div className="header-content">
            <div className="header-logo">
              <span className="logo-icon">🎯</span>
              <h1 className="header-title">气步枪打靶数据分析系统</h1>
            </div>
          </div>
        </Header>

        <Content className="app-content">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            items={tabItems}
            className="custom-tabs"
            style={{ marginBottom: '32px' }}
            tabBarStyle={{
              background: 'rgba(30, 41, 59, 0.6)',
              padding: '8px',
              borderRadius: '16px',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              backdropFilter: 'blur(20px)',
            }}
          />

          <div className="fade-in">
            {activeTab === 'analyze' && analysisContentComponent}
            {activeTab === 'history' && (
              <HistoryList
                ref={historyListRef}
                onViewRecord={handleViewHistory}
                onCompareRecords={handleCompareRecords}
              />
            )}
          </div>
        </Content>

        <Footer className="app-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>✨</span>
            <span>气步枪打靶数据分析系统 ©{new Date().getFullYear()}</span>
            <span>✨</span>
          </div>
        </Footer>

        <SaveRecordModal
          visible={saveModalVisible}
          analysisResult={analysisResult}
          imageUrl={imageUrl}
          onClose={() => setSaveModalVisible(false)}
          onSave={handleSaveComplete}
        />

        {selectedHistoryRecord && (
          <HistoryDetail
            visible={historyDetailVisible}
            record={selectedHistoryRecord}
            onClose={() => setHistoryDetailVisible(false)}
          />
        )}

        {selectedCompareRecords.length > 0 && (
          <CompareAnalysis
            visible={compareVisible}
            records={selectedCompareRecords}
            onClose={() => setCompareVisible(false)}
          />
        )}
      </Layout>
    </>
  );
}

function App() {
  return (
    <ConfigProvider theme={galaxyTheme}>
      <AntApp>
        <AppContent />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;