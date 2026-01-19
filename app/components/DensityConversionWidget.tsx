'use client';

import { useEffect, useState } from 'react';
import type { Question } from '../lib/engine/types';

interface DensityConversionWidgetProps {
  question: Question;
}

export default function DensityConversionWidget({ question }: DensityConversionWidgetProps) {
  // Algorithm input values (for density conversion)
  const [densityInputNumPrefixExp, setDensityInputNumPrefixExp] = useState<string>('');
  const [densityOutputNumPrefixExp, setDensityOutputNumPrefixExp] = useState<string>('');
  const [densityInputDenPrefixExp, setDensityInputDenPrefixExp] = useState<string>('');
  const [densityOutputDenPrefixExp, setDensityOutputDenPrefixExp] = useState<string>('');
  const [densityNumPower, setDensityNumPower] = useState<string>('');
  const [densityDenPower, setDensityDenPower] = useState<string>('');
  const [densityValueExp, setDensityValueExp] = useState<string>('');

  // Reset state when question changes
  useEffect(() => {
    if (question?.subtype === 'conversion.density' && question.meta) {
      setDensityInputNumPrefixExp('');
      setDensityOutputNumPrefixExp('');
      setDensityInputDenPrefixExp('');
      setDensityOutputDenPrefixExp('');
      setDensityNumPower('');
      setDensityDenPower('');
      setDensityValueExp('');
    }
  }, [question?.id]);

  if (!question || question.subtype !== 'conversion.density' || !question.meta) {
    return null;
  }

  // Parse input values
  const inputNumPrefixExp = densityInputNumPrefixExp.trim() === '' ? null : Number(densityInputNumPrefixExp);
  const outputNumPrefixExp = densityOutputNumPrefixExp.trim() === '' ? null : Number(densityOutputNumPrefixExp);
  const inputDenPrefixExp = densityInputDenPrefixExp.trim() === '' ? null : Number(densityInputDenPrefixExp);
  const outputDenPrefixExp = densityOutputDenPrefixExp.trim() === '' ? null : Number(densityOutputDenPrefixExp);
  const numPower = densityNumPower.trim() === '' ? null : Number(densityNumPower);
  const denPower = densityDenPower.trim() === '' ? null : Number(densityDenPower);
  const valueExp = densityValueExp.trim() === '' ? null : Number(densityValueExp);
  
  // Check each input against correct value
  const inputNumPrefixExpCorrect = inputNumPrefixExp !== null && Number.isFinite(inputNumPrefixExp) && Math.abs(inputNumPrefixExp - (question.meta.inputNumPrefixExp ?? 0)) < 0.001;
  const outputNumPrefixExpCorrect = outputNumPrefixExp !== null && Number.isFinite(outputNumPrefixExp) && Math.abs(outputNumPrefixExp - (question.meta.outputNumPrefixExp ?? 0)) < 0.001;
  const inputDenPrefixExpCorrect = inputDenPrefixExp !== null && Number.isFinite(inputDenPrefixExp) && Math.abs(inputDenPrefixExp - (question.meta.inputDenPrefixExp ?? 0)) < 0.001;
  const outputDenPrefixExpCorrect = outputDenPrefixExp !== null && Number.isFinite(outputDenPrefixExp) && Math.abs(outputDenPrefixExp - (question.meta.outputDenPrefixExp ?? 0)) < 0.001;
  const numPowerCorrect = numPower !== null && Number.isFinite(numPower) && Math.abs(numPower - (question.meta.numPower ?? 1)) < 0.001;
  const denPowerCorrect = denPower !== null && Number.isFinite(denPower) && Math.abs(denPower - (question.meta.denPower ?? 1)) < 0.001;
  const valueExpCorrect = valueExp !== null && Number.isFinite(valueExp) && Math.abs(valueExp - (question.meta.questionValueExponent ?? 0)) < 0.001;
  
  // Calculate exponent if all values are provided
  // Formula: (Input Num Prefix Exp - Output Num Prefix Exp) × Den Power + Question Value Exp - (Input Den Prefix Exp - Output Den Prefix Exp)
  let calculatedExponent: number | null = null;
  if (inputNumPrefixExp !== null && outputNumPrefixExp !== null && inputDenPrefixExp !== null && outputDenPrefixExp !== null && denPower !== null && valueExp !== null) {
    if (Number.isFinite(inputNumPrefixExp) && Number.isFinite(outputNumPrefixExp) && Number.isFinite(inputDenPrefixExp) && Number.isFinite(outputDenPrefixExp) && Number.isFinite(denPower) && Number.isFinite(valueExp)) {
      calculatedExponent = (inputNumPrefixExp - outputNumPrefixExp) * denPower + valueExp - (inputDenPrefixExp - outputDenPrefixExp);
    }
  }
  
  // Check if calculated exponent matches the correct one
  const isCorrect = calculatedExponent !== null && question.meta.finalExponent !== null && Math.abs(calculatedExponent - question.meta.finalExponent) < 0.001;
  
  // Helper function to get input background color
  const getInputBgColor = (hasValue: boolean, isCorrect: boolean) => {
    if (!hasValue) return '#fff';
    return isCorrect ? '#d4edda' : '#f8d7da'; // Light green for correct, light red for wrong
  };
  
  return (
    <div style={{ marginBottom: 12, padding: 14, border: '1px solid #ddd', borderRadius: 8, background: '#f9f9f9' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Recommended: Algorithm</div>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ marginBottom: 8 }}>
          Density conversions can always be solved using:
        </div>
        <div style={{ 
          fontFamily: 'monospace', 
          background: '#fff', 
          padding: '10px 12px', 
          borderRadius: 6,
          border: '1px solid #ccc',
          marginBottom: 8
        }}>
          Exponent = ([Input Numerator Prefix Exponent] - [Output Numerator Prefix Exponent]) × [Squared or Cubed (Denominator)] + [Question Value Exponent] - ([Input Denominator Prefix Exponent] - [Output Denominator Prefix Exponent])
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>For this question:</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '8px 12px', alignItems: 'center', fontSize: 13 }}>
            <label style={{ fontFamily: 'monospace' }}>Input Numerator Prefix Exp:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityInputNumPrefixExp}
              onChange={(e) => setDensityInputNumPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${inputNumPrefixExpCorrect ? '#28a745' : inputNumPrefixExp !== null && !inputNumPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(inputNumPrefixExp !== null, inputNumPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Output Numerator Prefix Exp:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityOutputNumPrefixExp}
              onChange={(e) => setDensityOutputNumPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${outputNumPrefixExpCorrect ? '#28a745' : outputNumPrefixExp !== null && !outputNumPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(outputNumPrefixExp !== null, outputNumPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Input Denominator Prefix Exp:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityInputDenPrefixExp}
              onChange={(e) => setDensityInputDenPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${inputDenPrefixExpCorrect ? '#28a745' : inputDenPrefixExp !== null && !inputDenPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(inputDenPrefixExp !== null, inputDenPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Output Denominator Prefix Exp:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityOutputDenPrefixExp}
              onChange={(e) => setDensityOutputDenPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${outputDenPrefixExpCorrect ? '#28a745' : outputDenPrefixExp !== null && !outputDenPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(outputDenPrefixExp !== null, outputDenPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Numerator Power:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityNumPower}
              onChange={(e) => setDensityNumPower(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${numPowerCorrect ? '#28a745' : numPower !== null && !numPowerCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(numPower !== null, numPowerCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Denominator Power:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityDenPower}
              onChange={(e) => setDensityDenPower(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${denPowerCorrect ? '#28a745' : denPower !== null && !denPowerCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(denPower !== null, denPowerCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Question Value Exponent:</label>
            <input
              type="text"
              inputMode="numeric"
              value={densityValueExp}
              onChange={(e) => setDensityValueExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${valueExpCorrect ? '#28a745' : valueExp !== null && !valueExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(valueExp !== null, valueExpCorrect),
              }}
            />
          </div>
          
          {/* Formula that fills in as you go */}
          <div style={{ marginTop: 16, padding: '12px', background: '#fff', borderRadius: 6, border: '1px solid #ccc' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>
              Answer Exponent = ({densityInputNumPrefixExp || ' '} - {densityOutputNumPrefixExp || ' '}) × {densityDenPower || ' '} + {densityValueExp || ' '} - ({densityInputDenPrefixExp || ' '} - {densityOutputDenPrefixExp || ' '}) = {calculatedExponent !== null ? calculatedExponent.toFixed(1) : ' '}
            </div>
            {calculatedExponent !== null && question.meta.finalExponent !== null && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                {isCorrect ? (
                  <span style={{ fontWeight: 700, color: '#4CAF50' }}>
                    ✓ Correct! Expected: {question.meta.finalExponent}
                  </span>
                ) : (
                  <span style={{ fontWeight: 700, color: '#f44336' }}>
                    ✗ Not quite. Expected: {question.meta.finalExponent}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
