export interface ClassItem {
  id: string;
  name: string;
  grade?: number | string | null; // e.g., 92 (percentage), 3.7 (4.0 scale point), or "A-"
  manualGrade?: string | number | null;
  credits?: number; // defaults to 1 credit per class if unspecified
}

/**
 * Converts percentage grades, 4.0 scale numbers, or letter grades to standard grade points.
 */
export function parseGradeToPoints(grade: number | string | null | undefined): number | null {
  if (grade === null || grade === undefined || grade === "") return null;

  // Handle numerical input (Percentage vs 4.0 scale)
  if (typeof grade === "number" || !isNaN(Number(grade))) {
    const num = Number(grade);

    // If grade is already on a 0.0–4.0 scale
    if (num <= 4.0) return Math.max(0, num);

    // Percentage conversion scale
    if (num >= 93) return 4.0;
    if (num >= 90) return 3.7;
    if (num >= 87) return 3.3;
    if (num >= 83) return 3.0;
    if (num >= 80) return 2.7;
    if (num >= 77) return 2.3;
    if (num >= 73) return 2.0;
    if (num >= 70) return 1.7;
    if (num >= 67) return 1.3;
    if (num >= 65) return 1.0;
    return 0.0;
  }

  // Handle Letter Grades
  const letterMap: Record<string, number> = {
    "A+": 4.0, "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0, "D-": 0.7,
    "F": 0.0,
  };

  const cleanLetter = grade.trim().toUpperCase();
  return letterMap[cleanLetter] ?? null;
}

/**
 * Calculates weighted total GPA across all active classes.
 */
export function calculateTotalGPA(classes: ClassItem[]): { gpa: number; totalCredits: number } {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const cls of classes) {
    const activeGrade = cls.manualGrade ?? cls.grade;
    const gradePoints = parseGradeToPoints(activeGrade);

    // Skip classes that don't have a valid grade assigned yet
    if (gradePoints === null) continue;

    const credits = Number(cls.credits) > 0 ? Number(cls.credits) : 1;

    totalPoints += gradePoints * credits;
    totalCredits += credits;
  }

  if (totalCredits === 0) return { gpa: 0.0, totalCredits: 0 };

  const rawGpa = totalPoints / totalCredits;
  
  return {
    gpa: Math.round(rawGpa * 100) / 100, // Rounded to 2 decimal places
    totalCredits,
  };
}
