'use client';

import { useEffect, useState } from 'react';
import type { Question } from '../lib/engine/types';

interface BasicConversionWidgetProps {
  question: Question;
}

export default function BasicConversionWidget({ question }: BasicConversionWidgetProps) {
  // Algorithm input values (for basic conversion)
  const [algorithmInputPrefixExp, setAlgorithmInputPrefixExp] = useState<string>('');
  const [algorithmOutputPrefixExp, setAlgorithmOutputPrefixExp] = useState<string>('');
  const [algorithmPower, setAlgorithmPower] = useState<string>('');
  const [algorithmValueExp, setAlgorithmValueExp] = useState<string>('');

  // Reset state when question changes
  useEffect(() => {
    if (question?.subtype === 'conversion.basic' && question.meta) {
      setAlgorithmInputPrefixExp('');
      setAlgorithmOutputPrefixExp('');
      setAlgorithmPower('');
      setAlgorithmValueExp('');
    }
  }, [question?.id]);

  if (!question || question.subtype !== 'conversion.basic' || !question.meta) {
    return null;
  }

  // Parse input values
  const inputPrefixExp = algorithmInputPrefixExp.trim() === '' ? null : Number(algorithmInputPrefixExp);
  const outputPrefixExp = algorithmOutputPrefixExp.trim() === '' ? null : Number(algorithmOutputPrefixExp);
  const power = algorithmPower.trim() === '' ? null : Number(algorithmPower);
  const valueExp = algorithmValueExp.trim() === '' ? null : Number(algorithmValueExp);
  
  // Check each input against correct value
  const inputPrefixExpCorrect = inputPrefixExp !== null && Number.isFinite(inputPrefixExp) && Math.abs(inputPrefixExp - question.meta.fromPrefixExponent) < 0.001;
  const outputPrefixExpCorrect = outputPrefixExp !== null && Number.isFinite(outputPrefixExp) && Math.abs(outputPrefixExp - question.meta.toPrefixExponent) < 0.001;
  const powerCorrect = power !== null && Number.isFinite(power) && Math.abs(power - question.meta.power) < 0.001;
  const valueExpCorrect = valueExp !== null && Number.isFinite(valueExp) && Math.abs(valueExp - question.meta.questionValueExponent) < 0.001;
  
  // Calculate exponent if all values are provided
  let calculatedExponent: number | null = null;
  if (inputPrefixExp !== null && outputPrefixExp !== null && power !== null && valueExp !== null) {
    if (Number.isFinite(inputPrefixExp) && Number.isFinite(outputPrefixExp) && Number.isFinite(power) && Number.isFinite(valueExp)) {
      calculatedExponent = (inputPrefixExp - outputPrefixExp) * power + valueExp;
    }
  }
  
  // Check if calculated exponent matches the correct one
  const isCorrect = calculatedExponent !== null && Math.abs(calculatedExponent - question.meta.finalExponent) < 0.001;
  
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
          Basic conversions can always be solved using:
        </div>
        <div style={{ 
          fontFamily: 'monospace', 
          background: '#fff', 
          padding: '10px 12px', 
          borderRadius: 6,
          border: '1px solid #ccc',
          marginBottom: 8
        }}>
          Exponent = ([Input Prefix Exponent] - [Output Prefix Exponent]) × [Squared or Cubed Units] + [Question Value Exponent]
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>For this question:</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '8px 12px', alignItems: 'center', fontSize: 13 }}>
            <label style={{ fontFamily: 'monospace' }}>Input Prefix Exponent:</label>
            <input
              type="text"
              inputMode="numeric"
              value={algorithmInputPrefixExp}
              onChange={(e) => setAlgorithmInputPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${inputPrefixExpCorrect ? '#28a745' : inputPrefixExp !== null && !inputPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(inputPrefixExp !== null, inputPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Output Prefix Exponent:</label>
            <input
              type="text"
              inputMode="numeric"
              value={algorithmOutputPrefixExp}
              onChange={(e) => setAlgorithmOutputPrefixExp(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${outputPrefixExpCorrect ? '#28a745' : outputPrefixExp !== null && !outputPrefixExpCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(outputPrefixExp !== null, outputPrefixExpCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Linear (1), Squared (2), or Cubed (3) Units:</label>
            <input
              type="text"
              inputMode="numeric"
              value={algorithmPower}
              onChange={(e) => setAlgorithmPower(e.target.value)}
              style={{
                padding: '6px 8px',
                border: `1px solid ${powerCorrect ? '#28a745' : power !== null && !powerCorrect ? '#dc3545' : '#ccc'}`,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                backgroundColor: getInputBgColor(power !== null, powerCorrect),
              }}
            />
            
            <label style={{ fontFamily: 'monospace' }}>Question Value Exponent:</label>
            <input
              type="text"
              inputMode="numeric"
              value={algorithmValueExp}
              onChange={(e) => setAlgorithmValueExp(e.target.value)}
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
              Answer Exponent = ({algorithmInputPrefixExp || ' '} - {algorithmOutputPrefixExp || ' '}) × {algorithmPower || ' '} + {algorithmValueExp || ' '} = {calculatedExponent !== null ? Math.round(calculatedExponent).toString() : ' '}
            </div>
            {calculatedExponent !== null && (
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
