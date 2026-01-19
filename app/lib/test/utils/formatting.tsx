// Shared formatting utilities for test results

import React from 'react';

/**
 * Convert a digit to superscript
 */
export function toSuperscript(digit: string): string {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '+': '⁺'
  };
  return digit.split('').map(char => superscripts[char] || char).join('');
}

/**
 * Format a number with thousands separators (commas)
 */
export function formatWithCommas(value: number): string {
  const parts = value.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * Format a number in scientific notation (e.g., 6830 -> "6.83 × 10³")
 */
export function formatScientificNotation(value: number): string {
  if (value === 0) return '0 × 10⁰';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  const exp = Math.floor(Math.log10(absValue));
  const mantissa = absValue / Math.pow(10, exp);
  
  let roundedMantissa: number;
  if (mantissa >= 1) {
    roundedMantissa = Math.round(mantissa * 100) / 100;
  } else {
    roundedMantissa = Math.round(mantissa * 1000) / 1000;
  }
  
  if (roundedMantissa >= 10) {
    roundedMantissa /= 10;
    const expStr = String(exp + 1);
    return `${sign}${roundedMantissa} × 10${toSuperscript(expStr)}`;
  }
  
  if (roundedMantissa < 1 && roundedMantissa > 0) {
    roundedMantissa *= 10;
    const expStr = String(exp - 1);
    return `${sign}${roundedMantissa} × 10${toSuperscript(expStr)}`;
  }
  
  const expStr = String(exp);
  return `${sign}${roundedMantissa} × 10${toSuperscript(expStr)}`;
}

/**
 * Format correct answer with both regular and scientific notation
 */
export function formatCorrectAnswerWithScientific(correctAnswerDisplay: string): React.ReactNode {
  const match = correctAnswerDisplay.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if (!match) return correctAnswerDisplay;
  
  const numberStr = match[1];
  const unit = match[2] || '';
  
  const number = parseFloat(numberStr);
  if (isNaN(number)) return correctAnswerDisplay;
  
  const regularFormatted = formatWithCommas(number);
  const regularDisplay = `${regularFormatted}${unit ? ' ' + unit : ''}`;
  
  const sciNotation = formatScientificNotation(number);
  const sciDisplay = `${sciNotation}${unit ? ' ' + unit : ''}`;
  
  return (
    <>
      {regularDisplay} <span style={{ fontWeight: 'normal' }}>or</span> {sciDisplay}
    </>
  );
}

/**
 * Format time as MM:SS
 */
export function formatMMSS(totalSeconds: number): string {
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}
