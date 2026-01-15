'use client';

import React from 'react';
import { getPixelsPerCm, cmToPixels } from '../lib/engine/utils/screenCalibration';

type CoinType = 'penny' | 'nickel' | 'dime' | 'quarter';

type CoinEstimationProps = {
  coinType: CoinType;
  coinName: string;
  coinDiameter: number; // mm
  measurementType: 'diameter' | 'circumference' | 'area' | 'thickness' | 'mass';
  measurementLabel: string;
};

// US Coin data (must match the data in commonObjects.ts)
const COIN_COLORS: Record<CoinType, { fill: string; stroke: string }> = {
  penny: { fill: '#cd7f32', stroke: '#8b4513' }, // Copper/bronze
  nickel: { fill: '#c0c0c0', stroke: '#808080' }, // Silver
  dime: { fill: '#c0c0c0', stroke: '#808080' }, // Silver
  quarter: { fill: '#c0c0c0', stroke: '#808080' }, // Silver
};

/**
 * Coin Estimation component that displays coins at accurate sizes
 * based on screen calibration.
 */
export default function CoinEstimation({ coinType, coinName, coinDiameter, measurementType, measurementLabel }: CoinEstimationProps) {
  // Get pixels per cm (calibrated or estimated)
  const pxPerCm = getPixelsPerCm();
  
  // Convert diameter from mm to cm, then to pixels
  const coinDiameterCm = coinDiameter / 10;
  const coinDiameterPx = cmToPixels(coinDiameterCm);
  
  // For thickness, we'll show it as a side view (scale appropriately)
  const coinThicknessPx = measurementType === 'thickness' ? cmToPixels(coinDiameterCm) * 0.1 : coinDiameterPx;

  const coinColor = COIN_COLORS[coinType];

  // If measuring thickness, show side view; otherwise show face view
  const isSideView = measurementType === 'thickness';

  return (
    <div
      style={{
        margin: '20px 0',
        padding: '24px',
        background: '#f9f9f9',
        borderRadius: '12px',
        border: '1px solid #ddd',
      }}
    >
      <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
        Estimate the {measurementLabel} of the {coinName.toLowerCase()} shown below.
      </div>

      {/* Coin display - always shown at accurate size */}
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
        {isSideView ? (
          // Side view for thickness measurement
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: `${coinDiameterPx}px`,
                height: `${coinThicknessPx}px`,
                background: coinColor.fill,
                border: `2px solid ${coinColor.stroke}`,
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              Side view (thickness)
            </div>
          </div>
        ) : (
          // Face view (circular coin with coin-like details)
          <svg
            width={coinDiameterPx}
            height={coinDiameterPx}
            viewBox={`0 0 ${coinDiameterPx} ${coinDiameterPx}`}
            style={{ display: 'block' }}
          >
            {/* Outer rim with reeded edge effect */}
            <defs>
              <radialGradient id={`coinGradient-${coinType}`} cx="50%" cy="50%">
                <stop offset="0%" stopColor={coinColor.fill} stopOpacity="1" />
                <stop offset="70%" stopColor={coinColor.fill} stopOpacity="0.9" />
                <stop offset="100%" stopColor={coinColor.stroke} stopOpacity="0.8" />
              </radialGradient>
            </defs>
            
            {/* Main coin body */}
            <circle
              cx={coinDiameterPx / 2}
              cy={coinDiameterPx / 2}
              r={coinDiameterPx / 2 - 1}
              fill={`url(#coinGradient-${coinType})`}
              stroke={coinColor.stroke}
              strokeWidth="1.5"
            />
            
            {/* Reeded edge effect (small radial lines around the rim) */}
            {Array.from({ length: Math.floor(coinDiameterPx * 0.5) }).map((_, i) => {
              const angle = (i / Math.floor(coinDiameterPx * 0.5)) * Math.PI * 2;
              const radius = coinDiameterPx / 2 - 1;
              const x1 = coinDiameterPx / 2 + Math.cos(angle) * (radius - 0.3);
              const x2 = coinDiameterPx / 2 + Math.cos(angle) * radius;
              const y1 = coinDiameterPx / 2 + Math.sin(angle) * (radius - 0.3);
              const y2 = coinDiameterPx / 2 + Math.sin(angle) * radius;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={coinColor.stroke}
                  strokeWidth="0.5"
                  opacity="0.6"
                />
              );
            })}
            
            {/* Coin text/labels */}
            <text
              x={coinDiameterPx / 2}
              y={coinDiameterPx / 2 - (coinDiameterPx * 0.15)}
              textAnchor="middle"
              fontSize={coinDiameterPx * 0.12}
              fill={coinColor.stroke}
              fontWeight="bold"
              opacity="0.8"
            >
              {coinType === 'quarter' ? 'QUARTER' : coinType === 'dime' ? 'DIME' : coinType === 'nickel' ? 'NICKEL' : 'ONE CENT'}
            </text>
            <text
              x={coinDiameterPx / 2}
              y={coinDiameterPx / 2 + (coinDiameterPx * 0.15)}
              textAnchor="middle"
              fontSize={coinDiameterPx * 0.1}
              fill={coinColor.stroke}
              fontWeight="bold"
              opacity="0.7"
            >
              {coinType === 'quarter' ? '25¢' : coinType === 'dime' ? '10¢' : coinType === 'nickel' ? '5¢' : '1¢'}
            </text>
          </svg>
        )}
      </div>
    </div>
  );
}
