import React from 'react';
import { Card, Typography } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';
import CurveLoader from './CurveLoader';

const { Title } = Typography;

const ResultsCard = styled(Card)`
  border-radius: 20px !important;
  border: 1px solid rgba(148, 163, 184, 0.15) !important;
  background: rgba(30, 41, 59, 0.7) !important;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 30px rgba(99, 102, 241, 0.1) !important;
  }

  .ant-card-head {
    border-bottom: 1px solid rgba(148, 163, 184, 0.15) !important;
    background: rgba(15, 23, 42, 0.3) !important;
  }

  .ant-card-head-title {
    font-weight: 600;
    font-size: 16px;
  }
`;

const ContentContainer = styled.div`
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(124, 58, 237, 0.03) 100%);
  padding: 24px;
  border-radius: 16px;
  min-height: 200px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
`;

const EmptyIcon = styled.div`
  font-size: 72px;
  margin-bottom: 20px;
  opacity: 0.8;
`;

const EmptyText = styled.div`
  font-size: 16px;
  color: #cbd5e1;
`;

const SuccessBadge = styled.span`
  float: right;
  font-size: 13px;
  font-weight: 600;
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
  padding: 6px 14px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MarkdownWrapper = styled.div`
  h3 {
    color: #6366f1 !important;
    margin-top: 28px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid rgba(99, 102, 241, 0.2);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.3px;
    
    &:first-child {
      margin-top: 0;
    }
  }
  
  ul {
    padding-left: 24px;
    margin-bottom: 16px;
  }
  
  li {
    margin-bottom: 10px;
    line-height: 1.8;
    color: #cbd5e1;
    font-size: 15px;
  }
  
  strong {
    color: #a5b4fc;
    font-weight: 700;
  }
  
  em {
    color: #6ee7b7;
    font-style: normal;
    font-weight: 600;
  }
  
  hr {
    border: none;
    border-top: 2px dashed rgba(148, 163, 184, 0.2);
    margin: 28px 0;
  }

  p {
    color: #cbd5e1;
    line-height: 1.8;
    font-size: 15px;
    margin-bottom: 16px;
  }
`;

interface AnalysisResultsProps {
  content: string;
  isLoading: boolean;
}

export default function AnalysisResults({ content, isLoading }: AnalysisResultsProps) {
  if (isLoading) {
    return (
      <ResultsCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            AI分析中
          </span>
        }
      >
        <CurveLoader text="正在分析射击数据，请稍候" />
      </ResultsCard>
    );
  }

  if (!content) {
    return (
      <ResultsCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            分析结果
          </span>
        }
      >
        <ContentContainer>
          <EmptyState>
            <EmptyIcon>🎯</EmptyIcon>
            <EmptyText>
              上传射击训练截图，点击「开始AI分析」
            </EmptyText>
          </EmptyState>
        </ContentContainer>
      </ResultsCard>
    );
  }

  return (
    <ResultsCard
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>📊</span>
          射击分析报告
          <SuccessBadge>
            <span>✅</span>
            分析完成
          </SuccessBadge>
        </span>
      }
    >
      <ContentContainer>
        <MarkdownWrapper className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </MarkdownWrapper>
      </ContentContainer>
    </ResultsCard>
  );
}
