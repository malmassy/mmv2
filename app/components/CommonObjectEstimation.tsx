'use client';

import React from 'react';
import { getPixelsPerCm, cmToPixels } from '../lib/engine/utils/screenCalibration';

type CoinType = 'penny' | 'nickel' | 'dime' | 'quarter';
type BatteryType = 'AA' | 'AAA' | 'C' | 'D';

type CommonObjectEstimationProps = {
  objectCategory: 'coin' | 'battery';
  objectType: CoinType | BatteryType;
  objectName: string;
  measurementType: 'diameter' | 'circumference' | 'area' | 'thickness' | 'mass' | 'length' | 'volume';
  measurementLabel: string;
  // Coin-specific
  coinDiameter?: number; // mm
  coinThickness?: number; // mm
  // Battery-specific
  batteryLength?: number; // mm
  batteryDiameter?: number; // mm
};

// US Coin data (must match the data in commonObjects.ts)
const COIN_COLORS: Record<CoinType, { fill: string; stroke: string }> = {
  penny: { fill: '#cd7f32', stroke: '#8b4513' }, // Copper/bronze
  nickel: { fill: '#c0c0c0', stroke: '#808080' }, // Silver
  dime: { fill: '#c0c0c0', stroke: '#808080' }, // Silver
  quarter: { fill: '#c0c0c0', stroke: '#808080' }, // Silver
};

/**
 * Common Object Estimation component that displays coins and batteries at accurate sizes
 * based on screen calibration.
 */
