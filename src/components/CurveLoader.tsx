import React from 'react';
import styled, { keyframes } from 'styled-components';

const rotate360 = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.95); }
`;

const orbit = keyframes`
  0% { transform: rotate(0deg) translateX(30px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 48px;
`;

const GalaxySpinner = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
`;

const CentralOrb = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: ${pulse} 2s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
`;

const OrbitRing = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 60px;
  height: 60px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-right-color: #764ba2;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: ${rotate360} 2s linear infinite;
`;

const OrbitParticle = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #06b6d4 0%, #667eea 100%);
  border-radius: 50%;
  animation: ${orbit} 2s linear infinite;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.8);
`;

const OrbitParticle2 = styled(OrbitParticle)`
  animation-delay: -1s;
  background: linear-gradient(135deg, #ec4899 0%, #667eea 100%);
  box-shadow: 0 0 10px rgba(236, 72, 153, 0.8);
`;

const LoadingText = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #cbd5e1;
  text-align: center;
  animation: ${float} 3s ease-in-out infinite;
`;

const DotContainer = styled.span`
  display: inline-flex;
  gap: 4px;
  margin-left: 4px;
`;

const Dot = styled.span<{ delay: number }>`
  width: 6px;
  height: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  animation: ${pulse} 1.4s ease-in-out infinite;
  animation-delay: ${props => props.delay}s;
`;

interface CurveLoaderProps {
  text?: string;
}

export default function CurveLoader({ text = '正在分析' }: CurveLoaderProps) {
  return (
    <LoaderContainer>
      <GalaxySpinner>
        <CentralOrb />
        <OrbitRing />
        <OrbitParticle />
        <OrbitParticle2 />
      </GalaxySpinner>
      <LoadingText>
        {text}
        <DotContainer>
          <Dot delay={0} />
          <Dot delay={0.2} />
          <Dot delay={0.4} />
        </DotContainer>
      </LoadingText>
    </LoaderContainer>
  );
}
