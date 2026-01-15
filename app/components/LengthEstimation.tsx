'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getCalibration, setCalibration, getPixelsPerCm, cmToPixels } from '../lib/engine/utils/screenCalibration';

type LengthEstimationProps = {
  lengthCm: number; // Length of object in centimeters
  onCalibrationComplete?: () => void; // Callback when calibration is complete
};

/**
 * Responsive length estimation component that displays objects at accurate sizes
 * based on screen calibration. Includes calibration step if needed.
 */
export default function LengthEstimation({ lengthCm, onCalibrationComplete }: LengthEstimationProps) {
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<'check' | 'measure' | 'complete'>('check');
  const [calibrationInput, setCalibrationInput] = useState('');
  const [calibrationError, setCalibrationError] = useState('');
  const referenceRef = useRef<HTMLDivElement>(null);

  // Check calibration on mount
  useEffect(() => {
    const calibrated = getCalibration() !== null;
    setIsCalibrated(calibrated);
    // If already calibrated, set step to complete so user can continue
    if (calibrated) {
      setCalibrationStep('complete');
    }
  }, []);

  // Start calibration process
  const startCalibration = () => {
    setCalibrationStep('measure');
    setCalibrationError('');
    setCalibrationInput('');
  };

  // Handle calibration measurement
  const handleCalibrationSubmit = () => {
    const measuredCm = parseFloat(calibrationInput);
    
    if (!Number.isFinite(measuredCm) || measuredCm <= 0) {
      setCalibrationError('Please enter a positive number.');
      return;
    }

    if (measuredCm < 5 || measuredCm > 15) {
      setCalibrationError('Please measure the reference line with a real ruler.');
      return;
    }

    // Calculate pixels per cm based on the reference line
    if (referenceRef.current) {
      const referenceWidthPx = referenceRef.current.offsetWidth;
      const pxPerCm = referenceWidthPx / measuredCm;
      
      setCalibration(pxPerCm);
      setIsCalibrated(true);
      setCalibrationStep('complete');
      setCalibrationError('');
      
      if (onCalibrationComplete) {
        onCalibrationComplete();
      }
    }
  };

  // Get pixels per cm (calibrated or estimated) - always use this to show object
  const pxPerCm = getPixelsPerCm();
  const objectWidthPx = cmToPixels(lengthCm);

  // Show calibration UI if not calibrated OR if we have onCalibrationComplete (test mode - always show)
  const showCalibrationUI = !isCalibrated || calibrationStep !== 'complete' || onCalibrationComplete !== undefined;

  // Always show the measurement object (uses estimate if not calibrated)
  return (
    <div>
      {/* Calibration banner if not calibrated */}
      {showCalibrationUI && (
        <div style={{ marginBottom: '20px', padding: '16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
            Screen Calibration Recommended
          </h3>
          
          {calibrationStep === 'check' && (
            <>
              <p style={{ marginBottom: '12px', lineHeight: '1.6', fontSize: '14px' }}>
                For accurate measurements, calibrate your display. Click below to start.
              </p>
              <button
                onClick={startCalibration}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#0070f3',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Start Calibration
              </button>
            </>
          )}

          {calibrationStep === 'measure' && (
            <>
              <p style={{ marginBottom: '12px', lineHeight: '1.6', fontSize: '14px' }}>
                Measure the reference line below with a real ruler and enter the length in cm:
              </p>
              
              <div
                ref={referenceRef}
                style={{
                  width: '380px',
                  height: '4px',
                  background: '#0070f3',
                  marginBottom: '8px',
                  borderRadius: '2px',
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                Reference line
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  value={calibrationInput}
                  onChange={(e) => {
                    setCalibrationInput(e.target.value);
                    setCalibrationError('');
                  }}
                  placeholder="Enter length in cm"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: calibrationError ? '2px solid #e74c3c' : '1px solid #ccc',
                    fontSize: '14px',
                    width: '160px',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCalibrationSubmit();
                    }
                  }}
                />
                <button
                  onClick={handleCalibrationSubmit}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#0070f3',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Calibrate
                </button>
              </div>
              
              {calibrationError && (
                <div style={{ marginTop: '8px', color: '#e74c3c', fontSize: '13px' }}>
                  {calibrationError}
                </div>
              )}
            </>
          )}

          {calibrationStep === 'complete' && (
            <>
              <p style={{ color: '#28a745', fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
                ✓ Calibration complete! Measurements are now more accurate.
              </p>
              {onCalibrationComplete && (
                <button
                  onClick={onCalibrationComplete}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#28a745',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Continue to Questions
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Measurement object - always shown */}
      <div
        style={{
          padding: '30px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #ccc',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          minHeight: '150px',
        }}
      >
        <div
          style={{
            width: `${objectWidthPx}px`,
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            border: '2px solid #333',
          }}
        />
      </div>
    </div>
  );
}
