// Predefined estimation questions with images

export type ImageQuestion = {
  id: string;
  imagePath: string;
  prompt: string;
  correctAnswer: number;
  targetUnit: string;
  correctAnswerDisplay: string;
  objectCategory: 'coin' | 'battery' | 'other';
  objectType?: string;
  objectName: string;
  measurementType: 'diameter' | 'circumference' | 'area' | 'thickness' | 'mass' | 'length' | 'volume';
  measurementLabel: string;
};

// Predefined image-based estimation questions
export const IMAGE_QUESTIONS: ImageQuestion[] = [
  {
    id: 'aaa_battery_length',
    imagePath: '/estimation/aaa_battery_length.jpeg',
    prompt: 'Estimate the length of this AAA battery.',
    correctAnswer: 4.45, // cm
    targetUnit: 'cm',
    correctAnswerDisplay: '4.45 cm',
    objectCategory: 'battery',
    objectType: 'AAA',
    objectName: 'AAA battery',
    measurementType: 'length',
    measurementLabel: 'length',
  },
  {
    id: 'quarter_diameter',
    imagePath: '/estimation/quarter_heads.jpg',
    prompt: 'Estimate the diameter of this quarter.',
    correctAnswer: 2.43, // cm (rounded to 2 decimals)
    targetUnit: 'cm',
    correctAnswerDisplay: '2.43 cm',
    objectCategory: 'coin',
    objectType: 'quarter',
    objectName: 'quarter',
    measurementType: 'diameter',
    measurementLabel: 'diameter',
  },
  {
    id: 'quarter_circumference',
    imagePath: '/estimation/quarter_heads.jpg',
    prompt: 'Estimate the circumference of this quarter.',
    correctAnswer: 7.62, // cm (Math.PI * 2.426, rounded to 2 decimals)
    targetUnit: 'cm',
    correctAnswerDisplay: '7.62 cm',
    objectCategory: 'coin',
    objectType: 'quarter',
    objectName: 'quarter',
    measurementType: 'circumference',
    measurementLabel: 'circumference',
  },
  {
    id: 'quarter_area',
    imagePath: '/estimation/quarter_heads.jpg',
    prompt: 'Estimate the surface area of this quarter.',
    correctAnswer: 4.62, // cm² (Math.PI * (2.426/2)², rounded to 2 decimals)
    targetUnit: 'cm²',
    correctAnswerDisplay: '4.62 cm²',
    objectCategory: 'coin',
    objectType: 'quarter',
    objectName: 'quarter',
    measurementType: 'area',
    measurementLabel: 'surface area',
  },
  {
    id: 'penny_diameter',
    imagePath: '/estimation/penny_heads.jpeg',
    prompt: 'Estimate the diameter of this penny.',
    correctAnswer: 1.91, // cm (rounded to 2 decimals)
    targetUnit: 'cm',
    correctAnswerDisplay: '1.91 cm',
    objectCategory: 'coin',
    objectType: 'penny',
    objectName: 'penny',
    measurementType: 'diameter',
    measurementLabel: 'diameter',
  },
  {
    id: 'penny_circumference',
    imagePath: '/estimation/penny_heads.jpeg',
    prompt: 'Estimate the circumference of this penny.',
    correctAnswer: 5.98, // cm (Math.PI * 1.905, rounded to 2 decimals)
    targetUnit: 'cm',
    correctAnswerDisplay: '5.98 cm',
    objectCategory: 'coin',
    objectType: 'penny',
    objectName: 'penny',
    measurementType: 'circumference',
    measurementLabel: 'circumference',
  },
  {
    id: 'penny_area',
    imagePath: '/estimation/penny_heads.jpeg',
    prompt: 'Estimate the surface area of this penny.',
    correctAnswer: 2.85, // cm² (Math.PI * (1.905/2)², rounded to 2 decimals)
    targetUnit: 'cm²',
    correctAnswerDisplay: '2.85 cm²',
    objectCategory: 'coin',
    objectType: 'penny',
    objectName: 'penny',
    measurementType: 'area',
    measurementLabel: 'surface area',
  },
];

/**
 * Get a random image-based question, or null if none available
 */
export function getRandomImageQuestion(): ImageQuestion | null {
  if (IMAGE_QUESTIONS.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * IMAGE_QUESTIONS.length);
  return IMAGE_QUESTIONS[randomIndex];
}

/**
 * Get a specific image question by ID
 */
export function getImageQuestionById(id: string): ImageQuestion | null {
  return IMAGE_QUESTIONS.find(q => q.id === id) || null;
}