export default function CommonObjectEstimation({
  objectCategory,
  objectType,
  objectName,
  measurementType,
  measurementLabel,
  coinDiameter,
  coinThickness,
  batteryLength,
  batteryDiameter,
}: CommonObjectEstimationProps) {
  // Get pixels per cm (calibrated or estimated)
  const pxPerCm = getPixelsPerCm();
  
  // Determine dimensions based on object type
  let displayWidthPx: number;
  let displayHeightPx: number;
  let isSideView: boolean;
  let fillColor: string;
  let strokeColor: string;

  if (objectCategory === 'coin') {
    const coinColor = COIN_COLORS[objectType as CoinType];
    fillColor = coinColor.fill;
    strokeColor = coinColor.stroke;
    
    const coinDiameterCm = (coinDiameter || 0) / 10;
    displayWidthPx = cmToPixels(coinDiameterCm);
    isSideView = measurementType === 'thickness';
    displayHeightPx = isSideView ? cmToPixels(coinDiameterCm) * 0.1 : displayWidthPx;
  } else {
    // Battery
    fillColor = '#1a4d2e'; // Dark green
    strokeColor = '#0d2818';
    
    const batteryLengthCm = (batteryLength || 0) / 10;
    const batteryDiameterCm = (batteryDiameter || 0) / 10;
    
    isSideView = measurementType === 'diameter' || measurementType === 'circumference' || measurementType === 'area';
    
    if (isSideView) {
      // Show circular cross-section
      displayWidthPx = cmToPixels(batteryDiameterCm);
      displayHeightPx = displayWidthPx;
    } else {
      // Show side view (length)
      displayWidthPx = cmToPixels(batteryDiameterCm);
      displayHeightPx = cmToPixels(batteryLengthCm);
    }
  }

  return (
    <div>
      {/* Object display - always shown at accurate size */}
      <div
        style={{
          padding: '30px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #ccc',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          minHeight: '200px',
        }}
      >
        {objectCategory === 'coin' ? (
          isSideView ? (
            // Coin side view for thickness measurement
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: `${displayWidthPx}px`,
                  height: `${displayHeightPx}px`,
                  background: fillColor,
                  border: `2px solid ${strokeColor}`,
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                Side view (thickness)
              </div>
            </div>
          ) : (
            // Coin face view (circular coin with coin-like details)
            <svg
              width={displayWidthPx}
              height={displayWidthPx}
              viewBox={`0 0 ${displayWidthPx} ${displayWidthPx}`}
              style={{ display: 'block' }}
            >
              {/* Outer rim with reeded edge effect */}
              <defs>
                <radialGradient id={`coinGradient-${objectType}`} cx="50%" cy="50%">
                  <stop offset="0%" stopColor={fillColor} stopOpacity="1" />
                  <stop offset="70%" stopColor={fillColor} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity="0.8" />
                </radialGradient>
              </defs>
              
              {/* Main coin body */}
              <circle
                cx={displayWidthPx / 2}
                cy={displayWidthPx / 2}
                r={displayWidthPx / 2 - 1}
                fill={`url(#coinGradient-${objectType})`}
                stroke={strokeColor}
                strokeWidth="1.5"
              />
              
              {/* Reeded edge effect (small radial lines around the rim) */}
              {Array.from({ length: Math.floor(displayWidthPx * 0.5) }).map((_, i) => {
                const angle = (i / Math.floor(displayWidthPx * 0.5)) * Math.PI * 2;
                const radius = displayWidthPx / 2 - 1;
                const x1 = displayWidthPx / 2 + Math.cos(angle) * (radius - 0.3);
                const x2 = displayWidthPx / 2 + Math.cos(angle) * radius;
                const y1 = displayWidthPx / 2 + Math.sin(angle) * (radius - 0.3);
                const y2 = displayWidthPx / 2 + Math.sin(angle) * radius;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth="0.5"
                    opacity="0.6"
                  />
                );
              })}
              
              {/* Coin text/labels */}
              <text
                x={displayWidthPx / 2}
                y={displayWidthPx / 2 - (displayWidthPx * 0.15)}
                textAnchor="middle"
                fontSize={displayWidthPx * 0.12}
                fill={strokeColor}
                fontWeight="bold"
                opacity="0.8"
              >
                {objectType === 'quarter' ? 'QUARTER' : objectType === 'dime' ? 'DIME' : objectType === 'nickel' ? 'NICKEL' : 'ONE CENT'}
              </text>
              <text
                x={displayWidthPx / 2}
                y={displayWidthPx / 2 + (displayWidthPx * 0.15)}
                textAnchor="middle"
                fontSize={displayWidthPx * 0.1}
                fill={strokeColor}
                fontWeight="bold"
                opacity="0.7"
              >
                {objectType === 'quarter' ? '25¢' : objectType === 'dime' ? '10¢' : objectType === 'nickel' ? '5¢' : '1¢'}
              </text>
            </svg>
          )
        ) : (
          // Battery
          isSideView ? (
            // Battery cross-section (circular)
            <svg
              width={displayWidthPx}
              height={displayWidthPx}
              viewBox={`0 0 ${displayWidthPx} ${displayWidthPx}`}
              style={{ display: 'block' }}
            >
              <defs>
                <radialGradient id={`batteryGradient-${objectType}`} cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#2d5016" stopOpacity="1" />
                  <stop offset="100%" stopColor={fillColor} stopOpacity="0.9" />
                </radialGradient>
              </defs>
              <circle
                cx={displayWidthPx / 2}
                cy={displayWidthPx / 2}
                r={displayWidthPx / 2 - 1}
                fill={`url(#batteryGradient-${objectType})`}
                stroke={strokeColor}
                strokeWidth="1.5"
              />
              <text
                x={displayWidthPx / 2}
                y={displayWidthPx / 2}
                textAnchor="middle"
                fontSize={displayWidthPx * 0.15}
                fill="white"
                fontWeight="bold"
                opacity="0.9"
              >
                {objectType}
              </text>
            </svg>
          ) : (
            // Battery side view (cylinder)
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <svg
                width={displayWidthPx}
                height={displayHeightPx}
                viewBox={`0 0 ${displayWidthPx} ${displayHeightPx}`}
                style={{ display: 'block' }}
              >
                <defs>
                  <linearGradient id={`batteryGradient-side-${objectType}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2d5016" stopOpacity="1" />
                    <stop offset="50%" stopColor={fillColor} stopOpacity="1" />
                    <stop offset="100%" stopColor="#0d2818" stopOpacity="1" />
                  </linearGradient>
                </defs>
                {/* Battery body */}
                <rect
                  x="1"
                  y="1"
                  width={displayWidthPx - 2}
                  height={displayHeightPx - 2}
                  rx={displayWidthPx * 0.15}
                  fill={`url(#batteryGradient-side-${objectType})`}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                {/* Battery label */}
                <text
                  x={displayWidthPx / 2}
                  y={displayHeightPx / 2}
                  textAnchor="middle"
                  fontSize={Math.min(displayWidthPx * 0.3, displayHeightPx * 0.15)}
                  fill="white"
                  fontWeight="bold"
                  opacity="0.9"
                >
                  {objectType}
                </text>
              </svg>
            </div>
          )
        )}
      </div>
    </div>
  );
}
