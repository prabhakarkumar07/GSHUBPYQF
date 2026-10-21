import { describe, it, expect, vi } from 'vitest';
import { gradeQuiz, strengthOf, formatDuration, computeStreak } from './scoring';
import type { Question, Responses, QuestionStat, OptionKey } from './types';

describe('Scoring - Negative Tests', () => {
  const mockQuestion: Question = {
    id: 'q1',
    stem: 'Test question',
    options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
    correct_option: 'A',
    subject_id: 1,
    topic_id: 1,
  };

  const mockQuestions: Question[] = [mockQuestion];
  const mockStats: Record<string, QuestionStat> = {
    q1: { correct: 50, attempts: 100, avg_time_sec: 30 },
  };

  describe('strengthOf', () => {
    it('should return null for null input', () => {
      expect(strengthOf(null)).toBeNull();
    });

    it('should return null for NaN input', () => {
      expect(strengthOf(NaN)).toBeNull();
    });

    it('should return "weak" for undefined input (treated as NaN)', () => {
      // @ts-expect-error - testing invalid input
      expect(strengthOf(undefined)).toBe('weak');
    });

    it('should return "weak" for percentage below 40', () => {
      expect(strengthOf(0)).toBe('weak');
      expect(strengthOf(39)).toBe('weak');
      expect(strengthOf(-10)).toBe('weak');
    });

    it('should return "average" for percentage 40-69', () => {
      expect(strengthOf(40)).toBe('average');
      expect(strengthOf(50)).toBe('average');
      expect(strengthOf(69)).toBe('average');
    });

    it('should return "strong" for percentage >= 70', () => {
      expect(strengthOf(70)).toBe('strong');
      expect(strengthOf(100)).toBe('strong');
      expect(strengthOf(150)).toBe('strong'); // Edge case: over 100%
    });
  });

  describe('formatDuration', () => {
    it('should handle negative seconds (clamps to 0)', () => {
      expect(formatDuration(-10)).toBe('00:00');
      expect(formatDuration(-3600)).toBe('00:00');
    });

    it('should handle zero seconds', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('should handle very large seconds', () => {
      // 100 hours
      expect(formatDuration(360000)).toBe('100:00:00');
    });

    it('should handle decimal seconds (rounds)', () => {
      expect(formatDuration(59.4)).toBe('00:59');
      expect(formatDuration(59.6)).toBe('01:00');
      // 3599.9 rounds to 3600 = 1 hour
      expect(formatDuration(3599.9)).toBe('1:00:00');
    });
  });

  describe('computeStreak', () => {
    it('should return 0 for empty array', () => {
      expect(computeStreak([])).toBe(0);
    });

    it('should throw for invalid date strings', () => {
      expect(() => computeStreak(['invalid'])).toThrow('Invalid time value');
      expect(() => computeStreak(['not-a-date'])).toThrow('Invalid time value');
    });

    it('should handle duplicate dates', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(computeStreak([today, today, today])).toBe(1);
    });

    it('should return 0 for future dates only', () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      expect(computeStreak([tomorrow])).toBe(0);
    });
  });

  describe('gradeQuiz - Negative/Edge Cases', () => {
    it('should handle empty questions array', () => {
      const result = gradeQuiz([], {}, 4, 1, {}, 1);
      expect(result.total).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.wrong).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(0);
      expect(result.accuracy).toBe(0);
    });

    it('should handle empty responses (all skipped)', () => {
      const result = gradeQuiz(mockQuestions, {}, 4, 1, mockStats, 1);
      expect(result.correct).toBe(0);
      expect(result.wrong).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.graded[0].outcome).toBe('skipped');
    });

    it('should handle responses with invalid question IDs', () => {
      const responses: Responses = {
        'nonexistent': { selected: 'A' },
      };
      const result = gradeQuiz(mockQuestions, responses, 4, 1, mockStats, 1);
      expect(result.graded[0].outcome).toBe('skipped');
    });

    it('should handle negative positive/negative marks', () => {
      const responses: Responses = {
        q1: { selected: 'A' }, // correct
      };
      const result = gradeQuiz(mockQuestions, responses, -4, -1, mockStats, 1);
      expect(result.score).toBeLessThan(0);
    });

    it('should handle zero marks', () => {
      const responses: Responses = {
        q1: { selected: 'A' },
      };
      const result = gradeQuiz(mockQuestions, responses, 0, 0, mockStats, 1);
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(0);
    });

    it('should handle missing stats (communityPct null)', () => {
      const responses: Responses = {
        q1: { selected: 'A' },
      };
      const result = gradeQuiz(mockQuestions, responses, 4, 1, {}, 1);
      expect(result.graded[0].communityPct).toBeNull();
      expect(result.graded[0].communityAttempts).toBe(0);
    });

    it('should handle stats with insufficient attempts', () => {
      const responses: Responses = {
        q1: { selected: 'A' },
      };
      const sparseStats: Record<string, QuestionStat> = {
        q1: { correct: 1, attempts: 1, avg_time_sec: 30 }, // minAttempts = 10
      };
      const result = gradeQuiz(mockQuestions, responses, 4, 1, sparseStats, 10);
      expect(result.graded[0].communityPct).toBeNull();
    });

    it('should handle selected option not in A/B/C/D', () => {
      const responses: Responses = {
        q1: { selected: 'Z' as OptionKey }, // Invalid option
      };
      const result = gradeQuiz(mockQuestions, responses, 4, 1, mockStats, 1);
      expect(result.graded[0].outcome).toBe('wrong');
    });

    it('should handle all questions wrong', () => {
      const responses: Responses = {
        q1: { selected: 'B' }, // wrong
      };
      const result = gradeQuiz(mockQuestions, responses, 4, 1, mockStats, 1);
      expect(result.correct).toBe(0);
      expect(result.wrong).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.accuracy).toBe(0);
    });

    it('should handle very large question sets', () => {
      const manyQuestions: Question[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockQuestion,
        id: `q${i}`,
      }));
      const manyResponses: Responses = {};
      manyQuestions.forEach((_, i) => {
        manyResponses[`q${i}`] = { selected: 'A' };
      });
      const manyStats: Record<string, QuestionStat> = {};
      manyQuestions.forEach((_, i) => {
        manyStats[`q${i}`] = { correct: 50, attempts: 100, avg_time_sec: 30 };
      });

      const result = gradeQuiz(manyQuestions, manyResponses, 4, 1, manyStats, 1);
      expect(result.total).toBe(1000);
      expect(result.correct).toBe(1000);
      expect(result.maxScore).toBe(4000);
    });

    it('should handle questions without topic_id', () => {
      const questionNoTopic: Question = { ...mockQuestion, topic_id: undefined };
      const responses: Responses = { q1: { selected: 'A' } };
      const result = gradeQuiz([questionNoTopic], responses, 4, 1, mockStats, 1);
      expect(result.byTopic).toHaveLength(0);
      expect(result.bySubject).toHaveLength(1);
    });
  });
});