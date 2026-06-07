'use client';
import React, { useState } from 'react';

export default function TiltWrapper({
  children,
  scaleOnHover = 1.015,
  rotateAmplitude = 0,
  style,
  className,
}: {
  children: React.ReactNode;
  scaleOnHover?: number;
  rotateAmplitude?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`tilt-wrapper-simple ${className || ''} ${isHovered ? 'is-hovered' : ''}`}
      style={{
        ...style
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}
