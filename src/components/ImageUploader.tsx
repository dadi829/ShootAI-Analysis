import { Upload, Button, Card } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useState } from 'react';
import styled from 'styled-components';

const UploadIconWrapper = styled.div`
  font-size: 56px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(124, 58, 237, 0.15) 100%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  transition: all 0.3s ease;
`;

const UploadText = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #cbd5e1;
  margin-bottom: 8px;
`;

const UploadHint = styled.div`
  font-size: 13px;
  color: #94a3b8;
`;

const ImagePreview = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
`;

const PreviewImage = styled.img`
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  background: rgba(15, 23, 42, 0.5);
`;

const DeleteButton = styled(Button)`
  position: absolute !important;
  top: -12px !important;
  right: -12px !important;
  width: 40px !important;
  height: 40px !important;
  border-radius: 50% !important;
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4) !important;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  border: none !important;
  z-index: 10;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
  
  &:hover {
    transform: scale(1.1) rotate(90deg) !important;
    box-shadow: 0 10px 25px rgba(239, 68, 68, 0.5) !important;
  }
`;

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  onImageCleared: () => void;
  selectedFile: File | null;
}

export default function ImageUploader({ 
  onImageSelected, 
  onImageCleared, 
  selectedFile 
}: ImageUploaderProps) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);

  const props: UploadProps = {
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        return false;
      }
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      onImageSelected(file);
      return false;
    },
    fileList: selectedFile ? [{
      uid: '-1',
      name: selectedFile.name,
      status: 'done',
      url: imageUrl,
    }] : [],
    onRemove: () => {
      setImageUrl(undefined);
      onImageCleared();
    },
    accept: 'image/png,image/jpeg,image/jpg',
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <Card 
      title={
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          fontSize: '16px',
          fontWeight: 600
        }}>
          <span style={{ fontSize: '20px' }}>📷</span>
          上传射击训练截图
        </span>
      }
      className="galaxy-card"
      style={{ 
        borderRadius: '20px',
        border: '1px solid rgba(148, 163, 184, 0.15)',
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          minHeight: '200px'
        }}
      >
        {imageUrl ? (
          <ImagePreview style={{ width: '100%' }}>
            <PreviewImage
              src={imageUrl}
              alt="预览"
            />
            <DeleteButton
              type="primary"
              danger
              icon={<DeleteOutlined style={{ fontSize: '18px' }} />}
              onClick={() => {
                setImageUrl(undefined);
                onImageCleared();
              }}
            />
          </ImagePreview>
        ) : (
          <Upload 
            {...props} 
            showUploadList={false}
            className="w-full"
            style={{ width: '100%' }}
          >
            <div 
              className={`upload-zone ${isDragging ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                padding: '48px 32px',
                textAlign: 'center',
              }}
            >
              <UploadIconWrapper style={{
                background: isDragging 
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(124, 58, 237, 0.25) 100%)'
                  : undefined
              }}>
                <UploadOutlined style={{ 
                  fontSize: '44px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }} />
              </UploadIconWrapper>
              <UploadText>
                {isDragging ? '松开鼠标上传图片' : '点击或拖拽图片到此区域'}
              </UploadText>
              <UploadHint>
                支持 PNG、JPG、JPEG 格式，大小不超过 10MB
              </UploadHint>
            </div>
          </Upload>
        )}
      </div>
    </Card>
  );
}
