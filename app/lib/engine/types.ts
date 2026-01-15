export type ParentType = 'estimation' | 'measurement' | 'conversion';

export type GradeOptions = {
  requireScientificNotation?: boolean;
  enforceSigFigs?: boolean;
  enforceUnits?: boolean;
  estimationVarianceBand?: 'regionals' | 'states' | 'nationals';
};

export type GradeResult = {
  isCorrect: boolean;
  score: number; // 0..1
  feedback: string;
  correctAnswerDisplay?: string;
};

export type Question = {
  id: string;
  parentType: ParentType;
  subtype: string; // e.g. 'conversion.basic'
  prompt: string;
  meta: Record<string, any>;
  createdAtMs: number;
  expectedUnit?: string; // e.g. "kg/m^3"
};

export type AttemptDraft = {
  questionId: string;
  subtype: string;
  submittedAnswer: string;
  timeSpentMs: number;
  isCorrect: boolean;
};

export type QuestionSubtype = {
  id: string;
  parentType: ParentType;
  label: string;
  generate: () => Question;
  grade: (q: Question, submittedAnswer: string, opts?: GradeOptions) => GradeResult;
  conversionType?: 'ratio' | 'offset'; // For conversion subtypes: ratio (multiply/divide) or offset (add/subtract)
};
