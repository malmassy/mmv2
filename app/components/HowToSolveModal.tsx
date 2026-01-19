'use client';

import { useEffect, useState } from 'react';

interface HowToSolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtypeId: string;
}

type StepItem = string | { text: string; substeps?: string[] };

const HOW_TO_SOLVE_CONTENT: Record<string, { title: string; steps: StepItem[] }> = {
  'conversion.basic': {
    title: 'How to Solve: Basic Metric Conversion',
    steps: [
      'Example: Convert 52,600 square millimeters to square megameters.',
      {
        text: 'We need to pick out 4 values from the question.',
        substeps: [
          '<b>1. Input Unit</b> millimeters has the prefix milli which is 10⁻³, so we use <b>-3</b>.',
          '<b>2. Output Unit</b> megameters has the prefix mega which is 10⁶, so we use <b>6</b>.',
          '<b>3. Unit Power</b> squared, so we use <b>2</b>.',
          '<b>4. Question Value</b> Translate the value from the question to scientific notation: 52,600 = 5.26 x 10⁴, so we use <b>4</b>.',
        ],
      },
      'Apply the formula: Exponent = ([Input Unit] - [Output Unit]) × [Unit Power] + [Question Value].',
      '(-3 - 6) × 2 + 4 = <b>-14</b>, so 52,600 square millimeters = <b>5.26 x 10⁻¹⁴ square megameters</b>.',
    ],
  },
  'conversion.density': {
    title: 'How to Solve: Density Unit Conversion',
    steps: [
        'Example: Convert 35 g/cm³ to kg/m³.',
        'Like "Basic", but we need to deal with the units in the denominator at the end.',
        {
          text: 'First, solve as if there are no units in the denominator. So 35 g to kg.',
          substeps: [
            'Use the basic conversion formula: (0 - 3) x 1 + 1 = -2',
          ],
        },
        {text: 'Now, solve the denominator units backwards.',
        substeps: ['Convert 1 m³ to cm³.','(0 - -2) x 3 = 6']},
        'Now, combine the two results: -2 + 6 = <b>4</b>',
        '<b>Answer:</b> 3.5 x 10⁴ kg/m³.'
      ],
  },
  'conversion.litersToM3': {
    title: 'How to Solve: Liters to Cubic Meters',
    steps: [
      {text: 'Remember a few facts:',
        substeps: ['mL = cm³', 'L = dm³', 'kL = m³',
        'Notice as we step up by 3 prefixes on the Liters, we step by 1 prefix on the cubic meters.',
        'If you struggle to remember this, your 1 liter water bottle is 10cm x 10cm x 10cm (and 10 cm = 1 dm).'

        ]},
      'Now, substitute either the input units or the output units so you are working with the same units.',
    ],
  },
  'conversion.celsiusKelvin': {
    title: 'How to Solve: Celsius to Kelvin (and vice versa)',
    steps: [
      'Celsius to Kelvin: Add 273.15 to the Celsius temperature.',
      'Kelvin to Celsius: Subtract 273.15 from the Kelvin temperature.',
      'If you can\'t remember whether to add or subtract, remember that Kelvin can\'t be negative, so it\'s always bigger than Celsius.',
    ],
  },
  'conversion.velocity': {
    title: 'How to Solve: Velocity Unit Conversion',
    steps: [
      'Identify the input and output velocity units (e.g., m/s to km/h).',
      'Break down the conversion into distance and time components.',
      'Convert the distance unit (e.g., m to km: multiply by 10⁻³).',
      'Convert the time unit (e.g., s to h: divide by 3600, or multiply by 1/3600).',
      'Combine the conversions: multiply distance conversion by time conversion.',
      'Example: Convert 10 m/s to km/h. 10 m/s = 10 × (10⁻³ km) / (1/3600 h) = 10 × 10⁻³ × 3600 = 36 km/h.',
    ],
  },
  'conversion.force': {
    title: 'How to Solve: Force Unit Conversion',
    steps: [
      'Identify the input and output force units (e.g., N to kN).',
      'Remember that force units are typically Newtons (N) with metric prefixes.',
      'Apply standard metric prefix conversions (e.g., kN = 10³ N).',
      'For compound units, convert each component separately.',
      'Example: Convert 5.2 N to mN. 5.2 N = 5.2 × 10³ mN = 5200 mN.',
    ],
  },
  'estimation.length': {
    title: 'How to Solve: Length Estimation',
    steps: [
      'Calibrate your screen using the calibration tool to determine pixels per centimeter.',
      'Use the calibrated measurement to estimate the length of objects shown.',
      'Compare your estimate to common reference objects (e.g., a paperclip is ~3 cm).',
      'Consider the scale and context of the object being measured.',
      'Enter your estimate in the appropriate units (typically cm or m).',
    ],
  },
  'estimation.commonObjects': {
    title: 'How to Solve: Common Object Estimation',
    steps: [
      'Use your knowledge of common object sizes as reference points.',
      'Common references: paperclip (~3 cm), credit card (~8.5 cm), smartphone (~15 cm), etc.',
      'Compare the object in question to these known references.',
      'Consider the scale and perspective shown in the image.',
      'Enter your estimate in the appropriate units.',
    ],
  },
};

export default function HowToSolveModal({ isOpen, onClose, subtypeId }: HowToSolveModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isMounted || !isOpen) return null;

  const content = HOW_TO_SOLVE_CONTENT[subtypeId] || {
    title: 'How to Solve',
    steps: ['Instructions for this subtype are coming soon.'],
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#333' }}>{content.title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
          {content.steps.map((step, index) => {
            if (typeof step === 'string') {
              return (
                <li 
                  key={index} 
                  style={{ marginBottom: '12px', color: '#333' }}
                  dangerouslySetInnerHTML={{ __html: step }}
                />
              );
            } else {
              return (
                <li key={index} style={{ marginBottom: '12px', color: '#333' }}>
                  <span dangerouslySetInnerHTML={{ __html: step.text }} />
                  {step.substeps && step.substeps.length > 0 && (
                    <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
                      {step.substeps.map((substep, subIndex) => (
                        <li 
                          key={subIndex} 
                          style={{ marginBottom: '8px', color: '#555' }}
                          dangerouslySetInnerHTML={{ __html: substep }}
                        />
                      ))}
                    </ul>
                  )}
                </li>
              );
            }
          })}
        </ol>
      </div>
    </div>
  );
}
