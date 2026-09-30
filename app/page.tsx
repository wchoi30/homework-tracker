"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { createWorker } from "tesseract.js";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import {
  Plus,
  Check,
  Clock,
  BookOpen,
  List,
  Calendar,
  CalendarDays,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Calculator,
  Upload,
  Flame,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Cloud,
  CloudOff,
  X,
  Award,
  GraduationCap,
  LayoutDashboard,
  Users,
  Filter,
  Target,
  Sliders,
  MapPin,
  Sun,
  Coffee,
  LogIn,
  LogOut,
  UserPlus,
  Lock,
  Mail,
  ShieldAlert,
  UserCheck,
  Camera,
  Image as ImageIcon,
  Loader2,
  Pencil,
  BarChart3,
  Brain,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Copy,
  RefreshCw,
  Settings,
  Languages,
  Moon,
  SunMedium,
  Bell,
  Palette,
  Bug,
  LifeBuoy,
  Info,
  Search,
  MoreHorizontal,
  House,
  Keyboard,
  UserCircle2,
  UserRound,
} from "lucide-react";

// Place right below imports, before: export default function Page() { ...

function getLetterGradeFromPoints(points: number): string {
  if (points >= 4.17) return "A+";
  if (points >= 3.84) return "A";
  if (points >= 3.50) return "A-";
  if (points >= 3.17) return "B+";
  if (points >= 2.84) return "B";
  if (points >= 2.50) return "B-";
  if (points >= 2.17) return "C+";
  if (points >= 1.84) return "C";
  if (points >= 1.50) return "C-";
  if (points >= 1.17) return "D+";
  if (points >= 0.84) return "D";
  if (points >= 0.50) return "D-";
  return "F";
}

function calculateRequiredGrade({
  currentGradePts,
  targetGradePts,
  completedCount,
  selectedCount,
}: {
  currentGradePts: number;
  targetGradePts: number;
  completedCount: number;
  selectedCount: number;
}) {
  if (selectedCount === 0) {
    return {
      requiredScorePts: null,
      letterGrade: "--",
      message: "Please select at least one standard to simulate.",
      isPossible: true,
    };
  }

  if (completedCount === 0) {
    return {
      requiredScorePts: targetGradePts,
      letterGrade: getLetterGradeFromPoints(targetGradePts),
      message: `To achieve your target overall, you must score an average of at least ${getLetterGradeFromPoints(targetGradePts)} (${targetGradePts.toFixed(2)} pts) on the ${selectedCount} selected standard(s).`,
      isPossible: true,
    };
  }

  const totalStandardsAfter = completedCount + selectedCount;
  const targetTotalPointsNeeded = targetGradePts * totalStandardsAfter;
  const currentTotalPointsEarned = currentGradePts * completedCount;

  const pointsNeededOnUpcoming = targetTotalPointsNeeded - currentTotalPointsEarned;
  const requiredAvgScore = pointsNeededOnUpcoming / selectedCount;

  const isPossible = requiredAvgScore <= 4.33;
  const clampedScore = Math.max(0, requiredAvgScore);

  return {
    requiredScorePts: Number(clampedScore.toFixed(2)),
    letterGrade: getLetterGradeFromPoints(clampedScore),
    message: isPossible
      ? `To achieve your target overall, you must score an average of at least ${getLetterGradeFromPoints(clampedScore)} (${clampedScore.toFixed(2)} pts) on the ${selectedCount} selected standard(s).`
      : `Unachievable: You would need an average score of ${clampedScore.toFixed(2)} pts (above the 4.33 max limit) on upcoming standards.`,
    isPossible,
  };
}

// --- TYPES & CONSTANTS ---
export type StandardLevel =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "F";

export const LETTER_POINTS: Record<StandardLevel, number> = {
  "A+": 4.33,
  A: 4.0,
  "A-": 3.67,
  "B+": 3.33,
  B: 3.0,
  "B-": 2.67,
  "C+": 2.33,
  C: 2.0,
  "C-": 1.67,
  "D+": 1.33,
  D: 1.0,
  F: 0.0,
};

export const STANDARD_SCALE: Record<
  StandardLevel,
  { points: number; label: string; color: string }
> = {
  "A+": {
    points: 4.33,
    label: "Meeting with Distinction",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  A: {
    points: 4.0,
    label: "Meeting with Excellence",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  "A-": {
    points: 3.67,
    label: "Meeting Standard",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  "B+": {
    points: 3.33,
    label: "Above Average",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  B: {
    points: 3.0,
    label: "Proficient",
    color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
  "B-": {
    points: 2.67,
    label: "Approaching Proficiency",
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
  "C+": {
    points: 2.33,
    label: "Developing",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  C: {
    points: 2.0,
    label: "Sufficient",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  "C-": {
    points: 1.67,
    label: "Below Average",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
  "D+": {
    points: 1.33,
    label: "Needs Improvement",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  D: {
    points: 1.0,
    label: "Beginning",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  F: {
    points: 0.0,
    label: "Not Yet Evident",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export const GRADE_TARGETS = [
  { label: "A+ (4.33)", value: "A+" },
  { label: "A (4.00)", value: "A" },
  { label: "A- (3.67)", value: "A-" },
  { label: "B+ (3.33)", value: "B+" },
  { label: "B (3.00)", value: "B" },
  { label: "B- (2.67)", value: "B-" },
  { label: "C+ (2.33)", value: "C+" },
  { label: "C (2.00)", value: "C" },
  { label: "C- (1.67)", value: "C-" },
  { label: "D+ (1.33)", value: "D+" },
  { label: "D (1.00)", value: "D" },
  { label: "F (0.00)", value: "F" },
];

export type StandardItem = {
  id: string;
  name: string;
  levels: StandardLevel[];
};

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type MeetingTime = {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
};

export type ClassItem = {
  id: string;
  name: string;
  color: string;
  targetGrade: StandardLevel;
  manualGrade?: StandardLevel;
  standards: StandardItem[];
  professorName?: string;
  roomNumber?: string;
  officeHours?: string;
  meetingTimes?: MeetingTime[];
  periodCode?: string;
};

export type AttendanceStatus = "present" | "absent" | "excused";

export type ClubMeetingTime = {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
};

export type ClubItem = {
  id: string;
  name: string;
  role: string;
  icon?: string;
  color?: string;
  meetingTimes?: ClubMeetingTime[];
  attendance?: Record<string, AttendanceStatus>;
};

export type TaskCategory = "test" | "homework";

export type Task = {
  id: string;
  title: string;
  classId: string;
  dueDate: string;
  type: TaskCategory;
  estimatedHours: number;
  actualHours: number;
  completed: boolean;
  completedAt?: string;
  score?: StandardLevel;
  xpAwarded?: boolean;
};

export type StreakHabit = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  completedDates: Record<string, boolean>;
};

export type StudySession = {
  id: string;
  date: string;
  minutes: number;
  taskId?: string;
};

export type LearningMaterial = {
  id: string;
  classId: string;
  title: string;
  content: string;
  createdAt: string;
};

export type LearningFlashcard = {
  front: string;
  back: string;
};

export type LearningQuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type LearningBundle = {
  id: string;
  classId: string;
  title: string;
  summary: string;
  notes: { heading: string; bullets: string[] }[];
  flashcards: LearningFlashcard[];
  quiz: LearningQuizQuestion[];
  materialIds: string[];
  createdAt: string;
};

// --- GAMIFICATION ---
const XP_PER_COMPLETED_TASK = 50;
const XP_PER_FOCUS_SESSION = 25;

function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return 100 * n + 25 * n * (n - 1);
}

function getGamificationProgress(totalXp: number) {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;

  while (safeXp >= xpRequiredForLevel(level + 1)) {
    level += 1;
    if (level > 1000) break;
  }

  const currentLevelXp = xpRequiredForLevel(level);
  const nextLevelXp = xpRequiredForLevel(level + 1);
  const xpIntoLevel = safeXp - currentLevelXp;
  const xpForThisLevel = Math.max(1, nextLevelXp - currentLevelXp);

  return {
    totalXp: safeXp,
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpForThisLevel,
    progressPercent: Math.min(100, Math.round((xpIntoLevel / xpForThisLevel) * 100)),
    xpToNextLevel: Math.max(0, nextLevelXp - safeXp),
  };
}

type LocalClanStore = {
  clan: { id: string; name: string; join_code: string; created_by: string };
  displayName: string;
  studyMinutes: number;
  joinedAt?: string;
};

function generateLocalClanCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) code += alphabet[bytes[i] % alphabet.length];
    return code;
  }
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

const LOCAL_CLAN_STORAGE_PREFIX = "wjstudy_clan_v2_";

export const CLUB_ICON_OPTIONS = ["👥", "🤖", "🏐", "⚽", "🏀", "🎨", "🎭", "🎵", "♟️", "💻", "🚀", "📖"];

export const COLOR_PALETTE = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899",
  "#06B6D4", "#6366F1", "#14B8A6", "#EAB308", "#F43F5E"
];

// --- LEGACY DEMO DATA (never used for new accounts) ---
export const DEFAULT_CLASSES: ClassItem[] = [
  {
    id: "1",
    name: "Mathematics",
    color: "#3B82F6",
    targetGrade: "A",
    manualGrade: "B+",
    standards: [
      { id: "s1", name: "S1: Linear Equations & Systems", levels: ["A+", "A-"] },
      { id: "s2", name: "S2: Quadratic & Polynomial Functions", levels: ["A-"] },
      { id: "s3", name: "S3: Vector Analysis & Matrices", levels: ["C+"] },
    ],
    professorName: "Dr. Alan Turing",
    roomNumber: "Sci-Bldg 402",
    officeHours: "Mon/Wed 10-11 AM",
    meetingTimes: [
      { day: "Monday", startTime: "09:00", endTime: "10:30" },
      { day: "Wednesday", startTime: "09:00", endTime: "10:30" },
    ],
  },
  {
    id: "2",
    name: "Physics",
    color: "#10B981",
    targetGrade: "B+",
    manualGrade: "B",
    standards: [
      { id: "s4", name: "S1: Newtonian Kinematics", levels: ["A-"] },
      { id: "s5", name: "S2: Thermodynamics & Heat", levels: ["C+"] },
      { id: "s6", name: "S3: Electromagnetic Waves", levels: ["D"] },
    ],
    professorName: "Dr. Marie Curie",
    roomNumber: "Lab 204",
    officeHours: "Tue 2-4 PM",
    meetingTimes: [
      { day: "Tuesday", startTime: "11:00", endTime: "12:30" },
      { day: "Thursday", startTime: "11:00", endTime: "12:30" },
    ],
  },
  {
    id: "3",
    name: "Literature & Composition",
    color: "#8B5CF6",
    targetGrade: "A",
    manualGrade: "A",
    standards: [
      { id: "s7", name: "S1: Critical Thesis Development", levels: ["A+", "A+"] },
      { id: "s8", name: "S2: Textual Analysis & Evidence", levels: ["A-"] },
    ],
    professorName: "Prof. Toni Morrison",
    roomNumber: "Arts 101",
    officeHours: "Fri 1-2 PM",
    meetingTimes: [
      { day: "Monday", startTime: "14:00", endTime: "15:00" },
      { day: "Wednesday", startTime: "14:00", endTime: "15:00" },
      { day: "Friday", startTime: "14:00", endTime: "15:00" },
    ],
  },
];

export const DEFAULT_CLUBS: ClubItem[] = [
  {
    id: "c1",
    name: "Robotics Club",
    role: "Lead Engineer",
    icon: "🤖",
    color: "#EC4899",
    meetingTimes: [
      { day: "Thursday", startTime: "16:00", endTime: "17:30" },
    ],
    attendance: {
      "2026-09-10": "present",
      "2026-09-17": "present",
      "2026-09-24": "present",
    },
  },
  {
    id: "c2",
    name: "Volleyball Club",
    role: "Team Captain",
    icon: "🏐",
    color: "#F59E0B",
    meetingTimes: [
      { day: "Tuesday", startTime: "15:30", endTime: "17:00" },
      { day: "Thursday", startTime: "15:30", endTime: "17:00" },
    ],
    attendance: {
      "2026-09-08": "present",
      "2026-09-15": "excused",
    },
  },
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: "101",
    title: "Midterm Physics Exam",
    classId: "2",
    dueDate: "2026-09-25",
    type: "test",
    estimatedHours: 4,
    actualHours: 1.5,
    completed: false,
  },
  {
    id: "102",
    title: "Calculus Problem Set 4",
    classId: "1",
    dueDate: "2026-09-23",
    type: "homework",
    estimatedHours: 2,
    actualHours: 2,
    completed: true,
    score: "A",
  },
  {
    id: "103",
    title: "Literary Essay Draft",
    classId: "3",
    dueDate: "2026-09-28",
    type: "homework",
    estimatedHours: 3,
    actualHours: 0.5,
    completed: false,
  },
];

export const DEFAULT_STREAKS: StreakHabit[] = [
  {
    id: "str-1",
    name: "Daily Study (2 Hours)",
    color: "#3B82F6",
    createdAt: "2026-09-01",
    completedDates: {
      "2026-09-18": true,
      "2026-09-19": true,
      "2026-09-20": true,
      "2026-09-21": true,
      "2026-09-22": true,
    },
  },
  {
    id: "str-2",
    name: "Review Flashcards",
    color: "#10B981",
    createdAt: "2026-09-05",
    completedDates: {
      "2026-09-20": true,
      "2026-09-21": true,
      "2026-09-22": true,
    },
  },
];

// Every new account starts with a genuinely blank workspace. The legacy ID lists
// also remove the sample records that older versions wrote to Supabase/localStorage.
const EMPTY_CLASSES: ClassItem[] = [];
const EMPTY_CLUBS: ClubItem[] = [];
const EMPTY_TASKS: Task[] = [];
const EMPTY_STREAKS: StreakHabit[] = [];

const LEGACY_DEMO_CLASS_IDS = new Set(["1", "2", "3"]);
const LEGACY_DEMO_CLUB_IDS = new Set(["c1", "c2"]);
const LEGACY_DEMO_TASK_IDS = new Set(["101", "102", "103"]);
const LEGACY_DEMO_STREAK_IDS = new Set(["str-1", "str-2"]);

function withoutLegacyDemoItems<T extends { id: string }>(items: T[], legacyIds: Set<string>): T[] {
  return items.filter((item) => !legacyIds.has(item.id));
}

// --- SCHOOL ACADEMIC CALENDAR BREAK DEFINITIONS (2026 - 2027) ---
export type CalendarDayType = "school" | "break" | "staff_only" | "early_dismissal" | "weekend";

export type SchoolCalendarEvent = {
  name: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  type: "break" | "staff_only" | "early_dismissal";
};

export const SCHOOL_CALENDAR_2026_2027: SchoolCalendarEvent[] = [
  // Summer break before the 2026-2027 school year
  { name: "Summer Break", startDate: "2026-07-01", endDate: "2026-08-09", type: "break" },

  // 2026-2027 Fall Semester
  { name: "Vietnamese National Holiday", startDate: "2026-08-31", endDate: "2026-09-02", type: "break" },
  { name: "Faculty PD (No School)", startDate: "2026-09-25", endDate: "2026-09-25", type: "staff_only" },
  { name: "Parent-Teacher Conferences (No School for Students)", startDate: "2026-10-08", endDate: "2026-10-09", type: "break" },
  { name: "Fall Break", startDate: "2026-10-12", endDate: "2026-10-16", type: "break" },
  { name: "Culture Day (No School)", startDate: "2026-11-24", endDate: "2026-11-24", type: "break" },
  { name: "Faculty PD (No School)", startDate: "2026-11-27", endDate: "2026-11-27", type: "staff_only" },
  { name: "Early Dismissal - 12:15 pm", startDate: "2026-12-18", endDate: "2026-12-18", type: "early_dismissal" },
  { name: "Winter Break", startDate: "2026-12-19", endDate: "2027-01-03", type: "break" },

  // 2027 Spring Semester
  { name: "Faculty PD (No School)", startDate: "2027-01-04", endDate: "2027-01-04", type: "staff_only" },
  { name: "Tet Holiday", startDate: "2027-02-03", endDate: "2027-02-12", type: "break" },
  { name: "Parent-Teacher Conferences (No School)", startDate: "2027-03-26", endDate: "2027-03-26", type: "break" },
  { name: "Spring Break", startDate: "2027-03-29", endDate: "2027-04-02", type: "break" },
  { name: "Vietnamese Kings Day (No School)", startDate: "2027-04-16", endDate: "2027-04-16", type: "break" },
  { name: "Reunification Day Holiday", startDate: "2027-04-29", endDate: "2027-04-30", type: "break" },
  { name: "Faculty PD (No School)", startDate: "2027-05-21", endDate: "2027-05-21", type: "staff_only" },
  { name: "Early Dismissal - 12:15 pm", startDate: "2027-06-10", endDate: "2027-06-10", type: "early_dismissal" },

  // Summer break after the final student day
  { name: "Summer Break", startDate: "2027-06-11", endDate: "2027-08-09", type: "break" },
];

export function getCalendarDayStatus(dateStr: string, isWeekend: boolean) {
  for (const event of SCHOOL_CALENDAR_2026_2027) {
    if (dateStr >= event.startDate && dateStr <= event.endDate) {
      return {
        type: event.type,
        label: event.name,
      };
    }
  }

  if (isWeekend) {
    return { type: "weekend" as const, label: "Weekend" };
  }

  return { type: "school" as const, label: "School Day" };
}

// --- HELPER FUNCTIONS ---
export function pointsToLetter(pts: number): StandardLevel {
  if (pts >= 4.17) return "A+";
  if (pts >= 3.84) return "A";
  if (pts >= 3.5) return "A-";
  if (pts >= 3.17) return "B+";
  if (pts >= 2.84) return "B";
  if (pts >= 2.5) return "B-";
  if (pts >= 2.17) return "C+";
  if (pts >= 1.84) return "C";
  if (pts >= 1.5) return "C-";
  if (pts >= 1.17) return "D+";
  if (pts >= 0.5) return "D";
  return "F";
}

export function parseGradeToPoints(
  grade: number | string | null | undefined
): number | null {
  if (grade === null || grade === undefined || String(grade).trim() === "") {
    return null;
  }
  const strVal = String(grade).trim().toUpperCase();
  if (LETTER_POINTS[strVal as StandardLevel] !== undefined) {
    return LETTER_POINTS[strVal as StandardLevel];
  }
  if (!isNaN(Number(strVal))) {
    const num = Number(strVal);
    if (num <= 4.33) return Math.max(0, num);
  }
  return null;
}

export function calculateOverallGrade(standards: StandardItem[] = []) {
  const evaluated = (standards || []).filter(
    (s) => s && Array.isArray(s.levels) && s.levels.length > 0
  );
  if (evaluated.length === 0) {
    return {
      letter: "N/A" as StandardLevel | "N/A",
      label: "No Standards Evaluated",
      gpa: 0,
      evaluatedCount: 0,
    };
  }

  let totalGpa = 0;

  evaluated.forEach((s) => {
    const sum = s.levels.reduce(
      (acc, lvl) => acc + (STANDARD_SCALE[lvl]?.points ?? 0),
      0
    );
    const stdAvg = sum / s.levels.length;
    totalGpa += stdAvg;
  });

  const avgGpa = totalGpa / evaluated.length;
  const letter = pointsToLetter(avgGpa);
  const label = STANDARD_SCALE[letter]?.label ?? "Evaluated";

  return { letter, label, gpa: avgGpa, evaluatedCount: evaluated.length };
}

export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekDates(baseDate: Date): Date[] {
  const dayOfWeek = baseDate.getDay();
  const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + distanceToMon);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d);
  }
  return week;
}

export function calculateCurrentStreak(completedDates: Record<string, boolean>): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = formatDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  let checkDate = new Date(today);
  if (!completedDates[todayKey] && completedDates[yesterdayKey]) {
    checkDate = yesterday;
  } else if (!completedDates[todayKey] && !completedDates[yesterdayKey]) {
    return 0;
  }

  while (true) {
    const key = formatDateKey(checkDate);
    if (completedDates[key]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function calculateBestStreak(completedDates: Record<string, boolean>): number {
  const sortedKeys = Object.keys(completedDates)
    .filter((k) => completedDates[k])
    .sort();

  if (sortedKeys.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedKeys.length; i++) {
    const prev = new Date(sortedKeys[i - 1]);
    const curr = new Date(sortedKeys[i]);
    const diffTime = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

function normalizeClubsData(rawClubs: any[]): ClubItem[] {
  if (!Array.isArray(rawClubs)) return [];
  return rawClubs.map((club) => {
    let meetingTimes: ClubMeetingTime[] = [];
    if (Array.isArray(club.meetingTimes)) {
      meetingTimes = club.meetingTimes;
    } else if (club.meetingTime) {
      const legacyDay = (club.meetingDay || "Thursday").replace(/s$/, "");
      const validDay: DayOfWeek = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ].includes(legacyDay)
        ? (legacyDay as DayOfWeek)
        : "Thursday";

      meetingTimes = [
        {
          day: validDay,
          startTime: club.meetingTime.startTime || "16:00",
          endTime: club.meetingTime.endTime || "17:30",
        },
      ];
    }

    return {
      id: club.id || Date.now().toString(),
      name: club.name || "Untitled Club",
      role: club.role || "Member",
      icon: club.icon || "👥",
      color: club.color || "#EC4899",
      attendance: club.attendance || {},
      meetingTimes,
    };
  });
}

const safeStorageGet = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch (err) {
    return fallback;
  }
};

type AppLanguage = "en" | "vi" | "ko" | "ja" | "es" | "zh";
type AppThemeMode = "dark" | "light";
type AppAccent = "blue" | "violet" | "emerald" | "rose" | "amber";

type AppSettings = {
  language: AppLanguage;
  theme: AppThemeMode;
  accent: AppAccent;
  profileName: string;
  profileAvatar: string;
  weeklyStudyGoalHours: number;
  onboardingCompleted: boolean;
  notifications: {
    taskReminders: boolean;
    deadlineAlerts: boolean;
    focusReminders: boolean;
  };
};

type PersistedFocusTimerState = {
  version: 1;
  taskId: string;
  mode: "work" | "break";
  isRunning: boolean;
  timeLeft: number;
  baseElapsedSeconds: number;
  startedAt: number | null;
  sessionId: string | null;
  recordedMinutes: number;
  xpAwarded: boolean;
  updatedAt: number;
};

const FOCUS_TIMER_STORAGE_PREFIX = "tracker_focus_timer_state_v1_";

function normalizePersistedFocusTimerState(value: unknown): PersistedFocusTimerState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || typeof raw.taskId !== "string" || !raw.taskId) return null;
  const mode = raw.mode === "break" ? "break" : "work";
  const isRunning = Boolean(raw.isRunning);
  const timeLeft = Math.max(0, Math.floor(Number(raw.timeLeft) || 0));
  const baseElapsedSeconds = Math.max(0, Number(raw.baseElapsedSeconds) || 0);
  const startedAt = raw.startedAt == null ? null : Number(raw.startedAt);
  const sessionId = typeof raw.sessionId === "string" && raw.sessionId ? raw.sessionId : null;
  const recordedMinutes = Math.max(0, Math.floor(Number(raw.recordedMinutes) || 0));
  const xpAwarded = Boolean(raw.xpAwarded);
  const updatedAt = Math.max(0, Number(raw.updatedAt) || 0);

  if (isRunning && startedAt !== null && !Number.isFinite(startedAt)) return null;

  return {
    version: 1,
    taskId: raw.taskId,
    mode,
    isRunning,
    timeLeft,
    baseElapsedSeconds,
    startedAt: Number.isFinite(startedAt as number) ? startedAt : null,
    sessionId,
    recordedMinutes,
    xpAwarded,
    updatedAt,
  };
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  language: "en",
  theme: "dark",
  accent: "blue",
  profileName: "",
  profileAvatar: "🎓",
  weeklyStudyGoalHours: 10,
  onboardingCompleted: false,
  notifications: {
    taskReminders: true,
    deadlineAlerts: true,
    focusReminders: false,
  },
};

const APP_ACCENT_VALUES: Record<AppAccent, string> = {
  blue: "#2563EB",
  violet: "#7C3AED",
  emerald: "#059669",
  rose: "#E11D48",
  amber: "#D97706",
};

const MAIN_UI_TEXT: Record<AppLanguage, Record<string, string>> = {
  "en": {},
  "vi": {
    "Sign in": "Đăng nhập",
    "Sign up": "Đăng ký",
    "Built for students": "Dành cho học sinh",
    "Study smarter.": "Học thông minh hơn.",
    "Know exactly where you stand.": "Biết chính xác bạn đang ở đâu.",
    "Get started free": "Bắt đầu miễn phí",
    "I already have an account": "Tôi đã có tài khoản",
    "Target Grade Simulator": "Mô phỏng điểm mục tiêu",
    "Example": "Ví dụ",
    "Current grade": "Điểm hiện tại",
    "Target grade": "Điểm mục tiêu",
    "Required average on upcoming standards": "Điểm trung bình cần đạt ở các tiêu chuẩn sắp tới",
    "about": "khoảng",
    "pts": "điểm",
    "Everything you need to stay on top of school": "Mọi thứ bạn cần để theo sát việc học",
    "How it works": "Cách hoạt động",
    "Ready to level up your grades?": "Sẵn sàng nâng điểm của bạn?",
    "Create your WJ Study account and set up your first class in minutes.": "Tạo tài khoản WJ Study và thiết lập lớp học đầu tiên trong vài phút.",
    "Create your account": "Tạo tài khoản",
    "Privacy Policy": "Chính sách bảo mật",
    "School Email": "Email trường",
    "Password": "Mật khẩu",
    "Create Account": "Tạo tài khoản",
    "Sign In": "Đăng nhập",
    "Or continue with": "Hoặc tiếp tục với",
    "Sign in with Google": "Đăng nhập bằng Google",
    "Already have an account?": "Đã có tài khoản?",
    "Don't have an account yet?": "Chưa có tài khoản?",
    "Back to home": "Về trang chủ",
    "Student": "Học sinh",
    "Cum GPA / Grade": "GPA tích lũy / Điểm",
    "Level": "Cấp",
    "XP": "XP",
    "Focus": "Tập trung",
    "Work": "Học",
    "Break": "Nghỉ",
    "Focus Target": "Mục tiêu tập trung",
    "-- Choose a task --": "-- Chọn nhiệm vụ --",
    "Synced": "Đã đồng bộ",
    "Syncing...": "Đang đồng bộ...",
    "Error": "Lỗi",
    "Class Roster": "Danh sách lớp",
    "AI PowerSchool Scan": "Quét PowerSchool bằng AI",
    "Add": "Thêm",
    "AI PowerSchool Photo Analyzer": "Phân tích ảnh PowerSchool bằng AI",
    "Click to upload PowerSchool screenshot": "Nhấp để tải ảnh chụp PowerSchool",
    "Supports PNG, JPG, WEBP screenshots": "Hỗ trợ ảnh PNG, JPG, WEBP",
    "Cancel": "Hủy",
    "Save": "Lưu",
    "Exp:": "Mã:",
    "Rm:": "Phòng:",
    "Prof:": "GV:",
    "Grade:": "Điểm:",
    "Auto": "Tự động",
    "Standards": "Tiêu chuẩn",
    "Clubs": "Câu lạc bộ",
    "AI SchoolsBuddy Scan": "Quét SchoolsBuddy bằng AI",
    "AI SchoolsBuddy Photo Analyzer": "Phân tích ảnh SchoolsBuddy bằng AI",
    "Click to upload SchoolsBuddy screenshot": "Nhấp để tải ảnh chụp SchoolsBuddy",
    "Add Timeslot:": "Thêm khung giờ:",
    "Add Club": "Thêm CLB",
    "No timeslots assigned": "Chưa có khung giờ",
    "Slot": "Khung giờ",
    "Recommended Focus Target": "Mục tiêu tập trung đề xuất",
    "Focus on:": "Tập trung vào:",
    "Start Focus": "Bắt đầu tập trung",
    "Quick Add Assignment": "Thêm nhanh bài tập",
    "Task title...": "Tên nhiệm vụ...",
    "Add a class first": "Trước tiên hãy thêm một lớp",
    "Homework": "Bài tập",
    "Test / Exam": "Bài kiểm tra / Thi",
    "hrs": "giờ",
    "Add Task": "Thêm nhiệm vụ",
    "Schedule & Tasks": "Lịch & Nhiệm vụ",
    "All": "Tất cả",
    "Active": "Đang làm",
    "Done": "Đã xong",
    "No tasks match the filter.": "Không có nhiệm vụ phù hợp.",
    "Due:": "Hạn:",
    "Calendar": "Lịch",
    "Streaks": "Chuỗi",
    "Learning": "Học tập",
    "Timetable": "Thời khóa biểu",
    "Grades": "Điểm",
    "Grade Simulator": "Mô phỏng điểm",
    "AI Planner": "Trình lập kế hoạch AI",
    "Analytics": "Phân tích",
    "Clan": "Nhóm",
    "Study Clan": "Nhóm học tập",
    "Join a clan and compete on actual study time recorded by Focus sessions.": "Tham gia nhóm và thi đua dựa trên thời gian học thực tế từ các phiên tập trung.",
    "Reset clan": "Đặt lại nhóm",
    "Your rank": "Xếp hạng của bạn",
    "Create a clan": "Tạo nhóm",
    "Clan name": "Tên nhóm",
    "Your display name": "Tên hiển thị",
    "Create clan": "Tạo nhóm",
    "Join a clan": "Tham gia nhóm",
    "6-character join code": "Mã tham gia 6 ký tự",
    "Join clan": "Tham gia nhóm",
    "Having trouble with an old clan?": "Gặp vấn đề với nhóm cũ?",
    "Study leaderboard": "Bảng xếp hạng học tập",
    "Focus time": "Thời gian tập trung",
    "No members yet.": "Chưa có thành viên.",
    "AI Study Planner": "Trình lập kế hoạch học tập AI",
    "Tasks": "Nhiệm vụ",
    "Planned time": "Thời gian dự kiến",
    "Use this as catch-up, review, or rest time.": "Dùng thời gian này để bù bài, ôn tập hoặc nghỉ.",
    "Start focus on this task": "Bắt đầu tập trung cho nhiệm vụ này",
    "Some work does not fit in the next 7 days": "Một số việc không thể xếp trong 7 ngày tới",
    "Study time": "Thời gian học",
    "actual logged study time": "thời gian học thực tế đã ghi nhận",
    "Task completion": "Hoàn thành nhiệm vụ",
    "This week": "Tuần này",
    "Missed deadlines": "Trễ hạn",
    "unfinished past due": "chưa hoàn thành và đã quá hạn",
    "Weekly study time": "Thời gian học tuần này",
    "Focus minutes recorded during the current Monday–Sunday week": "Số phút tập trung được ghi nhận trong tuần Thứ Hai–Chủ Nhật hiện tại",
    "Goal": "Mục tiêu",
    "Study time vs. grades": "Thời gian học so với điểm",
    "Up to 8 of your classes, ranked by logged study time": "Tối đa 8 lớp, xếp theo thời gian học đã ghi nhận",
    "Add a class to see its grade and study-time comparison.": "Thêm lớp để xem điểm và so sánh thời gian học.",
    "Create a habit to start tracking streaks.": "Tạo thói quen để bắt đầu theo dõi chuỗi.",
    "Best": "Tốt nhất",
    "No unfinished tasks are past due.": "Không có nhiệm vụ chưa hoàn thành nào bị quá hạn.",
    "Open": "Mở",
    "Academic Calendar showing school days, official breaks, and holidays.": "Lịch học hiển thị ngày học, kỳ nghỉ và ngày lễ chính thức.",
    "Add Event": "Thêm sự kiện",
    "Review & Organize": "Xem xét & Sắp xếp",
    "Today": "Hôm nay",
    "Legend:": "Chú thích:",
    "School Day": "Ngày học",
    "School Break / Holiday": "Nghỉ học / Ngày lễ",
    "Staff PD (No Students)": "Đào tạo giáo viên (Không có học sinh)",
    "Early Dismissal": "Tan học sớm",
    "Standards-Based Grade Evaluation": "Đánh giá điểm theo tiêu chuẩn",
    "No standards added yet.": "Chưa có tiêu chuẩn nào.",
    "No class selected.": "Chưa chọn lớp.",
    "Habit Streaks": "Chuỗi thói quen",
    "This Week": "Tuần này",
    "Add New Habit Streak": "Thêm chuỗi thói quen",
    "Create Streak": "Tạo chuỗi",
    "Click checkmark to toggle": "Nhấn dấu kiểm để bật/tắt",
    "No habit streaks created yet. Create one above to begin!": "Chưa có chuỗi thói quen nào. Hãy tạo một chuỗi ở trên để bắt đầu!",
    "Best:": "Tốt nhất:",
    "Learning Lab": "Phòng học tập",
    "AI-generated from your materials": "Được AI tạo từ tài liệu của bạn",
    "Class": "Lớp",
    "Add class material": "Thêm tài liệu lớp",
    "Add material": "Thêm tài liệu",
    "Materials for this class": "Tài liệu của lớp này",
    "Your class material library is empty.": "Thư viện tài liệu của lớp đang trống.",
    "Regenerate": "Tạo lại",
    "Notes": "Ghi chú",
    "Flashcards": "Thẻ ghi nhớ",
    "AI Quiz": "Quiz AI",
    "No flashcards were generated.": "Chưa tạo thẻ ghi nhớ nào.",
    "Tap to flip": "Chạm để lật",
    "Previous": "Trước",
    "Next": "Tiếp",
    "Score:": "Điểm:",
    "Why:": "Giải thích:",
    "Reset quiz": "Đặt lại quiz",
    "Your learning pack will appear here": "Bộ học tập của bạn sẽ xuất hiện ở đây",
    "Select a class, add your materials, then generate custom notes, flashcards, and a practice quiz.": "Chọn lớp, thêm tài liệu rồi tạo ghi chú, thẻ ghi nhớ và quiz luyện tập tùy chỉnh.",
    "Weekly Class Schedule": "Lịch học hàng tuần",
    "Add Class Session to Timetable": "Thêm buổi học vào thời khóa biểu",
    "Select Class": "Chọn lớp",
    "Day": "Ngày",
    "Start Time": "Giờ bắt đầu",
    "End Time": "Giờ kết thúc",
    "Add Slot": "Thêm khung giờ",
    "Time": "Thời gian",
    "All day": "Cả ngày",
    "Academic Performance Summary": "Tổng quan kết quả học tập",
    "Cumulative GPA": "GPA tích lũy",
    "Target Grade": "Điểm mục tiêu",
    "Current Grade": "Điểm hiện tại",
    "Status:": "Trạng thái:",
    "No evaluations yet": "Chưa có đánh giá",
    "On Track for Target": "Đang đạt mục tiêu",
    "Below Target": "Dưới mục tiêu",
    "standards tracked": "tiêu chuẩn được theo dõi",
    "Course Parameters": "Thông số môn học",
    "Active Course": "Môn đang chọn",
    "Current Grade Level": "Mức điểm hiện tại",
    "Desired Target Grade": "Điểm mục tiêu mong muốn",
    "Select Standard(s) Being Tested:": "Chọn tiêu chuẩn được kiểm tra:",
    "SIMULATION RESULT": "KẾT QUẢ MÔ PHỎNG",
    "Required Score on Selected Standard(s)": "Điểm cần đạt trên tiêu chuẩn đã chọn",
    "Target Breakdown:": "Phân tích mục tiêu:",
    "selected standard(s).": "tiêu chuẩn đã chọn.",
    "Add event": "Thêm sự kiện",
    "Create a personal calendar event without Google Calendar.": "Tạo sự kiện lịch cá nhân không cần Google Calendar.",
    "Name": "Tên",
    "Type": "Loại",
    "Study": "Học",
    "Test": "Kiểm tra",
    "Club": "CLB",
    "Personal": "Cá nhân",
    "Other": "Khác",
    "Event details": "Chi tiết sự kiện",
    "Date": "Ngày",
    "Start": "Bắt đầu",
    "End": "Kết thúc",
    "Save event": "Lưu sự kiện",
    "Calendar cleanup": "Dọn lịch",
    "Review similar events": "Xem các sự kiện tương tự",
    "Refresh": "Làm mới",
    "No similar event groups found": "Không tìm thấy nhóm sự kiện tương tự",
    "Your imported event names are currently distinct enough to keep separate.": "Tên các sự kiện đã nhập hiện đủ khác nhau để giữ riêng.",
    "Possible match": "Có thể trùng",
    "Merge into this name": "Gộp thành tên này",
    "Times:": "Thời gian:",
    "Dates:": "Ngày:",
    "Keep separate": "Giữ riêng",
    "Merge selected": "Gộp đã chọn",
    "Delete event": "Xóa sự kiện",
    "Day view": "Chế độ ngày",
    "Events": "Sự kiện",
    "Customize event": "Tùy chỉnh sự kiện",
    "Logo / icon": "Logo / biểu tượng",
    "Color": "Màu",
    "Start time": "Giờ bắt đầu",
    "End time": "Giờ kết thúc",
    "All-day event": "Sự kiện cả ngày",
    "Details": "Chi tiết",
    "Reset customization": "Đặt lại tùy chỉnh",
    "Delete": "Xóa",
    "Classes": "Lớp học",
    "Learn": "Học",
    "Planner": "Lập kế hoạch"
  },
  "es": {
    "Sign in": "Iniciar sesión",
    "Sign up": "Registrarse",
    "Built for students": "Creado para estudiantes",
    "Study smarter.": "Estudia de forma más inteligente.",
    "Know exactly where you stand.": "Sabe exactamente dónde estás.",
    "Get started free": "Empieza gratis",
    "I already have an account": "Ya tengo una cuenta",
    "Target Grade Simulator": "Simulador de nota objetivo",
    "Example": "Ejemplo",
    "Current grade": "Nota actual",
    "Target grade": "Nota objetivo",
    "Required average on upcoming standards": "Promedio necesario en los próximos estándares",
    "about": "aprox.",
    "pts": "pts",
    "Everything you need to stay on top of school": "Todo lo que necesitas para llevar el control de la escuela",
    "How it works": "Cómo funciona",
    "Ready to level up your grades?": "¿Listo para mejorar tus notas?",
    "Create your WJ Study account and set up your first class in minutes.": "Crea tu cuenta de WJ Study y configura tu primera clase en minutos.",
    "Create your account": "Crear tu cuenta",
    "Privacy Policy": "Política de privacidad",
    "School Email": "Correo escolar",
    "Password": "Contraseña",
    "Create Account": "Crear cuenta",
    "Sign In": "Iniciar sesión",
    "Or continue with": "O continúa con",
    "Sign in with Google": "Iniciar sesión con Google",
    "Already have an account?": "¿Ya tienes una cuenta?",
    "Don't have an account yet?": "¿Aún no tienes una cuenta?",
    "Back to home": "Volver al inicio",
    "Student": "Estudiante",
    "Cum GPA / Grade": "GPA acumulado / Nota",
    "Level": "Nivel",
    "Focus": "Enfoque",
    "Work": "Trabajo",
    "Break": "Descanso",
    "Focus Target": "Objetivo de enfoque",
    "-- Choose a task --": "-- Elige una tarea --",
    "Synced": "Sincronizado",
    "Syncing...": "Sincronizando...",
    "Error": "Error",
    "Class Roster": "Lista de clases",
    "AI PowerSchool Scan": "Escaneo de PowerSchool con IA",
    "Add": "Añadir",
    "AI PowerSchool Photo Analyzer": "Analizador de fotos de PowerSchool con IA",
    "Click to upload PowerSchool screenshot": "Haz clic para subir una captura de PowerSchool",
    "Supports PNG, JPG, WEBP screenshots": "Admite capturas PNG, JPG y WEBP",
    "Cancel": "Cancelar",
    "Save": "Guardar",
    "Grade:": "Nota:",
    "Auto": "Automático",
    "Standards": "Estándares",
    "Clubs": "Clubes",
    "AI SchoolsBuddy Scan": "Escaneo de SchoolsBuddy con IA",
    "AI SchoolsBuddy Photo Analyzer": "Analizador de fotos de SchoolsBuddy con IA",
    "Click to upload SchoolsBuddy screenshot": "Haz clic para subir una captura de SchoolsBuddy",
    "Add Timeslot:": "Añadir horario:",
    "Add Club": "Añadir club",
    "No timeslots assigned": "No hay horarios asignados",
    "Slot": "Horario",
    "Recommended Focus Target": "Objetivo de enfoque recomendado",
    "Focus on:": "Enfócate en:",
    "Start Focus": "Iniciar enfoque",
    "Quick Add Assignment": "Añadir tarea rápidamente",
    "Task title...": "Título de la tarea...",
    "Add a class first": "Añade una clase primero",
    "Homework": "Tarea",
    "Test / Exam": "Prueba / Examen",
    "hrs": "h",
    "Add Task": "Añadir tarea",
    "Schedule & Tasks": "Horario y tareas",
    "All": "Todas",
    "Active": "Activas",
    "Done": "Hechas",
    "No tasks match the filter.": "No hay tareas que coincidan con el filtro.",
    "Due:": "Vence:",
    "Calendar": "Calendario",
    "Streaks": "Rachas",
    "Learning": "Aprendizaje",
    "Timetable": "Horario",
    "Grades": "Notas",
    "Grade Simulator": "Simulador de notas",
    "AI Planner": "Planificador IA",
    "Analytics": "Analítica",
    "Clan": "Clan",
    "Study Clan": "Clan de estudio",
    "Reset clan": "Restablecer clan",
    "Your rank": "Tu posición",
    "Create a clan": "Crear un clan",
    "Clan name": "Nombre del clan",
    "Your display name": "Tu nombre visible",
    "Create clan": "Crear clan",
    "Join a clan": "Unirse a un clan",
    "6-character join code": "Código de unión de 6 caracteres",
    "Join clan": "Unirse al clan",
    "Having trouble with an old clan?": "¿Problemas con un clan antiguo?",
    "Study leaderboard": "Clasificación de estudio",
    "Focus time": "Tiempo de enfoque",
    "No members yet.": "Aún no hay miembros.",
    "AI Study Planner": "Planificador de estudio IA",
    "Tasks": "Tareas",
    "Planned time": "Tiempo planificado",
    "Use this as catch-up, review, or rest time.": "Usa esto para ponerte al día, repasar o descansar.",
    "Start focus on this task": "Enfocarse en esta tarea",
    "Some work does not fit in the next 7 days": "Algunas tareas no caben en los próximos 7 días",
    "Study time": "Tiempo de estudio",
    "Task completion": "Finalización de tareas",
    "This week": "Esta semana",
    "Missed deadlines": "Fechas límite perdidas",
    "unfinished past due": "sin terminar y vencido",
    "Weekly study time": "Tiempo de estudio semanal",
    "Goal": "Meta",
    "Study time vs. grades": "Tiempo de estudio vs. notas",
    "Add a class to see its grade and study-time comparison.": "Añade una clase para ver su nota y comparar el tiempo de estudio.",
    "Create a habit to start tracking streaks.": "Crea un hábito para empezar a seguir rachas.",
    "Best": "Mejor",
    "No unfinished tasks are past due.": "No hay tareas sin terminar vencidas.",
    "Open": "Abrir",
    "Academic Calendar showing school days, official breaks, and holidays.": "Calendario académico con días lectivos, vacaciones oficiales y festivos.",
    "Add Event": "Añadir evento",
    "Review & Organize": "Revisar y organizar",
    "Today": "Hoy",
    "Legend:": "Leyenda:",
    "School Day": "Día escolar",
    "School Break / Holiday": "Vacaciones / Festivo",
    "Staff PD (No Students)": "Formación del personal (Sin estudiantes)",
    "Early Dismissal": "Salida temprana",
    "Habit Streaks": "Rachas de hábitos",
    "This Week": "Esta semana",
    "Add New Habit Streak": "Añadir nueva racha",
    "Create Streak": "Crear racha",
    "Click checkmark to toggle": "Haz clic en la marca para cambiar",
    "No habit streaks created yet. Create one above to begin!": "Aún no hay rachas. Crea una arriba para empezar.",
    "Learning Lab": "Laboratorio de aprendizaje",
    "AI-generated from your materials": "Generado por IA a partir de tus materiales",
    "Class": "Clase",
    "Add class material": "Añadir material de clase",
    "Add material": "Añadir material",
    "Materials for this class": "Materiales de esta clase",
    "Your class material library is empty.": "La biblioteca de materiales de esta clase está vacía.",
    "Regenerate": "Regenerar",
    "Notes": "Notas",
    "Flashcards": "Tarjetas",
    "AI Quiz": "Cuestionario IA",
    "No flashcards were generated.": "No se generaron tarjetas.",
    "Tap to flip": "Toca para voltear",
    "Previous": "Anterior",
    "Next": "Siguiente",
    "Score:": "Puntuación:",
    "Why:": "Por qué:",
    "Reset quiz": "Restablecer cuestionario",
    "Your learning pack will appear here": "Tu paquete de aprendizaje aparecerá aquí",
    "Weekly Class Schedule": "Horario semanal de clases",
    "Add Class Session to Timetable": "Añadir sesión al horario",
    "Select Class": "Seleccionar clase",
    "Day": "Día",
    "Start Time": "Hora de inicio",
    "End Time": "Hora de fin",
    "Add Slot": "Añadir horario",
    "Time": "Hora",
    "All day": "Todo el día",
    "Academic Performance Summary": "Resumen del rendimiento académico",
    "Cumulative GPA": "GPA acumulado",
    "Target Grade": "Nota objetivo",
    "Current Grade": "Nota actual",
    "Status:": "Estado:",
    "No evaluations yet": "Aún no hay evaluaciones",
    "On Track for Target": "En camino al objetivo",
    "Below Target": "Por debajo del objetivo",
    "Course Parameters": "Parámetros del curso",
    "Active Course": "Curso activo",
    "Current Grade Level": "Nivel de nota actual",
    "Desired Target Grade": "Nota objetivo deseada",
    "Select Standard(s) Being Tested:": "Selecciona los estándares evaluados:",
    "SIMULATION RESULT": "RESULTADO DE LA SIMULACIÓN",
    "Required Score on Selected Standard(s)": "Puntuación necesaria en los estándares seleccionados",
    "Target Breakdown:": "Desglose del objetivo:",
    "Add event": "Añadir evento",
    "Name": "Nombre",
    "Type": "Tipo",
    "Study": "Estudio",
    "Test": "Prueba",
    "Club": "Club",
    "Personal": "Personal",
    "Other": "Otro",
    "Event details": "Detalles del evento",
    "Date": "Fecha",
    "Start": "Inicio",
    "End": "Fin",
    "Save event": "Guardar evento",
    "Calendar cleanup": "Limpieza del calendario",
    "Review similar events": "Revisar eventos similares",
    "Refresh": "Actualizar",
    "No similar event groups found": "No se encontraron grupos similares",
    "Possible match": "Posible coincidencia",
    "Merge into this name": "Combinar con este nombre",
    "Times:": "Horarios:",
    "Dates:": "Fechas:",
    "Keep separate": "Mantener separado",
    "Merge selected": "Combinar seleccionados",
    "Delete event": "Eliminar evento",
    "Day view": "Vista diaria",
    "Events": "Eventos",
    "Customize event": "Personalizar evento",
    "Logo / icon": "Logo / icono",
    "Color": "Color",
    "Start time": "Hora de inicio",
    "End time": "Hora de fin",
    "All-day event": "Evento de todo el día",
    "Details": "Detalles",
    "Reset customization": "Restablecer personalización",
    "Delete": "Eliminar",
    "Classes": "Clases",
    "Learn": "Aprender",
    "Planner": "Planificador",
    "Create a personal calendar event without Google Calendar.": "Crea un evento de calendario personal sin Google Calendar.",
    "Your imported event names are currently distinct enough to keep separate.": "Los nombres importados son lo bastante distintos para mantenerlos separados.",
    "Select a class, add your materials, then generate custom notes, flashcards, and a practice quiz.": "Selecciona una clase, añade tus materiales y genera notas, tarjetas y un cuestionario de práctica personalizados.",
    "Focus minutes recorded during the current Monday–Sunday week": "Minutos de enfoque registrados durante la semana actual de lunes a domingo",
    "Up to 8 of your classes, ranked by logged study time": "Hasta 8 de tus clases, ordenadas por tiempo de estudio registrado",
    "standards tracked": "estándares seguidos",
    "selected standard(s).": "estándar(es) seleccionados.",
    "No standards added yet.": "Aún no se han añadido estándares.",
    "No class selected.": "No hay clase seleccionada."
  },
  "zh": {
    "Sign in": "登录",
    "Sign up": "注册",
    "Built for students": "为学生打造",
    "Study smarter.": "更聪明地学习。",
    "Know exactly where you stand.": "清楚了解你的学习情况。",
    "Get started free": "免费开始",
    "I already have an account": "我已经有账号",
    "Target Grade Simulator": "目标成绩模拟器",
    "Example": "示例",
    "Current grade": "当前成绩",
    "Target grade": "目标成绩",
    "Required average on upcoming standards": "即将测试标准所需平均分",
    "about": "约",
    "pts": "分",
    "Everything you need to stay on top of school": "管理学习所需的一切",
    "How it works": "使用方法",
    "Ready to level up your grades?": "准备提升你的成绩了吗？",
    "Create your WJ Study account and set up your first class in minutes.": "创建 WJ Study 账号，并在几分钟内设置第一门课程。",
    "Create your account": "创建账号",
    "Privacy Policy": "隐私政策",
    "School Email": "学校邮箱",
    "Password": "密码",
    "Create Account": "创建账号",
    "Sign In": "登录",
    "Or continue with": "或继续使用",
    "Sign in with Google": "使用 Google 登录",
    "Already have an account?": "已经有账号？",
    "Don't have an account yet?": "还没有账号？",
    "Back to home": "返回首页",
    "Student": "学生",
    "Cum GPA / Grade": "累计 GPA / 成绩",
    "Level": "等级",
    "Focus": "专注",
    "Work": "学习",
    "Break": "休息",
    "Focus Target": "专注目标",
    "-- Choose a task --": "-- 选择任务 --",
    "Synced": "已同步",
    "Syncing...": "同步中...",
    "Error": "错误",
    "Class Roster": "课程列表",
    "AI PowerSchool Scan": "AI PowerSchool 扫描",
    "Add": "添加",
    "Cancel": "取消",
    "Save": "保存",
    "Grade:": "成绩：",
    "Auto": "自动",
    "Standards": "标准",
    "Clubs": "社团",
    "AI SchoolsBuddy Scan": "AI SchoolsBuddy 扫描",
    "Add Timeslot:": "添加时间段：",
    "Add Club": "添加社团",
    "No timeslots assigned": "未分配时间段",
    "Slot": "时间段",
    "Recommended Focus Target": "推荐专注目标",
    "Focus on:": "专注于：",
    "Start Focus": "开始专注",
    "Quick Add Assignment": "快速添加任务",
    "Task title...": "任务标题...",
    "Add a class first": "请先添加课程",
    "Homework": "作业",
    "Test / Exam": "测试 / 考试",
    "hrs": "小时",
    "Add Task": "添加任务",
    "Schedule & Tasks": "日程与任务",
    "All": "全部",
    "Active": "进行中",
    "Done": "已完成",
    "No tasks match the filter.": "没有符合筛选条件的任务。",
    "Due:": "截止：",
    "Calendar": "日历",
    "Streaks": "连续打卡",
    "Learning": "学习",
    "Timetable": "课表",
    "Grades": "成绩",
    "Grade Simulator": "成绩模拟器",
    "AI Planner": "AI 规划器",
    "Analytics": "分析",
    "Clan": "学习小组",
    "Study Clan": "学习小组",
    "Reset clan": "重置小组",
    "Your rank": "你的排名",
    "Create a clan": "创建小组",
    "Clan name": "小组名称",
    "Your display name": "你的显示名称",
    "Create clan": "创建小组",
    "Join a clan": "加入小组",
    "6-character join code": "6 位加入码",
    "Join clan": "加入小组",
    "Study leaderboard": "学习排行榜",
    "Focus time": "专注时间",
    "No members yet.": "还没有成员。",
    "AI Study Planner": "AI 学习规划器",
    "Tasks": "任务",
    "Planned time": "计划时间",
    "Use this as catch-up, review, or rest time.": "可用于补学、复习或休息。",
    "Start focus on this task": "开始专注此任务",
    "Some work does not fit in the next 7 days": "部分任务无法安排在未来 7 天内",
    "Study time": "学习时间",
    "Task completion": "任务完成度",
    "This week": "本周",
    "Missed deadlines": "逾期任务",
    "unfinished past due": "未完成且已逾期",
    "Weekly study time": "每周学习时间",
    "Goal": "目标",
    "Study time vs. grades": "学习时间与成绩",
    "Add a class to see its grade and study-time comparison.": "添加课程以查看成绩和学习时间对比。",
    "Create a habit to start tracking streaks.": "创建习惯以开始记录连续天数。",
    "Best": "最佳",
    "No unfinished tasks are past due.": "没有未完成的逾期任务。",
    "Open": "打开",
    "Academic Calendar showing school days, official breaks, and holidays.": "显示上课日、官方假期和节日的学术日历。",
    "Add Event": "添加事件",
    "Review & Organize": "检查与整理",
    "Today": "今天",
    "Legend:": "图例：",
    "School Day": "上课日",
    "School Break / Holiday": "假期 / 节日",
    "Staff PD (No Students)": "教职工培训（无学生）",
    "Early Dismissal": "提前放学",
    "Habit Streaks": "习惯连续记录",
    "This Week": "本周",
    "Add New Habit Streak": "添加新习惯连续记录",
    "Create Streak": "创建连续记录",
    "Click checkmark to toggle": "点击勾选切换",
    "No habit streaks created yet. Create one above to begin!": "还没有习惯连续记录。创建一个开始吧！",
    "Learning Lab": "学习实验室",
    "AI-generated from your materials": "由你的材料生成的 AI 内容",
    "Class": "课程",
    "Add class material": "添加课程材料",
    "Add material": "添加材料",
    "Materials for this class": "本课程材料",
    "Your class material library is empty.": "本课程材料库为空。",
    "Regenerate": "重新生成",
    "Notes": "笔记",
    "Flashcards": "闪卡",
    "AI Quiz": "AI 测验",
    "No flashcards were generated.": "还没有生成闪卡。",
    "Tap to flip": "点击翻面",
    "Previous": "上一项",
    "Next": "下一项",
    "Score:": "分数：",
    "Why:": "原因：",
    "Reset quiz": "重置测验",
    "Your learning pack will appear here": "你的学习包会显示在这里",
    "Weekly Class Schedule": "每周课程安排",
    "Add Class Session to Timetable": "添加课程时段到课表",
    "Select Class": "选择课程",
    "Day": "日期",
    "Start Time": "开始时间",
    "End Time": "结束时间",
    "Add Slot": "添加时间段",
    "Time": "时间",
    "All day": "全天",
    "Academic Performance Summary": "学业表现概览",
    "Cumulative GPA": "累计 GPA",
    "Target Grade": "目标成绩",
    "Current Grade": "当前成绩",
    "Status:": "状态：",
    "No evaluations yet": "还没有评估",
    "On Track for Target": "正在达到目标",
    "Below Target": "低于目标",
    "Course Parameters": "课程参数",
    "Active Course": "当前课程",
    "Current Grade Level": "当前成绩等级",
    "Desired Target Grade": "期望目标成绩",
    "Select Standard(s) Being Tested:": "选择测试标准：",
    "SIMULATION RESULT": "模拟结果",
    "Required Score on Selected Standard(s)": "所选标准所需分数",
    "Target Breakdown:": "目标分解：",
    "Add event": "添加事件",
    "Create a personal calendar event without Google Calendar.": "创建无需 Google 日历的个人事件。",
    "Name": "名称",
    "Type": "类型",
    "Study": "学习",
    "Test": "测试",
    "Club": "社团",
    "Personal": "个人",
    "Other": "其他",
    "Event details": "事件详情",
    "Date": "日期",
    "Start": "开始",
    "End": "结束",
    "Save event": "保存事件",
    "Calendar cleanup": "日历整理",
    "Review similar events": "检查相似事件",
    "Refresh": "刷新",
    "No similar event groups found": "未找到相似事件组",
    "Your imported event names are currently distinct enough to keep separate.": "导入的事件名称目前足够不同，可以保持分开。",
    "Possible match": "可能匹配",
    "Merge into this name": "合并为此名称",
    "Times:": "时间：",
    "Dates:": "日期：",
    "Keep separate": "保持分开",
    "Merge selected": "合并所选",
    "Delete event": "删除事件",
    "Day view": "日视图",
    "Events": "事件",
    "Customize event": "自定义事件",
    "Logo / icon": "Logo / 图标",
    "Color": "颜色",
    "Start time": "开始时间",
    "End time": "结束时间",
    "All-day event": "全天事件",
    "Details": "详情",
    "Reset customization": "重置自定义",
    "Delete": "删除",
    "Classes": "课程",
    "Learn": "学习",
    "Planner": "规划器",
    "standards tracked": "已跟踪标准",
    "selected standard(s).": "所选标准。",
    "No standards added yet.": "尚未添加标准。",
    "No class selected.": "未选择课程。"
  },
  "ko": {
    "Sign in": "로그인",
    "Sign up": "회원가입",
    "Get started free": "무료로 시작",
    "I already have an account": "이미 계정이 있습니다",
    "Student": "학생",
    "Level": "레벨",
    "Focus": "집중",
    "Work": "학습",
    "Break": "휴식",
    "Focus Target": "집중 목표",
    "-- Choose a task --": "-- 과제 선택 --",
    "Synced": "동기화됨",
    "Syncing...": "동기화 중...",
    "Error": "오류",
    "Class Roster": "수업 목록",
    "Add": "추가",
    "Save": "저장",
    "Cancel": "취소",
    "Standards": "기준",
    "Clubs": "동아리",
    "Add Club": "동아리 추가",
    "No timeslots assigned": "시간표가 없습니다",
    "Slot": "시간대",
    "Start Focus": "집중 시작",
    "Quick Add Assignment": "과제 빠르게 추가",
    "Task title...": "과제 제목...",
    "Add a class first": "먼저 수업을 추가하세요",
    "Homework": "숙제",
    "Test / Exam": "시험 / 평가",
    "hrs": "시간",
    "Add Task": "과제 추가",
    "Schedule & Tasks": "일정 및 과제",
    "All": "전체",
    "Active": "진행 중",
    "Done": "완료",
    "Calendar": "캘린더",
    "Streaks": "연속 기록",
    "Learning": "학습",
    "Timetable": "시간표",
    "Grades": "성적",
    "Grade Simulator": "성적 시뮬레이터",
    "AI Planner": "AI 플래너",
    "Analytics": "분석",
    "Clan": "클랜",
    "Study Clan": "스터디 클랜",
    "Reset clan": "클랜 초기화",
    "Your rank": "내 순위",
    "Create a clan": "클랜 만들기",
    "Join a clan": "클랜 가입",
    "Join clan": "클랜 가입",
    "Study leaderboard": "스터디 순위표",
    "Focus time": "집중 시간",
    "No members yet.": "아직 멤버가 없습니다.",
    "Tasks": "과제",
    "Study time": "학습 시간",
    "This week": "이번 주",
    "Missed deadlines": "마감일 놓침",
    "Weekly study time": "주간 학습 시간",
    "Goal": "목표",
    "Add Event": "이벤트 추가",
    "Review & Organize": "검토 및 정리",
    "Today": "오늘",
    "School Day": "수업일",
    "School Break / Holiday": "방학 / 휴일",
    "Habit Streaks": "습관 연속 기록",
    "This Week": "이번 주",
    "Create Streak": "연속 기록 만들기",
    "Learning Lab": "학습 실험실",
    "Class": "수업",
    "Regenerate": "다시 생성",
    "Notes": "노트",
    "Flashcards": "플래시카드",
    "AI Quiz": "AI 퀴즈",
    "Previous": "이전",
    "Next": "다음",
    "Reset quiz": "퀴즈 초기화",
    "Weekly Class Schedule": "주간 수업 일정",
    "Select Class": "수업 선택",
    "Day": "요일",
    "Start Time": "시작 시간",
    "End Time": "종료 시간",
    "Add Slot": "시간대 추가",
    "Time": "시간",
    "All day": "하루 종일",
    "Cumulative GPA": "누적 GPA",
    "Target Grade": "목표 성적",
    "Current Grade": "현재 성적",
    "Status:": "상태:",
    "Course Parameters": "과목 매개변수",
    "Active Course": "활성 과목",
    "Current Grade Level": "현재 성적 레벨",
    "Desired Target Grade": "원하는 목표 성적",
    "Add event": "이벤트 추가",
    "Name": "이름",
    "Type": "유형",
    "Study": "학습",
    "Test": "시험",
    "Club": "동아리",
    "Personal": "개인",
    "Other": "기타",
    "Date": "날짜",
    "Start": "시작",
    "End": "종료",
    "Save event": "이벤트 저장",
    "Calendar cleanup": "캘린더 정리",
    "Review similar events": "유사 이벤트 검토",
    "Refresh": "새로고침",
    "Delete event": "이벤트 삭제",
    "Day view": "일 보기",
    "Events": "이벤트",
    "Customize event": "이벤트 사용자 지정",
    "Logo / icon": "로고 / 아이콘",
    "Color": "색상",
    "Start time": "시작 시간",
    "End time": "종료 시간",
    "All-day event": "종일 이벤트",
    "Details": "세부 정보",
    "Reset customization": "사용자 지정 초기화",
    "Delete": "삭제",
    "Classes": "수업",
    "Learn": "학습",
    "Planner": "플래너"
  },
  "ja": {
    "Sign in": "ログイン",
    "Sign up": "登録",
    "Get started free": "無料で始める",
    "I already have an account": "すでにアカウントがあります",
    "Student": "生徒",
    "Level": "レベル",
    "Focus": "集中",
    "Work": "学習",
    "Break": "休憩",
    "Focus Target": "集中目標",
    "-- Choose a task --": "-- タスクを選択 --",
    "Synced": "同期済み",
    "Syncing...": "同期中...",
    "Error": "エラー",
    "Class Roster": "クラス一覧",
    "Add": "追加",
    "Save": "保存",
    "Cancel": "キャンセル",
    "Standards": "基準",
    "Clubs": "クラブ",
    "Add Club": "クラブを追加",
    "No timeslots assigned": "時間帯がありません",
    "Slot": "時間帯",
    "Start Focus": "集中を開始",
    "Quick Add Assignment": "課題を追加",
    "Task title...": "課題タイトル...",
    "Add a class first": "先にクラスを追加してください",
    "Homework": "宿題",
    "Test / Exam": "テスト / 試験",
    "hrs": "時間",
    "Add Task": "タスクを追加",
    "Schedule & Tasks": "スケジュールとタスク",
    "All": "すべて",
    "Active": "進行中",
    "Done": "完了",
    "Calendar": "カレンダー",
    "Streaks": "連続記録",
    "Learning": "学習",
    "Timetable": "時間割",
    "Grades": "成績",
    "Grade Simulator": "成績シミュレーター",
    "AI Planner": "AIプランナー",
    "Analytics": "分析",
    "Clan": "クラン",
    "Study Clan": "学習クラン",
    "Reset clan": "クランをリセット",
    "Your rank": "あなたの順位",
    "Create a clan": "クランを作成",
    "Join a clan": "クランに参加",
    "Join clan": "クランに参加",
    "Study leaderboard": "学習ランキング",
    "Focus time": "集中時間",
    "No members yet.": "まだメンバーはいません。",
    "Tasks": "タスク",
    "Study time": "学習時間",
    "This week": "今週",
    "Missed deadlines": "期限切れ",
    "Weekly study time": "週間学習時間",
    "Goal": "目標",
    "Add Event": "イベントを追加",
    "Review & Organize": "確認と整理",
    "Today": "今日",
    "School Day": "授業日",
    "School Break / Holiday": "休校日 / 休日",
    "Habit Streaks": "習慣の連続記録",
    "This Week": "今週",
    "Create Streak": "連続記録を作成",
    "Learning Lab": "学習ラボ",
    "Class": "クラス",
    "Regenerate": "再生成",
    "Notes": "ノート",
    "Flashcards": "フラッシュカード",
    "AI Quiz": "AIクイズ",
    "Previous": "前へ",
    "Next": "次へ",
    "Reset quiz": "クイズをリセット",
    "Weekly Class Schedule": "週間クラススケジュール",
    "Select Class": "クラスを選択",
    "Day": "曜日",
    "Start Time": "開始時刻",
    "End Time": "終了時刻",
    "Add Slot": "時間帯を追加",
    "Time": "時間",
    "All day": "終日",
    "Cumulative GPA": "累積GPA",
    "Target Grade": "目標成績",
    "Current Grade": "現在の成績",
    "Status:": "状態:",
    "Course Parameters": "科目パラメータ",
    "Active Course": "選択中の科目",
    "Current Grade Level": "現在の成績レベル",
    "Desired Target Grade": "希望する目標成績",
    "Add event": "イベントを追加",
    "Name": "名前",
    "Type": "種類",
    "Study": "学習",
    "Test": "テスト",
    "Club": "クラブ",
    "Personal": "個人",
    "Other": "その他",
    "Date": "日付",
    "Start": "開始",
    "End": "終了",
    "Save event": "イベントを保存",
    "Calendar cleanup": "カレンダー整理",
    "Review similar events": "類似イベントを確認",
    "Refresh": "更新",
    "Delete event": "イベントを削除",
    "Day view": "日表示",
    "Events": "イベント",
    "Customize event": "イベントをカスタマイズ",
    "Logo / icon": "ロゴ / アイコン",
    "Color": "色",
    "Start time": "開始時刻",
    "End time": "終了時刻",
    "All-day event": "終日イベント",
    "Details": "詳細",
    "Reset customization": "カスタマイズをリセット",
    "Delete": "削除",
    "Classes": "クラス",
    "Learn": "学習",
    "Planner": "プランナー"
  }
};

Object.assign(MAIN_UI_TEXT.vi, { Pause: "Tạm dừng", "Start focus": "Bắt đầu tập trung", "Reset focus timer": "Đặt lại bộ đếm tập trung", "Focus session": "Phiên tập trung", "Choose a task to start focusing": "Chọn nhiệm vụ để bắt đầu tập trung", "Logout": "Đăng xuất", "Log Out": "Đăng xuất", "Privacy": "Quyền riêng tư", "Settings": "Cài đặt" });
Object.assign(MAIN_UI_TEXT.es, { Pause: "Pausar", "Start focus": "Iniciar enfoque", "Reset focus timer": "Restablecer temporizador", "Focus session": "Sesión de enfoque", "Choose a task to start focusing": "Elige una tarea para empezar a concentrarte", "Logout": "Cerrar sesión", "Log Out": "Cerrar sesión", Settings: "Configuración" });
Object.assign(MAIN_UI_TEXT.zh, { Pause: "暂停", "Start focus": "开始专注", "Reset focus timer": "重置专注计时器", "Focus session": "专注学习", "Choose a task to start focusing": "选择任务开始专注", "Logout": "退出登录", "Log Out": "退出登录", Settings: "设置" });
Object.assign(MAIN_UI_TEXT.ko, { Pause: "일시정지", "Start focus": "집중 시작", "Reset focus timer": "집중 타이머 초기화", "Focus session": "집중 세션", "Choose a task to start focusing": "집중할 과제를 선택하세요", "Logout": "로그아웃", "Log Out": "로그아웃", Settings: "설정" });
Object.assign(MAIN_UI_TEXT.ja, { Pause: "一時停止", "Start focus": "集中を開始", "Reset focus timer": "集中タイマーをリセット", "Focus session": "集中セッション", "Choose a task to start focusing": "集中するタスクを選択", "Logout": "ログアウト", "Log Out": "ログアウト", Settings: "設定" });

function translateMainText(language: AppLanguage, english: string): string {
  return MAIN_UI_TEXT[language]?.[english] ?? MAIN_UI_TEXT.en?.[english] ?? english;
}

const MAIN_WEEKDAY_TEXT: Record<AppLanguage, Record<string, string>> = {
  en: { Monday: "Monday", Tuesday: "Tuesday", Wednesday: "Wednesday", Thursday: "Thursday", Friday: "Friday", Saturday: "Saturday", Sunday: "Sunday" },
  vi: { Monday: "Thứ Hai", Tuesday: "Thứ Ba", Wednesday: "Thứ Tư", Thursday: "Thứ Năm", Friday: "Thứ Sáu", Saturday: "Thứ Bảy", Sunday: "Chủ Nhật" },
  es: { Monday: "Lunes", Tuesday: "Martes", Wednesday: "Miércoles", Thursday: "Jueves", Friday: "Viernes", Saturday: "Sábado", Sunday: "Domingo" },
  zh: { Monday: "星期一", Tuesday: "星期二", Wednesday: "星期三", Thursday: "星期四", Friday: "星期五", Saturday: "星期六", Sunday: "星期日" },
  ko: { Monday: "월요일", Tuesday: "화요일", Wednesday: "수요일", Thursday: "목요일", Friday: "금요일", Saturday: "토요일", Sunday: "일요일" },
  ja: { Monday: "月曜日", Tuesday: "火曜日", Wednesday: "水曜日", Thursday: "木曜日", Friday: "金曜日", Saturday: "土曜日", Sunday: "日曜日" },
};

const ONBOARDING_TEXT: Record<AppLanguage, Record<string, string>> = {
  en: {
    welcomeTitle: "Welcome to WJ Study", welcomeBody: "Let's set up your workspace in a few quick steps.",
    stepClasses: "Add your classes", stepClassesBody: "Start with the classes you are taking. You can add more later.", classPlaceholder: "e.g. Biology", addClass: "Add class", classAdded: "Class added",
    stepTasks: "Add a task", stepTasksBody: "Create your first assignment so your dashboard has something to track.", taskPlaceholder: "e.g. Read chapter 3", dueDate: "Due date", addTask: "Add task", taskAdded: "Task added",
    stepCalendar: "Connect your calendar", stepCalendarBody: "Bring in events from Google Calendar. This is optional and can be done later from Calendar.", connectCalendar: "Connect Google Calendar", calendarConnected: "Calendar permission is available", continueWithout: "Continue without connecting",
    stepGoal: "Set a study goal", stepGoalBody: "Choose a weekly study target. You can change this later.", hoursPerWeek: "hours per week",
    finishTitle: "You're ready to study", finishBody: "Your WJ Study workspace is ready. You can always change these settings later.",
    back: "Back", continue: "Continue", skip: "Skip setup", finish: "Finish setup", progress: "Step", of: "of",
  },
  vi: {
    welcomeTitle: "Chào mừng đến với WJ Study", welcomeBody: "Hãy thiết lập không gian học tập của bạn trong vài bước nhanh.",
    stepClasses: "Thêm lớp học", stepClassesBody: "Bắt đầu với các lớp bạn đang học. Bạn có thể thêm sau.", classPlaceholder: "VD: Sinh học", addClass: "Thêm lớp", classAdded: "Đã thêm lớp",
    stepTasks: "Thêm nhiệm vụ", stepTasksBody: "Tạo bài tập đầu tiên để bảng điều khiển có nội dung theo dõi.", taskPlaceholder: "VD: Đọc chương 3", dueDate: "Hạn nộp", addTask: "Thêm nhiệm vụ", taskAdded: "Đã thêm nhiệm vụ",
    stepCalendar: "Kết nối lịch", stepCalendarBody: "Nhập sự kiện từ Google Calendar. Bạn có thể làm sau trong Lịch.", connectCalendar: "Kết nối Google Calendar", calendarConnected: "Quyền lịch đã sẵn sàng", continueWithout: "Tiếp tục mà không kết nối",
    stepGoal: "Đặt mục tiêu học", stepGoalBody: "Chọn mục tiêu học mỗi tuần. Bạn có thể thay đổi sau.", hoursPerWeek: "giờ mỗi tuần",
    finishTitle: "Bạn đã sẵn sàng", finishBody: "Không gian WJ Study của bạn đã sẵn sàng.",
    back: "Quay lại", continue: "Tiếp tục", skip: "Bỏ qua thiết lập", finish: "Hoàn tất", progress: "Bước", of: "trên",
  },
  es: {
    welcomeTitle: "Bienvenido a WJ Study", welcomeBody: "Configuremos tu espacio de estudio en unos pasos rápidos.",
    stepClasses: "Añade tus clases", stepClassesBody: "Empieza con las clases que cursas. Puedes añadir más después.", classPlaceholder: "p. ej., Biología", addClass: "Añadir clase", classAdded: "Clase añadida",
    stepTasks: "Añade una tarea", stepTasksBody: "Crea tu primera tarea para empezar a seguir tu trabajo.", taskPlaceholder: "p. ej., Leer capítulo 3", dueDate: "Fecha límite", addTask: "Añadir tarea", taskAdded: "Tarea añadida",
    stepCalendar: "Conecta tu calendario", stepCalendarBody: "Importa eventos de Google Calendar. Puedes hacerlo más tarde.", connectCalendar: "Conectar Google Calendar", calendarConnected: "Permiso del calendario disponible", continueWithout: "Continuar sin conectar",
    stepGoal: "Define un objetivo de estudio", stepGoalBody: "Elige un objetivo semanal. Puedes cambiarlo después.", hoursPerWeek: "horas por semana",
    finishTitle: "Ya estás listo", finishBody: "Tu espacio de WJ Study está listo.",
    back: "Atrás", continue: "Continuar", skip: "Omitir configuración", finish: "Terminar", progress: "Paso", of: "de",
  },
  zh: {
    welcomeTitle: "欢迎使用 WJ Study", welcomeBody: "只需几步即可设置你的学习空间。",
    stepClasses: "添加你的课程", stepClassesBody: "先添加你正在上的课程，之后还可以继续添加。", classPlaceholder: "例如：生物", addClass: "添加课程", classAdded: "已添加课程",
    stepTasks: "添加任务", stepTasksBody: "创建第一个作业，让你的主页开始有可追踪的内容。", taskPlaceholder: "例如：阅读第3章", dueDate: "截止日期", addTask: "添加任务", taskAdded: "已添加任务",
    stepCalendar: "连接日历", stepCalendarBody: "导入 Google 日历活动。之后也可以在日历页面连接。", connectCalendar: "连接 Google 日历", calendarConnected: "日历权限可用", continueWithout: "不连接并继续",
    stepGoal: "设置学习目标", stepGoalBody: "选择每周学习目标，之后可以修改。", hoursPerWeek: "每周小时",
    finishTitle: "准备好了", finishBody: "你的 WJ Study 学习空间已准备就绪。",
    back: "返回", continue: "继续", skip: "跳过设置", finish: "完成设置", progress: "步骤", of: "/",
  },
  ko: {
    welcomeTitle: "WJ Study에 오신 것을 환영합니다", welcomeBody: "몇 단계만 거쳐 학습 공간을 설정해 보세요.",
    stepClasses: "수업 추가", stepClassesBody: "현재 듣고 있는 수업부터 추가하세요. 나중에 더 추가할 수 있습니다.", classPlaceholder: "예: 생물학", addClass: "수업 추가", classAdded: "수업이 추가되었습니다",
    stepTasks: "과제 추가", stepTasksBody: "첫 과제를 만들어 대시보드에서 학습을 추적하세요.", taskPlaceholder: "예: 3장 읽기", dueDate: "마감일", addTask: "과제 추가", taskAdded: "과제가 추가되었습니다",
    stepCalendar: "캘린더 연결", stepCalendarBody: "Google 캘린더의 일정을 가져옵니다. 나중에 캘린더에서 연결할 수도 있습니다.", connectCalendar: "Google 캘린더 연결", calendarConnected: "캘린더 권한을 사용할 수 있습니다", continueWithout: "연결하지 않고 계속",
    stepGoal: "학습 목표 설정", stepGoalBody: "주간 학습 목표를 선택하세요. 나중에 변경할 수 있습니다.", hoursPerWeek: "시간 / 주",
    finishTitle: "준비가 끝났습니다", finishBody: "WJ Study 학습 공간이 준비되었습니다.",
    back: "뒤로", continue: "계속", skip: "설정 건너뛰기", finish: "설정 완료", progress: "단계", of: "/",
  },
  ja: {
    welcomeTitle: "WJ Studyへようこそ", welcomeBody: "いくつかの手順で学習スペースを設定しましょう。",
    stepClasses: "授業を追加", stepClassesBody: "まず受講中の授業を追加してください。後から追加できます。", classPlaceholder: "例：生物", addClass: "授業を追加", classAdded: "授業を追加しました",
    stepTasks: "タスクを追加", stepTasksBody: "最初の課題を作成して、ダッシュボードで管理しましょう。", taskPlaceholder: "例：3章を読む", dueDate: "期限", addTask: "タスクを追加", taskAdded: "タスクを追加しました",
    stepCalendar: "カレンダーを接続", stepCalendarBody: "Google カレンダーの予定を取り込みます。後からカレンダーで設定できます。", connectCalendar: "Google カレンダーを接続", calendarConnected: "カレンダー権限を利用できます", continueWithout: "接続せずに続ける",
    stepGoal: "学習目標を設定", stepGoalBody: "週間の学習目標を選びます。後から変更できます。", hoursPerWeek: "時間 / 週",
    finishTitle: "準備完了です", finishBody: "WJ Studyの学習スペースが準備できました。",
    back: "戻る", continue: "続ける", skip: "設定をスキップ", finish: "設定を完了", progress: "ステップ", of: "/",
  },
};

const SUPPORT_EMAIL = "support@wjstudy.app";
const APP_VERSION = "1.0.0";

const SETTINGS_TEXT: Record<AppLanguage, Record<string, string>> = {
  en: {
    settings: "Settings", back: "Back", language: "Language", languageDescription: "Choose the language used by WJ Study settings and supported interface labels.",
    appearance: "Appearance", appearanceDescription: "Change the look of WJ Study.", dark: "Dark", light: "Light", accent: "Accent color",
    notifications: "Notifications", notificationsDescription: "Choose which reminders and alerts WJ Study should keep enabled.",
    taskReminders: "Task reminders", taskRemindersDescription: "Reminders for upcoming tasks.", deadlineAlerts: "Deadline alerts", deadlineAlertsDescription: "Alerts for tasks approaching their due date.", focusReminders: "Focus reminders", focusRemindersDescription: "Reminders to start or return to a focus session.",
    english: "English", vietnamese: "Vietnamese", korean: "Korean", japanese: "Japanese", spanish: "Spanish", mandarin: "Mandarin Chinese", saved: "Saved automatically", helpFeedback: "Help & Feedback", helpFeedbackDescription: "Get help, report a bug, or contact WJ Study support.", reportBug: "Report a bug", reportBugDescription: "Tell us what went wrong and what you were doing when it happened.", contactSupport: "Contact support", contactSupportDescription: "Send a message to the WJ Study support team.", openEmail: "Open email", about: "About", aboutDescription: "See the current app version and what has been added recently.", appVersion: "App version", changelog: "Changelog", currentRelease: "Current release", account: "Profile & Account", profileName: "Profile name", profileNameDescription: "Choose the name shown around WJ Study.", avatar: "Avatar", email: "Email", emailDescription: "Your sign-in email address.", created: "Account created", changePassword: "Change password", newPassword: "New password", confirmPassword: "Confirm new password", changePasswordButton: "Update password", passwordUpdated: "Password updated successfully.", passwordMismatch: "Passwords do not match.", passwordTooShort: "Use at least 6 characters.", signOut: "Sign out", deleteAccount: "Delete account", deleteAccountDescription: "Permanently delete your WJ Study account and saved data.", deleteAccountConfirm: "Delete my account", deleteAccountWarning: "This permanently removes your account and WJ Study data. This cannot be undone.", commandSearch: "Search WJ Study", keyboardShortcuts: "Keyboard shortcuts", keyboardShortcutsDescription: "Quick controls for desktop.", shortcutCalendar: "Calendar", shortcutTasks: "Tasks", shortcutLearning: "Learning", shortcutFocus: "Focus", shortcutAnalytics: "Analytics", shortcutNewTask: "New task", shortcutClose: "Close modal", shortcutSearch: "Open search", newCalendarEvent: "New calendar event", openSettings: "Open settings", startFocus: "Start focus", noSearchResults: "No results", searchHint: "Search tasks, classes, events, clubs, and learning materials."
  },
  vi: {
    settings: "Cài đặt", back: "Quay lại", language: "Ngôn ngữ", languageDescription: "Chọn ngôn ngữ dùng cho cài đặt và các nhãn giao diện được hỗ trợ của WJ Study.",
    appearance: "Giao diện", appearanceDescription: "Thay đổi giao diện của WJ Study.", dark: "Tối", light: "Sáng", accent: "Màu nhấn",
    notifications: "Thông báo", notificationsDescription: "Chọn các lời nhắc và cảnh báo muốn bật trong WJ Study.",
    taskReminders: "Nhắc việc", taskRemindersDescription: "Nhắc nhở về các công việc sắp tới.", deadlineAlerts: "Cảnh báo hạn", deadlineAlertsDescription: "Cảnh báo khi công việc sắp đến hạn.", focusReminders: "Nhắc tập trung", focusRemindersDescription: "Nhắc bắt đầu hoặc quay lại phiên tập trung.",
    english: "Tiếng Anh", vietnamese: "Tiếng Việt", korean: "Tiếng Hàn", japanese: "Tiếng Nhật", spanish: "Tiếng Tây Ban Nha", mandarin: "Tiếng Trung (Phổ thông)", saved: "Tự động lưu", helpFeedback: "Trợ giúp & Phản hồi", helpFeedbackDescription: "Nhận trợ giúp, báo lỗi hoặc liên hệ bộ phận hỗ trợ WJ Study.", reportBug: "Báo lỗi", reportBugDescription: "Cho chúng tôi biết lỗi gì đã xảy ra và bạn đang làm gì khi lỗi xuất hiện.", contactSupport: "Liên hệ hỗ trợ", contactSupportDescription: "Gửi tin nhắn cho đội ngũ hỗ trợ WJ Study.", openEmail: "Mở email", about: "Giới thiệu", aboutDescription: "Xem phiên bản hiện tại và những tính năng mới được thêm gần đây.", appVersion: "Phiên bản ứng dụng", changelog: "Nhật ký thay đổi", currentRelease: "Bản phát hành hiện tại", account: "Hồ sơ & Tài khoản", profileName: "Tên hồ sơ", profileNameDescription: "Chọn tên hiển thị trong WJ Study.", avatar: "Ảnh đại diện", email: "Email", emailDescription: "Địa chỉ email dùng để đăng nhập.", created: "Ngày tạo tài khoản", changePassword: "Đổi mật khẩu", newPassword: "Mật khẩu mới", confirmPassword: "Xác nhận mật khẩu mới", changePasswordButton: "Cập nhật mật khẩu", passwordUpdated: "Đã cập nhật mật khẩu.", passwordMismatch: "Mật khẩu không khớp.", passwordTooShort: "Hãy dùng ít nhất 6 ký tự.", signOut: "Đăng xuất", deleteAccount: "Xóa tài khoản", deleteAccountDescription: "Xóa vĩnh viễn tài khoản WJ Study và dữ liệu đã lưu.", deleteAccountConfirm: "Xóa tài khoản của tôi", deleteAccountWarning: "Thao tác này sẽ xóa vĩnh viễn tài khoản và dữ liệu WJ Study. Không thể hoàn tác.", commandSearch: "Tìm kiếm WJ Study", keyboardShortcuts: "Phím tắt", keyboardShortcutsDescription: "Điều khiển nhanh trên máy tính.", shortcutCalendar: "Lịch", shortcutTasks: "Nhiệm vụ", shortcutLearning: "Học", shortcutFocus: "Tập trung", shortcutAnalytics: "Phân tích", shortcutNewTask: "Nhiệm vụ mới", shortcutClose: "Đóng cửa sổ", shortcutSearch: "Mở tìm kiếm", newCalendarEvent: "Sự kiện lịch mới", openSettings: "Mở cài đặt", startFocus: "Bắt đầu tập trung", noSearchResults: "Không có kết quả", searchHint: "Tìm nhiệm vụ, lớp học, sự kiện, câu lạc bộ và tài liệu học tập."
  },
  ko: {
    settings: "설정", back: "뒤로", language: "언어", languageDescription: "WJ Study 설정 및 지원되는 인터페이스 언어를 선택하세요.",
    appearance: "화면", appearanceDescription: "WJ Study의 모양을 변경합니다.", dark: "어두운 모드", light: "밝은 모드", accent: "강조 색상",
    notifications: "알림", notificationsDescription: "WJ Study에서 사용할 알림과 리마인더를 선택하세요.",
    taskReminders: "할 일 알림", taskRemindersDescription: "다가오는 할 일을 알려줍니다.", deadlineAlerts: "마감 알림", deadlineAlertsDescription: "마감일이 다가오는 할 일을 알려줍니다.", focusReminders: "집중 알림", focusRemindersDescription: "집중 세션 시작 또는 재개를 알려줍니다.",
    english: "영어", vietnamese: "베트남어", korean: "한국어", japanese: "일본어", spanish: "스페인어", mandarin: "중국어(표준어)", saved: "자동 저장됨", helpFeedback: "도움말 & 피드백", helpFeedbackDescription: "도움을 받고, 버그를 신고하거나 WJ Study 지원팀에 문의하세요.", reportBug: "버그 신고", reportBugDescription: "무슨 문제가 발생했는지와 발생 당시 하고 있던 작업을 알려주세요.", contactSupport: "지원팀 문의", contactSupportDescription: "WJ Study 지원팀에 메시지를 보내세요.", openEmail: "이메일 열기", about: "앱 정보", aboutDescription: "현재 앱 버전과 최근 추가된 기능을 확인하세요.", appVersion: "앱 버전", changelog: "변경 사항", currentRelease: "현재 릴리스", account: "프로필 및 계정", profileName: "프로필 이름", profileNameDescription: "WJ Study에 표시할 이름을 정합니다.", avatar: "아바타", email: "이메일", emailDescription: "로그인에 사용하는 이메일 주소입니다.", created: "계정 생성일", changePassword: "비밀번호 변경", newPassword: "새 비밀번호", confirmPassword: "새 비밀번호 확인", changePasswordButton: "비밀번호 업데이트", passwordUpdated: "비밀번호가 업데이트되었습니다.", passwordMismatch: "비밀번호가 일치하지 않습니다.", passwordTooShort: "6자 이상 입력하세요.", signOut: "로그아웃", deleteAccount: "계정 삭제", deleteAccountDescription: "WJ Study 계정과 저장된 데이터를 영구적으로 삭제합니다.", deleteAccountConfirm: "내 계정 삭제", deleteAccountWarning: "계정과 WJ Study 데이터가 영구적으로 삭제됩니다. 되돌릴 수 없습니다.", commandSearch: "WJ Study 검색", keyboardShortcuts: "키보드 단축키", keyboardShortcutsDescription: "데스크톱에서 빠르게 이동하세요.", shortcutCalendar: "캘린더", shortcutTasks: "할 일", shortcutLearning: "학습", shortcutFocus: "집중", shortcutAnalytics: "분석", shortcutNewTask: "새 할 일", shortcutClose: "모달 닫기", shortcutSearch: "검색 열기", newCalendarEvent: "새 캘린더 이벤트", openSettings: "설정 열기", startFocus: "집중 시작", noSearchResults: "결과 없음", searchHint: "과제, 수업, 이벤트, 동아리 및 학습 자료를 검색하세요."
  },
  ja: {
    settings: "設定", back: "戻る", language: "言語", languageDescription: "WJ Studyの設定と対応インターフェースで使用する言語を選択します。",
    appearance: "外観", appearanceDescription: "WJ Studyの見た目を変更します。", dark: "ダーク", light: "ライト", accent: "アクセントカラー",
    notifications: "通知", notificationsDescription: "WJ Studyで有効にするリマインダーと通知を選択します。",
    taskReminders: "タスクのリマインダー", taskRemindersDescription: "今後のタスクを知らせます。", deadlineAlerts: "締切通知", deadlineAlertsDescription: "締切が近いタスクを知らせます。", focusReminders: "集中リマインダー", focusRemindersDescription: "集中セッションの開始や再開を知らせます。",
    english: "英語", vietnamese: "ベトナム語", korean: "韓国語", japanese: "日本語", spanish: "スペイン語", mandarin: "中国語（普通話）", saved: "自動保存", helpFeedback: "ヘルプとフィードバック", helpFeedbackDescription: "ヘルプを受けたり、バグを報告したり、WJ Studyサポートに連絡できます。", reportBug: "バグを報告", reportBugDescription: "何が起きたか、発生時に何をしていたかを教えてください。", contactSupport: "サポートに連絡", contactSupportDescription: "WJ Studyサポートチームにメッセージを送ります。", openEmail: "メールを開く", about: "アプリについて", aboutDescription: "現在のアプリバージョンと最近追加された機能を確認できます。", appVersion: "アプリバージョン", changelog: "変更履歴", currentRelease: "現在のリリース", account: "プロフィールとアカウント", profileName: "プロフィール名", profileNameDescription: "WJ Studyで表示する名前を設定します。", avatar: "アバター", email: "メール", emailDescription: "ログインに使用するメールアドレスです。", created: "アカウント作成日", changePassword: "パスワードを変更", newPassword: "新しいパスワード", confirmPassword: "新しいパスワードを確認", changePasswordButton: "パスワードを更新", passwordUpdated: "パスワードを更新しました。", passwordMismatch: "パスワードが一致しません。", passwordTooShort: "6文字以上を使用してください。", signOut: "ログアウト", deleteAccount: "アカウントを削除", deleteAccountDescription: "WJ Studyのアカウントと保存データを完全に削除します。", deleteAccountConfirm: "アカウントを削除", deleteAccountWarning: "アカウントとWJ Studyデータが完全に削除されます。この操作は元に戻せません。", commandSearch: "WJ Studyを検索", keyboardShortcuts: "キーボードショートカット", keyboardShortcutsDescription: "デスクトップですばやく操作できます。", shortcutCalendar: "カレンダー", shortcutTasks: "タスク", shortcutLearning: "学習", shortcutFocus: "集中", shortcutAnalytics: "分析", shortcutNewTask: "新しいタスク", shortcutClose: "モーダルを閉じる", shortcutSearch: "検索を開く", newCalendarEvent: "新しいカレンダーイベント", openSettings: "設定を開く", startFocus: "集中を開始", noSearchResults: "結果なし", searchHint: "タスク、クラス、イベント、クラブ、学習資料を検索します。"
  },
  es: {
    settings: "Configuración", back: "Volver", language: "Idioma", languageDescription: "Elige el idioma utilizado por la configuración de WJ Study y las etiquetas compatibles de la interfaz.",
    appearance: "Apariencia", appearanceDescription: "Cambia el aspecto de WJ Study.", dark: "Oscuro", light: "Claro", accent: "Color de acento",
    notifications: "Notificaciones", notificationsDescription: "Elige qué recordatorios y alertas quieres mantener activados en WJ Study.",
    taskReminders: "Recordatorios de tareas", taskRemindersDescription: "Recordatorios sobre tareas próximas.", deadlineAlerts: "Alertas de fechas límite", deadlineAlertsDescription: "Alertas cuando una tarea se acerca a su fecha límite.", focusReminders: "Recordatorios de concentración", focusRemindersDescription: "Recordatorios para iniciar o volver a una sesión de concentración.",
    english: "Inglés", vietnamese: "Vietnamita", korean: "Coreano", japanese: "Japonés", spanish: "Español", mandarin: "Chino mandarín", saved: "Guardado automáticamente", helpFeedback: "Ayuda y comentarios", helpFeedbackDescription: "Obtén ayuda, informa de un error o contacta con el soporte de WJ Study.", reportBug: "Informar de un error", reportBugDescription: "Cuéntanos qué salió mal y qué estabas haciendo cuando ocurrió.", contactSupport: "Contactar con soporte", contactSupportDescription: "Envía un mensaje al equipo de soporte de WJ Study.", openEmail: "Abrir correo", about: "Acerca de", aboutDescription: "Consulta la versión actual de la aplicación y las novedades recientes.", appVersion: "Versión de la aplicación", changelog: "Registro de cambios", currentRelease: "Versión actual", account: "Perfil y cuenta", profileName: "Nombre del perfil", profileNameDescription: "Elige el nombre que se mostrará en WJ Study.", avatar: "Avatar", email: "Correo electrónico", emailDescription: "La dirección de correo que usas para iniciar sesión.", created: "Cuenta creada", changePassword: "Cambiar contraseña", newPassword: "Nueva contraseña", confirmPassword: "Confirmar nueva contraseña", changePasswordButton: "Actualizar contraseña", passwordUpdated: "Contraseña actualizada correctamente.", passwordMismatch: "Las contraseñas no coinciden.", passwordTooShort: "Usa al menos 6 caracteres.", signOut: "Cerrar sesión", deleteAccount: "Eliminar cuenta", deleteAccountDescription: "Elimina permanentemente tu cuenta de WJ Study y los datos guardados.", deleteAccountConfirm: "Eliminar mi cuenta", deleteAccountWarning: "Esto elimina permanentemente tu cuenta y tus datos de WJ Study. No se puede deshacer.", commandSearch: "Buscar en WJ Study", keyboardShortcuts: "Atajos de teclado", keyboardShortcutsDescription: "Controles rápidos para escritorio.", shortcutCalendar: "Calendario", shortcutTasks: "Tareas", shortcutLearning: "Aprendizaje", shortcutFocus: "Concentración", shortcutAnalytics: "Analíticas", shortcutNewTask: "Nueva tarea", shortcutClose: "Cerrar ventana", shortcutSearch: "Abrir búsqueda", newCalendarEvent: "Nuevo evento de calendario", openSettings: "Abrir configuración", startFocus: "Iniciar concentración", noSearchResults: "Sin resultados", searchHint: "Busca tareas, clases, eventos, clubes y materiales de aprendizaje."
  },
  zh: {
    settings: "设置", back: "返回", language: "语言", languageDescription: "选择 WJ Study 设置和支持的界面标签所使用的语言。",
    appearance: "外观", appearanceDescription: "更改 WJ Study 的外观。", dark: "深色", light: "浅色", accent: "强调色",
    notifications: "通知", notificationsDescription: "选择要在 WJ Study 中启用的提醒和通知。",
    taskReminders: "任务提醒", taskRemindersDescription: "提醒你即将到来的任务。", deadlineAlerts: "截止日期提醒", deadlineAlertsDescription: "任务临近截止日期时提醒你。", focusReminders: "专注提醒", focusRemindersDescription: "提醒你开始或继续专注学习。",
    english: "英语", vietnamese: "越南语", korean: "韩语", japanese: "日语", spanish: "西班牙语", mandarin: "中文（普通话）", saved: "已自动保存", helpFeedback: "帮助与反馈", helpFeedbackDescription: "获取帮助、报告错误或联系 WJ Study 支持团队。", reportBug: "报告错误", reportBugDescription: "告诉我们发生了什么问题，以及问题发生时你正在做什么。", contactSupport: "联系支持", contactSupportDescription: "向 WJ Study 支持团队发送消息。", openEmail: "打开邮件", about: "关于", aboutDescription: "查看当前应用版本和最近新增的功能。", appVersion: "应用版本", changelog: "更新日志", currentRelease: "当前版本", account: "个人资料与账户", profileName: "个人资料名称", profileNameDescription: "选择在 WJ Study 中显示的名称。", avatar: "头像", email: "电子邮箱", emailDescription: "用于登录的邮箱地址。", created: "账户创建时间", changePassword: "修改密码", newPassword: "新密码", confirmPassword: "确认新密码", changePasswordButton: "更新密码", passwordUpdated: "密码更新成功。", passwordMismatch: "两次密码不一致。", passwordTooShort: "请至少使用 6 个字符。", signOut: "退出登录", deleteAccount: "删除账户", deleteAccountDescription: "永久删除你的 WJ Study 账户和已保存数据。", deleteAccountConfirm: "删除我的账户", deleteAccountWarning: "这会永久删除你的账户和 WJ Study 数据，无法撤销。", commandSearch: "搜索 WJ Study", keyboardShortcuts: "键盘快捷键", keyboardShortcutsDescription: "桌面端快速操作。", shortcutCalendar: "日历", shortcutTasks: "任务", shortcutLearning: "学习", shortcutFocus: "专注", shortcutAnalytics: "分析", shortcutNewTask: "新任务", shortcutClose: "关闭窗口", shortcutSearch: "打开搜索", newCalendarEvent: "新建日历事件", openSettings: "打开设置", startFocus: "开始专注", noSearchResults: "没有结果", searchHint: "搜索任务、课程、事件、社团和学习资料。"
  },
};

type SyncedGoogleCalendarEvent = {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  allDay: boolean;
  recurringEventId?: string;
  originalStartTime?: string;
};

type ManualCalendarEvent = {
  id: string;
  name: string;
  details: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "Study" | "Test" | "Homework" | "Class" | "Club" | "Personal" | "Other";
};

type CalendarEventOverride = {
  title?: string;
  color?: string;
  icon?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
};

type CalendarEventDisplay = {
  key: string;
  title: string;
  color: string;
  icon: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  details?: string;
  sourceLabel: string;
};

function getManualEventColor(type: ManualCalendarEvent["type"]): string {
  switch (type) {
    case "Test":
      return "#E11D48";
    case "Homework":
      return "#2563EB";
    case "Study":
      return "#7C3AED";
    case "Class":
      return "#0F766E";
    case "Club":
      return "#D97706";
    case "Personal":
      return "#475569";
    default:
      return "#64748B";
  }
}

type GoogleCalendarDeletionRule = {
  seriesId: string;
  mode: "all" | "from";
  fromStart?: string;
};

type GoogleCalendarMergeRule = {
  id: string;
  canonicalTitle: string;
  aliases: string[];
};

type CalendarEventReviewGroup = {
  id: string;
  eventIds: string[];
  titles: string[];
  proposedTitle: string;
  confidence: number;
  exampleTimes: string[];
  exampleDates: string[];
};

type GoogleCalendarApiEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  recurringEventId?: string;
  originalStartTime?: { date?: string; dateTime?: string };
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

function isSyncedGoogleCalendarEvent(value: unknown): value is SyncedGoogleCalendarEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<SyncedGoogleCalendarEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.title === "string" &&
    typeof event.description === "string" &&
    typeof event.startDate === "string" &&
    typeof event.allDay === "boolean"
  );
}

function normalizeGoogleCalendarEvents(value: unknown): SyncedGoogleCalendarEvent[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (isSyncedGoogleCalendarEvent(item)) {
      return [{
        ...item,
        color: item.color || "#7C3AED",
        icon: item.icon || "G",
      }];
    }
    if (!item || typeof item !== "object") return [];
    const event = item as GoogleCalendarApiEvent;
    if (!event.id || event.status === "cancelled") return [];

    const startRaw = event.start?.dateTime || event.start?.date;
    if (!startRaw) return [];
    const endRaw = event.end?.dateTime || event.end?.date;
    const allDay = Boolean(event.start?.date && !event.start?.dateTime);

    const originalStartRaw = event.originalStartTime?.dateTime || event.originalStartTime?.date;

    return [{
      id: event.id,
      title: event.summary?.trim() || "Untitled Google Calendar event",
      description: event.description || "",
      color: "#7C3AED",
      icon: "G",
      startDate: startRaw.slice(0, 10),
      startTime: event.start?.dateTime?.slice(11, 16),
      endDate: endRaw?.slice(0, 10),
      endTime: event.end?.dateTime?.slice(11, 16),
      allDay,
      recurringEventId: event.recurringEventId,
      originalStartTime: originalStartRaw,
    }];
  });
}

function normalizeGoogleEventIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string"))];
}

function normalizeGoogleCalendarDeletionRules(value: unknown): GoogleCalendarDeletionRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rule = item as Partial<GoogleCalendarDeletionRule>;
    if (typeof rule.seriesId !== "string") return [];
    if (rule.mode !== "all" && rule.mode !== "from") return [];
    if (rule.mode === "from" && typeof rule.fromStart !== "string") return [];
    return [{
      seriesId: rule.seriesId,
      mode: rule.mode,
      ...(rule.mode === "from" ? { fromStart: rule.fromStart } : {}),
    }];
  });
}

function normalizeGoogleCalendarMergeRules(value: unknown): GoogleCalendarMergeRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rule = item as Partial<GoogleCalendarMergeRule>;
    if (typeof rule.id !== "string" || typeof rule.canonicalTitle !== "string" || !Array.isArray(rule.aliases)) {
      return [];
    }
    const aliases = [...new Set(
      rule.aliases.filter((alias): alias is string => typeof alias === "string")
        .map((alias) => alias.trim())
        .filter(Boolean)
    )];
    if (aliases.length === 0) return [];
    const canonicalTitle = rule.canonicalTitle.trim();
    if (!canonicalTitle) return [];
    return [{ id: rule.id, canonicalTitle, aliases }];
  });
}

function normalizeGoogleCalendarMergeText(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function findGoogleCalendarMergeRule(
  event: SyncedGoogleCalendarEvent,
  rules: GoogleCalendarMergeRule[]
): GoogleCalendarMergeRule | undefined {
  const normalizedTitle = normalizeGoogleCalendarMergeText(event.title);
  if (!normalizedTitle) return undefined;
  return rules.find((rule) =>
    [rule.canonicalTitle, ...rule.aliases].some(
      (title) => normalizeGoogleCalendarMergeText(title) === normalizedTitle
    )
  );
}

function applyGoogleCalendarMergeRules(
  events: SyncedGoogleCalendarEvent[],
  rules: GoogleCalendarMergeRule[],
  collapseOverlaps = false
): { events: SyncedGoogleCalendarEvent[]; duplicateIds: string[] } {
  if (rules.length === 0) return { events, duplicateIds: [] };

  const duplicateIds = new Set<string>();
  // For merged groups, the calendar should show at most one event per day.
  // We keep the first occurrence deterministically and hide every additional
  // merged variant that lands on that same start date, even when the times differ.
  const seenOccurrences = new Set<string>();
  const merged = events.map((event) => {
    const rule = findGoogleCalendarMergeRule(event, rules);
    return rule ? { ...event, title: rule.canonicalTitle } : event;
  });

  if (!collapseOverlaps) return { events: merged, duplicateIds: [] };

  const kept = merged.filter((event) => {
    const rule = findGoogleCalendarMergeRule(event, rules);
    if (!rule) return true;

    const occurrenceKey = `${rule.id}|${event.startDate}`;
    if (seenOccurrences.has(occurrenceKey)) {
      duplicateIds.add(event.id);
      return false;
    }

    seenOccurrences.add(occurrenceKey);
    return true;
  });

  return { events: kept, duplicateIds: [...duplicateIds] };
}

function googleEventDeletionTimestamp(event: SyncedGoogleCalendarEvent): number {
  const raw = event.originalStartTime || `${event.startDate}T${event.startTime || "00:00"}`;
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return parsed;

  const fallback = Date.parse(`${event.startDate}T${event.startTime || "00:00"}`);
  return Number.isFinite(fallback) ? fallback : 0;
}

function googleDeletionRuleApplies(
  event: SyncedGoogleCalendarEvent,
  rule: GoogleCalendarDeletionRule
): boolean {
  if (!event.recurringEventId || event.recurringEventId !== rule.seriesId) return false;
  if (rule.mode === "all") return true;
  const cutoff = Date.parse(rule.fromStart || "");
  if (!Number.isFinite(cutoff)) return false;
  return googleEventDeletionTimestamp(event) >= cutoff;
}

function shouldHideGoogleCalendarEvent(
  event: SyncedGoogleCalendarEvent,
  hiddenIds: string[],
  deletionRules: GoogleCalendarDeletionRule[]
): boolean {
  if (hiddenIds.includes(event.id)) return true;
  return deletionRules.some((rule) => googleDeletionRuleApplies(event, rule));
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function googleEventOccursOnDate(event: SyncedGoogleCalendarEvent, dateKey: string): boolean {
  if (dateKey < event.startDate) return false;
  if (!event.endDate) return dateKey === event.startDate;
  const lastDate = event.allDay ? addDaysToDateKey(event.endDate, -1) : event.endDate;
  return dateKey <= lastDate;
}

function googleEventError(message: string): Error {
  try {
    const body = JSON.parse(message) as { error?: { message?: string } };
    return new Error(body.error?.message || "Google Calendar could not be read.");
  } catch {
    return new Error("Google Calendar could not be read.");
  }
}

function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return DEFAULT_APP_SETTINGS;
  const source = value as Partial<AppSettings> & { notifications?: Partial<AppSettings["notifications"]> };
  const language: AppLanguage = source.language === "vi" || source.language === "ko" || source.language === "ja" || source.language === "es" || source.language === "zh" ? source.language : "en";
  const theme: AppThemeMode = source.theme === "light" ? "light" : "dark";
  const accent: AppAccent = source.accent === "violet" || source.accent === "emerald" || source.accent === "rose" || source.accent === "amber" ? source.accent : "blue";
  const profileName = typeof source.profileName === "string" ? source.profileName.slice(0, 80) : "";
  const profileAvatar = typeof source.profileAvatar === "string" && source.profileAvatar.trim() ? source.profileAvatar.slice(0, 8) : "🎓";
  const weeklyStudyGoalHours = typeof source.weeklyStudyGoalHours === "number" && Number.isFinite(source.weeklyStudyGoalHours)
    ? Math.min(40, Math.max(1, Math.round(source.weeklyStudyGoalHours * 2) / 2))
    : 10;
  const onboardingCompleted = source.onboardingCompleted === true;
  return {
    language,
    theme,
    accent,
    profileName,
    profileAvatar,
    weeklyStudyGoalHours,
    onboardingCompleted,
    notifications: {
      taskReminders: source.notifications?.taskReminders !== false,
      deadlineAlerts: source.notifications?.deadlineAlerts !== false,
      focusReminders: source.notifications?.focusReminders === true,
    },
  };
}

// --- MAIN COMPONENT ---
// --- LANDING PAGE (shown before sign-in / sign-up) ---
function LandingPage({
  onSignIn,
  onSignUp,
  language,
}: {
  onSignIn: () => void;
  onSignUp: () => void;
  language: AppLanguage;
}) {
  const tx = (english: string) => translateMainText(language, english);
  const features = [
    {
      icon: Camera,
      title: "Photo scan import",
      text: "Snap your PowerSchool or SchoolsBuddy page and let AI pull in your classes and standards.",
    },
    {
      icon: Award,
      title: "Standards-based grading",
      text: "Track every standard and level, and see your overall grade update as you go.",
    },
    {
      icon: Sliders,
      title: "Target grade simulator",
      text: "Pick the grade you want and see the average score you need on upcoming standards.",
    },
    {
      icon: CalendarDays,
      title: "Calendar & school breaks",
      text: "One calendar for tasks, deadlines and school breaks, with Google Calendar sync.",
    },
    {
      icon: Flame,
      title: "Habit streaks",
      text: "Build study routines and keep your streak alive day after day.",
    },
  ];

  const steps = [
    { n: "1", title: "Create your account", text: "Sign up with email or Google in seconds." },
    { n: "2", title: "Add your classes", text: "Scan a grade page or add classes and standards yourself." },
    { n: "3", title: "Plan and improve", text: "Track deadlines, run what-if grade scenarios and stay on top of your streaks." },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* NAV */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-blue-500/30 bg-blue-600/20 p-2 text-blue-400">
            <GraduationCap size={22} />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">{tx("WJ Study")}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSignIn}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onSignUp}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* HERO */}
      <header className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:pt-16">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              <Sparkles size={13} />{tx("Built for students")}</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">{tx("Study smarter.")}<br />
              <span className="text-blue-400">{tx("Know exactly where you stand.")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-400">
              WJ Study puts your classes, standards, deadlines and study habits in one place, and
              shows you the score you need to hit your target grade.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSignUp}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
              >{tx("Get started free")}<ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >{tx("I already have an account")}</button>
            </div>
          </div>

          {/* Example preview card (illustrative numbers) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sliders size={16} className="text-blue-400" />{tx("Target Grade Simulator")}</div>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{tx("Example")}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-slate-500">{tx("Current grade")}</div>
                <div className="mt-1 text-base font-bold text-emerald-400">B+</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-slate-500">{tx("Target grade")}</div>
                <div className="mt-1 text-base font-bold text-blue-400">A-</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-center">
              <div className="text-xs uppercase tracking-wider text-slate-500">{tx("Required average on upcoming standards")}</div>
              <div className="mt-2 text-6xl font-extrabold text-emerald-400">A</div>
              <div className="mt-1 text-sm text-slate-400">{tx("about")}<span className="font-mono font-bold text-white">4.01</span>{tx("pts")}</div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section className="border-y border-slate-900 bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-2xl font-bold text-white md:text-3xl">{tx("Everything you need to stay on top of school")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-400">
            Grades, planning and habits in one dashboard, so you spend less time organizing and more
            time learning.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700"
              >
                <div className="inline-flex rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 text-blue-400">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-bold text-white md:text-3xl">{tx("How it works")}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {step.n}
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{step.title}</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-400">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-4xl px-5 pb-20">
        <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 to-slate-900 p-10 text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">{tx("Ready to level up your grades?")}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-300">{tx("Create your WJ Study account and set up your first class in minutes.")}</p>
          <button
            type="button"
            onClick={onSignUp}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >{tx("Create your account")}<ChevronRight size={16} />
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 space-y-2">
        <div>© {new Date().getFullYear()} WJ Study</div>
        <div>
          <a href="/privacy" className="hover:text-slate-300 hover:underline transition">{tx("Privacy Policy")}</a>
        </div>
      </footer>
    </div>
  );
}

function MathText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;

  // Split string by $$...$$ (display math) and $...$ (inline math)
  const tokens = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

  return (
    <span className={className}>
      {tokens.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
            return (
              <span
                key={index}
                className="my-2 block overflow-x-auto text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <span key={index}>{part}</span>;
          }
        } else if (part.startsWith("$") && part.endsWith("$")) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
            return (
              <span
                key={index}
                className="inline-block px-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <span key={index}>{part}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

export default function AcademicOSDashboard() {
  const [mobileTab, setMobileTab] = useState<
    "home" | "more" | "classes" | "clubs" | "tasks" | "calendar" | "timetable" | "ai" | "simulator" | "streaks" | "learning" | "planner" | "analytics" | "clan" | "grades"
  >("calendar");
  const [activeTab, setActiveTab] = useState<
    "standards" | "calendar" | "timetable" | "grades" | "simulator" | "streaks" | "learning" | "planner" | "analytics" | "clan"
  >("calendar");

  const [taskFilter, setTaskFilter] = useState<
    "all" | "pending" | "completed" | "tests" | "homework"
  >("all");
  const [taskSort, setTaskSort] = useState<"dueDate" | "priority" | "title">(
    "dueDate"
  );

  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date(2026, 8, 1)); // Sep 2026 default

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streaks, setStreaks] = useState<StreakHabit[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  // Gamification starts at zero for a user and then increases from new actions.
  // We do not derive XP from pre-existing completed tasks/sessions, so importing
  // old data or adding existing work does not give a new user free XP.
  const [gamificationXp, setGamificationXp] = useState(0);

  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const commandSearchInputRef = useRef<HTMLInputElement | null>(null);
  const taskTitleInputRef = useRef<HTMLInputElement | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingClassName, setOnboardingClassName] = useState("");
  const [onboardingClassColor, setOnboardingClassColor] = useState("#3B82F6");
  const [onboardingTaskTitle, setOnboardingTaskTitle] = useState("");
  const [onboardingTaskDueDate, setOnboardingTaskDueDate] = useState("");
  const [onboardingStudyGoalHours, setOnboardingStudyGoalHours] = useState("10");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [accountActionMessage, setAccountActionMessage] = useState<string | null>(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  // Main-page translation helper. It reads the same language state used by Settings,
  // so changing language immediately re-renders the dashboard without leaving the page.
  const tx = (english: string) => translateMainText(appSettings.language, english);
  const txDay = (english: string) => MAIN_WEEKDAY_TEXT[appSettings.language]?.[english] ?? english;

  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [learningBundles, setLearningBundles] = useState<LearningBundle[]>([]);
  const [learningClassId, setLearningClassId] = useState("");
  const [learningMaterialTitle, setLearningMaterialTitle] = useState("");
  const [learningMaterialText, setLearningMaterialText] = useState("");
  const [learningView, setLearningView] = useState<"notes" | "flashcards" | "quiz">("notes");
  const [learningGenerating, setLearningGenerating] = useState(false);
  const [learningError, setLearningError] = useState<string | null>(null);
  const [learningMessage, setLearningMessage] = useState<string | null>(null);
  const [learningFlashcardIndex, setLearningFlashcardIndex] = useState(0);
  const [learningFlashcardFlipped, setLearningFlashcardFlipped] = useState(false);
  const [learningQuizAnswers, setLearningQuizAnswers] = useState<Record<number, number>>({});
  const [learningFileLoading, setLearningFileLoading] = useState(false);
  const learningMaterialsInitializedRef = useRef(false);

  type ClanInfo = {
    id: string;
    name: string;
    join_code: string;
    created_by: string;
  };
  type ClanMember = {
    user_id: string;
    display_name: string;
    study_minutes: number;
    joined_at: string;
  };

  const [clan, setClan] = useState<ClanInfo | null>(null);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [clanLoading, setClanLoading] = useState(false);
  const [clanMessage, setClanMessage] = useState<string | null>(null);
  const [clanError, setClanError] = useState<string | null>(null);
  const [clanDisplayName, setClanDisplayName] = useState("");
  const [clanStorageMode, setClanStorageMode] = useState<"database" | "local" | null>(null);
  const [clanStudyMinutes, setClanStudyMinutes] = useState(0);
  const clanRealtimeRef = useRef<any>(null);
  const clanDisplayNameRef = useRef("");
  const clanStudyMinutesRef = useRef(0);
  // Prevent the main user-data autosave from firing before clan membership has
  // been restored after authentication. Otherwise a reload can temporarily
  // write a user record without the clan field and erase the membership.
  const clanLoadedForUserIdRef = useRef<string | null>(null);
  const [newClanName, setNewClanName] = useState("");
  const [joinClanCode, setJoinClanCode] = useState("");

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<SyncedGoogleCalendarEvent[]>([]);
  const [hiddenGoogleEventIds, setHiddenGoogleEventIds] = useState<string[]>([]);
  const [googleCalendarDeletionRules, setGoogleCalendarDeletionRules] = useState<GoogleCalendarDeletionRule[]>([]);
  const [googleCalendarMergeRules, setGoogleCalendarMergeRules] = useState<GoogleCalendarMergeRule[]>([]);
  const [calendarSyncState, setCalendarSyncState] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [calendarSyncMessage, setCalendarSyncMessage] = useState<string | null>(null);
  const [zoomedCalendarDate, setZoomedCalendarDate] = useState<string | null>(null);
  const [editingCalendarItemKey, setEditingCalendarItemKey] = useState<string | null>(null);
  const [calendarEventOverrides, setCalendarEventOverrides] = useState<Record<string, CalendarEventOverride>>({});
  const [calendarDeleteEventId, setCalendarDeleteEventId] = useState<string | null>(null);
  const [manualCalendarEvents, setManualCalendarEvents] = useState<ManualCalendarEvent[]>([]);
  const [showManualEventModal, setShowManualEventModal] = useState(false);
  const [manualEventName, setManualEventName] = useState("");
  const [manualEventDetails, setManualEventDetails] = useState("");
  const [manualEventDate, setManualEventDate] = useState(formatDateKey(new Date()));
  const [manualEventStartTime, setManualEventStartTime] = useState("09:00");
  const [manualEventEndTime, setManualEventEndTime] = useState("10:00");
  const [manualEventType, setManualEventType] = useState<ManualCalendarEvent["type"]>("Study");
  const [calendarReviewOpen, setCalendarReviewOpen] = useState(false);
  const [calendarReviewGroups, setCalendarReviewGroups] = useState<CalendarEventReviewGroup[]>([]);
  const [calendarReviewSelected, setCalendarReviewSelected] = useState<Record<string, boolean>>({});

  // Authentication UI state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false); // false = show landing page first

  const isSavingRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null); // <-- ADD THIS
  const workspaceSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const workspaceSaveRequestRef = useRef(0);
  const prevClassIdRef = useRef<string>(selectedClassId);

  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState("#3B82F6");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassDraft, setEditClassDraft] = useState<{
    name: string;
    color: string;
    professorName: string;
    roomNumber: string;
    periodCode: string;
    officeHours: string;
  } | null>(null);
  const [newStandardName, setNewStandardName] = useState("");

  // AI PowerSchool Photo Analyzer state
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoAnalysisStatus, setPhotoAnalysisStatus] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // AI SchoolsBuddy Photo Analyzer state
  const [isAnalyzingClubPhoto, setIsAnalyzingClubPhoto] = useState(false);
  const [clubPhotoAnalysisStatus, setClubPhotoAnalysisStatus] = useState<string | null>(null);
  const [showClubPhotoModal, setShowClubPhotoModal] = useState(false);

  const [newClubName, setNewClubName] = useState("");
  const [newClubRole, setNewClubRole] = useState("");
  const [newClubIcon, setNewClubIcon] = useState("👥");
  const [newClubMeetingDay, setNewClubMeetingDay] = useState<DayOfWeek>("Thursday");
  const [newClubColor, setNewClubColor] = useState("#EC4899");
  const [newClubStartTime, setNewClubStartTime] = useState("16:00");
  const [newClubEndTime, setNewClubEndTime] = useState("17:30");

  const [addClubSlotDay, setAddClubSlotDay] = useState<DayOfWeek>("Tuesday");
  const [addClubSlotStart, setAddClubSlotStart] = useState("15:30");
  const [addClubSlotEnd, setAddClubSlotEnd] = useState("17:00");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskClassId, setTaskClassId] = useState("");
  const [taskType, setTaskType] = useState<TaskCategory>("homework");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskHours, setTaskHours] = useState("1");

  const [newStreakName, setNewStreakName] = useState("");
  const [newStreakColor, setNewStreakColor] = useState("#3B82F6");
  const [streakWeekBaseDate, setStreakWeekBaseDate] = useState<Date>(new Date());
  const [timetableWeekBaseDate, setTimetableWeekBaseDate] = useState<Date>(new Date());

  const [timetableClassId, setTimetableClassId] = useState<string>("");
  const [timetableDay, setTimetableDay] = useState<DayOfWeek>("Monday");
  const [timetableStartTime, setTimetableStartTime] = useState<string>("09:00");
  const [timetableEndTime, setTimetableEndTime] = useState<string>("10:30");

  const [selectedTimerTaskId, setSelectedTimerTaskId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");

  // Focus timing is based on real elapsed wall-clock time while the work timer
  // is actively running. These refs let us record every completed minute even
  // when the student pauses/resets before the 25-minute session ends.
  const focusRunStartedAtRef = useRef<number | null>(null);
  const focusRunBaseElapsedSecondsRef = useRef(0);
  const focusRunRecordedMinutesRef = useRef(0);
  const focusRunSessionIdRef = useRef<string | null>(null);
  const focusRunTaskIdRef = useRef<string | null>(null);
  const focusRunXpAwardedRef = useRef(false);
  const breakRunStartedAtRef = useRef<number | null>(null);
  const breakRunBaseElapsedSecondsRef = useRef(0);
  const focusTimerHydratedForUserRef = useRef<string | null>(null);

  const [simCurrentGrade, setSimCurrentGrade] = useState<StandardLevel>("B+");
  const [simTargetGrade, setSimTargetGrade] = useState<StandardLevel>("A");

  // State for tested standards in Grade Simulator
  const [selectedStandardsForExam, setSelectedStandardsForExam] = useState<string[]>([]);

  // Load user data specifically per user ID
  const loadUserData = async (currentUserId: string) => {
    // Always begin a user session at zero until persisted XP is loaded.
    // This prevents a previous user's XP from flashing on screen during auth changes.
    setGamificationXp(0);
    setSyncStatus("syncing");
    try {
      const { data, error } = await supabase
        .from("user_data")
        .select("data, updated_at")
        .eq("user_id", currentUserId)
        .single();

      if (!error && data && data.data) {
        const serverUpdatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
        const localWorkspaceSavedAt = Number(
          safeStorageGet<string | number>(
            `tracker_workspace_data_saved_at_v2_${currentUserId}`,
            0
          )
        );
        const localWorkspaceClasses = withoutLegacyDemoItems(
          safeStorageGet(`tracker_classes_v8_${currentUserId}`, EMPTY_CLASSES),
          LEGACY_DEMO_CLASS_IDS
        );
        const localWorkspaceClubs = normalizeClubsData(
          withoutLegacyDemoItems(
            safeStorageGet(`tracker_clubs_v8_${currentUserId}`, EMPTY_CLUBS),
            LEGACY_DEMO_CLUB_IDS
          )
        );
        const localWorkspaceTasks = withoutLegacyDemoItems(
          safeStorageGet(`tracker_tasks_v8_${currentUserId}`, EMPTY_TASKS),
          LEGACY_DEMO_TASK_IDS
        );
        const localWorkspaceStreaks = withoutLegacyDemoItems(
          safeStorageGet(`tracker_streaks_v8_${currentUserId}`, EMPTY_STREAKS),
          LEGACY_DEMO_STREAK_IDS
        );
        const localWorkspaceStudySessions = safeStorageGet<StudySession[]>(
          `tracker_study_sessions_v1_${currentUserId}`,
          []
        );
        const localWorkspaceXp = safeStorageGet<number>(
          `tracker_gamification_xp_v1_${currentUserId}`,
          0
        );
        const localWorkspaceSettings = safeStorageGet<AppSettings>(
          `tracker_app_settings_v1_${currentUserId}`,
          DEFAULT_APP_SETTINGS
        );
        const serverAppSettings = normalizeAppSettings(data.data.appSettings);
        const serverFocusTimerState = normalizePersistedFocusTimerState(data.data.focusTimerState);
        const localFocusTimerState = normalizePersistedFocusTimerState(
          safeStorageGet<PersistedFocusTimerState | null>(
            `${FOCUS_TIMER_STORAGE_PREFIX}${currentUserId}`,
            null
          )
        );
        const preferredFocusTimerState =
          localFocusTimerState &&
          localFocusTimerState.updatedAt >= (serverFocusTimerState?.updatedAt || 0)
            ? localFocusTimerState
            : serverFocusTimerState;
        try {
          if (preferredFocusTimerState) {
            localStorage.setItem(
              `${FOCUS_TIMER_STORAGE_PREFIX}${currentUserId}`,
              JSON.stringify(preferredFocusTimerState)
            );
          } else {
            localStorage.removeItem(`${FOCUS_TIMER_STORAGE_PREFIX}${currentUserId}`);
          }
        } catch {
          // Ignore focus timer cache errors.
        }
        const localWorkspaceCalendarEventOverrides = safeStorageGet<Record<string, CalendarEventOverride>>(
          `tracker_calendar_event_overrides_v1_${currentUserId}`,
          {}
        );
        const serverCalendarEventOverrides =
          data.data.calendarEventOverrides &&
          typeof data.data.calendarEventOverrides === "object" &&
          !Array.isArray(data.data.calendarEventOverrides)
            ? (data.data.calendarEventOverrides as Record<string, CalendarEventOverride>)
            : {};
        const useLocalWorkspace =
          localWorkspaceSavedAt > 0 && localWorkspaceSavedAt > serverUpdatedAt;

        setClasses(
          useLocalWorkspace
            ? localWorkspaceClasses
            : withoutLegacyDemoItems(
                Array.isArray(data.data.classes) ? data.data.classes : EMPTY_CLASSES,
                LEGACY_DEMO_CLASS_IDS
              )
        );
        setClubs(
          useLocalWorkspace
            ? localWorkspaceClubs
            : normalizeClubsData(
                withoutLegacyDemoItems(
                  Array.isArray(data.data.clubs) ? data.data.clubs : EMPTY_CLUBS,
                  LEGACY_DEMO_CLUB_IDS
                )
              )
        );
        setTasks(
          useLocalWorkspace
            ? localWorkspaceTasks
            : withoutLegacyDemoItems(
                Array.isArray(data.data.tasks) ? data.data.tasks : EMPTY_TASKS,
                LEGACY_DEMO_TASK_IDS
              )
        );
        setStreaks(
          useLocalWorkspace
            ? localWorkspaceStreaks
            : withoutLegacyDemoItems(
                Array.isArray(data.data.streaks) ? data.data.streaks : EMPTY_STREAKS,
                LEGACY_DEMO_STREAK_IDS
              )
        );
        setStudySessions(
          useLocalWorkspace
            ? localWorkspaceStudySessions
            : Array.isArray(data.data.studySessions)
              ? data.data.studySessions.filter(
                  (session: any) =>
                    session &&
                    typeof session.id === "string" &&
                    typeof session.date === "string" &&
                    typeof session.minutes === "number"
                )
              : []
        );
        setGamificationXp(
          useLocalWorkspace
            ? Math.max(0, Math.floor(localWorkspaceXp))
            : typeof data.data.gamificationXp === "number"
              ? Math.max(0, Math.floor(data.data.gamificationXp))
              : 0
        );
        setAppSettings(useLocalWorkspace ? localWorkspaceSettings : serverAppSettings);
        const serverLearningMaterials =
          Array.isArray(data.data.learningMaterials)
            ? data.data.learningMaterials.filter(
                (item: any) =>
                  item &&
                  typeof item.id === "string" &&
                  typeof item.classId === "string" &&
                  typeof item.title === "string" &&
                  typeof item.content === "string"
              )
            : [];
        const serverLearningBundles =
          Array.isArray(data.data.learningBundles) ? data.data.learningBundles : [];

        // The Learning section also keeps a device cache so an interrupted or
        // delayed Supabase write cannot erase a newly-added material on refresh.
        // Prefer that cache when it is newer than the account row.
        const cachedLearningMaterials = safeStorageGet<LearningMaterial[]>(
          `tracker_learning_materials_v1_${currentUserId}`,
          []
        );
        const cachedLearningBundles = safeStorageGet<LearningBundle[]>(
          `tracker_learning_bundles_v1_${currentUserId}`,
          []
        );
        const cachedLearningSavedAt = Number(
          safeStorageGet<string | number>(
            `tracker_learning_data_saved_at_v1_${currentUserId}`,
            0
          )
        );
        const useCachedLearningData =
          cachedLearningSavedAt > 0 && cachedLearningSavedAt > serverUpdatedAt;

        setLearningMaterials(
          useCachedLearningData ? cachedLearningMaterials : serverLearningMaterials
        );
        setLearningBundles(
          useCachedLearningData ? cachedLearningBundles : serverLearningBundles
        );
        learningMaterialsInitializedRef.current = true;
        const normalizedGoogleEvents = normalizeGoogleCalendarEvents(data.data.googleCalendarEvents);
        const savedHiddenGoogleEventIds = normalizeGoogleEventIds(
          data.data.hiddenGoogleEventIds
        );
        const savedGoogleCalendarDeletionRules = normalizeGoogleCalendarDeletionRules(
          data.data.googleCalendarDeletionRules
        );
        const savedGoogleCalendarMergeRules = normalizeGoogleCalendarMergeRules(
          data.data.googleCalendarMergeRules
        );
        const mergedLoadedEvents = applyGoogleCalendarMergeRules(
          normalizedGoogleEvents,
          savedGoogleCalendarMergeRules
        ).events;
        setGoogleCalendarEvents(
          mergedLoadedEvents.filter(
            (event) =>
              !shouldHideGoogleCalendarEvent(
                event,
                savedHiddenGoogleEventIds,
                savedGoogleCalendarDeletionRules
              )
          )
        );
        setHiddenGoogleEventIds(savedHiddenGoogleEventIds);
        setGoogleCalendarDeletionRules(savedGoogleCalendarDeletionRules);
        setGoogleCalendarMergeRules(savedGoogleCalendarMergeRules);
        setManualCalendarEvents(
          Array.isArray(data.data.manualCalendarEvents)
            ? data.data.manualCalendarEvents.filter(
                (event: any) =>
                  event &&
                  typeof event.id === "string" &&
                  typeof event.name === "string" &&
                  typeof event.date === "string" &&
                  typeof event.startTime === "string" &&
                  typeof event.endTime === "string" &&
                  typeof event.type === "string"
              )
            : []
        );
        setCalendarEventOverrides(
          useLocalWorkspace ? localWorkspaceCalendarEventOverrides : serverCalendarEventOverrides
        );

        const serverWorkspace = data.data as Record<string, any>;
        const hasExistingWorkspaceData = Boolean(
          localWorkspaceClasses.length ||
          localWorkspaceClubs.length ||
          localWorkspaceTasks.length ||
          localWorkspaceStreaks.length ||
          localWorkspaceStudySessions.length ||
          (Array.isArray(serverWorkspace.classes) && serverWorkspace.classes.length) ||
          (Array.isArray(serverWorkspace.tasks) && serverWorkspace.tasks.length) ||
          (Array.isArray(serverWorkspace.manualCalendarEvents) && serverWorkspace.manualCalendarEvents.length) ||
          (Array.isArray(serverWorkspace.googleCalendarEvents) && serverWorkspace.googleCalendarEvents.length)
        );
        const effectiveSettings = useLocalWorkspace ? localWorkspaceSettings : serverAppSettings;
        if (!effectiveSettings.onboardingCompleted && !hasExistingWorkspaceData) {
          setOnboardingStep(0);
          setOnboardingStudyGoalHours(String(effectiveSettings.weeklyStudyGoalHours || 10));
          setShowOnboarding(true);
        } else if (!effectiveSettings.onboardingCompleted && hasExistingWorkspaceData) {
          setAppSettings({ ...effectiveSettings, onboardingCompleted: true });
          setShowOnboarding(false);
        } else {
          setShowOnboarding(false);
        }

        if (!useLocalWorkspace) {
          try {
            localStorage.setItem(
              `tracker_workspace_data_saved_at_v2_${currentUserId}`,
              String(serverUpdatedAt || Date.now())
            );
            localStorage.setItem(
              `tracker_classes_v8_${currentUserId}`,
              JSON.stringify(
                withoutLegacyDemoItems(
                  Array.isArray(data.data.classes) ? data.data.classes : EMPTY_CLASSES,
                  LEGACY_DEMO_CLASS_IDS
                )
              )
            );
            localStorage.setItem(
              `tracker_clubs_v8_${currentUserId}`,
              JSON.stringify(
                normalizeClubsData(
                  withoutLegacyDemoItems(
                    Array.isArray(data.data.clubs) ? data.data.clubs : EMPTY_CLUBS,
                    LEGACY_DEMO_CLUB_IDS
                  )
                )
              )
            );
            localStorage.setItem(
              `tracker_tasks_v8_${currentUserId}`,
              JSON.stringify(
                withoutLegacyDemoItems(
                  Array.isArray(data.data.tasks) ? data.data.tasks : EMPTY_TASKS,
                  LEGACY_DEMO_TASK_IDS
                )
              )
            );
            localStorage.setItem(
              `tracker_streaks_v8_${currentUserId}`,
              JSON.stringify(
                withoutLegacyDemoItems(
                  Array.isArray(data.data.streaks) ? data.data.streaks : EMPTY_STREAKS,
                  LEGACY_DEMO_STREAK_IDS
                )
              )
            );
            localStorage.setItem(
              `tracker_study_sessions_v1_${currentUserId}`,
              JSON.stringify(
                Array.isArray(data.data.studySessions) ? data.data.studySessions : []
              )
            );
            localStorage.setItem(
              `tracker_gamification_xp_v1_${currentUserId}`,
              JSON.stringify(
                typeof data.data.gamificationXp === "number"
                  ? Math.max(0, Math.floor(data.data.gamificationXp))
                  : 0
              )
            );
            localStorage.setItem(
              `tracker_app_settings_v1_${currentUserId}`,
              JSON.stringify(serverAppSettings)
            );
            localStorage.setItem(
              `tracker_calendar_event_overrides_v1_${currentUserId}`,
              JSON.stringify(serverCalendarEventOverrides)
            );
          } catch {
            // Device cache is only a resilience layer; account data remains usable.
          }
        }

        setSyncStatus(useLocalWorkspace ? "syncing" : "synced");
      } else {
        const localClasses = withoutLegacyDemoItems(
          safeStorageGet(`tracker_classes_v8_${currentUserId}`, EMPTY_CLASSES),
          LEGACY_DEMO_CLASS_IDS
        );
        const localClubs = normalizeClubsData(
          withoutLegacyDemoItems(
            safeStorageGet(`tracker_clubs_v8_${currentUserId}`, EMPTY_CLUBS),
            LEGACY_DEMO_CLUB_IDS
          )
        );
        const localTasks = withoutLegacyDemoItems(
          safeStorageGet(`tracker_tasks_v8_${currentUserId}`, EMPTY_TASKS),
          LEGACY_DEMO_TASK_IDS
        );
        const localStreaks = withoutLegacyDemoItems(
          safeStorageGet(`tracker_streaks_v8_${currentUserId}`, EMPTY_STREAKS),
          LEGACY_DEMO_STREAK_IDS
        );
        const localStudySessions = safeStorageGet<StudySession[]>(
          `tracker_study_sessions_v1_${currentUserId}`,
          []
        );
        const localGamificationXp = safeStorageGet<number>(
          `tracker_gamification_xp_v1_${currentUserId}`,
          0
        );
        const localAppSettings = safeStorageGet<AppSettings>(
          `tracker_app_settings_v1_${currentUserId}`,
          DEFAULT_APP_SETTINGS
        );
        const localLearningMaterials = safeStorageGet<LearningMaterial[]>(
          `tracker_learning_materials_v1_${currentUserId}`,
          []
        );
        const localLearningBundles = safeStorageGet<LearningBundle[]>(
          `tracker_learning_bundles_v1_${currentUserId}`,
          []
        );
        const localGoogleCalendarEvents = normalizeGoogleCalendarEvents(
          safeStorageGet(`tracker_google_calendar_events_v1_${currentUserId}`, [])
        );
        const localHiddenGoogleEventIds = normalizeGoogleEventIds(
          safeStorageGet(`tracker_hidden_google_event_ids_v1_${currentUserId}`, [])
        );
        const localGoogleCalendarDeletionRules = normalizeGoogleCalendarDeletionRules(
          safeStorageGet(
            `tracker_google_calendar_deletion_rules_v1_${currentUserId}`,
            []
          )
        );
        const localManualCalendarEvents = safeStorageGet<ManualCalendarEvent[]>(
          `tracker_manual_calendar_events_v1_${currentUserId}`,
          []
        );
        const localCalendarEventOverrides = safeStorageGet<Record<string, CalendarEventOverride>>(
          `tracker_calendar_event_overrides_v1_${currentUserId}`,
          {}
        );
        const localFocusTimerState = normalizePersistedFocusTimerState(
          safeStorageGet<PersistedFocusTimerState | null>(
            `${FOCUS_TIMER_STORAGE_PREFIX}${currentUserId}`,
            null
          )
        );

        try {
          const localWorkspaceSavedAt = Number(
            safeStorageGet<string | number>(
              `tracker_workspace_data_saved_at_v2_${currentUserId}`,
              0
            )
          );
          if (localWorkspaceSavedAt === 0) {
            localStorage.setItem(
              `tracker_workspace_data_saved_at_v2_${currentUserId}`,
              String(Date.now())
            );
          }
        } catch {
          // Ignore cache errors.
        }

        setClasses(localClasses);
        setClubs(localClubs);
        setTasks(localTasks);
        setStreaks(localStreaks);
        setStudySessions(localStudySessions);
        setGamificationXp(
          typeof localGamificationXp === "number"
            ? Math.max(0, Math.floor(localGamificationXp))
            : 0
        );
        setAppSettings(normalizeAppSettings(localAppSettings));
        setLearningMaterials(Array.isArray(localLearningMaterials) ? localLearningMaterials : []);
        setLearningBundles(Array.isArray(localLearningBundles) ? localLearningBundles : []);
        if (localLearningMaterials.length || localLearningBundles.length) {
          try {
            localStorage.setItem(
              `tracker_learning_data_saved_at_v1_${currentUserId}`,
              String(Date.now())
            );
          } catch {
            // Ignore storage errors.
          }
        }
        learningMaterialsInitializedRef.current = true;
        setGoogleCalendarEvents(
          localGoogleCalendarEvents.filter(
            (event) =>
              !shouldHideGoogleCalendarEvent(
                event,
                localHiddenGoogleEventIds,
                localGoogleCalendarDeletionRules
              )
          )
        );
        setHiddenGoogleEventIds(localHiddenGoogleEventIds);
        setGoogleCalendarDeletionRules(localGoogleCalendarDeletionRules);
        setManualCalendarEvents(Array.isArray(localManualCalendarEvents) ? localManualCalendarEvents : []);
        setCalendarEventOverrides(localCalendarEventOverrides);
        const hasLocalWorkspaceData = Boolean(
          localClasses.length || localClubs.length || localTasks.length || localStreaks.length || localStudySessions.length ||
          localManualCalendarEvents.length || localGoogleCalendarEvents.length
        );
        const localSettings = normalizeAppSettings(localAppSettings);
        if (!localSettings.onboardingCompleted && !hasLocalWorkspaceData) {
          setOnboardingStep(0);
          setOnboardingStudyGoalHours(String(localSettings.weeklyStudyGoalHours || 10));
          setShowOnboarding(true);
        } else if (!localSettings.onboardingCompleted && hasLocalWorkspaceData) {
          setAppSettings({ ...localSettings, onboardingCompleted: true });
          setShowOnboarding(false);
        } else {
          setShowOnboarding(false);
        }
        setSyncStatus("synced");
      }
    } catch (err) {
      setSyncStatus("error");
    } finally {
      setIsLoaded(true);
    }
  };

  const persistLocalClan = (currentUserId: string, nextClan: LocalClanStore | null) => {
    if (typeof window === "undefined") return;
    const key = `${LOCAL_CLAN_STORAGE_PREFIX}${currentUserId}`;
    if (!nextClan) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(nextClan));
  };

  const readLocalClan = (currentUserId: string): LocalClanStore | null => {
    return safeStorageGet<LocalClanStore | null>(
      `${LOCAL_CLAN_STORAGE_PREFIX}${currentUserId}`,
      null
    );
  };

  const sortClanMembers = (members: ClanMember[]) =>
    [...members].sort(
      (a, b) =>
        b.study_minutes - a.study_minutes ||
        a.joined_at.localeCompare(b.joined_at)
    );

  const saveClanMembershipToAccount = async (
    currentUserId: string,
    membership: LocalClanStore | null
  ) => {
    const { data: existing, error: readError } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (readError) throw readError;

    const existingData =
      existing?.data && typeof existing.data === "object" && !Array.isArray(existing.data)
        ? { ...(existing.data as Record<string, any>) }
        : {};

    if (membership) existingData.clan = membership;
    else delete existingData.clan;

    const { error: writeError } = await supabase.from("user_data").upsert(
      {
        user_id: currentUserId,
        data: existingData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (writeError) throw writeError;
  };

  const readServerClan = async (currentUserId: string): Promise<LocalClanStore | null> => {
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) throw error;

    const candidate = data?.data?.clan;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const saved = candidate as Partial<LocalClanStore>;

    if (
      !saved.clan ||
      typeof saved.clan !== "object" ||
      typeof saved.clan.join_code !== "string" ||
      typeof saved.clan.name !== "string" ||
      typeof saved.displayName !== "string" ||
      typeof saved.studyMinutes !== "number"
    ) return null;

    return {
      clan: {
        id: String(saved.clan.id || `local-${saved.clan.join_code}`),
        name: saved.clan.name,
        join_code: saved.clan.join_code,
        created_by: String(saved.clan.created_by || ""),
      },
      displayName: saved.displayName,
      studyMinutes: Math.max(0, Number(saved.studyMinutes || 0)),
      joinedAt: saved.joinedAt || new Date().toISOString(),
    };
  };

  const loadClan = async (currentUserId: string) => {
    setClanLoading(true);
    setClanError(null);

    try {
      const serverSaved = await readServerClan(currentUserId);
      const localSaved = readLocalClan(currentUserId);
      const saved = serverSaved || localSaved;

      if (saved?.clan?.join_code) {
        setClanStorageMode("local");
        setClan(saved.clan as ClanInfo);
        setClanDisplayName(saved.displayName || "Student");
        setClanStudyMinutes(Math.max(0, Number(saved.studyMinutes || 0)));
        setClanMembers([{
          user_id: currentUserId,
          display_name: saved.displayName || "Student",
          study_minutes: Math.max(0, Number(saved.studyMinutes || 0)),
          joined_at: saved.joinedAt || new Date().toISOString(),
        }]);

        if (!localSaved || localSaved.clan.join_code !== saved.clan.join_code) {
          persistLocalClan(currentUserId, saved);
        }
        if (!serverSaved) {
          try {
            await saveClanMembershipToAccount(currentUserId, saved);
          } catch {
            // Keep local persistence as an offline fallback.
          }
        }
      } else {
        setClanStorageMode(null);
        setClan(null);
        setClanMembers([]);
        setClanStudyMinutes(0);
      }
    } catch (err: any) {
      const fallback = readLocalClan(currentUserId);
      if (fallback?.clan?.join_code) {
        setClanStorageMode("local");
        setClan(fallback.clan as ClanInfo);
        setClanDisplayName(fallback.displayName || "Student");
        setClanStudyMinutes(Math.max(0, Number(fallback.studyMinutes || 0)));
        setClanMembers([{
          user_id: currentUserId,
          display_name: fallback.displayName || "Student",
          study_minutes: Math.max(0, Number(fallback.studyMinutes || 0)),
          joined_at: fallback.joinedAt || new Date().toISOString(),
        }]);
      } else {
        setClanStorageMode(null);
        setClan(null);
        setClanMembers([]);
        setClanStudyMinutes(0);
        setClanError(err?.message || "Could not load your clan.");
      }
    } finally {
      clanLoadedForUserIdRef.current = currentUserId;
      setClanLoading(false);
    }
  };

  useEffect(() => {
    clanDisplayNameRef.current = clanDisplayName;

    if (!userId || clanStorageMode !== "local" || !clan?.join_code || !isLoaded) return;
    const saved = readLocalClan(userId);
    if (!saved) return;

    persistLocalClan(userId, {
      ...saved,
      clan,
      displayName: clanDisplayName || "Student",
      studyMinutes: clanStudyMinutesRef.current,
    });
  }, [clanDisplayName, userId, clanStorageMode, clan?.join_code, isLoaded]);

  useEffect(() => {
    clanStudyMinutesRef.current = clanStudyMinutes;
  }, [clanStudyMinutes]);

  // Clan networking is handled entirely through Supabase Realtime Presence and
  // Broadcast. This path does not query study_clan_members, so the broken/old
  // database schema cannot prevent a user from creating or joining a clan.
  useEffect(() => {
    if (!userId || !clan?.join_code || clanStorageMode !== "local") return;

    const topic = `study-clan-${clan.join_code.toUpperCase()}`;
    const channel = supabase.channel(topic, {
      config: { presence: { key: userId } },
    });
    clanRealtimeRef.current = channel;

    const ownMember = (): ClanMember => ({
      user_id: userId,
      display_name: clanDisplayNameRef.current || "Student",
      study_minutes: clanStudyMinutesRef.current,
      joined_at:
        readLocalClan(userId)?.joinedAt || new Date().toISOString(),
    });

    const syncPresence = () => {
      const state = channel.presenceState();
      const byUser = new Map<string, ClanMember>();
      Object.values(state).forEach((entries: any[]) => {
        entries.forEach((entry: any) => {
          if (!entry?.user_id) return;
          byUser.set(String(entry.user_id), {
            user_id: String(entry.user_id),
            display_name: String(entry.display_name || "Student"),
            study_minutes: Math.max(0, Number(entry.study_minutes || 0)),
            joined_at: String(entry.joined_at || new Date().toISOString()),
          });
        });
      });
      setClanMembers(sortClanMembers([...byUser.values()]));
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "join_request" }, async ({ payload }) => {
        if (!payload?.user_id || payload.user_id === userId) return;
        await channel.send({
          type: "broadcast",
          event: "clan_meta",
          payload: { name: clan.name, join_code: clan.join_code },
        });
        const member = ownMember();
        await channel.track(member);
        await channel.send({
          type: "broadcast",
          event: "member_update",
          payload: member,
        });
      })
      .on("broadcast", { event: "clan_meta" }, ({ payload }) => {
        if (!payload?.name || !payload?.join_code) return;
        if (String(payload.join_code).toUpperCase() !== clan.join_code.toUpperCase()) return;
        setClan((current) =>
          current ? { ...current, name: String(payload.name) } : current
        );
        const saved = readLocalClan(userId);
        if (saved) {
          persistLocalClan(userId, {
            ...saved,
            clan: { ...saved.clan, name: String(payload.name) },
          });
        }
      })
      .on("broadcast", { event: "member_update" }, ({ payload }) => {
        if (!payload?.user_id) return;
        const incoming: ClanMember = {
          user_id: String(payload.user_id),
          display_name: String(payload.display_name || "Student"),
          study_minutes: Math.max(0, Number(payload.study_minutes || 0)),
          joined_at: String(payload.joined_at || new Date().toISOString()),
        };
        setClanMembers((current) => {
          const map = new Map(current.map((item) => [item.user_id, item]));
          map.set(incoming.user_id, incoming);
          return sortClanMembers([...map.values()]);
        });
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        const member = ownMember();
        await channel.track(member);
        await channel.send({
          type: "broadcast",
          event: "join_request",
          payload: { user_id: userId },
        });
        await channel.send({
          type: "broadcast",
          event: "member_update",
          payload: member,
        });
        syncPresence();
      });

    return () => {
      if (clanRealtimeRef.current === channel) clanRealtimeRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [userId, clan?.join_code, clanStorageMode]);

  const createClan = async () => {
    if (!userId || !newClanName.trim() || !clanDisplayName.trim()) return;
    setClanLoading(true);
    setClanError(null);
    setClanMessage(null);

    if (readLocalClan(userId)?.clan?.join_code) {
      setClanError("You are already in a clan. Leave it before creating another.");
      setClanLoading(false);
      return;
    }

    const code = generateLocalClanCode();
    const joinedAt = new Date().toISOString();
    const nextClan: LocalClanStore = {
      clan: {
        id: `local-${code}`,
        name: newClanName.trim(),
        join_code: code,
        created_by: userId,
      },
      displayName: clanDisplayName.trim(),
      studyMinutes: 0,
      joinedAt,
    };

    persistLocalClan(userId, nextClan);
    clanLoadedForUserIdRef.current = userId;
    try {
      await saveClanMembershipToAccount(userId, nextClan);
    } catch (err: any) {
      setClanError(`Your clan was saved on this device, but account sync failed: ${err?.message || "network error"}`);
    }
    setClanStorageMode("local");
    setActiveTab("clan");
    setMobileTab("clan");
    setClan(nextClan.clan as ClanInfo);
    setClanDisplayName(nextClan.displayName);
    setClanStudyMinutes(0);
    setClanMembers([{
      user_id: userId,
      display_name: nextClan.displayName,
      study_minutes: 0,
      joined_at: joinedAt,
    }]);
    setNewClanName("");
    setClanMessage(`Clan created! Share code ${code} with your friends.`);
    setClanLoading(false);
  };

  const joinClan = async () => {
    if (!userId || !joinClanCode.trim() || !clanDisplayName.trim()) return;
    setClanLoading(true);
    setClanError(null);
    setClanMessage(null);

    if (readLocalClan(userId)?.clan?.join_code) {
      setClanError("You are already in a clan. Leave it before joining another.");
      setClanLoading(false);
      return;
    }

    const code = joinClanCode.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
      setClanError("Enter a valid 6-character clan code.");
      setClanLoading(false);
      return;
    }

    const joinedAt = new Date().toISOString();
    const nextClan: LocalClanStore = {
      clan: {
        id: `local-${code}`,
        name: `Study Clan ${code}`,
        join_code: code,
        created_by: "",
      },
      displayName: clanDisplayName.trim(),
      studyMinutes: 0,
      joinedAt,
    };

    persistLocalClan(userId, nextClan);
    clanLoadedForUserIdRef.current = userId;
    try {
      await saveClanMembershipToAccount(userId, nextClan);
    } catch (err: any) {
      setClanError(`Your clan was saved on this device, but account sync failed: ${err?.message || "network error"}`);
    }
    setClanStorageMode("local");
    setActiveTab("clan");
    setMobileTab("clan");
    setClan(nextClan.clan as ClanInfo);
    setClanDisplayName(nextClan.displayName);
    setClanStudyMinutes(0);
    setClanMembers([{
      user_id: userId,
      display_name: nextClan.displayName,
      study_minutes: 0,
      joined_at: joinedAt,
    }]);
    setJoinClanCode("");
    setClanMessage(`Joined clan ${code}.`);
    setClanLoading(false);
  };

  const leaveClan = async () => {
    if (!userId || !clan) return;
    if (!window.confirm(`Leave “${clan.name}”?`)) return;
    setClanLoading(true);

    if (clanRealtimeRef.current) {
      await clanRealtimeRef.current.untrack().catch(() => undefined);
      supabase.removeChannel(clanRealtimeRef.current);
      clanRealtimeRef.current = null;
    }

    persistLocalClan(userId, null);
    try {
      await saveClanMembershipToAccount(userId, null);
    } catch (err: any) {
      setClanError(`You left this device's clan, but account sync failed: ${err?.message || "network error"}`);
    }
    setClan(null);
    setClanMembers([]);
    setClanStudyMinutes(0);
    setClanStorageMode(null);
    setClanMessage("You left the clan.");
    setClanLoading(false);
  };

  const resetClan = async () => {
    if (!userId) return;
    const confirmed = window.confirm(
      "Reset your saved clan connection on this account and this device? This will let you create or join a new clan."
    );
    if (!confirmed) return;

    setClanLoading(true);
    setClanError(null);
    setClanMessage(null);

    // Stop any active realtime connection before clearing the saved clan.
    if (clanRealtimeRef.current) {
      try {
        await clanRealtimeRef.current.untrack();
      } catch {
        // Ignore cleanup errors; the channel is removed below.
      }
      supabase.removeChannel(clanRealtimeRef.current);
      clanRealtimeRef.current = null;
    }

    // Clear the current clan from both browser storage and the account record.
    persistLocalClan(userId, null);
    try {
      await saveClanMembershipToAccount(userId, null);
    } catch (err: any) {
      setClanError(
        `Local clan state was reset, but the account record could not be cleared: ${
          err?.message || "network error"
        }`
      );
    }

    // Clean up older clan-storage keys from previous app versions too.
    try {
      const legacyPrefixes = [
        "wjstudy_clan_",
        "wjstudy_clan_v1_",
        "wjstudy_clan_v2_",
      ];
      for (const prefix of legacyPrefixes) {
        localStorage.removeItem(`${prefix}${userId}`);
      }
    } catch {
      // localStorage may be unavailable in some privacy modes.
    }

    clanLoadedForUserIdRef.current = userId;
    setClan(null);
    setClanMembers([]);
    setClanStudyMinutes(0);
    setClanStorageMode(null);
    setClanDisplayName("");
    setJoinClanCode("");
    setNewClanName("");
    setActiveTab("clan");
    setMobileTab("clan");
    setClanMessage("Clan data reset. You can now create or join a clan.");
    setClanLoading(false);
  };

  const copyClanCode = async () => {
    if (!clan?.join_code) return;
    try {
      await navigator.clipboard.writeText(clan.join_code);
      setClanMessage("Join code copied.");
    } catch {
      setClanMessage(`Join code: ${clan.join_code}`);
    }
  };

  const recordClanStudySession = (sessionId: string, minutes: number) => {
    if (!clan || !userId || minutes <= 0) return;
    const safeMinutes = Math.min(60, Math.max(1, Math.round(minutes)));

    setClanStudyMinutes((current) => {
      const next = current + safeMinutes;
      const saved = readLocalClan(userId);
      const nextStore: LocalClanStore = {
        clan,
        displayName: clanDisplayNameRef.current || saved?.displayName || "Student",
        studyMinutes: next,
        joinedAt: saved?.joinedAt || new Date().toISOString(),
      };
      persistLocalClan(userId, nextStore);
      void saveClanMembershipToAccount(userId, nextStore).catch(() => undefined);

      const member: ClanMember = {
        user_id: userId,
        display_name: nextStore.displayName,
        study_minutes: next,
        joined_at: nextStore.joinedAt!,
      };

      setClanMembers((currentMembers) => {
        const map = new Map(currentMembers.map((item) => [item.user_id, item]));
        map.set(userId, member);
        return sortClanMembers([...map.values()]);
      });

      const channel = clanRealtimeRef.current;
      if (channel) {
        void channel.track(member);
        void channel.send({
          type: "broadcast",
          event: "member_update",
          payload: member,
        });
      }

      return next;
    });
  };

  // Auth Functions
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    setAuthLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Route signup through the server so the app can check the Supabase Auth
      // directory before creating a new identity. This prevents a signup from
      // silently creating a replacement account for an email that is already
      // registered.
      const response = await fetch("/api/account/signup", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error ||
            (response.status === 409
              ? "An account with this email already exists. Please sign in instead."
              : "Failed to sign up.")
        );
      }

      // The server returns the normal Supabase signup payload. When email
      // confirmation is disabled, apply the returned session to this browser.
      if (result?.session?.access_token && result?.session?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
        if (sessionError) throw sessionError;
      }

      if (result?.user && !result?.session) {
        setAuthMessage("Account created! Please check your email inbox to confirm registration.");
      } else {
        setAuthMessage("Account created and logged in!");
      }
    } catch (err: any) {
      setAuthError(err?.message || "Failed to sign up.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || "Failed to log in.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthMessage(null);
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Keep users on the page they started from after Google completes OAuth.
          redirectTo: `${window.location.origin}${window.location.pathname}`,
          // Read-only access is used to show Google Calendar events in this app.
          scopes: "https://www.googleapis.com/auth/calendar.readonly",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
      setAuthMessage("Redirecting to Google to sign you in…");
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Google sign-in could not be started.");
      setAuthLoading(false);
    }
  };

  const handleGoogleCalendarSync = async () => {
    if (calendarSyncState === "syncing") return;

    const accessToken = session?.provider_token as string | undefined;
    if (!accessToken) {
      setCalendarSyncState("error");
      setCalendarSyncMessage("Sign out, then use Sign in with Google to grant Calendar permission before syncing.");
      return;
    }

    setCalendarSyncState("syncing");
    setCalendarSyncMessage("Importing events from your primary Google Calendar…");

    try {
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 12);
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 12);
      const allGoogleEvents: GoogleCalendarApiEvent[] = [];
      let pageToken: string | undefined;

      do {
        const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
        url.searchParams.set("singleEvents", "true");
        url.searchParams.set("orderBy", "startTime");
        url.searchParams.set("showDeleted", "false");
        url.searchParams.set("maxResults", "2500");
        url.searchParams.set("timeMin", timeMin.toISOString());
        url.searchParams.set("timeMax", timeMax.toISOString());
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw googleEventError(await response.text());

        const payload = (await response.json()) as {
          items?: GoogleCalendarApiEvent[];
          nextPageToken?: string;
        };
        allGoogleEvents.push(...(payload.items || []));
        pageToken = payload.nextPageToken;
      } while (pageToken);

      const mergedImport = applyGoogleCalendarMergeRules(
        normalizeGoogleCalendarEvents(allGoogleEvents),
        googleCalendarMergeRules,
        true
      );
      const syncedHiddenGoogleEventIds = [...new Set([
        ...hiddenGoogleEventIds,
        ...mergedImport.duplicateIds,
      ])];
      const importedEvents = mergedImport.events.filter(
        (event) =>
          !shouldHideGoogleCalendarEvent(
            event,
            syncedHiddenGoogleEventIds,
            googleCalendarDeletionRules
          )
      );
      setGoogleCalendarEvents((currentEvents) => {
        const savedById = new Map(currentEvents.map((event) => [event.id, event]));
        return importedEvents.map((event) => {
          const saved = savedById.get(event.id);
          return saved
            ? { ...event, title: saved.title, color: saved.color, icon: saved.icon }
            : event;
        });
      });
      if (mergedImport.duplicateIds.length > 0) {
        setHiddenGoogleEventIds(syncedHiddenGoogleEventIds);
      }
      setCalendarSyncState("success");
      setCalendarSyncMessage(
        mergedImport.duplicateIds.length > 0
          ? `Imported ${importedEvents.length} Google Calendar events and kept ${mergedImport.duplicateIds.length} merged overlap${mergedImport.duplicateIds.length === 1 ? "" : "s"} hidden.`
          : `${importedEvents.length} Google Calendar event${importedEvents.length === 1 ? "" : "s"} imported into this app.`
      );
    } catch (err: unknown) {
      setCalendarSyncState("error");
      setCalendarSyncMessage(
        err instanceof Error
          ? err.message
          : "Google Calendar import failed. Please try again."
      );
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return false;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === "granted";
    } catch {
      setNotificationPermission(Notification.permission);
      return false;
    }
  };

  const showBrowserNotification = (title: string, body: string, tag: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;
    new Notification(title, { body, tag });
    return true;
  };

  const sendTestNotification = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) return;
    showBrowserNotification(
      "WJ Study",
      appSettings.language === "es"
        ? "Las notificaciones del navegador están activadas."
        : appSettings.language === "zh"
          ? "WJ Study 浏览器通知已启用。"
          : "Browser notifications are working.",
      "wj-study-test"
    );
  };

  const updateAppSettings = (updates: Partial<AppSettings>) => {
    setAppSettings((current) => normalizeAppSettings({
      ...current,
      ...updates,
      notifications: updates.notifications
        ? { ...current.notifications, ...updates.notifications }
        : current.notifications,
    }));
  };

  useEffect(() => {
    if (!isLoaded || !userId || typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const markAndNotify = (kind: string, key: string, title: string, body: string) => {
      const marker = `tracker_notification_sent_v1_${userId}_${kind}_${key}`;
      if (localStorage.getItem(marker)) return;
      if (showBrowserNotification(title, body, `wj-study-${kind}-${key}`)) {
        localStorage.setItem(marker, new Date().toISOString());
      }
    };

    const checkNotifications = () => {
      if (Notification.permission !== "granted") {
        setNotificationPermission(Notification.permission);
        return;
      }

      const today = new Date();
      const todayKey = formatDateKey(today);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = formatDateKey(tomorrow);
      const pendingTasks = tasks.filter((task) => !task.completed);

      if (appSettings.notifications.taskReminders) {
        pendingTasks
          .filter((task) => task.dueDate === todayKey || task.dueDate === tomorrowKey)
          .slice(0, 3)
          .forEach((task) => {
            markAndNotify(
              "task",
              `${todayKey}-${task.id}`,
              "WJ Study · Task reminder",
              task.dueDate === todayKey
                ? `${task.title} is due today.`
                : `${task.title} is due tomorrow.`
            );
          });
      }

      if (appSettings.notifications.deadlineAlerts) {
        pendingTasks
          .filter((task) => task.dueDate < todayKey)
          .slice(0, 3)
          .forEach((task) => {
            markAndNotify(
              "deadline",
              `${todayKey}-${task.id}`,
              "WJ Study · Deadline alert",
              `${task.title} is overdue.`
            );
          });
      }

      if (appSettings.notifications.focusReminders && today.getHours() >= 17) {
        const studiedToday = studySessions.some((session) => session.date === todayKey && session.minutes > 0);
        markAndNotify(
          "focus",
          todayKey,
          "WJ Study · Focus reminder",
          studiedToday ? "Keep up your study momentum." : "You have not logged study time today. Start a focus session when you are ready."
        );
      }
    };

    checkNotifications();
    const interval = window.setInterval(checkNotifications, 60_000);
    return () => window.clearInterval(interval);
  }, [appSettings.notifications.taskReminders, appSettings.notifications.deadlineAlerts, appSettings.notifications.focusReminders, isLoaded, tasks, studySessions, userId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.wjTheme = appSettings.theme;
    document.documentElement.dataset.wjAccent = appSettings.accent;
    document.documentElement.style.setProperty("--wj-accent", APP_ACCENT_VALUES[appSettings.accent]);
    document.documentElement.style.setProperty("color-scheme", appSettings.theme);
  }, [appSettings.theme, appSettings.accent]);

  const openCalendarDay = (date: string, calendarItemKey?: string) => {
    setZoomedCalendarDate(date);
    setEditingCalendarItemKey(calendarItemKey || null);
  };

  const updateCalendarEventOverride = (
    calendarItemKey: string,
    updates: CalendarEventOverride
  ) => {
    setCalendarEventOverrides((current) => ({
      ...current,
      [calendarItemKey]: { ...current[calendarItemKey], ...updates },
    }));
  };

  const resetCalendarEventOverride = (calendarItemKey: string) => {
    setCalendarEventOverrides((current) => {
      const next = { ...current };
      delete next[calendarItemKey];
      return next;
    });
  };

  const getCalendarEventDisplay = (
    calendarItemKey: string,
    base: Omit<CalendarEventDisplay, "key">
  ): CalendarEventDisplay => {
    const override = calendarEventOverrides[calendarItemKey] || {};
    return {
      key: calendarItemKey,
      title: override.title ?? base.title,
      color: override.color ?? base.color,
      icon: override.icon ?? base.icon,
      date: override.date ?? base.date,
      startTime: override.startTime ?? base.startTime,
      endTime: override.endTime ?? base.endTime,
      allDay: override.allDay ?? base.allDay,
      details: base.details,
      sourceLabel: base.sourceLabel,
    };
  };

  const openGoogleCalendarDeleteDialog = (eventId: string) => {
    setCalendarDeleteEventId(eventId);
  };

  const closeGoogleCalendarDeleteDialog = () => {
    setCalendarDeleteEventId(null);
  };

  const deleteGoogleCalendarEvent = (
    eventId: string,
    mode: "this" | "following" | "all"
  ) => {
    const eventToDelete = googleCalendarEvents.find((event) => event.id === eventId);
    if (!eventToDelete) {
      closeGoogleCalendarDeleteDialog();
      return;
    }

    if (mode === "this" || !eventToDelete.recurringEventId) {
      const nextHiddenGoogleEventIds = hiddenGoogleEventIds.includes(eventId)
        ? hiddenGoogleEventIds
        : [...hiddenGoogleEventIds, eventId];
      setHiddenGoogleEventIds(nextHiddenGoogleEventIds);
      setGoogleCalendarEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== eventId)
      );
      setCalendarSyncMessage(`Hidden “${eventToDelete.title}” from WJ Study.`);
      setCalendarDeleteEventId(null);
      setEditingCalendarItemKey(null);
      return;
    }

    const seriesId = eventToDelete.recurringEventId;
    const cutoff =
      eventToDelete.originalStartTime ||
      `${eventToDelete.startDate}T${eventToDelete.startTime || "00:00"}`;

    let nextGoogleCalendarDeletionRules: GoogleCalendarDeletionRule[];
    if (mode === "all") {
      nextGoogleCalendarDeletionRules = [
        ...googleCalendarDeletionRules.filter((rule) => rule.seriesId !== seriesId),
        { seriesId, mode: "all" },
      ];
    } else {
      const existingRule = googleCalendarDeletionRules.find(
        (rule) => rule.seriesId === seriesId
      );
      if (existingRule?.mode === "all") {
        nextGoogleCalendarDeletionRules = googleCalendarDeletionRules;
      } else if (existingRule?.mode === "from") {
        const existingCutoff = existingRule.fromStart || cutoff;
        const earlierCutoff =
          Date.parse(existingCutoff) <= Date.parse(cutoff)
            ? existingCutoff
            : cutoff;
        nextGoogleCalendarDeletionRules = googleCalendarDeletionRules.map((rule) =>
          rule.seriesId === seriesId
            ? { ...rule, mode: "from", fromStart: earlierCutoff }
            : rule
        );
      } else {
        nextGoogleCalendarDeletionRules = [
          ...googleCalendarDeletionRules,
          { seriesId, mode: "from", fromStart: cutoff },
        ];
      }
    }

    setGoogleCalendarDeletionRules(nextGoogleCalendarDeletionRules);
    setGoogleCalendarEvents((currentEvents) =>
      currentEvents.filter((currentEvent) =>
        !shouldHideGoogleCalendarEvent(
          currentEvent,
          hiddenGoogleEventIds,
          nextGoogleCalendarDeletionRules
        )
      )
    );
    setCalendarSyncMessage(
      mode === "all"
        ? `Hidden the entire “${eventToDelete.title}” series from WJ Study.`
        : `Hidden “${eventToDelete.title}” and all following occurrences from WJ Study.`
    );
    setCalendarDeleteEventId(null);
    setEditingCalendarItemKey(null);
  };

  // --- ORGANIZE WITH AI: match synced Google events to your classes/clubs
  // by name so they get the right color + icon, and clean up exact duplicates ---
  const STOPWORDS = new Set([
    "the", "a", "an", "of", "and", "or", "to", "year", "yr", "period",
    "advisory", "class", "course", "block",
  ]);

  const normalizeWords = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  const nameSimilarity = (a: string, b: string) => {
    const wordsA = new Set(normalizeWords(a));
    const wordsB = new Set(normalizeWords(b));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let shared = 0;
    wordsA.forEach((w) => {
      if (wordsB.has(w)) shared += 1;
    });
    return shared / Math.min(wordsA.size, wordsB.size);
  };

  const buildCalendarReviewGroups = (events: SyncedGoogleCalendarEvent[]) => {
    if (events.length < 2) return [] as CalendarEventReviewGroup[];

    const parent = events.map((_, index) => index);
    const find = (index: number): number => {
      let root = index;
      while (parent[root] !== root) root = parent[root];
      while (parent[index] !== index) {
        const next = parent[index];
        parent[index] = root;
        index = next;
      }
      return root;
    };
    const union = (a: number, b: number) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent[rootB] = rootA;
    };

    // Candidate duplicate groups are based on title similarity. We deliberately
    // do not merge anything here — this only builds a review queue.
    for (let i = 0; i < events.length; i += 1) {
      for (let j = i + 1; j < events.length; j += 1) {
        const a = events[i];
        const b = events[j];
        const score = nameSimilarity(a.title, b.title);
        if (score >= 0.5) union(i, j);
      }
    }

    const groups = new Map<number, number[]>();
    events.forEach((_, index) => {
      const root = find(index);
      const current = groups.get(root) || [];
      current.push(index);
      groups.set(root, current);
    });

    const reviewGroups: CalendarEventReviewGroup[] = [];
    let groupCounter = 0;
    groups.forEach((indexes) => {
      const uniqueTitles = [...new Set(indexes.map((index) => events[index].title.trim()).filter(Boolean))];
      if (uniqueTitles.length < 2) return;

      const groupEvents = indexes.map((index) => events[index]);
      const wordCounts = uniqueTitles.map((title) => ({ title, words: normalizeWords(title) }));
      const allWordCounts = new Map<string, number>();
      wordCounts.forEach(({ words }) => words.forEach((word) => allWordCounts.set(word, (allWordCounts.get(word) || 0) + 1)));

      let proposedTitle = uniqueTitles[0];
      let bestScore = -1;
      for (const candidate of uniqueTitles) {
        let score = 0;
        for (const other of uniqueTitles) {
          score += nameSimilarity(candidate, other);
        }
        if (score > bestScore) {
          bestScore = score;
          proposedTitle = candidate;
        }
      }

      const pairScores: number[] = [];
      for (let i = 0; i < uniqueTitles.length; i += 1) {
        for (let j = i + 1; j < uniqueTitles.length; j += 1) {
          pairScores.push(nameSimilarity(uniqueTitles[i], uniqueTitles[j]));
        }
      }
      const confidence = Math.round(((pairScores.reduce((sum, score) => sum + score, 0) / Math.max(1, pairScores.length)) || 0) * 100);

      const exampleTimes = [...new Set(groupEvents.map((event) => event.startTime).filter((time): time is string => Boolean(time)))].slice(0, 4);
      const exampleDates = [...new Set(groupEvents.map((event) => event.startDate).filter(Boolean))].slice(0, 4);

      reviewGroups.push({
        id: `calendar-review-${Date.now()}-${groupCounter++}`,
        eventIds: groupEvents.map((event) => event.id),
        titles: uniqueTitles,
        proposedTitle,
        confidence,
        exampleTimes,
        exampleDates,
      });
    });

    return reviewGroups.sort((a, b) => b.confidence - a.confidence);
  };

  const organizeCalendarWithAI = () => {
    const groups = buildCalendarReviewGroups(googleCalendarEvents);

    if (groups.length === 0) {
      setCalendarReviewGroups([]);
      setCalendarReviewSelected({});
      setCalendarReviewOpen(true);
      return;
    }

    setCalendarReviewGroups(groups);
    setCalendarReviewSelected(Object.fromEntries(groups.map((group) => [group.id, true])));
    setCalendarReviewOpen(true);
  };

  // Re-scan the current calendar contents while the review modal is open.
  // This intentionally re-runs the grouping/title suggestion logic from scratch
  // so a fresh Google sync or a user's edits can produce the same or a new
  // organizing name without applying any merge automatically.
  const refreshCalendarReview = () => {
    const groups = buildCalendarReviewGroups(googleCalendarEvents);
    setCalendarReviewGroups(groups);
    setCalendarReviewSelected(
      Object.fromEntries(groups.map((group) => [group.id, true]))
    );
  };

  // Beautify the calendar visually without changing dates, times, titles, or
  // merging/deleting anything. Colors/icons are chosen from existing class/club
  // names first, then from common event-type keywords, with a colorful fallback.
  const beautifyCalendar = () => {
    const palette = [
      "#2563EB",
      "#7C3AED",
      "#DB2777",
      "#EA580C",
      "#059669",
      "#0891B2",
      "#4F46E5",
      "#CA8A04",
    ];

    const classifyTitle = (title: string) => {
      const normalized = normalizeGoogleCalendarMergeText(title);
      const classMatch = classes
        .map((cls) => ({ cls, score: nameSimilarity(title, cls.name) }))
        .sort((a, b) => b.score - a.score)[0];
      const clubMatch = clubs
        .map((club) => ({ club, score: nameSimilarity(title, club.name) }))
        .sort((a, b) => b.score - a.score)[0];

      if (classMatch && classMatch.score >= 0.5 && classMatch.score >= (clubMatch?.score || 0)) {
        return {
          color: classMatch.cls.color || palette[0],
          icon: "📘",
        };
      }

      if (clubMatch && clubMatch.score >= 0.5) {
        return {
          color: clubMatch.club.color || "#8B5CF6",
          icon: clubMatch.club.icon || "👥",
        };
      }

      if (/\b(exam|test|midterm|final|quiz|assessment)\b/.test(normalized)) {
        return { color: "#E11D48", icon: "📝" };
      }
      if (/\b(homework|assignment|project|essay|paper)\b/.test(normalized)) {
        return { color: "#2563EB", icon: "✅" };
      }
      if (/\b(study|review|revision|flashcards|reading)\b/.test(normalized)) {
        return { color: "#7C3AED", icon: "📚" };
      }
      if (/\b(meeting|club|practice|rehearsal)\b/.test(normalized)) {
        return { color: "#D97706", icon: "👥" };
      }
      if (/\b(sports|sport|gym|workout|training)\b/.test(normalized)) {
        return { color: "#0891B2", icon: "🏃" };
      }
      if (/\b(birthday|doctor|appointment|personal)\b/.test(normalized)) {
        return { color: "#64748B", icon: "👤" };
      }

      return null;
    };

    setCalendarEventOverrides((current) => {
      const next = { ...current };
      let paletteIndex = 0;
      let googleStyled = 0;
      let manualStyled = 0;

      googleCalendarEvents.forEach((event) => {
        const key = `g-${event.id}`;
        const chosen = classifyTitle(event.title) || {
          color: palette[paletteIndex++ % palette.length],
          icon: "✦",
        };
        next[key] = {
          ...next[key],
          color: chosen.color,
          icon: chosen.icon,
        };
        googleStyled += 1;
      });

      manualCalendarEvents.forEach((event) => {
        const key = `m-${event.id}`;
        const typeStyles: Record<ManualCalendarEvent["type"], { color: string; icon: string }> = {
          Study: { color: "#7C3AED", icon: "📚" },
          Test: { color: "#E11D48", icon: "📝" },
          Homework: { color: "#2563EB", icon: "✅" },
          Class: { color: "#0F766E", icon: "📘" },
          Club: { color: "#D97706", icon: "👥" },
          Personal: { color: "#475569", icon: "👤" },
          Other: { color: "#64748B", icon: "✦" },
        };
        next[key] = {
          ...next[key],
          color: typeStyles[event.type].color,
          icon: typeStyles[event.type].icon,
        };
        manualStyled += 1;
      });

      return next;
    });

    setCalendarSyncState("success");
    setCalendarSyncMessage(
      `✨ Calendar beautified — ${googleCalendarEvents.length + manualCalendarEvents.length} event${googleCalendarEvents.length + manualCalendarEvents.length === 1 ? "" : "s"} color-coded and given matching icons.`
    );
  };

  const toggleCalendarReviewGroup = (groupId: string) => {
    setCalendarReviewSelected((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  const updateCalendarReviewTitle = (groupId: string, title: string) => {
    setCalendarReviewGroups((current) =>
      current.map((group) => group.id === groupId ? { ...group, proposedTitle: title } : group)
    );
  };

  const mergeReviewedCalendarGroups = () => {
    const selectedGroups = calendarReviewGroups.filter((group) => calendarReviewSelected[group.id]);
    if (selectedGroups.length === 0) {
      setCalendarReviewOpen(false);
      return;
    }

    const nextMergeRules = [...googleCalendarMergeRules];

    selectedGroups.forEach((group) => {
      const canonicalTitle = group.proposedTitle.trim() || group.titles[0];
      const aliasSet = new Set(group.titles.map((title) => title.trim()).filter(Boolean));
      aliasSet.add(canonicalTitle);
      const existingIndex = nextMergeRules.findIndex((rule) =>
        rule.aliases.some((alias) =>
          group.titles.some(
            (title) => normalizeGoogleCalendarMergeText(alias) === normalizeGoogleCalendarMergeText(title)
          )
        )
      );

      const nextRule: GoogleCalendarMergeRule = {
        id: existingIndex >= 0 ? nextMergeRules[existingIndex].id : `calendar-merge-${Date.now()}-${group.id}`,
        canonicalTitle,
        aliases: [...aliasSet],
      };

      if (existingIndex >= 0) nextMergeRules[existingIndex] = nextRule;
      else nextMergeRules.push(nextRule);
    });

    // A merge is an app-level consolidation: every selected title variant is
    // normalized to the chosen canonical name, while distinct dates remain.
    // When merged events land on the same calendar day, keep one occurrence
    // for that day so the calendar never shows duplicate merged events.
    const mergedResult = applyGoogleCalendarMergeRules(
      googleCalendarEvents,
      nextMergeRules,
      true
    );

    const nextHiddenGoogleEventIds = [
      ...new Set([...hiddenGoogleEventIds, ...mergedResult.duplicateIds]),
    ];

    setGoogleCalendarEvents(mergedResult.events);
    setHiddenGoogleEventIds(nextHiddenGoogleEventIds);
    setGoogleCalendarMergeRules(nextMergeRules);
    setCalendarReviewOpen(false);
    setEditingCalendarItemKey(null);
    setCalendarReviewGroups([]);
    setCalendarReviewSelected({});

    const mergedOccurrenceCount = selectedGroups.reduce(
      (total, group) => total + group.eventIds.length,
      0
    );
    const canonicalNames = selectedGroups
      .map((group) => group.proposedTitle.trim() || group.titles[0])
      .filter(Boolean);
    const duplicateCount = mergedResult.duplicateIds.length;

    setCalendarSyncMessage(
      canonicalNames.length === 1
        ? `Merged ${mergedOccurrenceCount} related occurrence${mergedOccurrenceCount === 1 ? "" : "s"} into “${canonicalNames[0]}”.${duplicateCount > 0 ? ` Removed ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} from matching days.` : ""}`
        : `Merged ${selectedGroups.length} event groups (${mergedOccurrenceCount} occurrences).${duplicateCount > 0 ? ` Removed ${duplicateCount} duplicates from matching days.` : ""}`
    );
    setCalendarSyncState("success");
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setShowAuth(false);
    setSession(null);
    setUserId(null);
    setClasses([]);
    setClubs([]);
    setTasks([]);
    setStreaks([]);
    setStudySessions([]);
    setGamificationXp(0);
    setAppSettings(DEFAULT_APP_SETTINGS);
    setShowSettingsPage(false);
    setShowOnboarding(false);
    clanLoadedForUserIdRef.current = null;
    setGoogleCalendarEvents([]);
    setHiddenGoogleEventIds([]);
    setManualCalendarEvents([]);
    setGoogleCalendarMergeRules([]);
    setCalendarSyncState("idle");
    setCalendarSyncMessage(null);
  };

  useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    setSession(session);
    const activeId = session?.user?.id ?? null;
    setUserId(activeId);

    if (activeId) {
      // Prevent re-fetching on background auth events or duplicate mounts
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      if (loadedUserIdRef.current === activeId) return;

      loadedUserIdRef.current = activeId;
      clanLoadedForUserIdRef.current = null;
      // The calendar is the default landing view after login. Loading a saved
      // clan should never redirect the user away from the calendar.
      setActiveTab("calendar");
      setMobileTab("calendar");
      setIsLoaded(false);
      void loadUserData(activeId);
      void loadClan(activeId);
    } else {
      loadedUserIdRef.current = null;
      clanLoadedForUserIdRef.current = null;
      setClasses([]);
      setClubs([]);
      setTasks([]);
      setStreaks([]);
      setStudySessions([]);
      setGamificationXp(0);
      setAppSettings(DEFAULT_APP_SETTINGS);
      setShowSettingsPage(false);
      setShowOnboarding(false);
      setLearningMaterials([]);
      setLearningBundles([]);
      setLearningClassId("");
      setLearningMaterialTitle("");
      setLearningMaterialText("");
      setGoogleCalendarEvents([]);
      setHiddenGoogleEventIds([]);
      setCalendarSyncState("idle");
      setCalendarSyncMessage(null);
      setIsLoaded(true);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  if (!userId) return;
    const channel = supabase
      .channel(`db-changes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_data",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (isSavingRef.current) return;
          if (payload.new && payload.new.data) {
            const localWorkspaceSavedAt = Number(
              safeStorageGet<string | number>(
                `tracker_workspace_data_saved_at_v2_${userId}`,
                0
              )
            );
            const realtimeUpdatedAt = payload.new?.updated_at
              ? new Date(payload.new.updated_at).getTime()
              : 0;
            const localWorkspaceIsNewer =
              localWorkspaceSavedAt > 0 &&
              realtimeUpdatedAt > 0 &&
              localWorkspaceSavedAt > realtimeUpdatedAt;

            if (!localWorkspaceIsNewer && Array.isArray(payload.new.data.classes))
              setClasses(
                withoutLegacyDemoItems(
                  payload.new.data.classes,
                  LEGACY_DEMO_CLASS_IDS
                )
              );
            if (!localWorkspaceIsNewer && Array.isArray(payload.new.data.clubs))
              setClubs(
                normalizeClubsData(
                  withoutLegacyDemoItems(
                    payload.new.data.clubs,
                    LEGACY_DEMO_CLUB_IDS
                  )
                )
              );
            if (!localWorkspaceIsNewer && Array.isArray(payload.new.data.tasks))
              setTasks(
                withoutLegacyDemoItems(
                  payload.new.data.tasks,
                  LEGACY_DEMO_TASK_IDS
                )
              );
            if (!localWorkspaceIsNewer && Array.isArray(payload.new.data.streaks))
              setStreaks(
                withoutLegacyDemoItems(
                  payload.new.data.streaks,
                  LEGACY_DEMO_STREAK_IDS
                )
              );
            if (!localWorkspaceIsNewer && Array.isArray(payload.new.data.studySessions))
              setStudySessions(
                payload.new.data.studySessions.filter(
                  (session: any) =>
                    session &&
                    typeof session.id === "string" &&
                    typeof session.date === "string" &&
                    typeof session.minutes === "number"
                )
              );
            if (!localWorkspaceIsNewer && typeof payload.new.data.gamificationXp === "number")
              setGamificationXp(Math.max(0, Math.floor(payload.new.data.gamificationXp)));
            if (!localWorkspaceIsNewer && payload.new.data.appSettings)
              setAppSettings(normalizeAppSettings(payload.new.data.appSettings));
            if (Array.isArray(payload.new.data.learningMaterials))
              setLearningMaterials(payload.new.data.learningMaterials);
            if (Array.isArray(payload.new.data.learningBundles))
              setLearningBundles(payload.new.data.learningBundles);
            if (!localWorkspaceIsNewer && Array.isArray(payload.new.data.manualCalendarEvents))
              setManualCalendarEvents(payload.new.data.manualCalendarEvents);
            if (!localWorkspaceIsNewer) {
              const realtimeCalendarEventOverrides =
                payload.new.data.calendarEventOverrides &&
                typeof payload.new.data.calendarEventOverrides === "object" &&
                !Array.isArray(payload.new.data.calendarEventOverrides)
                  ? (payload.new.data.calendarEventOverrides as Record<string, CalendarEventOverride>)
                  : {};
              setCalendarEventOverrides(realtimeCalendarEventOverrides);
            }
            const updatedHiddenGoogleEventIds = normalizeGoogleEventIds(
              payload.new.data.hiddenGoogleEventIds
            );
            if (Array.isArray(payload.new.data.googleCalendarDeletionRules)) {
              const updatedGoogleCalendarDeletionRules =
                normalizeGoogleCalendarDeletionRules(
                  payload.new.data.googleCalendarDeletionRules
                );
              const updatedGoogleCalendarMergeRules = normalizeGoogleCalendarMergeRules(
                payload.new.data.googleCalendarMergeRules
              );
              const mergedRealtimeEvents = applyGoogleCalendarMergeRules(
                normalizeGoogleCalendarEvents(
                  payload.new.data.googleCalendarEvents
                ),
                updatedGoogleCalendarMergeRules
              ).events;
              setGoogleCalendarEvents(
                mergedRealtimeEvents.filter(
                  (event) =>
                    !shouldHideGoogleCalendarEvent(
                      event,
                      updatedHiddenGoogleEventIds,
                      updatedGoogleCalendarDeletionRules
                    )
                )
              );
              setGoogleCalendarDeletionRules(updatedGoogleCalendarDeletionRules);
              setGoogleCalendarMergeRules(updatedGoogleCalendarMergeRules);
            } else {
              const updatedGoogleCalendarMergeRules = normalizeGoogleCalendarMergeRules(
                payload.new.data.googleCalendarMergeRules
              );
              setGoogleCalendarEvents(
                applyGoogleCalendarMergeRules(
                  normalizeGoogleCalendarEvents(
                    payload.new.data.googleCalendarEvents
                  ),
                  updatedGoogleCalendarMergeRules
                ).events.filter((event) => !updatedHiddenGoogleEventIds.includes(event.id))
              );
              setGoogleCalendarMergeRules(updatedGoogleCalendarMergeRules);
            }
            setHiddenGoogleEventIds(updatedHiddenGoogleEventIds);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

useEffect(() => {
  if (!isLoaded || !userId) return;

  // Academic workspace persistence must not depend on the optional Clan subsystem.
  // A slow/failing Clan load should never prevent tasks, classes, grades, streaks,
  // or schedule changes from being saved.

  // Immediately lock local state from Realtime overwrites during the 600ms debounce
  isSavingRef.current = true;

  const workspaceSavedAt = Date.now();
  localStorage.setItem(
    `tracker_workspace_data_saved_at_v2_${userId}`,
    String(workspaceSavedAt)
  );
  localStorage.setItem(`tracker_classes_v8_${userId}`, JSON.stringify(classes));
  localStorage.setItem(`tracker_clubs_v8_${userId}`, JSON.stringify(clubs));
  localStorage.setItem(`tracker_tasks_v8_${userId}`, JSON.stringify(tasks));
  localStorage.setItem(`tracker_streaks_v8_${userId}`, JSON.stringify(streaks));
  localStorage.setItem(`tracker_study_sessions_v1_${userId}`, JSON.stringify(studySessions));
  localStorage.setItem(`tracker_gamification_xp_v1_${userId}`, JSON.stringify(gamificationXp));
  localStorage.setItem(`tracker_app_settings_v1_${userId}`, JSON.stringify(appSettings));
  localStorage.setItem(`tracker_learning_materials_v1_${userId}`, JSON.stringify(learningMaterials));
  localStorage.setItem(`tracker_learning_bundles_v1_${userId}`, JSON.stringify(learningBundles));
  localStorage.setItem(
    `tracker_google_calendar_events_v1_${userId}`,
    JSON.stringify(googleCalendarEvents)
  );
  localStorage.setItem(
    `tracker_hidden_google_event_ids_v1_${userId}`,
    JSON.stringify(hiddenGoogleEventIds)
  );
  localStorage.setItem(
    `tracker_google_calendar_deletion_rules_v1_${userId}`,
    JSON.stringify(googleCalendarDeletionRules)
  );
  localStorage.setItem(
    `tracker_google_calendar_merge_rules_v1_${userId}`,
    JSON.stringify(googleCalendarMergeRules)
  );
  localStorage.setItem(
    `tracker_manual_calendar_events_v1_${userId}`,
    JSON.stringify(manualCalendarEvents)
  );
  localStorage.setItem(
    `tracker_calendar_event_overrides_v1_${userId}`,
    JSON.stringify(calendarEventOverrides)
  );

  async function saveData() {
    setSyncStatus("syncing");
    try {
      // Merge into the existing user_data JSON instead of replacing it blindly.
      // This keeps unrelated user-specific fields (especially Clan data) intact
      // while the rest of the academic workspace is being saved.
      const { data: existingRow, error: readError } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();

      if (readError) throw readError;

      const existingData =
        existingRow?.data &&
        typeof existingRow.data === "object" &&
        !Array.isArray(existingRow.data)
          ? { ...(existingRow.data as Record<string, any>) }
          : {};

      const nextData: Record<string, any> = {
        ...existingData,
        classes,
        clubs,
        tasks,
        streaks,
        studySessions,
        gamificationXp,
        appSettings,
        learningMaterials,
        learningBundles,
        googleCalendarEvents,
        hiddenGoogleEventIds,
        googleCalendarDeletionRules,
        googleCalendarMergeRules,
        manualCalendarEvents,
        calendarEventOverrides,
      };

      // Only replace/delete the Clan field after Clan has actually finished
      // loading. A slow Clan request must never erase the user's membership.
      if (clanLoadedForUserIdRef.current === userId) {
        if (clan && userId) {
          nextData.clan = {
            clan,
            displayName: clanDisplayName || "Student",
            studyMinutes: clanStudyMinutes,
            joinedAt: readLocalClan(userId)?.joinedAt || new Date().toISOString(),
          };
        } else {
          delete nextData.clan;
        }
      }

      const { error: writeError } = await supabase.from("user_data").upsert(
        {
          user_id: userId,
          data: nextData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (writeError) throw writeError;
      setSyncStatus("synced");
    } catch (err) {
      setSyncStatus("error");
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 500);
    }
  }

  const timeout = setTimeout(saveData, 600);
  return () => clearTimeout(timeout);
}, [
  classes,
  clubs,
  tasks,
  streaks,
  studySessions,
  gamificationXp,
  appSettings,
  learningMaterials,
  learningBundles,
  clan,
  clanDisplayName,
  clanStudyMinutes,
  googleCalendarEvents,
  hiddenGoogleEventIds,
  googleCalendarDeletionRules,
  googleCalendarMergeRules,
  manualCalendarEvents,
  calendarEventOverrides,
  isLoaded,
  userId,
]);

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedClassId("");
      setTaskClassId("");
      setTimetableClassId("");
      return;
    }
    if (!classes.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    }
    if (!classes.some((c) => c.id === taskClassId)) {
      setTaskClassId(classes[0].id);
    }
    if (!classes.some((c) => c.id === timetableClassId)) {
      setTimetableClassId(classes[0].id);
    }
  }, [classes, selectedClassId, taskClassId, timetableClassId]);

  useEffect(() => {
    if (classes.length > 0 && !classes.some((cls) => cls.id === learningClassId)) {
      setLearningClassId(classes[0].id);
    }
  }, [classes, learningClassId]);

  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Sync selected standards on class change
  useEffect(() => {
    if (activeClass?.standards) {
      setSelectedStandardsForExam(activeClass.standards.map((s) => s.id));
    }
  }, [selectedClassId, activeClass]);

  const toggleStandardSelection = (stdId: string) => {
    setSelectedStandardsForExam((prev) =>
      prev.includes(stdId) ? prev.filter((id) => id !== stdId) : [...prev, stdId]
    );
  };

  // --- POWERSCHOOL PHOTO ANALYZER OCR FUNCTION ---
  const analyzePowerSchoolScreenshot = async (file: File) => {
    setIsAnalyzingPhoto(true);
    setPhotoAnalysisStatus("Scanning PowerSchool table structure...");

    try {
    // 1. Run OCR on the uploaded image
    const worker = await createWorker("eng");
    const ret = await worker.recognize(file);
    await worker.terminate();

    const rawText = ret.data.text;
    setPhotoAnalysisStatus("Parsing course names and schedules...");

    // 2. Parse lines from the image text
    const lines = rawText.split("\n").filter((l) => l.trim().length > 0);
    const extractedClasses: ClassItem[] = [];

    lines.forEach((line, index) => {
      // Basic rule: filter out headers or empty text
      if (line.toLowerCase().includes("attendance") || line.toLowerCase().includes("teacher")) return;

      extractedClasses.push({
        id: Date.now().toString() + "-" + index,
        name: line.trim().slice(0, 40), // Extracted class name
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
        targetGrade: "A",
        standards: [],
        meetingTimes: [],
      });
    });

    if (extractedClasses.length > 0) {
      const nextClasses = [...classes, ...extractedClasses];
      setClasses(nextClasses);
      saveWorkspaceChangeImmediately({ classes: nextClasses });
      setSelectedClassId(extractedClasses[0].id);
      alert(`🎉 PowerSchool AI extracted ${extractedClasses.length} courses!`);
    } else {
      alert("No course text detected. Please try a clearer screenshot.");
    }
  } catch (err) {
    alert("Error reading screenshot. Please try again.");
  } finally {
    setIsAnalyzingPhoto(false);
    setPhotoAnalysisStatus(null);
    setShowPhotoModal(false);
  }
};

  // --- SCHOOLSBUDDY PHOTO ANALYZER OCR FUNCTION ---
const analyzeSchoolsBuddyScreenshot = async (file: File) => {
  setIsAnalyzingPhoto(true);
  setPhotoAnalysisStatus("Scanning SchoolsBuddy screenshot...");

  try {
    // 1. Run OCR on the image
    const worker = await createWorker("eng");
    const ret = await worker.recognize(file);
    await worker.terminate();

    const rawText = ret.data.text;
    setPhotoAnalysisStatus("Parsing clubs and activities...");

    // 2. Parse lines from the image
    const lines = rawText.split("\n").filter((l) => l.trim().length > 0);
    const extractedClubs: ClubItem[] = [];

    lines.forEach((line, index) => {
      // Filter out navigation/header text commonly seen in SchoolsBuddy
      const lower = line.toLowerCase();
      if (lower.includes("schoolsbuddy") || lower.includes("sign out") || lower.includes("welcome")) {
        return;
      }

      extractedClubs.push({
        id: Date.now().toString() + "-" + index,
        name: line.trim().slice(0, 40), // Extracted club name
        role: "Member",
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
        meetingTimes: [],
      });
    });

    if (extractedClubs.length > 0) {
      const nextClubs = [...clubs, ...extractedClubs];
      setClubs(nextClubs);
      saveWorkspaceChangeImmediately({ clubs: nextClubs });
      alert(`🎉 SchoolsBuddy AI extracted ${extractedClubs.length} clubs!`);
    } else {
      alert("No club text detected. Please try a clearer screenshot.");
    }
  } catch (err) {
    alert("Error reading screenshot. Please try again.");
  } finally {
    setIsAnalyzingPhoto(false);
    setPhotoAnalysisStatus(null);
    setShowPhotoModal(false);
  }
};

  const cumulativeGPA = useMemo(() => {
    if (!classes || classes.length === 0) return 0;
    let totalPoints = 0;
    let count = 0;
    for (const cls of classes) {
      let classPoints: number | null = null;
      if (
        cls.manualGrade !== undefined &&
        cls.manualGrade !== null &&
        String(cls.manualGrade).trim() !== ""
      ) {
        classPoints = parseGradeToPoints(cls.manualGrade);
      } else {
        const sbg = calculateOverallGrade(cls.standards);
        if (sbg.evaluatedCount > 0) classPoints = sbg.gpa;
      }
      if (classPoints === null) continue;
      totalPoints += classPoints;
      count += 1;
    }
    if (count === 0) return 0;
    return Math.round((totalPoints / count) * 100) / 100;
  }, [classes]);

  const topPriorityTask = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.completed);
    if (activeTasks.length === 0) return null;

    const calculatePriorityScore = (task: Task): number => {
      let score = 0;
      if (task.type === "test") score += 40;
      if (task.dueDate && task.dueDate.trim() !== "") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(task.dueDate + "T00:00:00");
        if (!isNaN(due.getTime())) {
          const diffDays = Math.ceil(
            (due.getTime() - today.getTime()) / (1000 * 3600 * 24)
          );
          if (diffDays <= 0) score += 100;
          else if (diffDays <= 1) score += 80;
          else if (diffDays <= 3) score += 60;
          else if (diffDays <= 7) score += 30;
          else score += 10;
        }
      }
      if (task.estimatedHours > 0) {
        score += Math.min(30, (task.estimatedHours - task.actualHours) * 5);
      }
      return score;
    };

    return [...activeTasks].sort(
      (a, b) => calculatePriorityScore(b) - calculatePriorityScore(a)
    )[0];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (taskFilter === "pending") result = result.filter((t) => !t.completed);
    else if (taskFilter === "completed")
      result = result.filter((t) => t.completed);
    else if (taskFilter === "tests") result = result.filter((t) => t.type === "test");
    else if (taskFilter === "homework")
      result = result.filter((t) => t.type === "homework");

    if (taskSort === "dueDate") {
      result.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    } else if (taskSort === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [tasks, taskFilter, taskSort]);

  const gamification = useMemo(() => {
    const completedTasks = tasks.filter((task) => task.completed).length;
    const focusSessions = studySessions.length;

    return {
      ...getGamificationProgress(gamificationXp),
      completedTasks,
      focusSessions,
    };
  }, [gamificationXp, tasks, studySessions]);

  const analytics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Study time uses one consistent rule everywhere:
    // for each task, use max(total Focus time, task.actualHours).
    // Orphan Focus sessions (not attached to a task) are still counted.
    const focusMinutesByTask = new Map<string, number>();
    studySessions.forEach((session) => {
      const minutes = Math.max(0, Number(session.minutes) || 0);
      if (session.taskId) {
        focusMinutesByTask.set(
          session.taskId,
          (focusMinutesByTask.get(session.taskId) || 0) + minutes
        );
      }
    });

    const studyHoursForTask = (task: Task) => {
      const focusHours = (focusMinutesByTask.get(task.id) || 0) / 60;
      const manualLoggedHours = Math.max(0, Number(task.actualHours) || 0);
      return Math.max(focusHours, manualLoggedHours);
    };

    const totalTaskStudyHours = tasks.reduce((sum, task) => sum + studyHoursForTask(task), 0);
    const orphanStudyMinutes = studySessions
      .filter((session) => !session.taskId)
      .reduce((sum, session) => sum + Math.max(0, Number(session.minutes) || 0), 0);
    const totalStudyHours = totalTaskStudyHours + orphanStudyMinutes / 60;

    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const completedTaskCount = tasks.filter((task) => task.completed).length;
    const pendingTaskCount = tasks.filter((task) => !task.completed).length;
    const missedDeadlineTasks = tasks.filter((task) => {
      if (task.completed || !task.dueDate) return false;
      const due = new Date(`${task.dueDate}T23:59:59`);
      return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
    });

    const classStudy = classes.map((cls) => {
      const hours = tasks
        .filter((task) => task.classId === cls.id)
        .reduce((sum, task) => sum + studyHoursForTask(task), 0);
      const grade = cls.manualGrade
        ? parseGradeToPoints(cls.manualGrade)
        : calculateOverallGrade(cls.standards).gpa;
      return {
        id: cls.id,
        name: cls.name,
        color: cls.color,
        hours,
        grade: grade ?? 0,
        letter: grade && grade > 0 ? pointsToLetter(grade) : "N/A",
      };
    });

    // "This week" is always the current Monday-Sunday calendar week.
    // For the daily graph, Focus sessions naturally retain their exact day.
    // Because Task.actualHours has no date history, any manual-only portion is
    // placed on the task due date when that due date is in the current week;
    // otherwise, when the task has Focus time this week, the extra manual-only
    // portion is placed on the latest Focus day for that task. This preserves
    // the same max(Focus time, actualHours) rule without double-counting.
    const dayOfWeek = today.getDay();
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - distanceToMonday);

    const weekDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
    const weekKeys = weekDates.map(formatDateKey);
    const weekKeySet = new Set(weekKeys);

    const focusByTaskAndDay = new Map<string, Map<string, number>>();
    studySessions.forEach((session) => {
      const minutes = Math.max(0, Number(session.minutes) || 0);
      if (!minutes || !session.taskId || !weekKeySet.has(session.date)) return;
      if (!focusByTaskAndDay.has(session.taskId)) focusByTaskAndDay.set(session.taskId, new Map());
      const dayMap = focusByTaskAndDay.get(session.taskId)!;
      dayMap.set(session.date, (dayMap.get(session.date) || 0) + minutes);
    });

    const dailyMinutesByKey = new Map<string, number>();
    weekKeys.forEach((key) => dailyMinutesByKey.set(key, 0));

    // First add exact per-day Focus time.
    focusByTaskAndDay.forEach((dayMap) => {
      dayMap.forEach((minutes, key) => {
        dailyMinutesByKey.set(key, (dailyMinutesByKey.get(key) || 0) + minutes);
      });
    });

    // Then add only the manual-only remainder needed to reach max(Focus, actualHours).
    tasks.forEach((task) => {
      const manualLoggedMinutes = Math.max(0, Number(task.actualHours) || 0) * 60;
      const dayMap = focusByTaskAndDay.get(task.id) || new Map<string, number>();
      const weekFocusMinutes = Array.from(dayMap.values()).reduce((sum, minutes) => sum + minutes, 0);
      const targetMinutesForWeek = Math.max(weekFocusMinutes, manualLoggedMinutes);
      const extraManualMinutes = Math.max(0, targetMinutesForWeek - weekFocusMinutes);
      if (extraManualMinutes <= 0) return;

      const dueDateIsThisWeek = Boolean(task.dueDate && weekKeySet.has(task.dueDate));
      const focusDays = Array.from(dayMap.keys()).filter((key) => weekKeySet.has(key));
      const anchorKey =
        dueDateIsThisWeek
          ? task.dueDate
          : focusDays.length
            ? focusDays.sort().at(-1)!
            : null;

      if (anchorKey) {
        dailyMinutesByKey.set(
          anchorKey,
          (dailyMinutesByKey.get(anchorKey) || 0) + extraManualMinutes
        );
      }
    });

    // Manual-only tasks due this week with no Focus time yet still contribute.
    tasks.forEach((task) => {
      if (!task.dueDate || !weekKeySet.has(task.dueDate)) return;
      const dayMap = focusByTaskAndDay.get(task.id);
      const weekFocusMinutes = dayMap
        ? Array.from(dayMap.values()).reduce((sum, minutes) => sum + minutes, 0)
        : 0;
      const manualLoggedMinutes = Math.max(0, Number(task.actualHours) || 0) * 60;
      if (weekFocusMinutes === 0 && manualLoggedMinutes > 0) {
        dailyMinutesByKey.set(
          task.dueDate,
          (dailyMinutesByKey.get(task.dueDate) || 0) + manualLoggedMinutes
        );
      }
    });

    const orphanWeekMinutes = studySessions
      .filter((session) => !session.taskId && weekKeySet.has(session.date))
      .reduce((sum, session) => sum + Math.max(0, Number(session.minutes) || 0), 0);
    const orphanWeekCounts = new Map<string, number>();
    studySessions
      .filter((session) => !session.taskId && weekKeySet.has(session.date))
      .forEach((session) => {
        const minutes = Math.max(0, Number(session.minutes) || 0);
        orphanWeekCounts.set(session.date, (orphanWeekCounts.get(session.date) || 0) + minutes);
      });
    orphanWeekCounts.forEach((minutes, key) => {
      dailyMinutesByKey.set(key, (dailyMinutesByKey.get(key) || 0) + minutes);
    });

    const last7Days = weekDates.map((date) => {
      const key = formatDateKey(date);
      const minutes = Math.max(0, Math.round(dailyMinutesByKey.get(key) || 0));
      const completed = tasks.filter((task) => task.completedAt?.slice(0, 10) === key).length;
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        minutes,
        hours: Number((minutes / 60).toFixed(2)),
        completed,
      };
    });

    const streakAnalytics = streaks.map((habit) => ({
      id: habit.id,
      name: habit.name,
      current: calculateCurrentStreak(habit.completedDates),
      best: calculateBestStreak(habit.completedDates),
      color: habit.color,
    })).sort((a, b) => b.current - a.current);

    const weeklyGoalHours = appSettings.weeklyStudyGoalHours;
    const weekHours = last7Days.reduce((sum, day) => sum + day.hours, 0);
    const weekCompleted = last7Days.reduce((sum, day) => sum + day.completed, 0);
    const weeklyMaxMinutes = Math.max(60, ...last7Days.map((day) => day.minutes));

    return {
      totalStudyHours,
      totalEstimatedHours,
      completedTaskCount,
      pendingTaskCount,
      missedDeadlineTasks,
      classStudy,
      last7Days,
      streakAnalytics,
      weeklyGoalHours,
      weekHours,
      weekCompleted,
      weeklyMaxMinutes,
      completionRate: tasks.length ? completedTaskCount / tasks.length : 0,
      todayLabel: today.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      weekLabel: `${weekDates[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    };
  }, [classes, tasks, studySessions, streaks, appSettings.weeklyStudyGoalHours]);


  const aiStudyPlan = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pending = tasks
      .filter((task) => !task.completed)
      .map((task) => {
        const due = task.dueDate ? new Date(`${task.dueDate}T23:59:59`) : null;
        const daysUntil = due && !Number.isNaN(due.getTime())
          ? Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24))
          : 14;
        // Only plan time that is actually left. A finished amount of work never
        // becomes a fake 30-minute block just because the task is still open.
        const remainingHours = Math.max(0, Number(((task.estimatedHours || 0) - (task.actualHours || 0)).toFixed(2)));
        const urgency = task.type === "test" ? 18 : 0;
        const dueScore = daysUntil <= 0 ? 60 : daysUntil <= 1 ? 50 : daysUntil <= 3 ? 40 : daysUntil <= 7 ? 25 : 10;
        const effortScore = Math.min(20, remainingHours * 4);
        return { task, daysUntil, remainingHours, priority: urgency + dueScore + effortScore };
      })
      .filter((item) => item.remainingHours > 0)
      .sort((a, b) => b.priority - a.priority || a.daysUntil - b.daysUntil);

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const key = formatDateKey(date);
      const capacity = date.getDay() === 0 || date.getDay() === 6 ? 3 : 2.5;
      return {
        date,
        key,
        label: date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        capacity,
        remaining: capacity,
        items: [] as Array<{ taskId: string; title: string; className: string; minutes: number; reason: string }>,
      };
    });

    for (const item of pending) {
      let remainingMinutes = Math.ceil(item.remainingHours * 60 / 30) * 30;
      for (const day of days) {
        if (remainingMinutes <= 0) break;
        if (item.daysUntil < 0 && day.date.getTime() > today.getTime()) continue;
        const alloc = Math.min(remainingMinutes, Math.floor(day.remaining * 60 / 30) * 30);
        if (alloc <= 0) continue;
        const cls = classes.find((c) => c.id === item.task.classId);
        day.items.push({
          taskId: item.task.id,
          title: item.task.title,
          className: cls?.name || "General",
          minutes: alloc,
          reason: item.task.type === "test" ? "Exam priority" : item.daysUntil <= 2 ? "Due soon" : "Balance workload",
        });
        day.remaining = Math.max(0, day.remaining - alloc / 60);
        remainingMinutes -= alloc;
      }
    }

    const totalScheduledMinutes = days.reduce(
      (sum, day) => sum + day.items.reduce((inner, item) => inner + item.minutes, 0),
      0
    );
    const unscheduledTasks = pending.filter((item) => !days.some((day) => day.items.some((entry) => entry.taskId === item.task.id)));

    return {
      days,
      totalScheduledMinutes,
      unscheduledTasks,
      pendingCount: pending.length,
    };
  }, [tasks, classes]);

  const existingTestCount = useMemo(() => {
    if (!activeClass || !activeClass.standards) return 0;
    return activeClass.standards.reduce(
      (acc, std) => acc + (std.levels ? std.levels.length : 0),
      0
    );
  }, [activeClass]);

  // Simulator Calculation Logic
  const requiredFinalGrade = useMemo(() => {
    if (!activeClass || !activeClass.standards || activeClass.standards.length === 0) {
      return {
        letter: "A+" as StandardLevel,
        points: 4.33,
        letterGrade: "--",
        requiredScorePts: null as number | null,
        message: "This class has no standards to simulate.",
        isPossible: true,
      };
    }

    const selectedCount = Math.max(1, selectedStandardsForExam.length);
    const totalStandardsCount = activeClass.standards.length;

    const currentPts = parseGradeToPoints(simCurrentGrade) ?? 4.33;
    const targetPts = parseGradeToPoints(simTargetGrade) ?? 4.33;

    const totalTargetPointsNeeded = totalStandardsCount * targetPts;
    
    const unselectedStandards = activeClass.standards.filter(
      (s) => !selectedStandardsForExam.includes(s.id)
    );
    
    let existingUnselectedPoints = 0;
    unselectedStandards.forEach((s) => {
      if (s.levels && s.levels.length > 0) {
        const avg = s.levels.reduce((acc, l) => acc + (LETTER_POINTS[l] || 0), 0) / s.levels.length;
        existingUnselectedPoints += avg;
      } else {
        existingUnselectedPoints += currentPts;
      }
    });

    const pointsNeededOnSelected = totalTargetPointsNeeded - existingUnselectedPoints;
    // Standards NOT selected for the exam count as already completed.
    // The "current grade" always represents at least one unit of finished work,
    // otherwise the current grade would have zero weight and the result would
    // just equal the target grade.
    const completedStandardsCount = Math.max(1, unselectedStandards.length);

    // Run the formula
    const simResult = calculateRequiredGrade({
      currentGradePts: currentPts,
      targetGradePts: targetPts,
      completedCount: completedStandardsCount,
      selectedCount: selectedCount,
    });

    const requiredAvgPoints = simResult.requiredScorePts ?? targetPts;
    const clampedPoints = Math.max(0, Math.min(4.33, requiredAvgPoints));

    return {
      letter: pointsToLetter(clampedPoints),
      points: Math.round(clampedPoints * 100) / 100,
      letterGrade: simResult.letterGrade,
      requiredScorePts: simResult.requiredScorePts,
      message: simResult.message,
      isPossible: simResult.isPossible,
    };
  }, [activeClass, simCurrentGrade, simTargetGrade, selectedStandardsForExam]);

  useEffect(() => {
    if (activeClass) {
      prevClassIdRef.current = selectedClassId;

      if (
        activeClass.manualGrade !== undefined &&
        activeClass.manualGrade !== null &&
        String(activeClass.manualGrade).trim() !== ""
      ) {
        setSimCurrentGrade(activeClass.manualGrade);
      } else {
        const sbg = calculateOverallGrade(activeClass.standards);
        if (sbg.letter !== "N/A") {
          setSimCurrentGrade(sbg.letter);
        }
      }
      if (activeClass.targetGrade) {
        setSimTargetGrade(activeClass.targetGrade);
      }
    }
  }, [selectedClassId, activeClass]);

  const recordFocusMinutes = (minutes: number) => {
    if (!userId || minutes <= 0) return;

    const safeMinutes = Math.max(1, Math.floor(minutes));
    const taskId = focusRunTaskIdRef.current || selectedTimerTaskId;
    const sessionId = focusRunSessionIdRef.current || `focus-${Date.now()}`;
    focusRunSessionIdRef.current = sessionId;

    setStudySessions((prevSessions) => {
      const now = new Date();
      const existing = prevSessions.find((session) => session.id === sessionId);
      if (existing) {
        return prevSessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                minutes: session.minutes + safeMinutes,
                date: formatDateKey(now),
                taskId: taskId || session.taskId,
              }
            : session
        );
      }

      return [
        ...prevSessions,
        {
          id: sessionId,
          date: formatDateKey(now),
          minutes: safeMinutes,
          taskId: taskId || undefined,
        },
      ];
    });

    if (taskId) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                actualHours: +((task.actualHours || 0) + safeMinutes / 60).toFixed(2),
              }
            : task
        )
      );
    }

    recordClanStudySession(sessionId, safeMinutes);
    focusRunRecordedMinutesRef.current += safeMinutes;
  };

  const flushActiveFocusMinutes = () => {
    if (timerMode !== "work") return 0;
    if (focusRunStartedAtRef.current === null) return 0;

    const elapsedSeconds =
      focusRunBaseElapsedSecondsRef.current +
      Math.max(0, (Date.now() - focusRunStartedAtRef.current) / 1000);
    const elapsedWholeMinutes = Math.floor(elapsedSeconds / 60);
    const newMinutes = elapsedWholeMinutes - focusRunRecordedMinutesRef.current;

    if (newMinutes > 0) recordFocusMinutes(newMinutes);
    return newMinutes;
  };

  const persistFocusTimerStateLocally = (state: PersistedFocusTimerState | null) => {
    if (!userId || typeof window === "undefined") return;
    try {
      const key = `${FOCUS_TIMER_STORAGE_PREFIX}${userId}`;
      if (state) localStorage.setItem(key, JSON.stringify(state));
      else localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
  };

  const getCurrentFocusTimerState = (): PersistedFocusTimerState | null => {
    if (!selectedTimerTaskId) return null;

    if (timerMode === "work") {
      const startedAt = focusRunStartedAtRef.current;
      const elapsedSeconds =
        focusRunBaseElapsedSecondsRef.current +
        (startedAt !== null ? Math.max(0, (Date.now() - startedAt) / 1000) : 0);
      return {
        version: 1,
        taskId: focusRunTaskIdRef.current || selectedTimerTaskId,
        mode: "work",
        isRunning: isTimerRunning,
        timeLeft: Math.max(0, Math.ceil(25 * 60 - elapsedSeconds)),
        baseElapsedSeconds: Math.min(25 * 60, elapsedSeconds),
        startedAt: isTimerRunning ? startedAt : null,
        sessionId: focusRunSessionIdRef.current,
        recordedMinutes: focusRunRecordedMinutesRef.current,
        xpAwarded: focusRunXpAwardedRef.current,
        updatedAt: Date.now(),
      };
    }

    const startedAt = breakRunStartedAtRef.current;
    const elapsedSeconds =
      breakRunBaseElapsedSecondsRef.current +
      (startedAt !== null ? Math.max(0, (Date.now() - startedAt) / 1000) : 0);
    return {
      version: 1,
      taskId: selectedTimerTaskId,
      mode: "break",
      isRunning: isTimerRunning,
      timeLeft: Math.max(0, Math.ceil(5 * 60 - elapsedSeconds)),
      baseElapsedSeconds: Math.min(5 * 60, elapsedSeconds),
      startedAt: isTimerRunning ? startedAt : null,
      sessionId: focusRunSessionIdRef.current,
      recordedMinutes: focusRunRecordedMinutesRef.current,
      xpAwarded: focusRunXpAwardedRef.current,
      updatedAt: Date.now(),
    };
  };

  const queuePersistedFocusTimerStateToServer = (state: PersistedFocusTimerState | null) => {
    if (!userId || !isLoaded) return;
    const requestState = state;
    workspaceSaveQueueRef.current = workspaceSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const { data: existingRow, error: readError } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", userId)
          .maybeSingle();
        if (readError) return;

        const existingData =
          existingRow?.data &&
          typeof existingRow.data === "object" &&
          !Array.isArray(existingRow.data)
            ? { ...(existingRow.data as Record<string, any>) }
            : {};
        if (requestState) existingData.focusTimerState = requestState;
        else delete existingData.focusTimerState;

        const { error: writeError } = await supabase.from("user_data").upsert(
          {
            user_id: userId,
            data: existingData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (!writeError) setSyncStatus("synced");
      });
  };

  const persistFocusTimerState = (syncServer = false) => {
    const state = getCurrentFocusTimerState();
    persistFocusTimerStateLocally(state);
    if (syncServer) queuePersistedFocusTimerStateToServer(state);
    return state;
  };

  const clearPersistedFocusTimerState = (syncServer = false) => {
    persistFocusTimerStateLocally(null);
    if (syncServer) queuePersistedFocusTimerStateToServer(null);
  };


  const beginWorkRun = (taskId: string, fresh = false) => {
    if (!taskId) return;

    if (fresh || focusRunTaskIdRef.current !== taskId || !focusRunSessionIdRef.current) {
      focusRunTaskIdRef.current = taskId;
      focusRunSessionIdRef.current = `focus-${Date.now()}`;
      focusRunRecordedMinutesRef.current = 0;
      focusRunBaseElapsedSecondsRef.current = 0;
      focusRunXpAwardedRef.current = false;
    }

    focusRunStartedAtRef.current = Date.now();
  };

  const endWorkRun = () => {
    flushActiveFocusMinutes();
    if (focusRunStartedAtRef.current !== null) {
      const elapsedSeconds =
        focusRunBaseElapsedSecondsRef.current +
        Math.max(0, (Date.now() - focusRunStartedAtRef.current) / 1000);
      focusRunBaseElapsedSecondsRef.current = Math.min(25 * 60, elapsedSeconds);
    }
    focusRunStartedAtRef.current = null;
  };

  const syncTimerClock = () => {
    if (!isTimerRunning) return;

    if (timerMode === "work") {
      const startedAt = focusRunStartedAtRef.current;
      if (startedAt !== null) {
        const elapsedSeconds =
          focusRunBaseElapsedSecondsRef.current +
          Math.max(0, (Date.now() - startedAt) / 1000);
        const wholeMinutes = Math.floor(elapsedSeconds / 60);
        const newMinutes = wholeMinutes - focusRunRecordedMinutesRef.current;
        if (newMinutes > 0) recordFocusMinutes(newMinutes);

        const remaining = Math.max(0, 25 * 60 - elapsedSeconds);
        setTimeLeft(Math.ceil(remaining));

        if (elapsedSeconds >= 25 * 60) {
          if (!focusRunXpAwardedRef.current) {
            setGamificationXp((prevXp) => prevXp + XP_PER_FOCUS_SESSION);
            focusRunXpAwardedRef.current = true;
          }
          focusRunRecordedMinutesRef.current = 25;
          focusRunBaseElapsedSecondsRef.current = 25 * 60;
          focusRunStartedAtRef.current = null;
          setIsTimerRunning(false);
          setTimerMode("break");
          breakRunBaseElapsedSecondsRef.current = 0;
          breakRunStartedAtRef.current = Date.now();
          setTimeLeft(5 * 60);
          const nextBreakTimerState: PersistedFocusTimerState = {
            version: 1,
            taskId: focusRunTaskIdRef.current || selectedTimerTaskId,
            mode: "break",
            isRunning: true,
            timeLeft: 5 * 60,
            baseElapsedSeconds: 0,
            startedAt: breakRunStartedAtRef.current,
            sessionId: focusRunSessionIdRef.current,
            recordedMinutes: focusRunRecordedMinutesRef.current,
            xpAwarded: focusRunXpAwardedRef.current,
            updatedAt: Date.now(),
          };
          persistFocusTimerStateLocally(nextBreakTimerState);
          queuePersistedFocusTimerStateToServer(nextBreakTimerState);
          return;
        }
      }
    } else {
      const startedAt = breakRunStartedAtRef.current;
      if (startedAt !== null) {
        const elapsedSeconds =
          breakRunBaseElapsedSecondsRef.current +
          Math.max(0, (Date.now() - startedAt) / 1000);
        setTimeLeft(Math.ceil(Math.max(0, 5 * 60 - elapsedSeconds)));
        if (elapsedSeconds >= 5 * 60) {
          setIsTimerRunning(false);
          setTimerMode("work");
          setTimeLeft(25 * 60);
          breakRunStartedAtRef.current = null;
          breakRunBaseElapsedSecondsRef.current = 0;
          clearPersistedFocusTimerState(true);
          return;
        }
      }
    }

    persistFocusTimerStateLocally(getCurrentFocusTimerState());
  };

  // Restore the persisted timer after the signed-in workspace is loaded.
  // A running timer resumes from wall-clock time, so reloading the app does not
  // reset a session or pause a timer that is supposed to keep running.
  useEffect(() => {
    if (!isLoaded || !userId) return;
    if (focusTimerHydratedForUserRef.current === userId) return;
    focusTimerHydratedForUserRef.current = userId;

    const saved = normalizePersistedFocusTimerState(
      safeStorageGet<PersistedFocusTimerState | null>(
        `${FOCUS_TIMER_STORAGE_PREFIX}${userId}`,
        null
      )
    );
    if (!saved) return;

    setSelectedTimerTaskId(saved.taskId);
    setTimerMode(saved.mode);
    setTimeLeft(saved.timeLeft);
    focusRunTaskIdRef.current = saved.taskId;
    focusRunSessionIdRef.current = saved.sessionId;
    focusRunRecordedMinutesRef.current = saved.recordedMinutes;
    focusRunXpAwardedRef.current = saved.xpAwarded;

    if (saved.mode === "work") {
      focusRunBaseElapsedSecondsRef.current = Math.min(25 * 60, saved.baseElapsedSeconds);
      focusRunStartedAtRef.current = saved.isRunning ? saved.startedAt : null;
      breakRunStartedAtRef.current = null;
      breakRunBaseElapsedSecondsRef.current = 0;

      const elapsedSeconds =
        focusRunBaseElapsedSecondsRef.current +
        (focusRunStartedAtRef.current !== null
          ? Math.max(0, (Date.now() - focusRunStartedAtRef.current) / 1000)
          : 0);

      const existingSessionMinutes = saved.sessionId
        ? studySessions.find((session) => session.id === saved.sessionId)?.minutes || 0
        : 0;
      focusRunRecordedMinutesRef.current = Math.max(
        focusRunRecordedMinutesRef.current,
        Math.max(0, Math.floor(existingSessionMinutes))
      );

      const elapsedWholeMinutes = Math.floor(elapsedSeconds / 60);
      const missingMinutes = elapsedWholeMinutes - focusRunRecordedMinutesRef.current;
      if (missingMinutes > 0 && saved.isRunning) recordFocusMinutes(missingMinutes);

      if (elapsedSeconds >= 25 * 60 && saved.isRunning) {
        setGamificationXp((prevXp) =>
          saved.xpAwarded ? prevXp : prevXp + XP_PER_FOCUS_SESSION
        );
        focusRunXpAwardedRef.current = true;
        focusRunRecordedMinutesRef.current = 25;
        focusRunBaseElapsedSecondsRef.current = 25 * 60;
        focusRunStartedAtRef.current = null;
        setIsTimerRunning(false);
        setTimerMode("break");
        breakRunBaseElapsedSecondsRef.current = 0;
        breakRunStartedAtRef.current = Date.now();
        setTimeLeft(5 * 60);
        persistFocusTimerStateLocally({
          version: 1,
          taskId: saved.taskId,
          mode: "break",
          isRunning: true,
          timeLeft: 5 * 60,
          baseElapsedSeconds: 0,
          startedAt: breakRunStartedAtRef.current,
          sessionId: saved.sessionId,
          recordedMinutes: 25,
          xpAwarded: true,
          updatedAt: Date.now(),
        });
        return;
      }

      if (saved.isRunning) {
        setIsTimerRunning(true);
        syncTimerClock();
      } else {
        setIsTimerRunning(false);
        setTimeLeft(Math.max(0, Math.ceil(25 * 60 - elapsedSeconds)));
      }
    } else {
      breakRunBaseElapsedSecondsRef.current = Math.min(5 * 60, saved.baseElapsedSeconds);
      breakRunStartedAtRef.current = saved.isRunning ? saved.startedAt : null;
      focusRunStartedAtRef.current = null;
      if (saved.isRunning) {
        const elapsedSeconds =
          breakRunBaseElapsedSecondsRef.current +
          (breakRunStartedAtRef.current !== null
            ? Math.max(0, (Date.now() - breakRunStartedAtRef.current) / 1000)
            : 0);
        if (elapsedSeconds >= 5 * 60) {
          setIsTimerRunning(false);
          setTimerMode("work");
          setTimeLeft(25 * 60);
          breakRunStartedAtRef.current = null;
          breakRunBaseElapsedSecondsRef.current = 0;
          clearPersistedFocusTimerState(true);
        } else {
          setTimeLeft(Math.max(0, Math.ceil(5 * 60 - elapsedSeconds)));
          setIsTimerRunning(true);
        }
      } else {
        setIsTimerRunning(false);
        setTimeLeft(Math.max(0, saved.timeLeft));
      }
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!isTimerRunning) return;

    syncTimerClock();
    const interval = window.setInterval(syncTimerClock, 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncTimerClock();
      } else {
        persistFocusTimerStateLocally(getCurrentFocusTimerState());
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleVisibility);
    };
  }, [isTimerRunning, timerMode, selectedTimerTaskId, userId]);

  const toggleTimer = () => {
    if (timerMode === "work") {
      if (!selectedTimerTaskId && !isTimerRunning) {
        alert("Please select a target task first to track focus time!");
        return;
      }

      if (isTimerRunning) {
        endWorkRun();
        const elapsedSeconds = focusRunBaseElapsedSecondsRef.current;
        const pausedState: PersistedFocusTimerState = {
          version: 1,
          taskId: focusRunTaskIdRef.current || selectedTimerTaskId,
          mode: "work",
          isRunning: false,
          timeLeft: Math.max(0, Math.ceil(25 * 60 - elapsedSeconds)),
          baseElapsedSeconds: Math.min(25 * 60, elapsedSeconds),
          startedAt: null,
          sessionId: focusRunSessionIdRef.current,
          recordedMinutes: focusRunRecordedMinutesRef.current,
          xpAwarded: focusRunXpAwardedRef.current,
          updatedAt: Date.now(),
        };
        setTimeLeft(pausedState.timeLeft);
        setIsTimerRunning(false);
        persistFocusTimerStateLocally(pausedState);
        queuePersistedFocusTimerStateToServer(pausedState);
        return;
      }

      // Resume the current task/session instead of resetting the timer.
      // If the user changed the Focus Target, create a new session for that task.
      const hasCurrentSessionForSelectedTask =
        focusRunTaskIdRef.current === selectedTimerTaskId &&
        Boolean(focusRunSessionIdRef.current);
      if (!hasCurrentSessionForSelectedTask) {
        beginWorkRun(selectedTimerTaskId, true);
        setTimeLeft(25 * 60);
      } else {
        beginWorkRun(selectedTimerTaskId, false);
      }
      setIsTimerRunning(true);

      const elapsedSeconds = Math.min(25 * 60, focusRunBaseElapsedSecondsRef.current);
      const runningState: PersistedFocusTimerState = {
        version: 1,
        taskId: focusRunTaskIdRef.current || selectedTimerTaskId,
        mode: "work",
        isRunning: true,
        timeLeft: Math.max(0, Math.ceil(25 * 60 - elapsedSeconds)),
        baseElapsedSeconds: elapsedSeconds,
        startedAt: focusRunStartedAtRef.current,
        sessionId: focusRunSessionIdRef.current,
        recordedMinutes: focusRunRecordedMinutesRef.current,
        xpAwarded: focusRunXpAwardedRef.current,
        updatedAt: Date.now(),
      };
      setTimeLeft(runningState.timeLeft);
      persistFocusTimerStateLocally(runningState);
      queuePersistedFocusTimerStateToServer(runningState);
      return;
    }

    if (isTimerRunning) {
      if (breakRunStartedAtRef.current !== null) {
        const elapsedSeconds =
          breakRunBaseElapsedSecondsRef.current +
          Math.max(0, (Date.now() - breakRunStartedAtRef.current) / 1000);
        breakRunBaseElapsedSecondsRef.current = Math.min(5 * 60, elapsedSeconds);
        breakRunStartedAtRef.current = null;
      }
      const pausedBreakState: PersistedFocusTimerState = {
        version: 1,
        taskId: selectedTimerTaskId,
        mode: "break",
        isRunning: false,
        timeLeft: Math.max(0, Math.ceil(5 * 60 - breakRunBaseElapsedSecondsRef.current)),
        baseElapsedSeconds: breakRunBaseElapsedSecondsRef.current,
        startedAt: null,
        sessionId: focusRunSessionIdRef.current,
        recordedMinutes: focusRunRecordedMinutesRef.current,
        xpAwarded: focusRunXpAwardedRef.current,
        updatedAt: Date.now(),
      };
      setTimeLeft(pausedBreakState.timeLeft);
      setIsTimerRunning(false);
      persistFocusTimerStateLocally(pausedBreakState);
      queuePersistedFocusTimerStateToServer(pausedBreakState);
      return;
    }

    breakRunStartedAtRef.current = Date.now();
    setIsTimerRunning(true);
    const runningBreakState: PersistedFocusTimerState = {
      version: 1,
      taskId: selectedTimerTaskId,
      mode: "break",
      isRunning: true,
      timeLeft: Math.max(0, Math.ceil(5 * 60 - breakRunBaseElapsedSecondsRef.current)),
      baseElapsedSeconds: breakRunBaseElapsedSecondsRef.current,
      startedAt: breakRunStartedAtRef.current,
      sessionId: focusRunSessionIdRef.current,
      recordedMinutes: focusRunRecordedMinutesRef.current,
      xpAwarded: focusRunXpAwardedRef.current,
      updatedAt: Date.now(),
    };
    persistFocusTimerStateLocally(runningBreakState);
    queuePersistedFocusTimerStateToServer(runningBreakState);
  };

  const startFocusForTask = (taskId: string) => {
    if (!taskId) return;
    const taskExists = tasks.some((task) => task.id === taskId && !task.completed);
    if (!taskExists) return;

    const isSameExistingSession =
      focusRunTaskIdRef.current === taskId &&
      Boolean(focusRunSessionIdRef.current);

    setSelectedTimerTaskId(taskId);
    setTimerMode("work");
    if (!isSameExistingSession) {
      setTimeLeft(25 * 60);
      beginWorkRun(taskId, true);
    } else {
      beginWorkRun(taskId, false);
    }
    setIsTimerRunning(true);
    setMobileTab("tasks");

    const elapsedSeconds = Math.min(25 * 60, focusRunBaseElapsedSecondsRef.current);
    const runningState: PersistedFocusTimerState = {
      version: 1,
      taskId: focusRunTaskIdRef.current || taskId,
      mode: "work",
      isRunning: true,
      timeLeft: Math.max(0, Math.ceil(25 * 60 - elapsedSeconds)),
      baseElapsedSeconds: elapsedSeconds,
      startedAt: focusRunStartedAtRef.current,
      sessionId: focusRunSessionIdRef.current,
      recordedMinutes: focusRunRecordedMinutesRef.current,
      xpAwarded: focusRunXpAwardedRef.current,
      updatedAt: Date.now(),
    };
    setTimeLeft(runningState.timeLeft);
    persistFocusTimerStateLocally(runningState);
    queuePersistedFocusTimerStateToServer(runningState);
  };

  const resetTimer = () => {
    if (isTimerRunning && timerMode === "work") endWorkRun();
    setIsTimerRunning(false);
    setTimeLeft(timerMode === "work" ? 25 * 60 : 5 * 60);

    if (timerMode === "work") {
      focusRunStartedAtRef.current = null;
      focusRunBaseElapsedSecondsRef.current = 0;
      focusRunRecordedMinutesRef.current = 0;
      focusRunSessionIdRef.current = null;
      focusRunTaskIdRef.current = selectedTimerTaskId || null;
      focusRunXpAwardedRef.current = false;
    } else {
      breakRunStartedAtRef.current = null;
      breakRunBaseElapsedSecondsRef.current = 0;
    }
    clearPersistedFocusTimerState(true);
  };

  const addClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const newClass: ClassItem = {
      id: Date.now().toString(),
      name: newClassName.trim(),
      color: newClassColor,
      targetGrade: "A",
      standards: [],
      meetingTimes: [],
    };
    const nextClasses = [...classes, newClass];
    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({ classes: nextClasses });
    setSelectedClassId(newClass.id);
    setNewClassName("");
  };

  const deleteClass = (id: string) => {
    const remaining = classes.filter((c) => c.id !== id);
    const remainingTasks = tasks.filter((t) => t.classId !== id);
    setClasses(remaining);
    setTasks(remainingTasks);
    saveWorkspaceChangeImmediately({ classes: remaining, tasks: remainingTasks });
    if (selectedClassId === id) {
      setSelectedClassId(remaining[0]?.id ?? "");
    }
  };

  const startEditClass = (cls: ClassItem) => {
    setEditingClassId(cls.id);
    setEditClassDraft({
      name: cls.name,
      color: cls.color,
      professorName: cls.professorName ?? "",
      roomNumber: cls.roomNumber ?? "",
      periodCode: cls.periodCode ?? "",
      officeHours: cls.officeHours ?? "",
    });
  };

  const cancelEditClass = () => {
    setEditingClassId(null);
    setEditClassDraft(null);
  };

  const saveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassId || !editClassDraft) return;
    if (!editClassDraft.name.trim()) return;
    const nextClasses = classes.map((c) =>
      c.id === editingClassId
        ? {
            ...c,
            name: editClassDraft.name.trim(),
            color: editClassDraft.color,
            professorName: editClassDraft.professorName.trim() || undefined,
            roomNumber: editClassDraft.roomNumber.trim() || undefined,
            periodCode: editClassDraft.periodCode.trim() || undefined,
            officeHours: editClassDraft.officeHours.trim() || undefined,
          }
        : c
    );
    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({ classes: nextClasses });
    cancelEditClass();
  };

  const updateManualGrade = (classId: string, grade: string) => {
    const val =
      grade.trim() === ""
        ? undefined
        : (grade.trim().toUpperCase() as StandardLevel);
    const nextClasses = classes.map((cls) =>
      cls.id === classId ? { ...cls, manualGrade: val } : cls
    );
    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({ classes: nextClasses });
  };

  const addMeetingTimeToClass = (e: React.FormEvent) => {
    e.preventDefault();

    if (!timetableClassId) return;
    if (!timetableStartTime || !timetableEndTime) return;

    const newMeeting: MeetingTime = {
      day: timetableDay,
      startTime: timetableStartTime,
      endTime: timetableEndTime,
    };

    const nextClasses = classes.map((c) => {
      if (c.id !== timetableClassId) return c;

      return {
        ...c,
        meetingTimes: [
          ...(c.meetingTimes || []),
          newMeeting,
        ],
      };
    });

    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({
      classes: nextClasses,
    });
  };

  const updateMeetingTimeInClass = (
    classId: string,
    meetingIndex: number
  ) => {
    if (!timetableStartTime || !timetableEndTime) return;

    const updatedMeeting: MeetingTime = {
      day: timetableDay,
      startTime: timetableStartTime,
      endTime: timetableEndTime,
    };

    const nextClasses = classes.map((c) => {
      if (c.id !== classId) return c;

      return {
        ...c,
        meetingTimes: (c.meetingTimes || []).map(
          (meeting, index) =>
            index === meetingIndex
              ? updatedMeeting
              : meeting
        ),
      };
    });

    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({
      classes: nextClasses,
    });
  };

  const removeMeetingTimeFromClass = (
    classId: string,
    indexToRemove: number
  ) => {
    const nextClasses = classes.map((c) => {
      if (c.id !== classId) return c;

      return {
        ...c,
        meetingTimes: (c.meetingTimes || []).filter(
          (_, idx) => idx !== indexToRemove
        ),
      };
    });

    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({
      classes: nextClasses,
    });
  };

  const editTimetableMeeting = (
    classId: string,
    meeting: MeetingTime
  ) => {
    setTimetableClassId(classId);
    setTimetableDay(meeting.day);
    setTimetableStartTime(meeting.startTime);
    setTimetableEndTime(meeting.endTime);
  };

  const addStandardToClass = (classId: string) => {
    if (!newStandardName.trim()) return;
    const newStd: StandardItem = {
      id: Date.now().toString(),
      name: newStandardName.trim(),
      levels: [],
    };
    const nextClasses = classes.map((cls) =>
      cls.id === classId
        ? { ...cls, standards: [...(cls.standards || []), newStd] }
        : cls
    );
    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({ classes: nextClasses });
    setNewStandardName("");
  };

  const deleteStandard = (classId: string, standardId: string) => {
    const nextClasses = classes.map((cls) =>
      cls.id === classId
        ? {
            ...cls,
            standards: (cls.standards || []).filter((s) => s.id !== standardId),
          }
        : cls
    );
    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({ classes: nextClasses });
  };

  const addGradeToStandard = (
    classId: string,
    standardId: string,
    level: StandardLevel
  ) => {
    const nextClasses = classes.map((cls) =>
      cls.id !== classId
        ? cls
        : {
            ...cls,
            standards: (cls.standards || []).map((st) =>
              st.id !== standardId
                ? st
                : { ...st, levels: [...(st.levels || []), level] }
            ),
          }
    );
    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({ classes: nextClasses });
  };

  const removeGradeFromStandard = (
    classId: string,
    standardId: string,
    indexToRemove: number
  ) => {
    const nextClasses = classes.map((cls) =>
      cls.id !== classId
        ? cls
        : {
            ...cls,
            standards: (cls.standards || []).map((st) =>
              st.id !== standardId
                ? st
                : {
                    ...st,
                    levels: (st.levels || []).filter(
                      (_, idx) => idx !== indexToRemove
                    ),
                  }
            ),
          }
    );
    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({ classes: nextClasses });
  };

  const addClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim()) return;

    const initialSlots: ClubMeetingTime[] = [];
    if (newClubStartTime && newClubEndTime) {
      initialSlots.push({
        day: newClubMeetingDay,
        startTime: newClubStartTime,
        endTime: newClubEndTime,
      });
    }

    const newClub: ClubItem = {
      id: Date.now().toString(),
      name: newClubName.trim(),
      role: newClubRole.trim() || "Member",
      icon: newClubIcon || "👥",
      color: newClubColor,
      meetingTimes: initialSlots,
      attendance: {},
    };
    const nextClubs = [...clubs, newClub];
    setClubs(nextClubs);
    saveWorkspaceChangeImmediately({ clubs: nextClubs });
    setSelectedClubId(newClub.id);
    setNewClubName("");
    setNewClubRole("");
  };

  const updateClubIcon = (clubId: string, icon: string) => {
    const nextClubs = clubs.map((c) => (c.id === clubId ? { ...c, icon } : c));
    setClubs(nextClubs);
    saveWorkspaceChangeImmediately({ clubs: nextClubs });
  };

  const deleteClub = (id: string) => {
    const remaining = clubs.filter((c) => c.id !== id);
    setClubs(remaining);
    saveWorkspaceChangeImmediately({ clubs: remaining });
    if (selectedClubId === id) {
      setSelectedClubId(remaining[0]?.id ?? "");
    }
  };

  const addTimeslotToClub = (clubId: string) => {
    if (!addClubSlotStart || !addClubSlotEnd) return;
    const newSlot: ClubMeetingTime = {
      day: addClubSlotDay,
      startTime: addClubSlotStart,
      endTime: addClubSlotEnd,
    };
    const nextClubs = clubs.map((c) =>
      c.id !== clubId
        ? c
        : { ...c, meetingTimes: [...(c.meetingTimes || []), newSlot] }
    );
    setClubs(nextClubs);
    saveWorkspaceChangeImmediately({ clubs: nextClubs });
  };

  const removeTimeslotFromClub = (clubId: string, indexToRemove: number) => {
    const nextClubs = clubs.map((c) =>
      c.id !== clubId
        ? c
        : {
            ...c,
            meetingTimes: (c.meetingTimes || []).filter(
              (_, idx) => idx !== indexToRemove
            ),
          }
    );
    setClubs(nextClubs);
    saveWorkspaceChangeImmediately({ clubs: nextClubs });
  };

  const addStreak = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreakName.trim()) return;
    const newHabit: StreakHabit = {
      id: Date.now().toString(),
      name: newStreakName.trim(),
      color: newStreakColor,
      createdAt: formatDateKey(new Date()),
      completedDates: {},
    };
    const nextStreaks = [...streaks, newHabit];
    setStreaks(nextStreaks);
    saveWorkspaceChangeImmediately({ streaks: nextStreaks });
    setNewStreakName("");
  };

  const toggleStreakDate = (habitId: string, dateKey: string) => {
    const nextStreaks = streaks.map((habit) => {
      if (habit.id !== habitId) return habit;
      const updated = { ...habit.completedDates };
      if (updated[dateKey]) {
        delete updated[dateKey];
      } else {
        updated[dateKey] = true;
      }
      return { ...habit, completedDates: updated };
    });
    setStreaks(nextStreaks);
    saveWorkspaceChangeImmediately({ streaks: nextStreaks });
  };

  const deleteStreak = (habitId: string) => {
    const nextStreaks = streaks.filter((h) => h.id !== habitId);
    setStreaks(nextStreaks);
    saveWorkspaceChangeImmediately({ streaks: nextStreaks });
  };

  const prevStreakWeek = () => {
    setStreakWeekBaseDate(
      new Date(streakWeekBaseDate.getTime() - 7 * 24 * 3600 * 1000)
    );
  };

  const nextStreakWeek = () => {
    setStreakWeekBaseDate(
      new Date(streakWeekBaseDate.getTime() + 7 * 24 * 3600 * 1000)
    );
  };

  const resetStreakWeekToToday = () => {
    setStreakWeekBaseDate(new Date());
  };

  const prevTimetableWeek = () => {
    setTimetableWeekBaseDate(
      new Date(timetableWeekBaseDate.getTime() - 7 * 24 * 3600 * 1000)
    );
  };

  const nextTimetableWeek = () => {
    setTimetableWeekBaseDate(
      new Date(timetableWeekBaseDate.getTime() + 7 * 24 * 3600 * 1000)
    );
  };

  const resetTimetableWeekToToday = () => {
    setTimetableWeekBaseDate(new Date());
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || classes.length === 0) return;
    const validClassId = classes.some((c) => c.id === taskClassId)
      ? taskClassId
      : classes[0].id;
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskTitle.trim(),
      classId: validClassId,
      dueDate: taskDueDate,
      type: taskType,
      estimatedHours: Math.max(0.1, parseFloat(taskHours) || 1),
      actualHours: 0,
      completed: false,
    };
    const nextTasks = [...tasks, newTask];
    setTasks(nextTasks);
    saveWorkspaceChangeImmediately({ tasks: nextTasks });
    setTaskTitle("");
    setTaskDueDate("");
  };

  const toggleTask = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;

    const completing = !target.completed;
    let nextTasks = tasks.map((task) => {
      if (task.id !== id) return task;
      return {
        ...task,
        completed: completing,
        completedAt: completing ? new Date().toISOString() : undefined,
        // Award completion XP only once for this task. Pre-existing completed
        // tasks have no xpAwarded flag and therefore do not grant XP at startup.
        xpAwarded: completing ? (task.xpAwarded ?? false) : task.xpAwarded,
      };
    });

    let nextXp = gamificationXp;
    if (completing && !target.xpAwarded) {
      nextXp += XP_PER_COMPLETED_TASK;
      nextTasks = nextTasks.map((task) =>
        task.id === id ? { ...task, xpAwarded: true } : task
      );
    }

    setTasks(nextTasks);
    if (nextXp !== gamificationXp) setGamificationXp(nextXp);
    saveWorkspaceChangeImmediately({ tasks: nextTasks, gamificationXp: nextXp });
  };

  const deleteTask = (id: string) => {
    const nextTasks = tasks.filter((t) => t.id !== id);
    setTasks(nextTasks);
    saveWorkspaceChangeImmediately({ tasks: nextTasks });
    if (selectedTimerTaskId === id) setSelectedTimerTaskId("");
  };

  const updateTaskScore = (id: string, scoreStr: string) => {
    const val = scoreStr.trim().toUpperCase();
    const isValidScore = (Object.keys(LETTER_POINTS) as string[]).includes(val);
    const nextTasks = tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            score: isValidScore ? (val as StandardLevel) : undefined,
          }
        : task
    );
    setTasks(nextTasks);
    saveWorkspaceChangeImmediately({ tasks: nextTasks });
  };

  type WorkspacePersistSnapshot = {
    classes: ClassItem[];
    clubs: ClubItem[];
    tasks: Task[];
    streaks: StreakHabit[];
    studySessions: StudySession[];
    gamificationXp: number;
  };

  const saveWorkspaceChangeImmediately = (
    overrides: Partial<WorkspacePersistSnapshot>
  ) => {
    if (!userId || !isLoaded) return;

    const snapshot: WorkspacePersistSnapshot = {
      classes,
      clubs,
      tasks,
      streaks,
      studySessions,
      gamificationXp,
      ...overrides,
    };

    const localSavedAt = Date.now();
    try {
      localStorage.setItem(
        `tracker_workspace_data_saved_at_v2_${userId}`,
        String(localSavedAt)
      );
      localStorage.setItem(`tracker_classes_v8_${userId}`, JSON.stringify(snapshot.classes));
      localStorage.setItem(`tracker_clubs_v8_${userId}`, JSON.stringify(snapshot.clubs));
      localStorage.setItem(`tracker_tasks_v8_${userId}`, JSON.stringify(snapshot.tasks));
      localStorage.setItem(`tracker_streaks_v8_${userId}`, JSON.stringify(snapshot.streaks));
      localStorage.setItem(`tracker_study_sessions_v1_${userId}`, JSON.stringify(snapshot.studySessions));
      localStorage.setItem(`tracker_gamification_xp_v1_${userId}`, JSON.stringify(snapshot.gamificationXp));
    } catch {
      // Supabase remains the durable account store when localStorage is unavailable.
    }

    const requestId = ++workspaceSaveRequestRef.current;
    isSavingRef.current = true;
    setSyncStatus("syncing");

    workspaceSaveQueueRef.current = workspaceSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const { data: existingRow, error: readError } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", userId)
          .maybeSingle();

        if (readError) throw readError;

        const existingData =
          existingRow?.data &&
          typeof existingRow.data === "object" &&
          !Array.isArray(existingRow.data)
            ? { ...(existingRow.data as Record<string, any>) }
            : {};

        const serverTimestamp = new Date().toISOString();
        const nextData: Record<string, any> = {
          ...existingData,
          classes: snapshot.classes,
          clubs: snapshot.clubs,
          tasks: snapshot.tasks,
          streaks: snapshot.streaks,
          studySessions: snapshot.studySessions,
          gamificationXp: snapshot.gamificationXp,
          // Keep the rest of the signed-in user's current client state too, so an
          // academic change never writes an older Learning or Calendar snapshot
          // back over a newer change made in the same browser.
          learningMaterials,
          learningBundles,
          googleCalendarEvents,
          hiddenGoogleEventIds,
          googleCalendarDeletionRules,
          googleCalendarMergeRules,
          focusTimerState: normalizePersistedFocusTimerState(
            safeStorageGet<PersistedFocusTimerState | null>(
              `${FOCUS_TIMER_STORAGE_PREFIX}${userId}`,
              null
            )
          ),
        };

        // Never let an academic workspace save erase a Clan value that is not yet
        // loaded. Once Clan is loaded, preserve the current membership snapshot too.
        if (clanLoadedForUserIdRef.current === userId) {
          if (clan) {
            nextData.clan = {
              clan,
              displayName: clanDisplayName || "Student",
              studyMinutes: clanStudyMinutes,
              joinedAt:
                readLocalClan(userId)?.joinedAt || new Date().toISOString(),
            };
          } else {
            delete nextData.clan;
          }
        }

        const { error: writeError } = await supabase.from("user_data").upsert(
          {
            user_id: userId,
            data: nextData,
            updated_at: serverTimestamp,
          },
          { onConflict: "user_id" }
        );

        if (writeError) throw writeError;

        try {
          localStorage.setItem(
            `tracker_workspace_data_saved_at_v2_${userId}`,
            String(Date.parse(serverTimestamp) || Date.now())
          );
        } catch {
          // Ignore cache timestamp errors.
        }

        if (requestId === workspaceSaveRequestRef.current) {
          setSyncStatus("synced");
        }
      })
      .catch((err: unknown) => {
        // Local storage was already updated synchronously. Surface the account
        // failure instead of silently pretending the save succeeded.
        if (requestId === workspaceSaveRequestRef.current) {
          setSyncStatus("error");
        }
        console.error("Workspace save failed:", err);
      })
      .finally(() => {
        if (requestId === workspaceSaveRequestRef.current) {
          isSavingRef.current = false;
        }
      });
  };

  const saveLearningDataImmediately = async (
    nextMaterials: LearningMaterial[],
    nextBundles: LearningBundle[]
  ) => {
    if (!userId || !isLoaded) return;

    const localSavedAt = Date.now();

    // Keep a local copy immediately so the material survives reloads even if the
    // network request is delayed or fails. This timestamp lets loadUserData know
    // that the device has newer Learning data than the server row.
    try {
      localStorage.setItem(
        `tracker_learning_materials_v1_${userId}`,
        JSON.stringify(nextMaterials)
      );
      localStorage.setItem(
        `tracker_learning_bundles_v1_${userId}`,
        JSON.stringify(nextBundles)
      );
      localStorage.setItem(
        `tracker_learning_data_saved_at_v1_${userId}`,
        String(localSavedAt)
      );
    } catch {
      // Continue to the account save; localStorage can be unavailable in some modes.
    }

    // Ignore Realtime payloads generated by the account write while this save is
    // in progress so an older snapshot cannot briefly overwrite the new material.
    isSavingRef.current = true;
    setSyncStatus("syncing");
    try {
      const { data: existing, error: readError } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();

      if (readError) throw readError;

      const existingData =
        existing?.data && typeof existing.data === "object" && !Array.isArray(existing.data)
          ? { ...(existing.data as Record<string, any>) }
          : {};

      existingData.learningMaterials = nextMaterials;
      existingData.learningBundles = nextBundles;

      const { error: writeError } = await supabase.from("user_data").upsert(
        {
          user_id: userId,
          data: existingData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (writeError) throw writeError;
      try {
        localStorage.setItem(
          `tracker_learning_data_saved_at_v1_${userId}`,
          String(Date.now())
        );
      } catch {
        // Ignore storage errors.
      }
      setSyncStatus("synced");
      setLearningError(null);
      setLearningMessage("Learning data saved to your account.");
    } catch (err) {
      setSyncStatus("error");
      setLearningError(
        err instanceof Error
          ? `Saved on this device, but account sync failed: ${err.message}`
          : "Saved on this device, but account sync failed."
      );
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 500);
    }
  };

  const addLearningMaterial = () => {
    if (!learningClassId || !learningMaterialText.trim()) {
      setLearningError("Select a class and add some material first.");
      return;
    }
    const material: LearningMaterial = {
      id: `learning-material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      classId: learningClassId,
      title: learningMaterialTitle.trim() || "Class material",
      content: learningMaterialText.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextMaterials = [...learningMaterials, material];
    setLearningMaterials(nextMaterials);
    setLearningMaterialTitle("");
    setLearningMaterialText("");
    setLearningError(null);
    setLearningMessage("Material saved to this class.");
    void saveLearningDataImmediately(nextMaterials, learningBundles);
  };

  const deleteLearningMaterial = (id: string) => {
    const nextMaterials = learningMaterials.filter((item) => item.id !== id);
    const nextBundles = learningBundles.filter((bundle) => !bundle.materialIds.includes(id));
    setLearningMaterials(nextMaterials);
    setLearningBundles(nextBundles);
    setLearningMessage("Material removed from this class.");
    void saveLearningDataImmediately(nextMaterials, nextBundles);
  };

  const handleLearningFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLearningFileLoading(true);
    setLearningError(null);
    try {
      if (file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name)) {
        const text = await file.text();
        setLearningMaterialTitle(file.name.replace(/\.[^/.]+$/, ""));
        setLearningMaterialText(text);
      } else if (file.type.startsWith("image/")) {
        const worker = await createWorker("eng");
        const { data } = await worker.recognize(file);
        await worker.terminate();
        setLearningMaterialTitle(file.name.replace(/\.[^/.]+$/, ""));
        setLearningMaterialText(data.text);
      } else {
        setLearningError("Use pasted text, TXT/MD/CSV files, or an image of your class notes.");
      }
    } catch (err: unknown) {
      setLearningError(err instanceof Error ? err.message : "Could not read that material.");
    } finally {
      setLearningFileLoading(false);
      e.target.value = "";
    }
  };

  const generateLearningPack = async () => {
    if (!learningClassId) {
      setLearningError("Select a class first.");
      return;
    }
    const classMaterials = learningMaterials.filter((item) => item.classId === learningClassId);
    if (classMaterials.length === 0) {
      setLearningError("Add at least one class material before generating a learning pack.");
      return;
    }
    const activeClassName = classes.find((item) => item.id === learningClassId)?.name || "Class";
    setLearningGenerating(true);
    setLearningError(null);
    setLearningMessage(null);
    try {
      const response = await fetch("/api/learning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: activeClassName,
          materials: classMaterials.map((item) => ({ title: item.title, content: item.content })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "AI learning generation failed.");
      const bundle: LearningBundle = {
        id: `learning-bundle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        classId: learningClassId,
        title: payload.title || `${activeClassName} Study Pack`,
        summary: payload.summary || "",
        notes: Array.isArray(payload.notes) ? payload.notes : [],
        flashcards: Array.isArray(payload.flashcards) ? payload.flashcards : [],
        quiz: Array.isArray(payload.quiz) ? payload.quiz : [],
        materialIds: classMaterials.map((item) => item.id),
        createdAt: new Date().toISOString(),
      };
      const nextBundles = [
        bundle,
        ...learningBundles.filter((item) => item.classId !== learningClassId).slice(0, 9),
      ];
      setLearningBundles(nextBundles);
      void saveLearningDataImmediately(learningMaterials, nextBundles);
      setLearningView("notes");
      setLearningFlashcardIndex(0);
      setLearningFlashcardFlipped(false);
      setLearningQuizAnswers({});
      setLearningMessage("Your notes, flashcards, and quiz are ready.");
    } catch (err: unknown) {
      setLearningError(err instanceof Error ? err.message : "Could not generate the learning pack.");
    } finally {
      setLearningGenerating(false);
    }
  };

  const activeLearningBundle = useMemo(
    () => learningBundles.find((bundle) => bundle.classId === learningClassId) || null,
    [learningBundles, learningClassId]
  );

  const learningQuizScore = useMemo(() => {
    if (!activeLearningBundle) return 0;
    return activeLearningBundle.quiz.reduce(
      (score, question, index) => score + (learningQuizAnswers[index] === question.correctIndex ? 1 : 0),
      0
    );
  }, [activeLearningBundle, learningQuizAnswers]);

  const currentMonth = currentCalendarDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(
    currentCalendarDate.getFullYear(),
    currentCalendarDate.getMonth() + 1,
    0
  ).getDate();
  const daysArray = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );
  const firstDayOfMonth = new Date(
    currentCalendarDate.getFullYear(),
    currentCalendarDate.getMonth(),
    1
  ).getDay();
  const firstDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const zoomedGoogleEvents = useMemo(
    () =>
      zoomedCalendarDate
        ? googleCalendarEvents.filter((event) => {
            const key = `g-${event.id}`;
            const movedDate = calendarEventOverrides[key]?.date;
            return movedDate
              ? movedDate === zoomedCalendarDate
              : googleEventOccursOnDate(event, zoomedCalendarDate);
          })
        : [],
    [googleCalendarEvents, zoomedCalendarDate, calendarEventOverrides]
  );
  const zoomedManualEvents = useMemo(
    () =>
      zoomedCalendarDate
        ? manualCalendarEvents.filter((event) => {
            const key = `m-${event.id}`;
            return (calendarEventOverrides[key]?.date ?? event.date) === zoomedCalendarDate;
          })
        : [],
    [manualCalendarEvents, zoomedCalendarDate, calendarEventOverrides]
  );

  // Day-of-week + academic status for the zoomed day, so we can pull in the
  // same weekly Timetable class sessions and club meetings the month grid shows.
  const zoomedDayInfo = useMemo(() => {
    if (!zoomedCalendarDate) {
      return {
        dayOfWeekName: null as DayOfWeek | null,
        academicStatus: null as ReturnType<typeof getCalendarDayStatus> | null,
      };
    }
    const zoomedDate = new Date(`${zoomedCalendarDate}T12:00:00`);
    const dayOfWeekNum = zoomedDate.getDay();
    const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;
    const dayOfWeekName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][dayOfWeekNum] as DayOfWeek;
    return {
      dayOfWeekName,
      academicStatus: getCalendarDayStatus(zoomedCalendarDate, isWeekend),
    };
  }, [zoomedCalendarDate]);

  // Same source of truth as the "Add Class Session to Timetable" form: each
  // class's meetingTimes. This is what keeps the Calendar day view in sync
  // with whatever has been added on the Timetable tab.
  const zoomedClassMeetings = useMemo(() => {
    const { dayOfWeekName, academicStatus } = zoomedDayInfo;
    if (!dayOfWeekName || academicStatus?.type === "break" || academicStatus?.type === "staff_only") {
      return [] as { cls: ClassItem; slot: MeetingTime }[];
    }
    return classes.flatMap((cls) =>
      (cls.meetingTimes || [])
        .filter((mt) => mt.day === dayOfWeekName)
        .map((slot) => ({ cls, slot }))
    );
  }, [classes, zoomedDayInfo]);

  const zoomedClubMeetings = useMemo(() => {
    const { dayOfWeekName, academicStatus } = zoomedDayInfo;
    if (!dayOfWeekName || academicStatus?.type === "break" || academicStatus?.type === "staff_only") {
      return [] as { club: ClubItem; slot: ClubMeetingTime }[];
    }
    return clubs.flatMap((club) => {
      const matchingSlots = (club.meetingTimes || []).filter((mt) => mt.day === dayOfWeekName);
      if (matchingSlots.length > 0) {
        return matchingSlots.map((slot) => ({ club, slot }));
      }
      if (zoomedCalendarDate && club.attendance?.[zoomedCalendarDate]) {
        return [{ club, slot: { day: dayOfWeekName, startTime: "", endTime: "" } }];
      }
      return [];
    });
  }, [clubs, zoomedDayInfo, zoomedCalendarDate]);

  type ZoomedDayItem =
    | { kind: "google"; sortKey: string; id: string; event: SyncedGoogleCalendarEvent; display: CalendarEventDisplay }
    | { kind: "manual"; sortKey: string; id: string; event: ManualCalendarEvent; display: CalendarEventDisplay }
    | { kind: "class"; sortKey: string; id: string; cls: ClassItem; slot: MeetingTime; display: CalendarEventDisplay }
    | { kind: "club"; sortKey: string; id: string; club: ClubItem; slot: ClubMeetingTime; display: CalendarEventDisplay };

  // Everything on the zoomed day — Google Calendar events, tasks, Timetable
  // class sessions, and club meetings — merged into one time-ordered list.
  const zoomedDayItems = useMemo<ZoomedDayItem[]>(() => {
    const items: ZoomedDayItem[] = [];
    zoomedGoogleEvents.forEach((event) => {
      const key = `g-${event.id}`;
      items.push({
        kind: "google",
        sortKey: event.allDay ? "0000" : event.startTime || "0000",
        id: key,
        event,
        display: getCalendarEventDisplay(key, {
          title: event.title,
          color: event.color,
          icon: event.icon,
          date: event.startDate,
          startTime: event.startTime,
          endTime: event.endTime,
          allDay: event.allDay,
          details: event.description,
          sourceLabel: "Google Calendar",
        }),
      });
    });
    zoomedManualEvents.forEach((event) => {
      const key = `m-${event.id}`;
      items.push({
        kind: "manual",
        sortKey: event.startTime || "0000",
        id: key,
        event,
        display: getCalendarEventDisplay(key, {
          title: event.name,
          color: getManualEventColor(event.type),
          icon: "✦",
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          allDay: false,
          details: event.details,
          sourceLabel: "Personal event",
        }),
      });
    });
    zoomedClassMeetings.forEach(({ cls, slot }) => {
      const key = `c-${cls.id}-${zoomedCalendarDate}-${slot.startTime || "all-day"}-${slot.endTime || ""}`;
      items.push({
        kind: "class",
        sortKey: slot.startTime || "0000",
        id: key,
        cls,
        slot,
        display: getCalendarEventDisplay(key, {
          title: cls.name,
          color: cls.color || "#3B82F6",
          icon: "📘",
          date: zoomedCalendarDate || "",
          startTime: slot.startTime,
          endTime: slot.endTime,
          allDay: !slot.startTime,
          sourceLabel: "Class",
        }),
      });
    });
    zoomedClubMeetings.forEach(({ club, slot }) => {
      const key = `cl-${club.id}-${zoomedCalendarDate}-${slot.startTime || "all-day"}-${slot.endTime || ""}`;
      items.push({
        kind: "club",
        sortKey: slot.startTime || "0000",
        id: key,
        club,
        slot,
        display: getCalendarEventDisplay(key, {
          title: club.name,
          color: club.color || "#8B5CF6",
          icon: club.icon || "👥",
          date: zoomedCalendarDate || "",
          startTime: slot.startTime,
          endTime: slot.endTime,
          allDay: !slot.startTime,
          sourceLabel: "Club",
        }),
      });
    });
    return items.sort((a, b) => {
      const aTime = a.display.allDay ? "0000" : a.display.startTime || "0000";
      const bTime = b.display.allDay ? "0000" : b.display.startTime || "0000";
      return aTime.localeCompare(bTime) || a.display.title.localeCompare(b.display.title);
    });
  }, [zoomedGoogleEvents, zoomedManualEvents, zoomedClassMeetings, zoomedClubMeetings, zoomedCalendarDate, calendarEventOverrides]);

  const editingCalendarItem = zoomedDayItems.find(
    (item) => item.id === editingCalendarItemKey
  );

  const zoomedDateLabel = zoomedCalendarDate
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${zoomedCalendarDate}T12:00:00`))
    : "";

  const openManualEventModal = (date?: string) => {
    setManualEventDate(date || zoomedCalendarDate || formatDateKey(new Date()));
    setManualEventName("");
    setManualEventDetails("");
    setManualEventStartTime("09:00");
    setManualEventEndTime("10:00");
    setManualEventType("Study");
    setShowManualEventModal(true);
  };

  const addManualCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const name = manualEventName.trim();
    if (!name || !manualEventDate || !manualEventStartTime || !manualEventEndTime) return;

    const event: ManualCalendarEvent = {
      id: `manual-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      details: manualEventDetails.trim(),
      date: manualEventDate,
      startTime: manualEventStartTime,
      endTime: manualEventEndTime,
      type: manualEventType,
    };

    const nextEvents = [...manualCalendarEvents, event].sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime) ||
        a.name.localeCompare(b.name)
    );
    setManualCalendarEvents(nextEvents);
    setShowManualEventModal(false);
    setZoomedCalendarDate(manualEventDate);
    setEditingCalendarItemKey(null);
  };

  const deleteManualCalendarEvent = (eventId: string) => {
    setManualCalendarEvents((current) => current.filter((event) => event.id !== eventId));
  };

  const prevMonth = () => {
    setCurrentCalendarDate(
      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentCalendarDate(
      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1)
    );
  };

  const resetToToday = () => {
    setCurrentCalendarDate(new Date());
  };

  const completeOnboarding = () => {
    const goal = Math.min(40, Math.max(1, Number(onboardingStudyGoalHours) || 10));
    updateAppSettings({ weeklyStudyGoalHours: goal, onboardingCompleted: true });
    setShowOnboarding(false);
    setOnboardingStep(0);
    setMobileTab("calendar");
    setActiveTab("calendar");
  };

  const addOnboardingClass = () => {
    if (!onboardingClassName.trim()) return;
    const nextClass: ClassItem = {
      id: Date.now().toString(),
      name: onboardingClassName.trim(),
      color: onboardingClassColor,
      targetGrade: "A",
      standards: [],
      meetingTimes: [],
    };
    const nextClasses = [...classes, nextClass];
    setClasses(nextClasses);
    saveWorkspaceChangeImmediately({ classes: nextClasses });
    setSelectedClassId(nextClass.id);
    setOnboardingClassName("");
  };

  const addOnboardingTask = () => {
    if (!onboardingTaskTitle.trim() || classes.length === 0) return;
    const nextTask: Task = {
      id: Date.now().toString(),
      title: onboardingTaskTitle.trim(),
      classId: classes[0].id,
      dueDate: onboardingTaskDueDate,
      type: "homework",
      estimatedHours: 1,
      actualHours: 0,
      completed: false,
    };
    const nextTasks = [...tasks, nextTask];
    setTasks(nextTasks);
    saveWorkspaceChangeImmediately({ tasks: nextTasks });
    setOnboardingTaskTitle("");
    setOnboardingTaskDueDate("");
  };

  const txOnboarding = (key: string) =>
    ONBOARDING_TEXT[appSettings.language]?.[key] ?? ONBOARDING_TEXT.en[key] ?? key;

  // Global command menu + desktop keyboard shortcuts. Typing inside an input/textarea/select never triggers navigation shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (showOnboarding) {
        if (event.key === "Escape") event.preventDefault();
        return;
      }
      const target = event.target as HTMLElement | null;
      const isTyping = Boolean(target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setCommandPaletteOpen((open) => !open);
        setCommandQuery("");
        return;
      }
      if (event.key === "Escape") {
        if (commandPaletteOpen) { setCommandPaletteOpen(false); setCommandQuery(""); return; }
        if (showSettingsPage) { setShowSettingsPage(false); return; }
        return;
      }
      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;

      if (key === "c") openSectionFromCommand("calendar");
      else if (key === "t") openSectionFromCommand("tasks");
      else if (key === "l") openSectionFromCommand("learning");
      else if (key === "f") openSectionFromCommand("focus");
      else if (key === "a") openSectionFromCommand("analytics");
      else if (key === "n") openNewTaskFromCommand();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, showSettingsPage, showOnboarding, userId, tasks, selectedTimerTaskId, learningClassId, classes]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    setTimeout(() => commandSearchInputRef.current?.focus(), 0);
  }, [commandPaletteOpen]);

  // --- RENDER UNAUTHENTICATED LOGIN / SIGNUP SCREEN ---
  if (!session || !userId) {
    // Wait for Supabase to report the session so the landing page doesn't flash for signed-in users
    if (!isLoaded) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      );
    }

    if (!showAuth) {
      return (
        <LandingPage
          language={appSettings.language}
          onSignIn={() => {
            setIsSignUp(false);
            setShowAuth(true);
          }}
          onSignUp={() => {
            setIsSignUp(true);
            setShowAuth(true);
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setShowAuth(false);
              setAuthError(null);
              setAuthMessage(null);
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
          >
            <ChevronLeft size={14} />{tx("Back to home")}</button>
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 mb-2">
              <GraduationCap size={36} />
            </div>
            <h1 className="text-2xl font-bold text-white">{tx("WJ Study")}</h1>
            <p className="text-xs text-slate-400">
              {isSignUp
                ? "Create your personal student account"
                : "Sign in to access your classes, schedule, & clubs"}
            </p>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2">
              <UserCheck size={16} className="shrink-0" />
              <span>{authMessage}</span>
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleLogIn} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">{tx("School Email")}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="student@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">{tx("Password")}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? (
                <Sparkles size={16} className="animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus size={16} />{tx("Create Account")}</>
              ) : (
                <>
                  <LogIn size={16} />{tx("Sign In")}</>
              )}
            </button>
          </form>

          {!isSignUp && (
            <div className="space-y-4">
              <div className="flex items-center gap-3" aria-hidden="true">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{tx("Or continue with")}</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full rounded-lg border border-slate-700 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span
                  aria-hidden="true"
                  className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 text-[10px] font-bold text-blue-600"
                >
                  G
                </span>{tx("Sign in with Google")}</button>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                  setAuthMessage(null);
                }}
                className="text-blue-400 font-semibold hover:underline ml-1"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const openSupportEmail = (subject: string, body: string) => {
    if (typeof window === "undefined") return;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const reportBug = () => {
    const body = [
      "Hi WJ Study support,",
      "",
      "I found a bug:",
      "[Please describe what happened]",
      "",
      "What I was doing:",
      "[Please describe the steps]",
      "",
      `Current page: ${typeof window !== "undefined" ? window.location.href : ""}`,
      `Browser: ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`,
    ].join("\n");
    openSupportEmail("WJ Study bug report", body);
  };

  const contactSupport = () => {
    openSupportEmail("WJ Study support", "Hi WJ Study support,\n\nHow can you help me?\n");
  };

  const openNewTaskFromCommand = () => {
    setShowSettingsPage(false);
    setCommandPaletteOpen(false);
    setMobileTab("tasks");
    setTimeout(() => taskTitleInputRef.current?.focus(), 40);
  };

  const openNewCalendarEventFromCommand = () => {
    setShowSettingsPage(false);
    setCommandPaletteOpen(false);
    openManualEventModal(formatDateKey(new Date()));
  };

  const openSectionFromCommand = (section: "calendar" | "learning" | "analytics" | "settings" | "tasks" | "focus") => {
    setCommandPaletteOpen(false);
    if (section === "settings") {
      setShowSettingsPage(true);
      return;
    }
    setShowSettingsPage(false);
    if (section === "calendar") { setActiveTab("calendar"); setMobileTab("calendar"); return; }
    if (section === "learning") { setActiveTab("learning"); setMobileTab("learning"); if (!learningClassId && classes[0]?.id) setLearningClassId(classes[0].id); return; }
    if (section === "analytics") { setActiveTab("analytics"); setMobileTab("analytics"); return; }
    if (section === "tasks") { setMobileTab("tasks"); setActiveTab("calendar"); return; }
    if (section === "focus") {
      const pendingTask = selectedTimerTaskId && tasks.find((task) => task.id === selectedTimerTaskId && !task.completed)
        ? selectedTimerTaskId
        : tasks.find((task) => !task.completed)?.id;
      setMobileTab("tasks");
      if (pendingTask) startFocusForTask(pendingTask);
    }
  };

  const mobileBottomGroup =
    mobileTab === "home"
      ? "home"
      : mobileTab === "calendar" || mobileTab === "timetable" || mobileTab === "clubs"
        ? "calendar"
        : mobileTab === "clan" || mobileTab === "streaks"
          ? "clan"
          : mobileTab === "learning" || mobileTab === "planner" || mobileTab === "analytics" || mobileTab === "simulator" || mobileTab === "ai"
            ? "learning"
            : mobileTab === "more"
              ? "more"
              : "home";

  const updateProfileName = (value: string) => updateAppSettings({ profileName: value.slice(0, 80) });
  const updateProfileAvatar = (value: string) => updateAppSettings({ profileAvatar: value.slice(0, 8) || "🎓" });

  const changePassword = async () => {
    setAccountActionMessage(null);
    setAccountActionError(null);
    if (newPassword.length < 6) {
      setAccountActionError(SETTINGS_TEXT[appSettings.language].passwordTooShort);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setAccountActionError(SETTINGS_TEXT[appSettings.language].passwordMismatch);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setAccountActionError(error.message);
      return;
    }
    setNewPassword("");
    setConfirmNewPassword("");
    setAccountActionMessage(SETTINGS_TEXT[appSettings.language].passwordUpdated);
  };

  const deleteAccount = async () => {
    if (!userId || deletingAccount) return;
    const confirmed = window.confirm(SETTINGS_TEXT[appSettings.language].deleteAccountWarning);
    if (!confirmed) return;
    setDeletingAccount(true);
    setAccountActionError(null);
    setAccountActionMessage(null);
    try {
      const { data: currentSessionData } = await supabase.auth.getSession();
      const accessToken = currentSessionData.session?.access_token;
      if (!accessToken) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Could not delete the account.");
      const keys = [
        `tracker_workspace_data_saved_at_v2_${userId}`, `tracker_classes_v8_${userId}`, `tracker_clubs_v8_${userId}`,
        `tracker_tasks_v8_${userId}`, `tracker_streaks_v8_${userId}`, `tracker_study_sessions_v1_${userId}`,
        `tracker_gamification_xp_v1_${userId}`, `tracker_app_settings_v1_${userId}`, `tracker_learning_materials_v1_${userId}`,
        `tracker_learning_bundles_v1_${userId}`, `tracker_google_calendar_events_v1_${userId}`, `tracker_hidden_google_event_ids_v1_${userId}`,
        `tracker_google_calendar_deletion_rules_v1_${userId}`, `tracker_google_calendar_merge_rules_v1_${userId}`,
        `tracker_manual_calendar_events_v1_${userId}`, `tracker_calendar_event_overrides_v1_${userId}`,
      ];
      keys.forEach((key) => localStorage.removeItem(key));
      await supabase.auth.signOut();
      setShowSettingsPage(false);
      setSession(null);
      setUserId(null);
      setClasses([]); setClubs([]); setTasks([]); setStreaks([]); setStudySessions([]);
      setGamificationXp(0); setAppSettings(DEFAULT_APP_SETTINGS);
    } catch (error: any) {
      setAccountActionError(error?.message || "Could not delete the account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  // --- RENDER AUTHENTICATED DASHBOARD ---
  if (showOnboarding && session && userId) {
    const onboardingStepTitles = [
      txOnboarding("welcomeTitle"),
      txOnboarding("stepClasses"),
      txOnboarding("stepTasks"),
      txOnboarding("stepCalendar"),
      txOnboarding("stepGoal"),
    ];
    const totalSteps = onboardingStepTitles.length;
    const isLightOnboarding = appSettings.theme === "light";
    const onboardingCard = isLightOnboarding ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800";
    const onboardingText = isLightOnboarding ? "text-slate-900" : "text-white";
    const onboardingBody = isLightOnboarding ? "text-slate-600" : "text-slate-400";
    const onboardingInput = isLightOnboarding ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-700 text-white";
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isLightOnboarding ? "bg-slate-100" : "bg-slate-950"}`}>
        <div className={`w-full max-w-2xl rounded-3xl border p-5 sm:p-8 shadow-2xl ${onboardingCard}`}>
          <div className="flex items-center justify-between gap-4 mb-7">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600/15 text-2xl">🎓</div>
              <div>
                <div className={`text-sm font-extrabold ${onboardingText}`}>WJ Study</div>
                <div className={`text-[11px] ${onboardingBody}`}>{txOnboarding("progress")} {Math.min(onboardingStep + 1, totalSteps)} {txOnboarding("of")} {totalSteps}</div>
              </div>
            </div>
            <button type="button" onClick={completeOnboarding} className={`text-xs font-semibold px-3 py-2 rounded-lg border ${isLightOnboarding ? "border-slate-300 text-slate-600 hover:bg-slate-50" : "border-slate-700 text-slate-400 hover:bg-slate-800"}`}>
              {txOnboarding("skip")}
            </button>
          </div>
          <div className={`h-1.5 rounded-full mb-8 ${isLightOnboarding ? "bg-slate-200" : "bg-slate-800"}`}>
            <div className="h-1.5 rounded-full bg-blue-600 transition-all" style={{ width: `${((onboardingStep + 1) / totalSteps) * 100}%` }} />
          </div>

          <div className="min-h-[330px] flex flex-col justify-center">
            {onboardingStep === 0 && (
              <div className="text-center space-y-5">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-blue-600/15 text-4xl">👋</div>
                <div>
                  <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${onboardingText}`}>{txOnboarding("welcomeTitle")}</h1>
                  <p className={`mt-3 text-sm sm:text-base max-w-lg mx-auto ${onboardingBody}`}>{txOnboarding("welcomeBody")}</p>
                </div>
              </div>
            )}

            {onboardingStep === 1 && (
              <div className="space-y-5">
                <div><h2 className={`text-2xl font-black ${onboardingText}`}>{txOnboarding("stepClasses")}</h2><p className={`mt-2 text-sm ${onboardingBody}`}>{txOnboarding("stepClassesBody")}</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <input value={onboardingClassName} onChange={(e) => setOnboardingClassName(e.target.value)} placeholder={txOnboarding("classPlaceholder")} className={`rounded-xl border px-3 py-3 text-sm outline-none focus:border-blue-500 ${onboardingInput}`} autoFocus />
                  <div className="flex gap-2">
                    <input type="color" value={onboardingClassColor} onChange={(e) => setOnboardingClassColor(e.target.value)} className="h-12 w-14 rounded-xl cursor-pointer bg-transparent" aria-label={txOnboarding("addClass")} />
                    <button type="button" onClick={addOnboardingClass} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500">{txOnboarding("addClass")}</button>
                  </div>
                </div>
                {classes.length > 0 && <div className="flex flex-wrap gap-2">{classes.slice(0, 8).map((cls) => <span key={cls.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: cls.color }}>{cls.name}</span>)}</div>}
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-5">
                <div><h2 className={`text-2xl font-black ${onboardingText}`}>{txOnboarding("stepTasks")}</h2><p className={`mt-2 text-sm ${onboardingBody}`}>{classes.length === 0 ? txOnboarding("stepTasksBody") + " " + (appSettings.language === "en" ? "Add a class first to attach the task." : "") : txOnboarding("stepTasksBody")}</p></div>
                <input value={onboardingTaskTitle} onChange={(e) => setOnboardingTaskTitle(e.target.value)} placeholder={txOnboarding("taskPlaceholder")} disabled={classes.length === 0} className={`w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:opacity-50 ${onboardingInput}`} autoFocus />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`rounded-xl border px-3 py-2.5 ${onboardingInput}`}><span className={`block text-[11px] mb-1 ${onboardingBody}`}>{txOnboarding("dueDate")}</span><input type="date" value={onboardingTaskDueDate} onChange={(e) => setOnboardingTaskDueDate(e.target.value)} className="w-full bg-transparent outline-none text-sm" disabled={classes.length === 0} /></label>
                  <button type="button" onClick={addOnboardingTask} disabled={classes.length === 0 || !onboardingTaskTitle.trim()} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40">{txOnboarding("addTask")}</button>
                </div>
                {tasks.length > 0 && <div className={`rounded-xl border p-3 text-xs ${isLightOnboarding ? "border-slate-200 bg-slate-50 text-slate-700" : "border-slate-800 bg-slate-950 text-slate-300"}`}>{txOnboarding("taskAdded")} · {tasks[tasks.length - 1]?.title}</div>}
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="space-y-6 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-600/15"><CalendarDays size={30} className="text-blue-500" /></div>
                <div><h2 className={`text-2xl font-black ${onboardingText}`}>{txOnboarding("stepCalendar")}</h2><p className={`mt-2 text-sm max-w-lg mx-auto ${onboardingBody}`}>{txOnboarding("stepCalendarBody")}</p></div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button type="button" onClick={() => { if (session?.provider_token) { void handleGoogleCalendarSync(); } else { void handleGoogleSignIn(); } }} className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500">{txOnboarding("connectCalendar")}</button>
                  <button type="button" onClick={() => { setOnboardingStep(4); }} className={`w-full sm:w-auto rounded-xl border px-5 py-3 text-sm font-semibold ${isLightOnboarding ? "border-slate-300 text-slate-700 hover:bg-slate-50" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}>{txOnboarding("continueWithout")}</button>
                </div>
                {calendarSyncMessage && <div className={`text-xs ${calendarSyncState === "error" ? "text-rose-500" : "text-emerald-500"}`}>{calendarSyncMessage}</div>}
              </div>
            )}

            {onboardingStep === 4 && (
              <div className="space-y-6">
                <div><h2 className={`text-2xl font-black ${onboardingText}`}>{txOnboarding("stepGoal")}</h2><p className={`mt-2 text-sm ${onboardingBody}`}>{txOnboarding("stepGoalBody")}</p></div>
                <div className={`rounded-2xl border p-5 ${isLightOnboarding ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/60"}`}>
                  <div className="flex items-end gap-3">
                    <input type="number" min="1" max="40" step="0.5" value={onboardingStudyGoalHours} onChange={(e) => setOnboardingStudyGoalHours(e.target.value)} className={`w-32 rounded-xl border px-3 py-3 text-2xl font-black outline-none focus:border-blue-500 ${onboardingInput}`} />
                    <span className={`pb-3 text-sm font-semibold ${onboardingBody}`}>{txOnboarding("hoursPerWeek")}</span>
                  </div>
                  <input type="range" min="1" max="40" step="0.5" value={Number(onboardingStudyGoalHours) || 10} onChange={(e) => setOnboardingStudyGoalHours(e.target.value)} className="mt-6 w-full accent-blue-600" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" disabled={onboardingStep === 0} onClick={() => setOnboardingStep((step) => Math.max(0, step - 1))} className={`rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-30 ${isLightOnboarding ? "border-slate-300 text-slate-700 hover:bg-slate-50" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}>{txOnboarding("back")}</button>
            {onboardingStep < 4 ? (
              <button type="button" onClick={() => setOnboardingStep((step) => Math.min(4, step + 1))} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500">{txOnboarding("continue")}</button>
            ) : (
              <button type="button" onClick={completeOnboarding} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500">{txOnboarding("finish")}</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showSettingsPage) {
    const settingsCopy = SETTINGS_TEXT[appSettings.language];
    const isLight = appSettings.theme === "light";
    const surface = isLight
      ? "border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]"
      : "border-slate-800 bg-slate-900 shadow-sm";
    const inner = isLight
      ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
      : "border-slate-800 bg-slate-950/50 hover:border-slate-700";
    const subtle = isLight ? "text-slate-500" : "text-slate-400";
    const primaryText = isLight ? "text-slate-900" : "text-white";
    const bodyText = isLight ? "text-slate-700" : "text-slate-300";
    const notificationStatus =
      notificationPermission === "granted"
        ? "granted"
        : notificationPermission === "denied"
          ? "denied"
          : notificationPermission === "unsupported"
            ? "unsupported"
            : "default";

    const setNotification = async (key: keyof AppSettings["notifications"], value: boolean) => {
      if (value && notificationPermission !== "granted") {
        const granted = await requestNotificationPermission();
        if (!granted) return;
      }
      updateAppSettings({ notifications: { ...appSettings.notifications, [key]: value } });
    };

    return (
      <div
        className={`min-h-screen font-sans transition-colors duration-200 ${
          isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"
        }`}
        style={{ ["--wj-accent" as string]: APP_ACCENT_VALUES[appSettings.accent] } as React.CSSProperties}
      >
        <style jsx global>{`
          [data-wj-theme="light"] body { background: #f8fafc !important; color: #0f172a !important; }
          [data-wj-theme="light"] .wj-settings-header { background: rgba(255,255,255,.94) !important; border-color: #e2e8f0 !important; }
          [data-wj-theme="light"] .wj-settings-accent { color: var(--wj-accent) !important; }
          [data-wj-theme="light"] .wj-settings-accent-bg { background: var(--wj-accent) !important; }
          [data-wj-theme="light"] .wj-settings-accent-soft { background: color-mix(in srgb, var(--wj-accent) 10%, white) !important; }
          [data-wj-theme="light"] .wj-settings-accent-border { border-color: color-mix(in srgb, var(--wj-accent) 48%, #cbd5e1) !important; }
          [data-wj-theme="dark"] .wj-settings-accent { color: var(--wj-accent) !important; }
          [data-wj-theme="dark"] .wj-settings-accent-bg { background: var(--wj-accent) !important; }
        `}</style>

        <header className={`wj-settings-header sticky top-0 z-20 border-b backdrop-blur-md ${isLight ? "border-slate-200 bg-white/95" : "border-slate-800 bg-slate-900/95"}`}>
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => setShowSettingsPage(false)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isLight ? "text-slate-700 hover:bg-slate-100 hover:text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <ChevronLeft size={17} /> {settingsCopy.back}
            </button>
            <div className={`flex items-center gap-2 text-sm font-bold ${primaryText}`}>
              <Settings size={17} className="wj-settings-accent" />
              <span>{settingsCopy.settings}</span>
            </div>
            <span className={`hidden text-[11px] font-semibold sm:block ${subtle}`}>{settingsCopy.saved}</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
          <section className={`rounded-2xl border p-5 sm:p-6 ${surface}`}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isLight ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/10 text-indigo-400"}`}>
                <UserCircle2 size={19} />
              </div>
              <div className="min-w-0">
                <h2 className={`text-base font-bold ${primaryText}`}>{settingsCopy.account}</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={`block text-xs font-semibold ${bodyText}`}>{settingsCopy.profileName}
                <span className={`mt-1 block text-[11px] font-normal ${subtle}`}>{settingsCopy.profileNameDescription}</span>
                <input
                  value={appSettings.profileName}
                  onChange={(e) => updateProfileName(e.target.value)}
                  placeholder={session?.user?.email?.split("@")[0] || "Student"}
                  maxLength={80}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </label>

              <div>
                <div className={`text-xs font-semibold ${bodyText}`}>{settingsCopy.avatar}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {["🎓","📚","🧠","🚀","🌟","😊","🎯","🧑‍🎓"].map((avatar) => (
                    <button key={avatar} type="button" onClick={() => updateProfileAvatar(avatar)} className={`grid h-10 w-10 place-items-center rounded-xl border text-lg transition ${appSettings.profileAvatar === avatar ? "border-blue-400 bg-blue-500/10 ring-2 ring-blue-400/30" : inner}`} aria-label={`${settingsCopy.avatar}: ${avatar}`}>{avatar}</button>
                  ))}
                  <input value={appSettings.profileAvatar} onChange={(e) => updateProfileAvatar(e.target.value)} maxLength={8} className="h-10 w-16 rounded-xl border border-slate-700 bg-slate-950 text-center text-lg outline-none focus:border-blue-400" aria-label={settingsCopy.avatar} />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className={`rounded-xl border p-4 ${inner}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wide ${subtle}`}>{settingsCopy.email}</div>
                <div className={`mt-1 break-all text-sm font-semibold ${primaryText}`}>{session?.user?.email || "—"}</div>
                <div className={`mt-1 text-[11px] ${subtle}`}>{settingsCopy.emailDescription}</div>
              </div>
              <div className={`rounded-xl border p-4 ${inner}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wide ${subtle}`}>{settingsCopy.created}</div>
                <div className={`mt-1 text-sm font-semibold ${primaryText}`}>{session?.user?.created_at ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(session.user.created_at)) : "—"}</div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-800 pt-5">
              <div className={`text-sm font-bold ${primaryText}`}>{settingsCopy.changePassword}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={settingsCopy.newPassword} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder={settingsCopy.confirmPassword} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <button type="button" onClick={() => void changePassword()} className="mt-3 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500">{settingsCopy.changePasswordButton}</button>
              {accountActionMessage && <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{accountActionMessage}</div>}
              {accountActionError && <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{accountActionError}</div>}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handleLogOut} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${inner}`}>
                <span className="flex items-center gap-2"><LogOut size={17} /> {settingsCopy.signOut}</span>
              </button>
              <button type="button" onClick={() => void deleteAccount()} disabled={deletingAccount} className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-left text-sm font-semibold text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-50">
                <span className="flex items-center gap-2"><Trash2 size={17} /> {deletingAccount ? "…" : settingsCopy.deleteAccount}</span>
                <span className="mt-1 block text-[11px] font-normal opacity-80">{settingsCopy.deleteAccountDescription}</span>
              </button>
            </div>
          </section>

          <section className={`rounded-2xl border p-5 sm:p-6 ${surface}`}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isLight ? "bg-cyan-50 text-cyan-600" : "bg-cyan-500/10 text-cyan-400"}`}><Keyboard size={19} /></div>
              <div className="min-w-0"><h2 className={`text-base font-bold ${primaryText}`}>{settingsCopy.keyboardShortcuts}</h2><p className={`mt-1 text-xs leading-relaxed ${subtle}`}>{settingsCopy.keyboardShortcutsDescription}</p></div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[["C", settingsCopy.shortcutCalendar],["T", settingsCopy.shortcutTasks],["L", settingsCopy.shortcutLearning],["F", settingsCopy.shortcutFocus],["A", settingsCopy.shortcutAnalytics],["N", settingsCopy.shortcutNewTask],["Esc", settingsCopy.shortcutClose],["⌘/Ctrl K", settingsCopy.shortcutSearch]].map(([key,label]) => (
                <div key={key} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${inner}`}><span className={`text-xs font-semibold ${bodyText}`}>{label}</span><kbd className={`rounded-md border px-2 py-1 text-[10px] font-bold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-slate-700 bg-slate-900 text-slate-300"}`}>{key}</kbd></div>
              ))}
            </div>
          </section>

          <section className={`rounded-2xl border p-5 sm:p-6 ${surface}`}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isLight ? "bg-blue-50 text-blue-600" : "bg-blue-500/10 text-blue-400"}`}><Languages size={19} />
              </div>
              <div className="min-w-0">
                <h2 className={`text-base font-bold ${primaryText}`}>{settingsCopy.language}</h2>
                <p className={`mt-1 text-xs leading-relaxed ${subtle}`}>{settingsCopy.languageDescription}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                ["en", settingsCopy.english],
                ["vi", settingsCopy.vietnamese],
                ["ko", settingsCopy.korean],
                ["ja", settingsCopy.japanese],
                ["es", settingsCopy.spanish],
                ["zh", settingsCopy.mandarin],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateAppSettings({ language: value as AppLanguage })}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    appSettings.language === value
                      ? `wj-settings-accent-border ${isLight ? "wj-settings-accent-soft text-slate-900" : "bg-violet-500/10 text-white"}`
                      : `${inner} ${bodyText}`
                  }`}
                >
                  <span>{label}</span>
                  {appSettings.language === value && <span className="h-2.5 w-2.5 rounded-full wj-settings-accent-bg" />}
                </button>
              ))}
            </div>
          </section>

          <section className={`rounded-2xl border p-5 sm:p-6 ${surface}`}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isLight ? "bg-violet-50 text-violet-600" : "bg-violet-500/10 text-violet-400"}`}>
                <Palette size={19} />
              </div>
              <div className="min-w-0">
                <h2 className={`text-base font-bold ${primaryText}`}>{settingsCopy.appearance}</h2>
                <p className={`mt-1 text-xs leading-relaxed ${subtle}`}>{settingsCopy.appearanceDescription}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["dark", settingsCopy.dark, Moon],
                ["light", settingsCopy.light, SunMedium],
              ] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateAppSettings({ theme: value })}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${
                    appSettings.theme === value
                      ? `wj-settings-accent-border ${isLight && value === "light" ? "wj-settings-accent-soft" : "bg-violet-500/10"}`
                      : inner
                  }`}
                >
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-slate-200"}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${primaryText}`}>{label}</div>
                    <div className={`mt-0.5 text-[11px] ${subtle}`}>{value === "dark" ? (appSettings.language === "es" ? "Cómodo con poca luz" : appSettings.language === "zh" ? "适合低光环境" : "Low-light friendly") : (appSettings.language === "es" ? "Interfaz más luminosa" : appSettings.language === "zh" ? "更明亮的界面" : "Brighter interface")}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <div className={`mb-2 flex items-center gap-2 text-xs font-bold ${bodyText}`}>
                <Palette size={14} /> {settingsCopy.accent}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {(Object.keys(APP_ACCENT_VALUES) as AppAccent[]).map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    onClick={() => updateAppSettings({ accent })}
                    className={`h-10 w-10 rounded-full border-2 transition ${appSettings.accent === accent ? "border-slate-900 ring-2 ring-white scale-105" : "border-transparent opacity-80 hover:opacity-100"}`}
                    style={{ backgroundColor: APP_ACCENT_VALUES[accent] }}
                    title={accent}
                    aria-label={`${settingsCopy.accent}: ${accent}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className={`rounded-2xl border p-5 sm:p-6 ${surface}`}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isLight ? "bg-amber-50 text-amber-600" : "bg-amber-500/10 text-amber-400"}`}>
                <Bell size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={`text-base font-bold ${primaryText}`}>{settingsCopy.notifications}</h2>
                <p className={`mt-1 text-xs leading-relaxed ${subtle}`}>{settingsCopy.notificationsDescription}</p>
              </div>
            </div>

            <div className={`mt-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/50"}`}>
              <div>
                <div className={`text-sm font-bold ${primaryText}`}>Browser notifications</div>
                <div className={`mt-1 text-[11px] ${subtle}`}>
                  {notificationStatus === "granted"
                    ? "Enabled in this browser. WJ Study can show reminders while the app is open."
                    : notificationStatus === "denied"
                      ? "Blocked by this browser. Allow notifications in your browser site settings to use them."
                      : notificationStatus === "unsupported"
                        ? "This browser does not support web notifications."
                        : "Enable browser permission to receive task, deadline, and focus reminders."}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={sendTestNotification}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${isLight ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                >
                  {notificationStatus === "granted" ? "Test notification" : "Enable notifications"}
                </button>
              </div>
            </div>

            <div className={`mt-4 divide-y ${isLight ? "divide-slate-200" : "divide-slate-800/80"}`}>
              {[
                ["taskReminders", settingsCopy.taskReminders, settingsCopy.taskRemindersDescription],
                ["deadlineAlerts", settingsCopy.deadlineAlerts, settingsCopy.deadlineAlertsDescription],
                ["focusReminders", settingsCopy.focusReminders, settingsCopy.focusRemindersDescription],
              ].map(([key, label, description]) => {
                const enabled = appSettings.notifications[key as keyof AppSettings["notifications"]];
                return (
                  <div key={key} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${primaryText}`}>{label}</div>
                      <div className={`mt-0.5 text-[11px] leading-relaxed ${subtle}`}>{description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void setNotification(key as keyof AppSettings["notifications"], !enabled)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "wj-settings-accent-bg" : isLight ? "bg-slate-300" : "bg-slate-700"}`}
                      aria-pressed={enabled}
                      aria-label={`${label}: ${enabled ? "on" : "off"}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className={`mt-3 rounded-lg border p-3 text-[11px] leading-relaxed ${isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-slate-800 bg-slate-950/60 text-slate-500"}`}>
              Browser notifications are checked automatically about once per minute while WJ Study is open. They are not background push notifications when the browser/app is fully closed.
            </div>
          </section>

          <section className={`rounded-2xl border p-5 sm:p-6 ${surface}`}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isLight ? "bg-sky-50 text-sky-600" : "bg-sky-500/10 text-sky-400"}`}>
                <LifeBuoy size={19} />
              </div>
              <div className="min-w-0">
                <h2 className={`text-base font-bold ${primaryText}`}>{settingsCopy.helpFeedback}</h2>
                <p className={`mt-1 text-xs leading-relaxed ${subtle}`}>{settingsCopy.helpFeedbackDescription}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={reportBug}
                className={`group flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition hover:-translate-y-0.5 ${inner}`}
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isLight ? "bg-rose-50 text-rose-600" : "bg-rose-500/10 text-rose-400"}`}>
                  <Bug size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-bold ${primaryText}`}>{settingsCopy.reportBug}</div>
                  <div className={`mt-0.5 text-[11px] leading-relaxed ${subtle}`}>{settingsCopy.reportBugDescription}</div>
                </div>
                <span className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-slate-700 bg-slate-900 text-slate-300"}`}>{settingsCopy.openEmail}</span>
              </button>

              <button
                type="button"
                onClick={contactSupport}
                className={`group flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition hover:-translate-y-0.5 ${inner}`}
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isLight ? "bg-blue-50 text-blue-600" : "bg-blue-500/10 text-blue-400"}`}>
                  <Mail size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-bold ${primaryText}`}>{settingsCopy.contactSupport}</div>
                  <div className={`mt-0.5 text-[11px] leading-relaxed ${subtle}`}>{settingsCopy.contactSupportDescription}</div>
                </div>
                <span className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${isLight ? "border-slate-300 bg-white text-slate-700" : "border-slate-700 bg-slate-900 text-slate-300"}`}>{settingsCopy.openEmail}</span>
              </button>
            </div>

            <div className={`mt-4 rounded-lg border p-3 text-[11px] ${isLight ? "border-slate-200 bg-slate-50 text-slate-500" : "border-slate-800 bg-slate-950/60 text-slate-500"}`}>
              {SUPPORT_EMAIL}
            </div>
          </section>

          <section className={`rounded-2xl border p-5 sm:p-6 ${surface}`}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isLight ? "bg-violet-50 text-violet-600" : "bg-violet-500/10 text-violet-400"}`}>
                <Info size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={`text-base font-bold ${primaryText}`}>{settingsCopy.about}</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${isLight ? "border-violet-200 bg-violet-50 text-violet-700" : "border-violet-500/30 bg-violet-500/10 text-violet-300"}`}>v{APP_VERSION}</span>
                </div>
                <p className={`mt-1 text-xs leading-relaxed ${subtle}`}>{settingsCopy.aboutDescription}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className={`rounded-xl border p-4 ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/50"}`}>
                <div className={`text-[11px] font-semibold uppercase tracking-wide ${subtle}`}>{settingsCopy.appVersion}</div>
                <div className={`mt-2 text-2xl font-black tracking-tight ${primaryText}`}>v{APP_VERSION}</div>
                <div className={`mt-1 text-[11px] ${subtle}`}>{settingsCopy.currentRelease}</div>
              </div>

              <div className={`rounded-xl border p-4 ${isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-950/50"}`}>
                <div className={`text-sm font-bold ${primaryText}`}>{settingsCopy.changelog}</div>
                <div className={`mt-3 space-y-3 text-[11px] leading-relaxed ${bodyText}`}>
                  <div>
                    <div className={`font-bold ${primaryText}`}>v{APP_VERSION}</div>
                    <ul className="mt-1 space-y-1 pl-4 list-disc">
                      <li>Added Settings with language, appearance, accent color, and notification controls.</li>
                      <li>Added Spanish and Mandarin language support across the supported interface.</li>
                      <li>Improved the light theme for clearer contrast and readability.</li>
                      <li>Added Help &amp; Feedback with bug reporting and support contact options.</li>
                      <li>Expanded calendar customization and management features.</li>
                      <li>Added profile/account controls, desktop keyboard shortcuts, and the global command/search menu.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen overflow-x-hidden text-slate-100 flex flex-col pb-24 lg:pb-6 font-sans ${
      appSettings.theme === "light" ? "wj-study-theme-light bg-slate-100" : "wj-study-theme-dark bg-slate-950"
    }`}
      style={{ ["--wj-accent" as string]: APP_ACCENT_VALUES[appSettings.accent] } as React.CSSProperties}
    >
      <style jsx global>{`
        [data-wj-theme="light"] body { background: #f8fafc !important; color: #0f172a !important; }
        [data-wj-theme="light"] [class~="bg-slate-950"] { background-color: #ffffff !important; }
        [data-wj-theme="light"] [class*="bg-slate-950/"] { background-color: rgba(248,250,252,.96) !important; }
        [data-wj-theme="light"] [class~="bg-slate-900"] { background-color: #ffffff !important; }
        [data-wj-theme="light"] [class*="bg-slate-900/"] { background-color: rgba(255,255,255,.97) !important; }
        [data-wj-theme="light"] [class~="bg-slate-800"] { background-color: #e2e8f0 !important; }
        [data-wj-theme="light"] [class*="bg-slate-800/"] { background-color: rgba(226,232,240,.75) !important; }
        [data-wj-theme="light"] [class~="border-slate-900"],
        [data-wj-theme="light"] [class~="border-slate-800"],
        [data-wj-theme="light"] [class~="border-slate-700"],
        [data-wj-theme="light"] [class~="border-slate-600"] { border-color: #dbe2ea !important; }
        [data-wj-theme="light"] [class~="text-white"] { color: #0f172a !important; }
        [data-wj-theme="light"] [class~="text-slate-100"] { color: #0f172a !important; }
        [data-wj-theme="light"] [class~="text-slate-200"] { color: #1e293b !important; }
        [data-wj-theme="light"] [class~="text-slate-300"] { color: #334155 !important; }
        [data-wj-theme="light"] [class~="text-slate-400"] { color: #64748b !important; }
        [data-wj-theme="light"] [class~="text-slate-500"] { color: #64748b !important; }
        [data-wj-theme="light"] input,
        [data-wj-theme="light"] select,
        [data-wj-theme="light"] textarea { color: #0f172a !important; background-color: #ffffff !important; border-color: #cbd5e1 !important; }
        [data-wj-theme="light"] [class*="from-slate-950"] { --tw-gradient-from: #ffffff !important; }
        [data-wj-theme="light"] [class*="via-slate-900"] { --tw-gradient-stops: var(--tw-gradient-from), rgba(248,250,252,.96), var(--tw-gradient-to) !important; }
        [data-wj-theme="light"] [class*="to-slate-950"] { --tw-gradient-to: #f8fafc !important; }
        [data-wj-theme="light"] .wj-accent-bg { background-color: var(--wj-accent) !important; }
        [data-wj-theme="light"] .wj-accent-text { color: var(--wj-accent) !important; }
        [data-wj-accent] [class~="bg-blue-600"] { background-color: var(--wj-accent) !important; }
        [data-wj-accent] [class~="hover:bg-blue-500"]:hover { background-color: var(--wj-accent) !important; filter: brightness(1.08); }
        [data-wj-accent] [class~="text-blue-400"] { color: var(--wj-accent) !important; }
        [data-wj-accent] [class~="border-blue-500"],
        [data-wj-accent] [class~="border-blue-500/30"],
        [data-wj-accent] [class~="border-blue-500/40"] { border-color: color-mix(in srgb, var(--wj-accent) 55%, transparent) !important; }
      `}</style>

      {commandPaletteOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={() => setCommandPaletteOpen(false)}>
          <div className="mx-auto mt-[10vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
              <Search size={18} className="text-slate-400" />
              <input ref={commandSearchInputRef} value={commandQuery} onChange={(e) => setCommandQuery(e.target.value)} placeholder={SETTINGS_TEXT[appSettings.language].commandSearch} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
              <kbd className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400">Esc</kbd>
            </div>
            {(() => {
              const q = commandQuery.trim().toLowerCase();
              const actions = [
                { id: "new-task", label: SETTINGS_TEXT[appSettings.language].shortcutNewTask, icon: Plus, onClick: openNewTaskFromCommand },
                { id: "new-event", label: SETTINGS_TEXT[appSettings.language].newCalendarEvent, icon: CalendarDays, onClick: openNewCalendarEventFromCommand },
                { id: "calendar", label: SETTINGS_TEXT[appSettings.language].shortcutCalendar, icon: Calendar, onClick: () => openSectionFromCommand("calendar") },
                { id: "tasks", label: SETTINGS_TEXT[appSettings.language].shortcutTasks, icon: List, onClick: () => openSectionFromCommand("tasks") },
                { id: "learning", label: SETTINGS_TEXT[appSettings.language].shortcutLearning, icon: BookOpen, onClick: () => openSectionFromCommand("learning") },
                { id: "focus", label: SETTINGS_TEXT[appSettings.language].startFocus, icon: Play, onClick: () => openSectionFromCommand("focus") },
                { id: "analytics", label: SETTINGS_TEXT[appSettings.language].shortcutAnalytics, icon: BarChart3, onClick: () => openSectionFromCommand("analytics") },
                { id: "settings", label: SETTINGS_TEXT[appSettings.language].openSettings, icon: Settings, onClick: () => openSectionFromCommand("settings") },
              ].filter((item) => !q || item.label.toLowerCase().includes(q));
              const searchResults = q ? [
                ...tasks.map((task) => ({ id: `task-${task.id}`, label: task.title, meta: SETTINGS_TEXT[appSettings.language].shortcutTasks, icon: List, onClick: () => { setCommandPaletteOpen(false); setMobileTab("tasks"); } })),
                ...classes.map((cls) => ({ id: `class-${cls.id}`, label: cls.name, meta: "Class", icon: BookOpen, onClick: () => { setCommandPaletteOpen(false); setActiveTab("standards"); setSelectedClassId(cls.id); setMobileTab("calendar"); } })),
                ...manualCalendarEvents.map((event) => ({ id: `manual-${event.id}`, label: event.name, meta: event.date, icon: CalendarDays, onClick: () => { setCommandPaletteOpen(false); setActiveTab("calendar"); setMobileTab("calendar"); setZoomedCalendarDate(event.date); } })),
                ...googleCalendarEvents.map((event) => ({ id: `google-${event.id}`, label: event.title, meta: event.startDate, icon: Calendar, onClick: () => { setCommandPaletteOpen(false); setActiveTab("calendar"); setMobileTab("calendar"); setZoomedCalendarDate(event.startDate); } })),
                ...learningMaterials.map((item) => ({ id: `learn-${item.id}`, label: item.title, meta: SETTINGS_TEXT[appSettings.language].shortcutLearning, icon: BookOpen, onClick: () => { setCommandPaletteOpen(false); setActiveTab("learning"); setMobileTab("learning"); } })),
              ].filter((item) => item.label.toLowerCase().includes(q)).slice(0, 8) : [];
              const items = q ? [...actions, ...searchResults].slice(0, 12) : actions;
              return items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">{SETTINGS_TEXT[appSettings.language].noSearchResults}</div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {items.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={item.onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-800"><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-800 text-blue-400"><Icon size={16} /></span><span className="min-w-0 flex-1 truncate">{item.label}</span>{"meta" in item && typeof item.meta === "string" && item.meta ? <span className="text-[10px] text-slate-500">{item.meta}</span> : null}</button>; })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="hidden lg:flex flex-col lg:flex-row lg:items-center justify-between px-3 py-3 sm:p-4 bg-slate-900/80 border-b border-slate-800 gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <span>🎓</span>{tx("WJ Study")}</h1>
          <p className="hidden sm:block text-xs text-slate-400">
            PowerSchool & SchoolsBuddy AI Photo Scan, School Break Calendar, SBG Evaluation, Habit Streaks, XP & Schedule
          </p>
        </div>

        {/* Header Widgets */}
        <div className="flex w-full lg:w-auto flex-nowrap items-center gap-2.5 overflow-x-auto pb-1 self-start lg:self-auto">
          {/* User Account & Logout */}
          <div className="shrink-0 flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg text-xs min-h-10">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-800 text-sm">{appSettings.profileAvatar || "🎓"}</span>
            <span className="text-slate-300 font-medium truncate max-w-[120px] sm:max-w-[200px]">
              {appSettings.profileName || session?.user?.email || "Student"}
            </span>
            <button
              type="button"
              onClick={handleLogOut}
              className="ml-1 p-1 bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition"
              title="Log Out"
            >
              <LogOut size={13} />
            </button>
          </div>

          {/* GPA Summary */}
          <div className="shrink-0 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg flex items-center gap-2">
            <GraduationCap size={18} className="text-emerald-400" />
            <div>
              <div className="text-[9px] text-slate-400 font-bold uppercase">{tx("Cum GPA / Grade")}</div>
              <div className="text-sm font-extrabold text-emerald-400 font-mono">
                {cumulativeGPA > 0
                  ? `${pointsToLetter(cumulativeGPA)} (${cumulativeGPA.toFixed(2)})`
                  : "N/A"}
              </div>
            </div>
          </div>

          {/* XP / LEVEL WIDGET */}
          <div className="shrink-0 min-w-[250px] rounded-xl border border-violet-500/20 bg-slate-950/90 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                  <Award size={14} className="text-violet-400" /> Level {gamification.level}
                </div>
                <div className="mt-0.5 text-sm font-extrabold text-white">
                  {gamification.totalXp.toLocaleString()} XP
                </div>
              </div>
              <div className="text-right text-[9px] text-slate-500">
                <div>{gamification.xpToNextLevel} XP to Lv. {gamification.level + 1}</div>
                <div>{gamification.completedTasks} tasks · {gamification.focusSessions} focus</div>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${gamification.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Pomodoro Timer Widget */}
          <div className="shrink-0 min-w-[220px] bg-slate-950/90 border border-slate-800 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                <Flame size={14} className="text-amber-500" /> Focus ({timerMode === "work" ? "Work" : "Break"})
              </div>
              <div className="mt-0.5 text-2xl sm:text-xl leading-none font-mono font-extrabold tracking-tight text-blue-400">
                {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={toggleTimer}
                className="grid h-10 w-10 place-items-center bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                title={isTimerRunning ? "Pause" : "Start"}
                aria-label={isTimerRunning ? "Pause focus timer" : "Start focus timer"}
              >
                {isTimerRunning ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button
                type="button"
                onClick={resetTimer}
                className="grid h-10 w-10 place-items-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                title="Reset"
                aria-label={tx("Reset focus timer")}
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* Focus Target Selector — kept beside the timer for quick access */}
          <div className="shrink-0 min-w-[275px] bg-slate-950/90 border border-slate-800 px-3.5 py-2.5 rounded-xl">
            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5 mb-1.5">
              <Clock size={14} className="text-blue-400" />{tx("Focus Target")}</div>
            <select
              value={selectedTimerTaskId}
              onChange={(e) => setSelectedTimerTaskId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 px-2.5 py-2 rounded-lg text-xs sm:text-[11px] font-semibold text-white focus:outline-none focus:border-blue-500"
              aria-label="Focus target task"
            >
              <option value="">{tx("-- Choose a task --")}</option>
              {tasks
                .filter((t) => !t.completed)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.type.toUpperCase()}] {t.title}
                  </option>
                ))}
            </select>
          </div>

          {/* Cloud Sync Status */}
          <div className="shrink-0 bg-slate-950/80 border border-slate-800 px-2.5 py-2 rounded-lg text-xs flex items-center gap-1.5 min-h-10">
            {syncStatus === "synced" && (
              <>
                <Cloud size={14} className="text-emerald-400" />
                <span className="text-[10px] text-emerald-400 hidden sm:inline">{tx("Synced")}</span>
              </>
            )}
            {syncStatus === "syncing" && (
              <>
                <Cloud size={14} className="text-amber-400 animate-pulse" />
                <span className="text-[10px] text-amber-400 hidden sm:inline">{tx("Syncing...")}</span>
              </>
            )}
            {syncStatus === "error" && (
              <>
                <CloudOff size={14} className="text-rose-400" />
                <span className="text-[10px] text-rose-400 hidden sm:inline">{tx("Error")}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE APP HEADER */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/20">
                <GraduationCap size={18} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold text-white">WJ Study</div>
                <div className="truncate text-[10px] text-slate-500">{appSettings.profileName || session?.user?.email || "Student"}</div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setCommandPaletteOpen(true); setCommandQuery(""); }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white"
            aria-label="Search WJ Study"
          >
            <Search size={18} />
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 p-3 sm:p-4 max-w-[1600px] mx-auto w-full flex-1 items-start">
        {/* MOBILE SECTION NAVIGATION */}
        <div className="lg:hidden col-span-full rounded-2xl border border-slate-800 bg-slate-900/80 p-2 shadow-sm">
          {mobileTab === "home" && (
            <div className="px-2 py-1.5">
              <div className="text-sm font-extrabold text-white">{tx("Home")}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">Your focus, classes, grades, and study target.</div>
            </div>
          )}
          {mobileTab === "more" && (
            <div className="px-2 py-1.5">
              <div className="text-sm font-extrabold text-white">{tx("More")}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">Account, settings, support, and app information.</div>
            </div>
          )}
          {mobileBottomGroup === "calendar" && (
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" onClick={() => { setMobileTab("calendar"); setActiveTab("calendar"); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "calendar" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><Calendar size={15} className="mx-auto mb-1" /><span>{tx("Calendar")}</span></button>
              <button type="button" onClick={() => { setMobileTab("timetable"); setActiveTab("timetable"); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "timetable" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><CalendarDays size={15} className="mx-auto mb-1" /><span>{tx("Timetable")}</span></button>
              <button type="button" onClick={() => { setMobileTab("clubs"); setActiveTab("calendar"); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "clubs" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><Users size={15} className="mx-auto mb-1" /><span>{tx("Clubs")}</span></button>
              <button type="button" onClick={() => { setMobileTab("tasks"); setActiveTab("calendar"); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "tasks" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><List size={15} className="mx-auto mb-1" /><span>{tx("Tasks")}</span></button>
            </div>
          )}
          {mobileBottomGroup === "clan" && (
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" onClick={() => { setMobileTab("clan"); setActiveTab("clan"); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "clan" ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><Trophy size={15} className="mx-auto mb-1" /><span>{tx("Clan")}</span></button>
              <button type="button" onClick={() => { setMobileTab("streaks"); setActiveTab("streaks"); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "streaks" ? "bg-orange-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><Flame size={15} className="mx-auto mb-1" /><span>{tx("Streaks")}</span></button>
              <button type="button" onClick={() => { setMobileTab("clan"); setActiveTab("clan"); }} className="rounded-xl px-1.5 py-2 text-[10px] font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition"><Award size={15} className="mx-auto mb-1" /><span>{tx("XP")}</span></button>
              <button type="button" onClick={() => { setMobileTab("clan"); setActiveTab("clan"); }} className="rounded-xl px-1.5 py-2 text-[10px] font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition"><TrendingUp size={15} className="mx-auto mb-1" /><span>{tx("Level")}</span></button>
            </div>
          )}
          {mobileBottomGroup === "learning" && (
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" onClick={() => { setMobileTab("planner"); setActiveTab("planner"); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "planner" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><Brain size={15} className="mx-auto mb-1" /><span>{tx("AI Planner")}</span></button>
              <button type="button" onClick={() => { setMobileTab("analytics"); setActiveTab("analytics"); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "analytics" ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><BarChart3 size={15} className="mx-auto mb-1" /><span>{tx("Analytics")}</span></button>
              <button type="button" onClick={() => { setMobileTab("learning"); setActiveTab("learning"); if (!learningClassId && classes[0]?.id) setLearningClassId(classes[0].id); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "learning" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><BookOpen size={15} className="mx-auto mb-1" /><span>{tx("Learning")}</span></button>
              <button type="button" onClick={() => { setMobileTab("simulator"); setActiveTab("simulator"); }} className={`rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${mobileTab === "simulator" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><Sliders size={15} className="mx-auto mb-1" /><span>{tx("Grade Simulator")}</span></button>
            </div>
          )}
        </div>
        {/* MOBILE HOME */}
        {mobileTab === "home" && (
          <div className="lg:hidden col-span-full space-y-4">
            <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 via-slate-900 to-slate-950 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-blue-300"><Flame size={15} /> {tx("Focus Timer")}</div>
                  <div className="mt-2 font-mono text-4xl font-black tracking-tight text-blue-400">{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{timerMode === "work" ? tx("Focus session") : tx("Break")}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={toggleTimer} className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white shadow-md" aria-label={isTimerRunning ? "Pause focus timer" : "Start focus timer"}>{isTimerRunning ? <Pause size={17} /> : <Play size={17} />}</button>
                  <button type="button" onClick={resetTimer} className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-300" aria-label={tx("Reset focus timer")}><RotateCcw size={17} /></button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-white"><Target size={17} className="text-blue-400" /> {tx("Focus Target")}</div>
              <p className="mt-1 text-[11px] text-slate-500">Choose what you are working on right now.</p>
              <select value={selectedTimerTaskId} onChange={(e) => setSelectedTimerTaskId(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-blue-500">
                <option value="">{tx("-- Choose a task --")}</option>
                {tasks.filter((task) => !task.completed).map((task) => <option key={task.id} value={task.id}>[{task.type.toUpperCase()}] {task.title}</option>)}
              </select>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><GraduationCap size={14} /> {tx("Cumulative GPA")}</div>
                <div className="mt-2 text-2xl font-black text-emerald-400">{cumulativeGPA > 0 ? cumulativeGPA.toFixed(2) : "N/A"}</div>
                <div className="mt-1 text-[11px] text-slate-500">{cumulativeGPA > 0 ? pointsToLetter(cumulativeGPA) : tx("No grades yet")}</div>
              </section>
              <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-violet-300"><Award size={14} /> {tx("Level")}</div>
                <div className="mt-2 text-2xl font-black text-violet-300">{gamification.level}</div>
                <div className="mt-1 text-[11px] text-slate-500">{gamification.totalXp.toLocaleString()} XP</div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white"><UserRound size={17} className="text-blue-400" /> {tx("Class Roster")}</div>
                  <div className="mt-1 text-[11px] text-slate-500">Your classes and current grades.</div>
                </div>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-400">{classes.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {classes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">{tx("No classes yet.")}</div>
                ) : classes.map((cls) => {
                  const sbgGrade = calculateOverallGrade(cls.standards);
                  const currentGrade = cls.manualGrade ?? sbgGrade.letter;
                  return (
                    <div key={cls.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cls.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{cls.name}</div>
                        <div className="mt-0.5 truncate text-[10px] text-slate-500">{cls.professorName || "No teacher listed"}{cls.roomNumber ? ` · Rm ${cls.roomNumber}` : ""}</div>
                      </div>
                      <select value={cls.manualGrade ?? ""} onChange={(e) => updateManualGrade(cls.id, e.target.value)} className="w-16 rounded-lg border border-slate-800 bg-slate-900 px-1.5 py-2 text-center text-xs font-black text-emerald-400 outline-none">
                        <option value="">{currentGrade}</option>
                        {Object.keys(LETTER_POINTS).map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* MOBILE MORE */}
        {mobileTab === "more" && (
          <div className="lg:hidden col-span-full space-y-3">
            <button type="button" onClick={() => setShowSettingsPage(true)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-slate-700">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-blue-400"><Settings size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">{SETTINGS_TEXT[appSettings.language].settings}</span><span className="mt-0.5 block text-[11px] text-slate-500">Profile, appearance, language, notifications, and account controls.</span></span>
              <ChevronRight size={18} className="text-slate-600" />
            </button>
            <button type="button" onClick={() => setShowSettingsPage(true)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-slate-700">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-500/10 text-sky-400"><LifeBuoy size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">{SETTINGS_TEXT[appSettings.language].helpFeedback}</span><span className="mt-0.5 block text-[11px] text-slate-500">{SETTINGS_TEXT[appSettings.language].helpFeedbackDescription}</span></span>
              <ChevronRight size={18} className="text-slate-600" />
            </button>
            <button type="button" onClick={() => setShowSettingsPage(true)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-slate-700">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-400"><Info size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">{SETTINGS_TEXT[appSettings.language].about}</span><span className="mt-0.5 block text-[11px] text-slate-500">v{APP_VERSION} · {SETTINGS_TEXT[appSettings.language].changelog}</span></span>
              <ChevronRight size={18} className="text-slate-600" />
            </button>
            <button type="button" onClick={() => { setCommandPaletteOpen(true); setCommandQuery(""); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-slate-700">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-300"><Search size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">{SETTINGS_TEXT[appSettings.language].commandSearch}</span><span className="mt-0.5 block text-[11px] text-slate-500">Search tasks, classes, events, clubs, and learning materials.</span></span>
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>
        )}

        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside className="hidden lg:flex lg:col-span-2 lg:col-start-1 lg:row-start-1 sticky top-4 self-start">
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 shadow-sm backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/20">
                  <GraduationCap size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-white truncate">WJ Study</div>
                  <div className="text-[10px] text-slate-500 truncate">Academic Workspace</div>
                </div>
              </div>
            </div>
            <nav className="p-2.5 space-y-1">
              <button type="button" onClick={() => { setActiveTab("calendar"); setMobileTab("calendar"); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${activeTab === "calendar" && mobileTab === "calendar" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Calendar size={16} /><span>{tx("Calendar")}</span></button>
              <button type="button" onClick={() => { setMobileTab("clubs"); setActiveTab("calendar"); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${mobileTab === "clubs" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Users size={16} /><span>{tx("Clubs")}</span></button>
              <button type="button" onClick={() => { setMobileTab("tasks"); setActiveTab("calendar"); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${mobileTab === "tasks" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><List size={16} /><span>{tx("Tasks")}</span></button>
              <button type="button" onClick={() => { setActiveTab("streaks"); setMobileTab("streaks"); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${activeTab === "streaks" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Flame size={16} /><span>{tx("Streaks")}</span></button>
              <button type="button" onClick={() => { setActiveTab("learning"); setMobileTab("learning"); if (!learningClassId && classes[0]?.id) setLearningClassId(classes[0].id); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${activeTab === "learning" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><BookOpen size={16} /><span>{tx("Learning")}</span></button>
              <button type="button" onClick={() => { setActiveTab("timetable"); setMobileTab("timetable"); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${activeTab === "timetable" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><CalendarDays size={16} /><span>{tx("Timetable")}</span></button>
              <button type="button" onClick={() => { setActiveTab("simulator"); setMobileTab("simulator"); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${activeTab === "simulator" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Sliders size={16} /><span>{tx("Grade Simulator")}</span></button>
              <button type="button" onClick={() => { setActiveTab("planner"); setMobileTab("planner"); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${activeTab === "planner" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Brain size={16} /><span>{tx("AI Planner")}</span></button>
              <button type="button" onClick={() => { setActiveTab("analytics"); setMobileTab("analytics"); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${activeTab === "analytics" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><BarChart3 size={16} /><span>{tx("Analytics")}</span></button>
              <button type="button" onClick={() => { setActiveTab("clan"); setMobileTab("clan"); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${activeTab === "clan" ? "bg-violet-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Trophy size={16} /><span>{tx("Clan")}</span></button>
            </nav>
            <div className="border-t border-slate-800 p-2.5">
              <button type="button" onClick={() => setShowSettingsPage(true)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"><Settings size={16} /><span>{SETTINGS_TEXT[appSettings.language].settings}</span></button>
              <button type="button" onClick={() => { setCommandPaletteOpen(true); setCommandQuery(""); }} className="mt-1 w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"><Search size={16} /><span className="flex-1">{SETTINGS_TEXT[appSettings.language].commandSearch}</span><kbd className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[8px] font-bold text-slate-500">⌘K</kbd></button>
            </div>
          </div>
        </aside>

        {/* RIGHT PANEL: CLASS ROSTER */}
        <aside
          className="hidden lg:block lg:col-span-3 lg:col-start-10 lg:row-start-1 space-y-4 sm:space-y-6"
        >
          {/* CLASS ROSTER WITH AI POWERSCHOOL PHOTO ANALYZER */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-4 shadow-sm">
            {/* Class Roster Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <BookOpen size={14} className="text-blue-400" />{tx("Class Roster")}</h2>

                {/* AI PHOTO SCAN BUTTON */}
                <button
                  type="button"
                  onClick={() => 
                     document.getElementById("powerschoolImport")?.click()
                  }
                  className="shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-2.5 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md transition min-h-9"
                  title="Scan PowerSchool Screenshot to add classes"
                >
                  <Sparkles size={13} className="animate-pulse" />
                  <span className="hidden sm:inline">{tx("AI PowerSchool Scan")}</span>
                </button>

                <input
                  type="file"
                  accept="application/json,.json"
                  id="powerschoolImport"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const text = await file.text();
                      const data = JSON.parse(text);

                      if (!Array.isArray(data)) {
                        throw new Error("PowerSchool import must be an array.");
                      }

                      const importedClasses: ClassItem[] = data
                        .filter((c: any) => c && c.name)
                        .map((c: any, index: number) => ({
                          id: crypto.randomUUID(),
                          name: String(c.name).trim(),
                          color: COLOR_PALETTE[index % COLOR_PALETTE.length],
                          targetGrade: "A",
                          manualGrade:
                            typeof c.grade === "string" &&
                            LETTER_POINTS[c.grade.trim().toUpperCase() as StandardLevel] !== undefined
                              ? (c.grade.trim().toUpperCase() as StandardLevel)
                              : undefined,
                          professorName: c.teacher
                            ? String(c.teacher).trim()
                            : undefined,
                          roomNumber: "",
                          officeHours: "",
                          meetingTimes: [],
                          standards: (() => {
                            if (!Array.isArray(c.standards)) return [];

                            const powerSchoolToLevel: Record<string, StandardLevel> = {
                              MWE: "A+",
                              MEET: "A-",
                              DEV: "C+",
                              BEG: "D",
                              NYE: "F",
                            };

                            const standardsByCode = new Map<
                              string,
                              {
                                id: string;
                                name: string;
                                levels: StandardLevel[];
                              }
                            >();

                            c.standards
                              .filter((s: any) => s && (s.code || s.description))
                              .forEach((s: any) => {
                                const code = s.code
                                  ? String(s.code).trim()
                                  : "";

                                const description = s.description
                                  ? String(s.description).trim()
                                  : "";

                                const name = [code, description]
                                  .filter(Boolean)
                                  .join(" - ");

                                const score = String(s.score || "")
                                  .trim()
                                  .toUpperCase();

                                const mappedLevel = powerSchoolToLevel[score];

                                if (!mappedLevel) return;

                                // Use the standard code to group all assessments
                                // belonging to the same PowerSchool standard.
                                const key = code || name;

                                const existing = standardsByCode.get(key);

                                if (existing) {
                                  // Add another assessment to the same standard.
                                  existing.levels.push(mappedLevel);
                                } else {
                                  // First assessment for this standard.
                                  standardsByCode.set(key, {
                                    id: `ps-${crypto.randomUUID()}`,
                                    name,
                                    levels: [mappedLevel],
                                  });
                                }
                              });

                            return Array.from(standardsByCode.values());
                          })(),
                        }));

                      if (importedClasses.length === 0) {
                        throw new Error("No classes were found in the PowerSchool file.");
                      }

                      setClasses(importedClasses);
                      setSelectedClassId(importedClasses[0].id);

                      // Save immediately so the import survives a refresh.
                      saveWorkspaceChangeImmediately({
                        classes: importedClasses,
                      });

                      e.target.value = "";

                      alert(
                        `PowerSchool import complete: ${importedClasses.length} class${
                          importedClasses.length === 1 ? "" : "es"
                        } imported.`
                      );
                    } catch (error) {
                      console.error("PowerSchool import failed:", error);

                      alert(
                        error instanceof Error
                          ? `PowerSchool import failed: ${error.message}`
                          : "PowerSchool import failed. Please check the JSON file."
                      );

                      e.target.value = "";
                    }
                  }}
                />
              </div>

              {/* MANUAL CLASS ADD FORM */}
              <form onSubmit={addClass} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Class name..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
                <input
                  type="color"
                  value={newClassColor}
                  onChange={(e) => setNewClassColor(e.target.value)}
                  className="h-8 w-8 bg-transparent cursor-pointer rounded border border-slate-800 shrink-0"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shrink-0 min-h-10"
                >
                  <Plus size={14} />{tx("Add")}</button>
              </form>

              {/* POWERSCHOOL PHOTO ANALYZER MODAL / BANNER */}
              {showPhotoModal && (
                <div className="p-4 bg-slate-950 border border-purple-500/40 rounded-xl space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => setShowPhotoModal(false)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>

                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-purple-400" />
                    <h3 className="text-xs font-bold text-white">{tx("AI PowerSchool Photo Analyzer")}</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Upload a screenshot of your PowerSchool "Attendance By Class" or Schedule table to auto-extract your classes, teachers, rooms, and grades.
                  </p>

                  <label className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-950/10 p-3 rounded-lg flex flex-col items-center justify-center cursor-pointer text-center transition space-y-1.5">
                    {isAnalyzingPhoto ? (
                      <div className="py-2 space-y-2 flex flex-col items-center">
                        <Loader2 size={24} className="animate-spin text-purple-400" />
                        <span className="text-[11px] font-semibold text-purple-300">
                          {photoAnalysisStatus}
                        </span>
                      </div>
                    ) : (
                      <>
                        <ImageIcon size={22} className="text-purple-400" />
                        <span className="text-xs font-semibold text-slate-200">{tx("Click to upload PowerSchool screenshot")}</span>
                        <span className="text-[9px] text-slate-500">{tx("Supports PNG, JPG, WEBP screenshots")}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) analyzePowerSchoolScreenshot(file);
                          }}
                        />
                      </>
                    )}
                  </label>
                </div>
              )}

              {/* CLASS LIST ITEMS */}
              <div className="space-y-2.5 pt-1">
                {classes.map((cls) => {
                  const sbgGrade = calculateOverallGrade(cls.standards);
                  const isEditing = editingClassId === cls.id;

                  if (isEditing && editClassDraft) {
                    return (
                      <form
                        key={cls.id}
                        onSubmit={saveEditClass}
                        className="p-3 rounded-xl border border-blue-500/50 bg-slate-800/80 space-y-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editClassDraft.color}
                            onChange={(e) =>
                              setEditClassDraft((prev) =>
                                prev ? { ...prev, color: e.target.value } : prev
                              )
                            }
                            className="h-8 w-8 bg-transparent cursor-pointer rounded border border-slate-700 shrink-0"
                          />
                          <input
                            type="text"
                            placeholder="Class name"
                            value={editClassDraft.name}
                            onChange={(e) =>
                              setEditClassDraft((prev) =>
                                prev ? { ...prev, name: e.target.value } : prev
                              )
                            }
                            className="flex-1 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Professor"
                            value={editClassDraft.professorName}
                            onChange={(e) =>
                              setEditClassDraft((prev) =>
                                prev ? { ...prev, professorName: e.target.value } : prev
                              )
                            }
                            className="bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Room #"
                            value={editClassDraft.roomNumber}
                            onChange={(e) =>
                              setEditClassDraft((prev) =>
                                prev ? { ...prev, roomNumber: e.target.value } : prev
                              )
                            }
                            className="bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Period code"
                            value={editClassDraft.periodCode}
                            onChange={(e) =>
                              setEditClassDraft((prev) =>
                                prev ? { ...prev, periodCode: e.target.value } : prev
                              )
                            }
                            className="bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Office hours"
                            value={editClassDraft.officeHours}
                            onChange={(e) =>
                              setEditClassDraft((prev) =>
                                prev ? { ...prev, officeHours: e.target.value } : prev
                              )
                            }
                            className="bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={cancelEditClass}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white transition"
                          >{tx("Cancel")}</button>
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition"
                          >{tx("Save")}</button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={cls.id}
                      className={`p-3 rounded-xl border transition space-y-2 ${
                        selectedClassId === cls.id
                          ? "bg-slate-800/80 border-blue-500/50"
                          : "bg-slate-950/40 border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cls.color }}
                          />
                          <span className="font-semibold text-sm truncate max-w-[170px]">
                            {cls.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => startEditClass(cls)}
                            className="text-slate-500 hover:text-blue-400"
                            title="Edit class"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteClass(cls.id)}
                            className="text-slate-500 hover:text-rose-400"
                            title="Delete class"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2">
                        {cls.periodCode && (
                          <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-300">
                            Exp: {cls.periodCode}
                          </span>
                        )}
                        {cls.roomNumber && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} /> Rm: {cls.roomNumber}
                          </span>
                        )}
                        {cls.professorName && (
                          <span className="truncate">
                            Prof: {cls.professorName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">{tx("Grade:")}</span>
                          <select
                            value={cls.manualGrade ?? ""}
                            onChange={(e) =>
                              updateManualGrade(cls.id, e.target.value)
                            }
                            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-center font-bold text-emerald-400 focus:outline-none"
                          >
                            <option value="">{tx("Auto")}</option>
                            {Object.keys(LETTER_POINTS).map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-emerald-400 text-xs font-mono">
                            {cls.manualGrade ?? sbgGrade.letter}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClassId(cls.id);
                              setActiveTab("standards");
                              setMobileTab("calendar");
                            }}
                            className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded flex items-center gap-1 text-[10px] font-bold hover:bg-blue-600/30 transition"
                          >{tx("Standards")}<ChevronRight size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </aside>

        {/* CENTER / MAIN PANEL */}
        <main className="lg:col-span-7 lg:col-start-3 lg:row-start-1 space-y-6">
          {/* CLUBS VIEW */}
          <div
            className={`${
              mobileTab === "clubs" ? "block" : "hidden"
            } space-y-6`}
          >
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/20">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold">{tx("Clubs")}</h2>
                  <p className="text-xs text-slate-500">Manage your clubs, activities, icons, colors, and meeting times.</p>
                </div>
              </div>

            {/* Clubs Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Users size={14} className="text-blue-400" />{tx("Clubs")}</h2>

                {/* AI SCHOOLSBUDDY PHOTO SCAN BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowClubPhotoModal(true)}
                  className="shrink-0 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white px-2.5 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md transition min-h-9"
                  title="Scan SchoolsBuddy Screenshot to add clubs"
                >
                  <Sparkles size={13} className="animate-pulse" />
                  <span className="hidden sm:inline">{tx("AI SchoolsBuddy Scan")}</span>
                </button>
              </div>

              {/* SCHOOLSBUDDY PHOTO ANALYZER MODAL / BANNER */}
              {showClubPhotoModal && (
                <div className="p-4 bg-slate-950 border border-pink-500/40 rounded-xl space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => setShowClubPhotoModal(false)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>

                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-pink-400" />
                    <h3 className="text-xs font-bold text-white">{tx("AI SchoolsBuddy Photo Analyzer")}</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Upload a screenshot of your SchoolsBuddy schedule/activities to automatically extract CCA clubs, sports practice times, and days.
                  </p>

                  <label className="border-2 border-dashed border-pink-500/30 hover:border-pink-500/60 bg-pink-950/10 p-3 rounded-lg flex flex-col items-center justify-center cursor-pointer text-center transition space-y-1.5">
                    {isAnalyzingClubPhoto ? (
                      <div className="py-2 space-y-2 flex flex-col items-center">
                        <Loader2 size={24} className="animate-spin text-pink-400" />
                        <span className="text-[11px] font-semibold text-pink-300">
                          {clubPhotoAnalysisStatus}
                        </span>
                      </div>
                    ) : (
                      <>
                        <ImageIcon size={22} className="text-pink-400" />
                        <span className="text-xs font-semibold text-slate-200">{tx("Click to upload SchoolsBuddy screenshot")}</span>
                        <span className="text-[9px] text-slate-500">{tx("Supports PNG, JPG, WEBP screenshots")}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) analyzeSchoolsBuddyScreenshot(file);
                          }}
                        />
                      </>
                    )}
                  </label>
                </div>
              )}

              <form onSubmit={addClub} className="space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={newClubIcon}
                    onChange={(e) => setNewClubIcon(e.target.value)}
                    className="bg-slate-950 border border-slate-800 p-1.5 rounded-lg text-sm focus:outline-none shrink-0"
                    title="Club Icon"
                  >
                    {CLUB_ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Club name..."
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Role"
                    value={newClubRole}
                    onChange={(e) => setNewClubRole(e.target.value)}
                    className="w-20 sm:w-16 bg-slate-950 border border-slate-800 px-2 py-2 rounded-lg text-xs focus:outline-none min-h-10"
                  />
                  <input
                    type="color"
                    value={newClubColor}
                    onChange={(e) => setNewClubColor(e.target.value)}
                    className="h-8 w-8 bg-transparent cursor-pointer rounded border border-slate-800 shrink-0"
                    title="Club color"
                  />
                </div>

                <div className="space-y-1.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold block">{tx("Add Timeslot:")}</span>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <select
                      value={newClubMeetingDay}
                      onChange={(e) => setNewClubMeetingDay(e.target.value as DayOfWeek)}
                      className="flex-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-xs focus:outline-none text-slate-200"
                    >
                      <option value="Monday">{txDay("Monday")}</option>
                      <option value="Tuesday">{txDay("Tuesday")}</option>
                      <option value="Wednesday">{txDay("Wednesday")}</option>
                      <option value="Thursday">{txDay("Thursday")}</option>
                      <option value="Friday">{txDay("Friday")}</option>
                      <option value="Saturday">{txDay("Saturday")}</option>
                      <option value="Sunday">{txDay("Sunday")}</option>
                    </select>
                    <input
                      type="time"
                      value={newClubStartTime}
                      onChange={(e) => setNewClubStartTime(e.target.value)}
                      className="w-20 bg-slate-950 border border-slate-800 px-1.5 py-2 rounded text-[11px] focus:outline-none text-slate-200 min-h-10"
                      title="Start Time"
                    />
                    <span className="text-slate-500 text-xs">-</span>
                    <input
                      type="time"
                      value={newClubEndTime}
                      onChange={(e) => setNewClubEndTime(e.target.value)}
                      className="w-20 bg-slate-950 border border-slate-800 px-1.5 py-2 rounded text-[11px] focus:outline-none text-slate-200 min-h-10"
                      title="End Time"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition mt-1 min-h-10"
                >
                  <Plus size={14} />{tx("Add Club")}</button>
              </form>

              {/* Club Cards List */}
              <div className="space-y-2.5">
                {clubs.map((club) => {
                  const isSelected = selectedClubId === club.id;
                  const clubColor = club.color || "#8B5CF6";
                  return (
                    <div
                      key={club.id}
                      onClick={() => setSelectedClubId(club.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer space-y-2 ${
                        isSelected
                          ? "bg-slate-800/80 border-blue-500/50"
                          : "bg-slate-950/40 border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <select
                            value={club.icon || "👥"}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateClubIcon(club.id, e.target.value);
                            }}
                            className="bg-transparent border-none text-base cursor-pointer focus:outline-none"
                            title="Change Icon"
                          >
                            {CLUB_ICON_OPTIONS.map((ico) => (
                              <option key={ico} value={ico} className="bg-slate-900 text-slate-200">
                                {ico}
                              </option>
                            ))}
                          </select>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: clubColor }}
                          />
                          <span className="font-semibold text-sm">
                            {club.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: `${clubColor}33`, color: clubColor }}
                          >
                            {club.role}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteClub(club.id);
                            }}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Display Timeslots */}
                      <div className="text-[11px] text-slate-400 space-y-1.5">
                        {club.meetingTimes && club.meetingTimes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {club.meetingTimes.map((mt, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-200 font-mono flex items-center gap-1"
                              >
                                {mt.day.slice(0, 3)} {mt.startTime}-{mt.endTime}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTimeslotFromClub(club.id, idx);
                                  }}
                                  className="text-slate-500 hover:text-rose-400"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic">{tx("No timeslots assigned")}</div>
                        )}

                        {isSelected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex gap-1 items-center bg-slate-900/90 p-1.5 rounded border border-slate-800 pt-1.5 mt-1"
                          >
                            <select
                              value={addClubSlotDay}
                              onChange={(e) => setAddClubSlotDay(e.target.value as DayOfWeek)}
                              className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[10px] text-slate-200 focus:outline-none"
                            >
                              <option value="Monday">Mon</option>
                              <option value="Tuesday">Tue</option>
                              <option value="Wednesday">Wed</option>
                              <option value="Thursday">Thu</option>
                              <option value="Friday">Fri</option>
                              <option value="Saturday">Sat</option>
                              <option value="Sunday">Sun</option>
                            </select>
                            <input
                              type="time"
                              value={addClubSlotStart}
                              onChange={(e) => setAddClubSlotStart(e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[10px] font-mono text-slate-200"
                            />
                            <span className="text-slate-500 text-[10px]">-</span>
                            <input
                              type="time"
                              value={addClubSlotEnd}
                              onChange={(e) => setAddClubSlotEnd(e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[10px] font-mono text-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => addTimeslotToClub(club.id)}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded ml-auto flex items-center gap-0.5"
                            >
                              <Plus size={10} />{tx("Slot")}</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            </div>
          </div>

          {/* TASKS VIEW */}
          <div
            className={`${
              mobileTab === "tasks" ? "block" : "hidden"
            } space-y-6`}
          >
            {/* MOBILE FOCUS TIMER */}
            <div className="lg:hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 via-slate-900 to-slate-950 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-300">
                    <Clock size={14} /> {timerMode === "work" ? tx("Focus") : tx("Break")}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-white">
                    {selectedTimerTaskId
                      ? tasks.find((task) => task.id === selectedTimerTaskId)?.title || tx("Focus session")
                      : tx("Choose a task to start focusing")}
                  </div>
                </div>
                <div className="shrink-0 font-mono text-2xl font-extrabold text-blue-400">
                  {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={toggleTimer}
                  disabled={!selectedTimerTaskId}
                  className="flex-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                  {isTimerRunning ? tx("Pause") : tx("Start focus")}
                </button>
                <button
                  type="button"
                  onClick={resetTimer}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-300 transition hover:bg-slate-800"
                  aria-label={tx("Reset focus timer")}
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Priority Banner */}
            {topPriorityTask && (
              <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-500/30 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase">{tx("Recommended Focus Target")}</span>
                    <h3 className="font-semibold text-sm text-white">
                      Focus on:{" "}
                      <span className="underline">{topPriorityTask.title}</span>
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startFocusForTask(topPriorityTask.id)}
                  className="w-full sm:w-auto px-3 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg text-white whitespace-nowrap transition min-h-10"
                >{tx("Start Focus")}</button>
              </div>
            )}

            {/* Add Task Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 space-y-4 shadow-sm">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Plus size={18} className="text-blue-400" /> Quick Add
                Assignment
              </h2>
              <form onSubmit={addTask} className="space-y-3">
                <input
                  type="text"
                  placeholder="Task title..."
                  ref={taskTitleInputRef}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select
                    value={taskClassId}
                    onChange={(e) => setTaskClassId(e.target.value)}
                    disabled={classes.length === 0}
                    className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                  >
                    {classes.length === 0 && (
                      <option value="">{tx("Add a class first")}</option>
                    )}
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={taskType}
                    onChange={(e) =>
                      setTaskType(e.target.value as TaskCategory)
                    }
                    className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                  >
                    <option value="homework">📝 Homework</option>
                    <option value="test">🧪 Test / Exam</option>
                  </select>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                  />
                  <div className="flex items-center bg-slate-950 border border-slate-800 px-2.5 rounded-lg focus-within:border-blue-500">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="1"
                      value={taskHours}
                      onChange={(e) => setTaskHours(e.target.value)}
                      className="w-full bg-transparent py-1.5 text-xs focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 pl-1">{tx("hrs")}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={classes.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-xs transition"
                >
                  <Plus size={16} className="inline mr-2" />{tx("Add Task")}</button>
              </form>
            </div>

            {/* Task List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <List size={18} className="text-blue-400" />{tx("Schedule & Tasks")}</h2>
                <div className="flex w-full sm:w-auto items-center gap-2 overflow-x-auto">
                  <div className="flex min-w-max items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-[11px]">
                    <Filter size={12} className="text-slate-400 ml-1" />
                    <button
                      type="button"
                      onClick={() => setTaskFilter("all")}
                      className={`px-2 py-0.5 rounded ${
                        taskFilter === "all"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-400"
                      }`}
                    >{tx("All")}</button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter("pending")}
                      className={`px-2 py-0.5 rounded ${
                        taskFilter === "pending"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-400"
                      }`}
                    >{tx("Active")}</button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter("completed")}
                      className={`px-2 py-0.5 rounded ${
                        taskFilter === "completed"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-400"
                      }`}
                    >{tx("Done")}</button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {filteredTasks.length === 0 && (
                  <p className="text-xs text-slate-500 py-6 text-center">{tx("No tasks match the filter.")}</p>
                )}
                {filteredTasks.map((task) => {
                  const taskClass = classes.find((c) => c.id === task.classId);
                  return (
                    <div
                      key={task.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border transition ${
                        task.completed
                          ? "bg-slate-950/40 border-slate-800/50 opacity-60 line-through"
                          : "bg-slate-950/80 border-slate-800"
                      }`}
                    >
                      <div className="flex min-w-0 w-full items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                            task.completed
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "border-slate-600 hover:border-blue-400"
                          }`}
                        >
                          {task.completed && <Check size={12} />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs">
                              {task.title}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                task.type === "test"
                                  ? "bg-rose-500/20 text-rose-400"
                                  : "bg-indigo-500/20 text-indigo-400"
                              }`}
                            >
                              {task.type === "homework" ? tx("Homework") : tx("Test / Exam")}
                            </span>
                            {taskClass && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-semibold"
                                style={{ backgroundColor: taskClass.color }}
                              >
                                {taskClass.name}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                            {task.dueDate && <span>Due: {task.dueDate}</span>}
                            <span>
                              {task.actualHours || 0}/{task.estimatedHours} hrs
                              logged
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full sm:w-auto flex items-center justify-end gap-2 pl-7 sm:pl-0">
                        <select
                          value={task.score ?? ""}
                          onChange={(e) =>
                            updateTaskScore(task.id, e.target.value)
                          }
                          className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-center font-bold text-emerald-400 focus:outline-none"
                        >
                          <option value="">Grade</option>
                          {Object.keys(LETTER_POINTS).map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ACADEMIC WORKSPACE VIEW */}
          <div
            className={`${
              mobileTab === "calendar" ||
              mobileTab === "timetable" ||
              mobileTab === "ai" ||
              mobileTab === "simulator" ||
              mobileTab === "streaks" ||
              mobileTab === "learning" ||
              mobileTab === "planner" ||
              mobileTab === "analytics" ||
              mobileTab === "clan"
                ? "block"
                : "hidden"
            } space-y-6`}
          >
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <LayoutDashboard size={18} className="text-blue-400" /> Academic
                  Workspace
                </h2>

              </div>

              {/* TAB: CLAN */}
              {activeTab === "clan" && (
                <div className="space-y-4 pt-1">
                  <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 via-slate-950 to-slate-950 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <Trophy size={18} className="text-violet-400" />{tx("Study Clan")}</div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{tx("Join a clan and compete on actual study time recorded by Focus sessions.")}</p>
                      </div>
                      <button
                        type="button"
                        onClick={resetClan}
                        disabled={clanLoading || !userId}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Reset clan connection"
                      >
                        <RotateCcw size={14} />{tx("Reset clan")}</button>
                      {clan && (
                        <div className="rounded-xl border border-violet-500/20 bg-slate-950/70 px-4 py-3 text-center">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">{tx("Your rank")}</div>
                          <div className="text-2xl font-extrabold text-violet-300">
                            #{Math.max(1, clanMembers.findIndex((member) => member.user_id === userId) + 1)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {clanMessage && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">{clanMessage}</div>
                  )}
                  {clanError && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-300">{clanError}</div>
                  )}

                  {!clan ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                        <div className="text-sm font-bold text-white">{tx("Create a clan")}</div>
                        <input
                          value={newClanName}
                          onChange={(e) => setNewClanName(e.target.value)}
                          placeholder="Clan name"
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                        />
                        <input
                          value={clanDisplayName}
                          onChange={(e) => setClanDisplayName(e.target.value)}
                          placeholder="Your display name"
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                        />
                        <button
                          type="button"
                          onClick={createClan}
                          disabled={clanLoading || !newClanName.trim() || !clanDisplayName.trim()}
                          className="w-full rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="inline-flex items-center justify-center gap-2"><Trophy size={15} />{tx("Create clan")}</span>
                        </button>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                        <div className="text-sm font-bold text-white">{tx("Join a clan")}</div>
                        <input
                          value={joinClanCode}
                          onChange={(e) => setJoinClanCode(e.target.value.toUpperCase())}
                          placeholder="6-character join code"
                          maxLength={6}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-mono uppercase text-white outline-none focus:border-violet-500"
                        />
                        <input
                          value={clanDisplayName}
                          onChange={(e) => setClanDisplayName(e.target.value)}
                          placeholder="Your display name"
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                        />
                        <button
                          type="button"
                          onClick={joinClan}
                          disabled={clanLoading || joinClanCode.trim().length < 6 || !clanDisplayName.trim()}
                          className="w-full rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="inline-flex items-center justify-center gap-2"><UserPlus size={15} />{tx("Join clan")}</span>
                        </button>
                      </div>

                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-white">{tx("Having trouble with an old clan?")}</div>
                            <p className="mt-1 text-xs text-slate-400">
                              Reset the saved clan connection on your account and this device, then start fresh.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={resetClan}
                            disabled={clanLoading}
                            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCcw size={14} />{tx("Reset clan")}</button>
                        </div>
                      </div>
                    </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="text-lg font-extrabold text-white truncate">{clan.name}</div>
                            <div className="mt-1 text-xs text-slate-500">Share this code with classmates to join. {clanStorageMode === "local" ? "Live clan mode is active." : ""}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 font-mono text-sm font-bold tracking-widest text-violet-300">{clan.join_code}</div>
                            <button type="button" onClick={copyClanCode} className="rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-300 hover:text-white" title="Copy join code"><Copy size={15} /></button>
                            <button type="button" onClick={() => userId && loadClan(userId)} className="rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-300 hover:text-white" title="Refresh leaderboard"><RefreshCw size={15} /></button>
                            <button type="button" onClick={leaveClan} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-rose-300 hover:bg-rose-500/10" title="Leave clan"><LogOut size={15} /></button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-white"><Trophy size={16} className="text-amber-400" />{tx("Study leaderboard")}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">{clanStorageMode === "local" ? "Live" : "All-time"}</div>
                        </div>
                        <div className="divide-y divide-slate-800/70">
                          {clanMembers.map((member, index) => (
                            <div key={member.user_id} className={`flex items-center gap-3 px-4 py-3 ${member.user_id === userId ? "bg-violet-500/5" : ""}`}>
                              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${index === 0 ? "bg-amber-500/15 text-amber-300" : index === 1 ? "bg-slate-700/40 text-slate-200" : index === 2 ? "bg-orange-500/10 text-orange-300" : "bg-slate-900 text-slate-500"}`}>{index + 1}</div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-100">{member.display_name}{member.user_id === userId ? " (You)" : ""}</div>
                                <div className="mt-0.5 text-[10px] text-slate-500">{tx("Focus time")}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-extrabold text-violet-300">{(member.study_minutes / 60).toFixed(1)}h</div>
                                <div className="text-[10px] text-slate-500">{member.study_minutes} min</div>
                              </div>
                            </div>
                          ))}
                          {clanMembers.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-500">{tx("No members yet.")}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: AI STUDY PLANNER */}
              {activeTab === "planner" && (
                <div className="space-y-4 pt-1">
                  <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 via-slate-950 to-slate-950 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <Brain size={18} className="text-blue-400" />{tx("AI Study Planner")}</div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          Builds a 7-day plan from work that still has time remaining, deadlines, tests, and time already logged. Planned time is not counted as completed study time.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center sm:min-w-44">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                          <div className="text-lg font-extrabold text-white">{aiStudyPlan.pendingCount}</div>
                          <div className="text-[10px] text-slate-500 uppercase">{tx("Tasks")}</div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                          <div className="text-lg font-extrabold text-blue-400">{(aiStudyPlan.totalScheduledMinutes / 60).toFixed(1)}h</div>
                          <div className="text-[10px] text-slate-500 uppercase">{tx("Planned time")}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {aiStudyPlan.days.map((day, index) => {
                      const plannedMinutes = day.items.reduce((sum, item) => sum + item.minutes, 0);
                      const percent = day.capacity ? Math.min(100, plannedMinutes / (day.capacity * 60) * 100) : 0;
                      return (
                        <div key={day.key} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-white">{index === 0 ? "Today" : day.label}</div>
                              <div className="mt-0.5 text-[11px] text-slate-500">{plannedMinutes ? `${(plannedMinutes / 60).toFixed(1)}h planned` : "Open study time"}</div>
                            </div>
                            <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-400">{day.items.length} block{day.items.length === 1 ? "" : "s"}</span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${percent}%` }} />
                          </div>
                          <div className="mt-3 space-y-2">
                            {day.items.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-slate-800 p-3 text-xs text-slate-500">{tx("Use this as catch-up, review, or rest time.")}</div>
                            ) : day.items.map((item) => (
                              <div key={`${day.key}-${item.taskId}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-xs font-semibold text-white">{item.title}</div>
                                    <div className="mt-0.5 truncate text-[10px] text-slate-500">{item.className} · {item.reason}</div>
                                  </div>
                                  <span className="shrink-0 text-xs font-bold text-blue-400">{item.minutes}m</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startFocusForTask(item.taskId)}
                                  className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 transition hover:bg-blue-500/20"
                                >
                                  <Play size={12} />{tx("Start focus on this task")}</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {aiStudyPlan.unscheduledTasks.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300"><AlertTriangle size={14} />{tx("Some work does not fit in the next 7 days")}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {aiStudyPlan.unscheduledTasks.map((item) => (
                          <span key={item.task.id} className="rounded-full border border-amber-500/20 bg-slate-950 px-2.5 py-1 text-[10px] text-slate-300">{item.task.title}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: STUDY ANALYTICS */}
              {activeTab === "analytics" && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tx("Study time")}</div>
                      <div className="mt-1 text-2xl font-extrabold text-blue-400">{analytics.totalStudyHours.toFixed(1)}h</div>
                      <div className="mt-1 text-[10px] text-slate-500">{tx("actual logged study time")}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tx("Task completion")}</div>
                      <div className="mt-1 text-2xl font-extrabold text-emerald-400">{Math.round(analytics.completionRate * 100)}%</div>
                      <div className="mt-1 text-[10px] text-slate-500">{analytics.completedTaskCount} of {tasks.length}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tx("This week")}</div>
                      <div className="mt-1 text-2xl font-extrabold text-violet-400">{analytics.weekHours.toFixed(1)}h</div>
                      <div className="mt-1 text-[10px] text-slate-500">Mon–Sun · {analytics.weekLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tx("Missed deadlines")}</div>
                      <div className="mt-1 text-2xl font-extrabold text-rose-400">{analytics.missedDeadlineTasks.length}</div>
                      <div className="mt-1 text-[10px] text-slate-500">{tx("unfinished past due")}</div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><TrendingUp size={16} className="text-blue-400" />{tx("Weekly study time")}</h3>
                          <p className="mt-0.5 text-[10px] text-slate-500">{tx("Focus minutes recorded during the current Monday–Sunday week")}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">Goal {analytics.weeklyGoalHours}h</span>
                      </div>
                      <div className="mt-5 grid grid-cols-[34px_1fr] gap-3">
                        <div className="flex h-44 flex-col justify-between text-right text-[9px] text-slate-600">
                          <span>{(analytics.weeklyMaxMinutes / 60).toFixed(1)}h</span>
                          <span>{(analytics.weeklyMaxMinutes / 120).toFixed(1)}h</span>
                          <span>0h</span>
                        </div>
                        <div className="min-w-0">
                          <div className="relative h-44 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-3">
                              <div className="border-t border-slate-800/90" />
                              <div className="border-t border-slate-800/70" />
                              <div className="border-t border-slate-800/90" />
                            </div>
                            <div className="relative flex h-full items-end gap-2 px-3 pb-2 pt-3">
                              {analytics.last7Days.map((day) => {
                                const percent = day.minutes > 0
                                  ? Math.max(5, Math.min(100, (day.minutes / analytics.weeklyMaxMinutes) * 100))
                                  : 3;
                                return (
                                  <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                                    <span className="text-[9px] font-semibold text-slate-400">{day.minutes ? `${day.hours.toFixed(1)}h` : "0h"}</span>
                                    <div
                                      className={`w-full max-w-10 rounded-t-lg border border-blue-400/20 ${day.minutes ? "bg-blue-500/70" : "bg-slate-800/80"}`}
                                      style={{ height: `${percent}%` }}
                                      title={`${day.label}: ${day.hours.toFixed(2)}h of focus time`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="mt-1 flex gap-2 px-3">
                            {analytics.last7Days.map((day) => (
                              <span key={day.key} className="min-w-0 flex-1 text-center text-[9px] text-slate-500">{day.label}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><BarChart3 size={16} className="text-emerald-400" />{tx("Study time vs. grades")}</h3>
                          <p className="mt-0.5 text-[10px] text-slate-500">{tx("Up to 8 of your classes, ranked by logged study time")}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-500">{Math.min(8, analytics.classStudy.length)} shown</span>
                      </div>
                      <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                        {analytics.classStudy.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">{tx("Add a class to see its grade and study-time comparison.")}</div>
                        ) : analytics.classStudy.slice(0, 8).map((item) => {
                          const maxHours = Math.max(1, ...analytics.classStudy.map((entry) => entry.hours));
                          const width = item.hours > 0 ? Math.max(6, (item.hours / maxHours) * 100) : 3;
                          return (
                            <div key={item.id}>
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="min-w-0 truncate font-semibold text-slate-300">{item.name}</span>
                                <span className="shrink-0 font-mono text-slate-400">{item.letter} · {item.hours.toFixed(1)}h</span>
                              </div>
                              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-900">
                                <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: item.color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Flame size={16} className="text-amber-400" />{tx("Streaks")}</h3>
                      <div className="mt-3 space-y-2">
                        {analytics.streakAnalytics.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-xs text-slate-500">{tx("Create a habit to start tracking streaks.")}</div>
                        ) : analytics.streakAnalytics.map((habit) => (
                          <div key={habit.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: habit.color }} />
                              <span className="truncate text-xs font-semibold text-slate-300">{habit.name}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3 text-[10px]">
                              <span className="font-bold text-amber-400">🔥 {habit.current}</span>
                              <span className="text-slate-500">Best {habit.best}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-white"><AlertTriangle size={16} className="text-rose-400" />{tx("Missed deadlines")}</h3>
                      <div className="mt-3 space-y-2">
                        {analytics.missedDeadlineTasks.length === 0 ? (
                          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-300"><CheckCircle2 size={15} />{tx("No unfinished tasks are past due.")}</div>
                        ) : analytics.missedDeadlineTasks.slice(0, 5).map((task) => {
                          const cls = classes.find((c) => c.id === task.classId);
                          return (
                            <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-slate-200">{task.title}</div>
                                <div className="mt-0.5 text-[10px] text-slate-500">{cls?.name || "General"} · due {task.dueDate}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMobileTab("tasks")}
                                className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300"
                              >{tx("Open")}</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CALENDAR WITH SCHOOL DAYS VS. BREAK DAYS */}
              {activeTab === "calendar" && (
                <div className="space-y-4 pt-1 overflow-x-auto pb-1">
                  {/* Calendar Month Header & Navigation */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Calendar size={18} className="text-blue-400" /> {currentMonth}
                      </h3>
                      <p className="text-[11px] text-slate-400">{tx("Academic Calendar showing school days, official breaks, and holidays.")}</p>
                    </div>

                    <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => openManualEventModal()}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition"
                        title="Add a calendar event manually"
                      >
                        <Plus size={14} />{tx("Add Event")}</button>
                      <button
                        type="button"
                        onClick={handleGoogleCalendarSync}
                        disabled={calendarSyncState === "syncing"}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                        title="Import events from your primary Google Calendar"
                      >
                        {calendarSyncState === "syncing" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CalendarDays size={14} />
                        )}
                        Sync from Google
                      </button>
                      <button
                        type="button"
                        onClick={beautifyCalendar}
                        disabled={googleCalendarEvents.length + manualCalendarEvents.length === 0}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 hover:from-pink-400 hover:via-purple-500 hover:to-blue-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                        title="Automatically color-code calendar events and add matching icons"
                      >
                        <Palette size={14} />Beautify</button>
                      <button
                        type="button"
                        onClick={organizeCalendarWithAI}
                        disabled={googleCalendarEvents.length === 0}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                        title="Review similar Google events before merging them"
                      >
                        <Sparkles size={14} />{tx("Review & Organize")}</button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={prevMonth}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
                          title="Previous Month"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={resetToToday}
                          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition min-h-10"
                        >{tx("Today")}</button>
                        <button
                          type="button"
                          onClick={nextMonth}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
                          title="Next Month"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {calendarSyncMessage && (
                    <div
                      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                        calendarSyncState === "error"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          : calendarSyncState === "success"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-blue-500/30 bg-blue-500/10 text-blue-200"
                      }`}
                    >
                      {calendarSyncState === "syncing" ? (
                        <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin" />
                      ) : calendarSyncState === "success" ? (
                        <Check size={14} className="mt-0.5 shrink-0" />
                      ) : (
                        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                      )}
                      <span>{calendarSyncMessage}</span>
                    </div>
                  )}

                  {/* CALENDAR LEGEND & COLORED KEYS */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px]">
                    <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mr-1">{tx("Legend:")}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-emerald-500/40 bg-slate-900" />
                      <span className="text-slate-300">{tx("School Day")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-amber-800/50 bg-amber-950/40" />
                      <span className="text-amber-200/90 font-medium">{tx("School Break / Holiday")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-indigo-800/50 bg-indigo-950/40" />
                      <span className="text-indigo-200/90 font-medium">{tx("Staff PD (No Students)")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-cyan-800/50 bg-cyan-950/40" />
                      <span className="text-cyan-200/90 font-medium">{tx("Early Dismissal")}</span>
                    </div>
                  </div>

                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <div
                        key={d}
                        className="text-[11px] font-bold text-slate-400 py-1 uppercase tracking-wider"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid min-w-[620px] lg:min-w-0 grid-cols-7 gap-1.5">
                    {Array.from({ length: firstDayOffset }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="min-h-[76px] p-1.5 rounded-xl bg-slate-950/20 border border-slate-900/40"
                      />
                    ))}

                    {daysArray.map((day) => {
                      const todayDate = new Date();
                      const isToday =
                        day === todayDate.getDate() &&
                        currentCalendarDate.getMonth() === todayDate.getMonth() &&
                        currentCalendarDate.getFullYear() === todayDate.getFullYear();

                      const dateStr = `${currentCalendarDate.getFullYear()}-${String(
                        currentCalendarDate.getMonth() + 1
                      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                      const currentDayDate = new Date(
                        currentCalendarDate.getFullYear(),
                        currentCalendarDate.getMonth(),
                        day
                      );

                      const dayOfWeekNum = currentDayDate.getDay();
                      const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;

                      const dayOfWeekName = [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ][dayOfWeekNum] as DayOfWeek;

                      // Academic status lookup
                      const academicStatus = getCalendarDayStatus(dateStr, isWeekend);

                      // Calendar events only. Task management lives in the Tasks section.
                      const dayGoogleEvents = googleCalendarEvents.filter((event) => {
                        const key = `g-${event.id}`;
                        const movedDate = calendarEventOverrides[key]?.date;
                        return movedDate
                          ? movedDate === dateStr
                          : googleEventOccursOnDate(event, dateStr);
                      });
                      const dayManualEvents = manualCalendarEvents.filter((event) => {
                        const key = `m-${event.id}`;
                        return (calendarEventOverrides[key]?.date ?? event.date) === dateStr;
                      });

                      const dayClubMeetings =
                        academicStatus.type === "break" || academicStatus.type === "staff_only"
                          ? []
                          : clubs.flatMap((club) => {
                              const matchingSlots = (club.meetingTimes || []).filter(
                                (mt) => mt.day === dayOfWeekName
                              );
                              if (matchingSlots.length > 0) {
                                return matchingSlots.map((slot) => ({ club, slot }));
                              }
                              if (club.attendance?.[dateStr]) {
                                return [{ club, slot: { day: dayOfWeekName, startTime: "", endTime: "" } }];
                              }
                              return [];
                            });

                      // Weekly class sessions from the Timetable tab
                      const dayClassMeetings =
                        academicStatus.type === "break" || academicStatus.type === "staff_only"
                          ? []
                          : classes.flatMap((cls) =>
                              (cls.meetingTimes || [])
                                .filter((mt) => mt.day === dayOfWeekName)
                                .map((slot) => ({ cls, slot }))
                            );

                      let dayBoxStyle = "bg-slate-950/80 border-slate-800/80";
                      let dayHeaderStyle = "text-slate-400";

                      if (isToday) {
                        dayBoxStyle = "bg-blue-950/35 border-blue-500/60 ring-1 ring-blue-500/30";
                        dayHeaderStyle = "text-blue-400 font-black";
                      } else if (academicStatus.type === "break") {
                        dayBoxStyle = "bg-amber-950/25 border-amber-800/40 hover:border-amber-700/60";
                        dayHeaderStyle = "text-amber-300 font-semibold";
                      } else if (academicStatus.type === "staff_only") {
                        dayBoxStyle = "bg-indigo-950/25 border-indigo-800/40 hover:border-indigo-700/60";
                        dayHeaderStyle = "text-indigo-300 font-semibold";
                      } else if (academicStatus.type === "early_dismissal") {
                        dayBoxStyle = "bg-cyan-950/20 border-cyan-800/40 hover:border-cyan-700/60";
                        dayHeaderStyle = "text-cyan-300 font-semibold";
                      } else if (isWeekend) {
                        dayBoxStyle = "bg-slate-950/40 border-slate-800/40";
                        dayHeaderStyle = "text-slate-500";
                      } else {
                        dayBoxStyle = "bg-slate-900/40 border-slate-800/80 border-t-2 border-t-emerald-500/40";
                        dayHeaderStyle = "text-slate-200 font-medium";
                      }

                      return (
                        <div
                          key={day}
                          onClick={() => openCalendarDay(dateStr)}
                          className={`min-h-[76px] p-1.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition ${dayBoxStyle}`}
                          title="Open day view"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] ${dayHeaderStyle}`}>
                              {day}
                            </span>
                            {isToday && (
                              <span className="text-[8px] bg-blue-500/20 text-blue-300 font-bold px-1 rounded border border-blue-500/30">{tx("Today")}</span>
                            )}
                          </div>

                          {/* Academic Break / Event Badge */}
                          {academicStatus.type !== "school" && academicStatus.type !== "weekend" && (
                            <div
                              className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold flex items-center gap-1 truncate ${
                                academicStatus.type === "break"
                                  ? "bg-amber-500/15 border-amber-500/30 text-amber-200"
                                  : academicStatus.type === "staff_only"
                                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-200"
                                  : "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                              }`}
                              title={academicStatus.label}
                            >
                              {academicStatus.type === "break" && <Coffee size={10} className="shrink-0 text-amber-400" />}
                              {academicStatus.type === "staff_only" && <Sun size={10} className="shrink-0 text-indigo-400" />}
                              <span className="truncate">{academicStatus.label}</span>
                            </div>
                          )}

                          {/* Assignments & Clubs Only */}
                          <div className="space-y-1 mt-0.5">
                            {dayGoogleEvents.map((event) => {
                              const key = `g-${event.id}`;
                              const override = calendarEventOverrides[key] || {};
                              const title = override.title ?? event.title;
                              const icon = override.icon ?? event.icon;
                              const color = override.color ?? event.color;
                              const startTime = override.startTime ?? event.startTime;
                              const endTime = override.endTime ?? event.endTime;
                              return (
                                <button
                                  type="button"
                                  key={event.id}
                                  onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    openCalendarDay(dateStr, key);
                                  }}
                                  className="w-full text-left text-[9px] truncate px-1.5 py-0.5 rounded text-white font-medium transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/70"
                                  style={{ backgroundColor: color }}
                                  title={`${title}${startTime ? ` (${startTime}${endTime ? `–${endTime}` : ""})` : ""}${event.description ? `\n${event.description}` : ""}`}
                                >
                                  <span className="mr-1 opacity-80">{icon}</span>{title}
                                  {startTime && <span className="ml-1 font-mono opacity-80">{startTime}</span>}
                                </button>
                              );
                            })}
                            {dayManualEvents.map((event) => {
                              const key = `m-${event.id}`;
                              const override = calendarEventOverrides[key] || {};
                              const title = override.title ?? event.name;
                              const icon = override.icon ?? "✦";
                              const color = override.color ?? getManualEventColor(event.type);
                              const startTime = override.startTime ?? event.startTime;
                              const endTime = override.endTime ?? event.endTime;
                              return (
                                <button
                                  key={`manual-${event.id}`}
                                  type="button"
                                  onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    openCalendarDay(dateStr, key);
                                  }}
                                  className="w-full text-left text-[9px] px-1.5 py-1 rounded-lg border border-emerald-500/20 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/70"
                                  style={{ backgroundColor: `${color}33` }}
                                  title={`${title} · ${startTime} – ${endTime}`}
                                >
                                  <span className="font-semibold text-slate-200 truncate block"><span className="mr-1">{icon}</span>{title}</span>
                                  <span className="text-slate-400 font-mono">{startTime}</span>
                                </button>
                              );
                            })}
                            {dayClassMeetings.map(({ cls, slot }) => {
                              const key = `c-${cls.id}-${dateStr}-${slot.startTime || "all-day"}-${slot.endTime || ""}`;
                              const override = calendarEventOverrides[key] || {};
                              const title = override.title ?? cls.name;
                              const icon = override.icon ?? "📘";
                              const color = override.color ?? cls.color;
                              const startTime = override.startTime ?? slot.startTime;
                              const endTime = override.endTime ?? slot.endTime;
                              return (
                                <button
                                  type="button"
                                  key={key}
                                  onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    openCalendarDay(dateStr, key);
                                  }}
                                  className="w-full text-left text-[9px] truncate px-1.5 py-0.5 rounded text-white font-semibold flex justify-between items-center transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/70"
                                  style={{ backgroundColor: `${color}CC` }}
                                  title={`${title} ${startTime ? `(${startTime}-${endTime})` : ""}`}
                                >
                                  <span className="truncate"><span className="mr-1">{icon}</span>{title}</span>
                                  {startTime && <span className="text-[8px] font-mono opacity-80 shrink-0 ml-1">{startTime}</span>}
                                </button>
                              );
                            })}

                            {dayClubMeetings.map(({ club, slot }) => {
                              const key = `cl-${club.id}-${dateStr}-${slot.startTime || "all-day"}-${slot.endTime || ""}`;
                              const override = calendarEventOverrides[key] || {};
                              const title = override.title ?? club.name;
                              const icon = override.icon ?? club.icon ?? "👥";
                              const color = override.color ?? club.color ?? "#8B5CF6";
                              const startTime = override.startTime ?? slot.startTime;
                              const endTime = override.endTime ?? slot.endTime;
                              return (
                                <button
                                  type="button"
                                  key={key}
                                  onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    openCalendarDay(dateStr, key);
                                  }}
                                  className="w-full text-left text-[9px] truncate px-1.5 py-0.5 rounded text-white font-semibold flex justify-between items-center transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/70"
                                  style={{ backgroundColor: `${color}CC` }}
                                  title={`${title} ${startTime ? `(${startTime}-${endTime})` : ""}`}
                                >
                                  <span className="truncate"><span className="mr-1">{icon}</span>{title}</span>
                                  {startTime && <span className="text-[8px] font-mono opacity-80 shrink-0 ml-1">{startTime}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: STANDARDS */}
              {activeTab === "standards" &&
                (activeClass ? (
                  <div className="space-y-4 pt-1">
                    <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: activeClass.color }}
                        />
                        <div>
                          <h3 className="text-sm font-bold">
                            {activeClass.name}
                          </h3>
                          <p className="text-[10px] text-slate-400">{tx("Standards-Based Grade Evaluation")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const g = calculateOverallGrade(activeClass.standards);
                          return (
                            <>
                              <div className="text-lg font-black text-emerald-400 font-mono">
                                {g.letter} {g.gpa > 0 && `(${g.gpa.toFixed(2)})`}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {g.label}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add standard/test (e.g., S1: Linear Modeling)..."
                        value={newStandardName}
                        onChange={(e) => setNewStandardName(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addStandardToClass(activeClass.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500"
                      >{tx("Add")}</button>
                    </div>

                    <div className="space-y-2.5">
                      {!activeClass.standards ||
                      activeClass.standards.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">{tx("No standards added yet.")}</p>
                      ) : (
                        activeClass.standards.map((st) => (
                          <div
                            key={st.id}
                            className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-2"
                          >
                            <div className="flex justify-between items-center gap-2">
                              <h4 className="font-medium text-xs flex-1">{st.name}</h4>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteStandard(activeClass.id, st.id)
                                }
                                className="text-slate-500 hover:text-rose-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(st.levels || []).map((lvl, idx) => (
                                <span
                                  key={`${lvl}-${idx}`}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${STANDARD_SCALE[lvl]?.color}`}
                                >
                                  {lvl}{" "}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeGradeFromStandard(
                                        activeClass.id,
                                        st.id,
                                        idx
                                      )
                                    }
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {(
                                Object.keys(STANDARD_SCALE) as StandardLevel[]
                              ).map((lvl) => (
                                <button
                                  type="button"
                                  key={lvl}
                                  onClick={() =>
                                    addGradeToStandard(
                                      activeClass.id,
                                      st.id,
                                      lvl
                                    )
                                  }
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-medium hover:border-slate-600 transition"
                                >
                                  + {lvl}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">{tx("No class selected.")}</p>
                ))}

              {/* TAB: STREAKS */}
              {activeTab === "streaks" && (
                <div className="space-y-5 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 gap-3">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                        <Flame size={18} className="text-amber-500 fill-amber-500" />{tx("Habit Streaks")}</h3>
                      <p className="text-[10px] text-slate-400">
                        Build consistency by keeping weekly habit streaks active. Click checkmarks to complete!
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={prevStreakWeek}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
                        title="Previous Week"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={resetStreakWeekToToday}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition min-h-10"
                      >{tx("This Week")}</button>
                      <button
                        type="button"
                        onClick={nextStreakWeek}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
                        title="Next Week"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={addStreak} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1.5">
                      <Plus size={14} />{tx("Add New Habit Streak")}</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Habit name (e.g., Daily Study 2hrs, Review Flashcards)..."
                        value={newStreakName}
                        onChange={(e) => setNewStreakName(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-white"
                      />
                      <input
                        type="color"
                        value={newStreakColor}
                        onChange={(e) => setNewStreakColor(e.target.value)}
                        className="h-9 w-12 bg-transparent cursor-pointer rounded border border-slate-800 shrink-0"
                        title="Theme Color"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
                      >
                        <Plus size={14} />{tx("Create Streak")}</button>
                    </div>
                  </form>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    {(() => {
                      const weekDates = getWeekDates(streakWeekBaseDate);
                      const todayKey = formatDateKey(new Date());

                      return (
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 text-xs text-slate-400 font-semibold">
                            <span>
                              Week of {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-[10px] text-slate-500">{tx("Click checkmark to toggle")}</span>
                          </div>

                          {streaks.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-xs">{tx("No habit streaks created yet. Create one above to begin!")}</div>
                          ) : (
                            <div className="space-y-3">
                              {streaks.map((habit) => {
                                const currentStreak = calculateCurrentStreak(habit.completedDates);
                                const bestStreak = calculateBestStreak(habit.completedDates);

                                return (
                                  <div
                                    key={habit.id}
                                    className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-3"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                                      <div className="flex items-center gap-2.5">
                                        <span
                                          className="w-3 h-3 rounded-full shrink-0"
                                          style={{ backgroundColor: habit.color || "#3B82F6" }}
                                        />
                                        <span className="font-bold text-sm text-white">
                                          {habit.name}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2.5">
                                        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-400 font-bold text-xs">
                                          <Flame size={14} className="fill-amber-500" />
                                          <span>{currentStreak} day streak</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">{tx("Best:")}<strong className="text-slate-200">{bestStreak}d</strong>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => deleteStreak(habit.id)}
                                          className="text-slate-500 hover:text-rose-400 p-1 transition"
                                          title="Delete Habit"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
                                      {weekDates.map((d) => {
                                        const dateKey = formatDateKey(d);
                                        const isCompleted = !!habit.completedDates[dateKey];
                                        const isToday = dateKey === todayKey;
                                        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                                        const dayNum = d.getDate();

                                        return (
                                          <div
                                            key={dateKey}
                                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition ${
                                              isToday
                                                ? "bg-blue-950/40 border-blue-500/40"
                                                : "bg-slate-950/60 border-slate-800/80"
                                            }`}
                                          >
                                            <div className="text-center">
                                              <div className={`text-[9px] font-bold uppercase ${isToday ? "text-blue-400" : "text-slate-400"}`}>
                                                {dayName}
                                              </div>
                                              <div className="text-[11px] font-extrabold text-slate-300 font-mono">
                                                {dayNum}
                                              </div>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => toggleStreakDate(habit.id, dateKey)}
                                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition ${
                                                isCompleted
                                                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20 scale-105"
                                                  : "bg-slate-900 border border-slate-700 hover:border-emerald-500/60 text-slate-600 hover:text-slate-400"
                                              }`}
                                              title={`${isCompleted ? "Unmark" : "Mark"} completed for ${dateKey}`}
                                            >
                                              <Check size={16} strokeWidth={isCompleted ? 3 : 2} />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB: LEARNING */}
              {activeTab === "learning" && (
                <div className="space-y-4 pt-1">
                  <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 via-slate-950 to-slate-950 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <BookOpen size={18} className="text-blue-400" />{tx("Learning Lab")}</div>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                          Add your own class materials, then build source-grounded notes, flashcards, and practice quizzes for that class.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-slate-950/70 px-3 py-2 text-[10px] text-slate-400">
                        <Sparkles size={13} className="text-blue-400" />{tx("AI-generated from your materials")}</div>
                    </div>
                  </div>

                  {learningMessage && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">{learningMessage}</div>
                  )}
                  {learningError && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-300">{learningError}</div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-4">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{tx("Class")}</label>
                        <select
                          value={learningClassId}
                          onChange={(e) => {
                            setLearningClassId(e.target.value);
                            setLearningFlashcardIndex(0);
                            setLearningFlashcardFlipped(false);
                            setLearningQuizAnswers({});
                          }}
                          disabled={classes.length === 0}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-blue-500"
                        >
                          {classes.length === 0 ? <option value="">{tx("Add a class first")}</option> : null}
                          {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                        </select>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-3">
                        <div className="text-xs font-bold text-white">{tx("Add class material")}</div>
                        <input
                          value={learningMaterialTitle}
                          onChange={(e) => setLearningMaterialTitle(e.target.value)}
                          placeholder="Material title (e.g. Unit 3 Notes)"
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                        />
                        <textarea
                          value={learningMaterialText}
                          onChange={(e) => setLearningMaterialText(e.target.value)}
                          placeholder="Paste lecture notes, textbook excerpts, review sheets, or teacher handouts here..."
                          rows={9}
                          className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs leading-relaxed text-white outline-none focus:border-blue-500"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-600">
                            {learningFileLoading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                            Upload TXT / MD / CSV / image
                            <input type="file" className="hidden" accept=".txt,.md,.csv,text/plain,text/markdown,text/csv,image/*" onChange={handleLearningFileUpload} />
                          </label>
                          <button
                            type="button"
                            onClick={addLearningMaterial}
                            disabled={!learningClassId || !learningMaterialText.trim()}
                            className="flex-1 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                          >{tx("Add material")}</button>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs font-bold text-white">{tx("Materials for this class")}</div>
                          <span className="text-[10px] text-slate-500">{learningMaterials.filter((item) => item.classId === learningClassId).length}</span>
                        </div>
                        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                          {learningMaterials.filter((item) => item.classId === learningClassId).length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">{tx("Your class material library is empty.")}</div>
                          ) : (
                            learningMaterials.filter((item) => item.classId === learningClassId).map((item) => (
                              <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-xs font-semibold text-white">{item.title}</div>
                                  <div className="mt-0.5 truncate text-[10px] text-slate-500">{item.content.replace(/\s+/g, " ").slice(0, 120)}</div>
                                </div>
                                <button type="button" onClick={() => deleteLearningMaterial(item.id)} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" title="Delete material"><Trash2 size={13} /></button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={generateLearningPack}
                        disabled={learningGenerating || learningMaterials.filter((item) => item.classId === learningClassId).length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {learningGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {learningGenerating ? "Building your study pack…" : "Generate notes + flashcards + quiz"}
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                      {activeLearningBundle ? (
                        <>
                          <div className="border-b border-slate-800 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-base font-bold text-white">{activeLearningBundle.title}</h3>
                                <p className="mt-1 text-xs leading-relaxed text-slate-400">{activeLearningBundle.summary}</p>
                              </div>
                              <button type="button" onClick={generateLearningPack} disabled={learningGenerating} className="shrink-0 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-semibold text-blue-300 hover:bg-blue-500/20">{tx("Regenerate")}</button>
                            </div>
                            <div className="mt-4 flex gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 p-1">
                              {(["notes", "flashcards", "quiz"] as const).map((view) => (
                                <button key={view} type="button" onClick={() => setLearningView(view)} className={`shrink-0 rounded-md px-3 py-2 text-[11px] font-semibold transition ${learningView === view ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                                  {view === "notes" ? "Notes" : view === "flashcards" ? "Flashcards" : "AI Quiz"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {learningView === "notes" && (
                            <div className="max-h-[620px] space-y-4 overflow-y-auto p-4">
                              {activeLearningBundle.notes.map((section, index) => (
                                <div key={`${section.heading}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                                  <h4 className="text-sm font-bold text-white">{section.heading}</h4>
                                  <ul className="mt-2 space-y-2">
                                    {section.bullets.map((bullet, bulletIndex) => (
                                      <li key={bulletIndex} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                                        <MathText text={bullet} />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}

                          {learningView === "flashcards" && (
                            <div className="p-4">
                              {activeLearningBundle.flashcards.length === 0 ? (
                                <div className="py-16 text-center text-sm text-slate-500">{tx("No flashcards were generated.")}</div>
                              ) : (
                                <div className="space-y-4">
                                  <button type="button" onClick={() => setLearningFlashcardFlipped((current) => !current)} className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-slate-900 p-8 text-center transition hover:border-blue-400/40">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">{learningFlashcardFlipped ? "Answer" : "Question"}</div>
                                    <div className="mt-5 text-xl font-bold leading-relaxed text-white">
                                      <MathText
                                        text={
                                          learningFlashcardFlipped
                                            ? activeLearningBundle.flashcards[learningFlashcardIndex].back
                                            : activeLearningBundle.flashcards[learningFlashcardIndex].front
                                          }
                                        />
                                      </div>
                                    <div className="mt-6 text-[10px] text-slate-500">{tx("Tap to flip")}</div>
                                  </button>
                                  <div className="flex items-center justify-between gap-2">
                                    <button type="button" onClick={() => { setLearningFlashcardIndex((current) => (current - 1 + activeLearningBundle.flashcards.length) % activeLearningBundle.flashcards.length); setLearningFlashcardFlipped(false); }} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">{tx("Previous")}</button>
                                    <span className="text-xs font-mono text-slate-500">{learningFlashcardIndex + 1} / {activeLearningBundle.flashcards.length}</span>
                                    <button type="button" onClick={() => { setLearningFlashcardIndex((current) => (current + 1) % activeLearningBundle.flashcards.length); setLearningFlashcardFlipped(false); }} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">{tx("Next")}</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {learningView === "quiz" && (
                            <div className="max-h-[620px] space-y-4 overflow-y-auto p-4">
                              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">{tx("Score:")}<span className="font-bold text-white">{learningQuizScore} / {activeLearningBundle.quiz.length}</span> answered: {Object.keys(learningQuizAnswers).length}</div>
                              {activeLearningBundle.quiz.map((question, index) => {
                                const selected = learningQuizAnswers[index];
                                const answered = selected !== undefined;
                                return (
                                  <div key={`${question.question}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                                    <div className="text-xs font-bold leading-relaxed text-white">{index + 1}. {question.question}</div>
                                    <div className="mt-3 space-y-2">
                                      {question.options.map((option, optionIndex) => {
                                        const isCorrect = optionIndex === question.correctIndex;
                                        const isSelected = selected === optionIndex;
                                        return (
                                          <button key={optionIndex} type="button" onClick={() => setLearningQuizAnswers((current) => ({ ...current, [index]: optionIndex }))} className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs transition ${answered && isCorrect ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : answered && isSelected ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"}`}>
                                            {option}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {answered && <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-400"><span className="font-bold text-slate-200">{tx("Why:")}</span> {question.explanation}</div>}
                                  </div>
                                );
                              })}
                              <button type="button" onClick={() => setLearningQuizAnswers({})} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:text-white">{tx("Reset quiz")}</button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="grid min-h-[520px] place-items-center p-8 text-center">
                          <div className="max-w-sm">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400"><BookOpen size={22} /></div>
                            <h3 className="mt-4 text-base font-bold text-white">{tx("Your learning pack will appear here")}</h3>
                            <p className="mt-2 text-xs leading-relaxed text-slate-500">{tx("Select a class, add your materials, then generate custom notes, flashcards, and a practice quiz.")}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: TIMETABLE */}
              {activeTab === "timetable" &&
                (() => {
                  const weekDates = getWeekDates(timetableWeekBaseDate);
                  const weekDateKeys = weekDates.map(formatDateKey);
                  const todayKey = formatDateKey(new Date());

                  const daysOfWeek: DayOfWeek[] = [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ];

                  const weekGoogleEvents = weekDateKeys.map((dateKey) =>
                    googleCalendarEvents.filter((event) =>
                      googleEventOccursOnDate(event, dateKey)
                    )
                  );

                  const weekAllDayGoogleEvents = weekGoogleEvents.map(
                    (events) =>
                      events.filter(
                        (event) => event.allDay || !event.startTime
                      )
                  );

                  const weekTimedGoogleEvents = weekGoogleEvents.map(
                    (events) =>
                      events.filter(
                        (event) =>
                          !event.allDay && event.startTime
                      )
                  );

                  const weekTasks = weekDateKeys.map((dateKey) =>
                    tasks.filter((task) => task.dueDate === dateKey)
                  );

                  /*
                  * Always get the color from the actual class object.
                  * This keeps Timetable, Class Roster, and Calendar
                  * synchronized.
                  */
                  const getClassColor = (cls: typeof classes[number]) => {
                    return cls.color || "#3B82F6";
                  };

                  return (
                    <div className="space-y-4 pt-1 overflow-x-auto pb-4">

                      {/* HEADER */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold">
                            {tx("Weekly Class Schedule")}
                          </h3>

                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Week of{" "}
                            {weekDates[0].toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            –{" "}
                            {weekDates[6].toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {" · "}
                            classes &amp; clubs repeat every week
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={prevTimetableWeek}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
                            title="Previous Week"
                          >
                            <ChevronLeft size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={resetTimetableWeekToToday}
                            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition min-h-10"
                          >
                            {tx("This Week")}
                          </button>

                          <button
                            type="button"
                            onClick={nextTimetableWeek}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
                            title="Next Week"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>

                      {/* ADD / EDIT SESSION */}
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1.5">
                          <Plus size={14} />
                          {tx("Add Class Session to Timetable")}
                        </h4>

                        <form
                          onSubmit={addMeetingTimeToClass}
                          className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
                        >

                          {/* CLASS */}
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">
                              {tx("Select Class")}
                            </label>

                            <select
                              value={timetableClassId}
                              onChange={(e) =>
                                setTimetableClassId(e.target.value)
                              }
                              disabled={classes.length === 0}
                              className="w-full bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                            >
                              {classes.length === 0 && (
                                <option value="">
                                  {tx("Add a class first")}
                                </option>
                              )}

                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* DAY */}
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">
                              {tx("Day")}
                            </label>

                            <select
                              value={timetableDay}
                              onChange={(e) =>
                                setTimetableDay(
                                  e.target.value as DayOfWeek
                                )
                              }
                              className="w-full bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                            >
                              {daysOfWeek.map((day) => (
                                <option key={day} value={day}>
                                  {day}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* START */}
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">
                              {tx("Start Time")}
                            </label>

                            <input
                              type="time"
                              value={timetableStartTime}
                              onChange={(e) =>
                                setTimetableStartTime(e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-white"
                            />
                          </div>

                          {/* END */}
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">
                              {tx("End Time")}
                            </label>

                            <input
                              type="time"
                              value={timetableEndTime}
                              onChange={(e) =>
                                setTimetableEndTime(e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-white"
                            />
                          </div>

                          {/* ADD */}
                          <button
                            type="submit"
                            disabled={
                              classes.length === 0 ||
                              !timetableClassId
                            }
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <Plus size={14} />
                            {tx("Add Slot")}
                          </button>
                        </form>
                      </div>

                      {/* TIMETABLE */}
                      <div className="min-w-[700px] border border-slate-800 rounded-xl bg-slate-950/50 flex flex-col overflow-hidden">

                        {/* DAYS */}
                        <div className="grid grid-cols-8 border-b border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 text-center py-2.5">

                          <div className="text-[10px] text-slate-500 flex items-center justify-center">
                            {tx("Time")}
                          </div>

                          {daysOfWeek.map((day, index) => (
                            <div
                              key={day}
                              className="flex flex-col items-center gap-0.5"
                            >
                              <span
                                className={
                                  weekDateKeys[index] === todayKey
                                    ? "text-blue-400"
                                    : ""
                                }
                              >
                                {day.slice(0, 3)}
                              </span>

                              <span
                                className={`text-[9px] font-mono font-normal ${
                                  weekDateKeys[index] === todayKey
                                    ? "text-blue-400"
                                    : "text-slate-600"
                                }`}
                              >
                                {weekDates[index].getDate()}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* ALL DAY */}
                        <div className="grid grid-cols-8 border-b border-slate-800/80 bg-slate-950/70 min-h-[38px]">

                          <div className="p-1.5 border-r border-slate-800/80 text-[9px] font-mono text-slate-500 text-center flex items-center justify-center uppercase tracking-wide">
                            {tx("All day")}
                          </div>

                          {daysOfWeek.map((day, dayIndex) => (
                            <div
                              key={day}
                              className="p-1 border-r border-slate-800/40 space-y-1"
                            >
                              {weekAllDayGoogleEvents[dayIndex].map(
                                (event) => (
                                  <div
                                    key={`g-allday-${event.id}`}
                                    className="px-1.5 py-0.5 rounded text-[9px] text-white font-semibold truncate flex items-center gap-1"
                                    style={{
                                      backgroundColor: event.color,
                                    }}
                                    title={event.title}
                                  >
                                    <span className="opacity-80 shrink-0">
                                      {event.icon}
                                    </span>

                                    <span className="truncate">
                                      {event.title}
                                    </span>
                                  </div>
                                )
                              )}

                              {weekTasks[dayIndex].map((task) => (
                                <div
                                  key={`task-${task.id}`}
                                  className={`px-1.5 py-0.5 rounded text-[9px] text-white font-semibold truncate ${
                                    task.type === "test"
                                      ? "bg-rose-600/90"
                                      : "bg-blue-600/90"
                                  }`}
                                  title={`Task: ${task.title}`}
                                >
                                  {task.title}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        {/* HOURS */}
                        <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">

                          {[
                            8, 9, 10, 11, 12, 13, 14,
                            15, 16, 17, 18, 19, 20,
                          ].map((hour) => {

                            const timeLabel =
                              `${hour.toString().padStart(2, "0")}:00`;

                            return (
                              <div
                                key={hour}
                                className="grid grid-cols-8 min-h-[50px]"
                              >

                                {/* TIME */}
                                <div className="p-2 border-r border-slate-800/80 text-[10px] font-mono text-slate-500 text-center flex items-center justify-center bg-slate-900/30">
                                  {timeLabel}
                                </div>

                                {daysOfWeek.map(
                                  (day, dayIndex) => {

                                    const classMatches =
                                      classes.flatMap((cls) =>
                                        (cls.meetingTimes || [])
                                          .filter((meeting) => {
                                            if (meeting.day !== day) {
                                              return false;
                                            }

                                            const startHour =
                                              parseInt(
                                                meeting.startTime.split(":")[0],
                                                10
                                              );

                                            return startHour === hour;
                                          })
                                          .map(
                                            (meeting, index) => ({
                                              cls,
                                              meeting,
                                              index,
                                            })
                                          )
                                      );

                                    const clubMatches =
                                      clubs.flatMap((club) =>
                                        (club.meetingTimes || [])
                                          .filter((meeting) => {
                                            if (meeting.day !== day) {
                                              return false;
                                            }

                                            const startHour =
                                              parseInt(
                                                meeting.startTime.split(":")[0],
                                                10
                                              );

                                            return startHour === hour;
                                          })
                                          .map((meeting, index) => ({
                                            club,
                                            meeting,
                                            index,
                                          }))
                                      );

                                    const googleMatches =
                                      weekTimedGoogleEvents[
                                        dayIndex
                                      ].filter((event) => {
                                        const startHour =
                                          parseInt(
                                            (
                                              event.startTime || ""
                                            ).split(":")[0],
                                            10
                                          );

                                        return startHour === hour;
                                      });

                                    return (
                                      <div
                                        key={day}
                                        className="p-1 border-r border-slate-800/40 relative space-y-1"
                                      >

                                        {/* CLASSES */}
                                        {classMatches.map(
                                          ({
                                            cls,
                                            meeting,
                                            index,
                                          }) => (
                                            <div
                                              key={`class-${cls.id}-${index}`}
                                              role="button"
                                              tabIndex={0}
                                              onClick={() =>
                                                editTimetableMeeting(
                                                  cls.id,
                                                  meeting
                                                )
                                              }
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key ===
                                                    "Enter" ||
                                                  e.key === " "
                                                ) {
                                                  e.preventDefault();

                                                  editTimetableMeeting(
                                                    cls.id,
                                                    meeting
                                                  );
                                                }
                                              }}
                                              className="p-1.5 rounded text-[10px] text-white font-semibold flex flex-col justify-between shadow-sm group relative cursor-pointer transition hover:brightness-110 hover:ring-2 hover:ring-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                                              style={{
                                                backgroundColor:
                                                  getClassColor(cls),
                                              }}
                                              title="Click to edit this class session"
                                            >

                                              <div className="flex items-center justify-between gap-1">

                                                <span className="font-bold truncate">
                                                  {cls.name}
                                                </span>

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();

                                                    removeMeetingTimeFromClass(
                                                      cls.id,
                                                      index
                                                    );
                                                  }}
                                                  className="shrink-0 opacity-0 group-hover:opacity-100 text-white/80 hover:text-white transition"
                                                  title="Remove session"
                                                >
                                                  <X size={10} />
                                                </button>

                                              </div>

                                              <div className="text-[9px] opacity-90 font-mono">
                                                {meeting.startTime}
                                                {" - "}
                                                {meeting.endTime}
                                              </div>
                                            </div>
                                          )
                                        )}

                                        {/* CLUBS */}
                                        {clubMatches.map(
                                          ({
                                            club,
                                            meeting,
                                            index,
                                          }) => (
                                            <div
                                              key={`club-${club.id}-${index}`}
                                              className="p-1.5 rounded text-[10px] text-white font-semibold flex flex-col justify-between shadow-sm"
                                               style={{ backgroundColor: cls.color }}
                                            >
                                              <div className="font-bold truncate flex items-center gap-1">
                                                <span>
                                                  {club.icon || "👥"}
                                                </span>

                                                <span className="truncate">
                                                  {club.name}
                                                </span>
                                              </div>

                                              <div className="text-[9px] opacity-90 font-mono">
                                                {meeting.startTime}
                                                {" - "}
                                                {meeting.endTime}
                                              </div>
                                            </div>
                                          )
                                        )}

                                        {/* GOOGLE EVENTS */}
                                        {googleMatches.map(
                                          (event) => (
                                            <div
                                              key={`google-${event.id}`}
                                              className="p-1.5 rounded text-[10px] text-white font-semibold flex flex-col justify-between shadow-sm"
                                              style={{
                                                backgroundColor:
                                                  event.color,
                                              }}
                                            >
                                              <div className="font-bold truncate flex items-center gap-1">
                                                <span>
                                                  {event.icon}
                                                </span>

                                                <span className="truncate">
                                                  {event.title}
                                                </span>
                                              </div>

                                              <div className="text-[9px] opacity-90 font-mono">
                                                {event.startTime}
                                                {event.endTime
                                                  ? ` - ${event.endTime}`
                                                  : ""}
                                              </div>
                                            </div>
                                          )
                                        )}

                                      </div>
                                    );
                                  }
                                )}

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* TAB: GRADES */}
              {activeTab === "grades" && (
                <div className="space-y-4 pt-1">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <GraduationCap size={18} className="text-emerald-400" />{tx("Academic Performance Summary")}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Overview of current grades, targets, and cumulative GPA status across all enrolled subjects.
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{tx("Cumulative GPA")}</span>
                      <span className="text-xl font-extrabold text-emerald-400 font-mono">
                        {cumulativeGPA > 0 ? `${pointsToLetter(cumulativeGPA)} (${cumulativeGPA.toFixed(2)})` : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {classes.map((cls) => {
                      const sbg = calculateOverallGrade(cls.standards);
                      const currentGrade = cls.manualGrade ?? sbg.letter;
                      const currentPts = parseGradeToPoints(currentGrade) ?? 0;
                      const targetPts = parseGradeToPoints(cls.targetGrade) ?? 0;

                      const isMeetingTarget = currentPts >= targetPts && currentGrade !== "N/A";

                      return (
                        <div
                          key={cls.id}
                          className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: cls.color }} />
                              <div>
                                <h4 className="font-bold text-sm text-white">{cls.name}</h4>
                                <p className="text-[10px] text-slate-400">
                                  {cls.professorName ? `Instructor: ${cls.professorName}` : "Standards-Based Course"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-semibold">{tx("Target Grade")}</span>
                                <select
                                  value={cls.targetGrade || "A"}
                                  onChange={(e) => {
                                    const val = e.target.value as StandardLevel;
                                    const nextClasses = classes.map((c) =>
                                      c.id === cls.id ? { ...c, targetGrade: val } : c
                                    );
                                    setClasses(nextClasses);
                                    saveWorkspaceChangeImmediately({ classes: nextClasses });
                                  }}
                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold text-blue-400 focus:outline-none"
                                >
                                  {GRADE_TARGETS.map((gt) => (
                                    <option key={gt.value} value={gt.value}>
                                      {gt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-semibold">{tx("Current Grade")}</span>
                                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                                  {currentGrade} {sbg.gpa > 0 && !cls.manualGrade ? `(${sbg.gpa.toFixed(2)})` : ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-[11px]">{tx("Status:")}</span>
                              {currentGrade === "N/A" ? (
                                <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">{tx("No evaluations yet")}</span>
                              ) : isMeetingTarget ? (
                                <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-bold">
                                  On Track for Target ({cls.targetGrade})
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-bold">
                                  Below Target ({cls.targetGrade})
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] text-slate-500 font-mono">
                              {cls.standards?.length || 0} standards tracked
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: SIMULATOR */}
              {activeTab === "simulator" && (
                <div className="space-y-4 pt-1">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sliders size={18} className="text-blue-400" />{tx("Target Grade Simulator")}</h3>
                    <p className="text-xs text-slate-400">
                      Calculate required average scores on upcoming standards to reach your target grade.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Parameters Form */}
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-4">
                      <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1.5">
                        <Target size={14} />{tx("Course Parameters")}</h4>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-400 font-semibold block mb-1">{tx("Active Course")}</label>
                          <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs font-bold text-white focus:outline-none"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 font-semibold block mb-1">{tx("Current Grade Level")}</label>
                          <select
                            value={simCurrentGrade}
                            onChange={(e) => setSimCurrentGrade(e.target.value as StandardLevel)}
                            className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs font-bold text-emerald-400 focus:outline-none"
                          >
                            {Object.keys(LETTER_POINTS).map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl} ({LETTER_POINTS[lvl as StandardLevel].toFixed(2)} pts)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 font-semibold block mb-1">{tx("Desired Target Grade")}</label>
                          <select
                            value={simTargetGrade}
                            onChange={(e) => setSimTargetGrade(e.target.value as StandardLevel)}
                            className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs font-bold text-blue-400 focus:outline-none"
                          >
                            {Object.keys(LETTER_POINTS).map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl} ({LETTER_POINTS[lvl as StandardLevel].toFixed(2)} pts)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Multi-Select Tested Standards */}
                        <div className="space-y-1.5 pt-2">
                          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                            <span>{tx("Select Standard(s) Being Tested:")}</span>
                            <span className="text-blue-400 text-[11px]">
                              ({selectedStandardsForExam.length} selected)
                            </span>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {activeClass?.standards?.map((st) => (
                              <label
                                key={st.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs hover:border-slate-700 transition"
                              >
                                <span className="truncate pr-2 text-slate-200">{st.name}</span>
                                <input
                                  type="checkbox"
                                  checked={selectedStandardsForExam.includes(st.id)}
                                  onChange={() => toggleStandardSelection(st.id)}
                                  className="rounded border-slate-700 text-blue-600 focus:ring-0"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  {/* RIGHT COLUMN: SIMULATION RESULT */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400">{tx("SIMULATION RESULT")}</h3>
                    <h2 className="mt-1 text-lg font-bold text-white">{tx("Required Score on Selected Standard(s)")}</h2>

                    {/* ✅ PASTE YOUR SNIPPET HERE */}
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                      <div className="text-center">
                        <div className="text-6xl font-extrabold text-emerald-400">
                          {requiredFinalGrade.letterGrade}
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          Required Avg Score Point:{" "}
                          <span className="font-mono font-bold text-white">
                           {requiredFinalGrade.requiredScorePts !== null ? requiredFinalGrade.requiredScorePts : "N/A"}
                          </span>
                        </p>
                      </div>

                      {/* Target Breakdown */}
                      <div className="mt-6 rounded-lg bg-slate-800/40 p-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                          <span>✨</span>{tx("Target Breakdown:")}</div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          {requiredFinalGrade.message}
                        </p>
                      </div>
                    </div>
                  </div>

                      <div className="text-[11px] text-slate-400 space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800/60">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                          <Sparkles size={13} className="text-amber-400" />{tx("Target Breakdown:")}</div>
                      <p className="leading-relaxed">
                        To achieve <strong className="text-blue-400">{simTargetGrade}</strong>,
                        you must score an average of at least{" "}
                        <strong className="text-emerald-400">{requiredFinalGrade.letter}</strong> ({requiredFinalGrade.points} pts) on the{" "}
                        <strong>{selectedStandardsForExam.length}</strong>{tx("selected standard(s).")}</p>
                      </div>
                    </div>
                  </div>
              )}

            </div>
          </div>
        </main>
      </div>

      {showManualEventModal && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setShowManualEventModal(false)}
          role="presentation"
        >
          <section
            className="w-full max-w-lg rounded-t-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-event-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{tx("Calendar")}</p>
                <h2 id="manual-event-title" className="mt-1 text-xl font-bold text-white">{tx("Add event")}</h2>
                <p className="mt-1 text-xs text-slate-400">{tx("Create a personal calendar event without Google Calendar.")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualEventModal(false)}
                className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Close add event"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addManualCalendarEvent} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-300">{tx("Name")}<input
                    value={manualEventName}
                    onChange={(e) => setManualEventName(e.target.value)}
                    placeholder="e.g. Biology Review"
                    required
                    autoFocus
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">{tx("Type")}<select
                    value={manualEventType}
                    onChange={(e) => setManualEventType(e.target.value as ManualCalendarEvent["type"])}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                  >
                    <option>{tx("Study")}</option>
                    <option>{tx("Test")}</option>
                    <option>{tx("Homework")}</option>
                    <option>{tx("Class")}</option>
                    <option>{tx("Club")}</option>
                    <option>{tx("Personal")}</option>
                    <option>{tx("Other")}</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-semibold text-slate-300">{tx("Event details")}<textarea
                  value={manualEventDetails}
                  onChange={(e) => setManualEventDetails(e.target.value)}
                  placeholder="What is this event for?"
                  rows={3}
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-xs font-semibold text-slate-300">{tx("Date")}<input
                    type="date"
                    value={manualEventDate}
                    onChange={(e) => setManualEventDate(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-300">{tx("Start")}<input
                    type="time"
                    value={manualEventStartTime}
                    onChange={(e) => setManualEventStartTime(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-300">{tx("End")}<input
                    type="time"
                    value={manualEventEndTime}
                    onChange={(e) => setManualEventEndTime(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowManualEventModal(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                >{tx("Cancel")}</button>
                <button
                  type="submit"
                  disabled={!manualEventName.trim() || !manualEventDate || !manualEventStartTime || !manualEventEndTime}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} />{tx("Save event")}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {calendarReviewOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setCalendarReviewOpen(false)}
          role="presentation"
        >
          <section
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-review-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">{tx("Calendar cleanup")}</p>
                <h2 id="calendar-review-title" className="mt-1 text-xl font-bold text-white">{tx("Review similar events")}</h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                  Possible matches are grouped for you first. Nothing is changed until you press Merge selected.
                  Different dates stay separate; after a merge, only one matching event is kept per day.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={refreshCalendarReview}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  title="Re-check the current calendar events and regenerate organizing suggestions"
                >
                  <RefreshCw size={14} />{tx("Refresh")}</button>
                <button
                  type="button"
                  onClick={() => setCalendarReviewOpen(false)}
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Close calendar review"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-300">{tx("Refresh")}</span> re-checks the events currently in your calendar and regenerates the suggested organizing names. It does not merge or rename anything by itself.
            </div>

            {calendarReviewGroups.length === 0 ? (
              <div className="py-14 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">{tx("No similar event groups found")}</h3>
                <p className="mt-1 text-xs text-slate-500">{tx("Your imported event names are currently distinct enough to keep separate.")}</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {calendarReviewGroups.map((group) => (
                  <div key={group.id} className={`rounded-2xl border p-4 transition ${calendarReviewSelected[group.id] ? "border-violet-500/40 bg-violet-500/5" : "border-slate-800 bg-slate-950/60"}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(calendarReviewSelected[group.id])}
                        onChange={() => toggleCalendarReviewGroup(group.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500"
                        aria-label={`Select ${group.titles.join(", ")}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">{tx("Possible match")}</span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-semibold text-slate-400">{group.confidence}% similarity</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {group.titles.map((title) => (
                            <span key={title} className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-200">{title}</span>
                          ))}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                          <label className="block text-xs font-semibold text-slate-300">{tx("Merge into this name")}<input
                              value={group.proposedTitle}
                              onChange={(event) => updateCalendarReviewTitle(group.id, event.target.value)}
                              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
                            />
                          </label>
                          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[10px] text-slate-500">
                            <div>{group.eventIds.length} occurrences in group</div>
                            {group.exampleTimes.length > 0 && <div className="mt-0.5">Times: {group.exampleTimes.join(", ")}</div>}
                            {group.exampleDates.length > 0 && <div className="mt-0.5">Dates: {group.exampleDates.join(", ")}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setCalendarReviewOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >{tx("Keep separate")}</button>
              <button
                type="button"
                onClick={mergeReviewedCalendarGroups}
                disabled={calendarReviewGroups.length === 0 || !Object.values(calendarReviewSelected).some(Boolean)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={14} />{tx("Merge selected")}</button>
            </div>
          </section>
        </div>
      )}

      {calendarDeleteEventId && (() => {
        const calendarDeleteEvent = googleCalendarEvents.find(
          (event) => event.id === calendarDeleteEventId
        );
        if (!calendarDeleteEvent) return null;
        const isRecurring = Boolean(calendarDeleteEvent.recurringEventId);
        const eventDateLabel = new Date(
          `${calendarDeleteEvent.startDate}T${calendarDeleteEvent.startTime || "12:00"}`
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={closeGoogleCalendarDeleteDialog}
            role="presentation"
          >
            <section
              className="w-full max-w-lg rounded-t-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="calendar-delete-title"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">{tx("Delete event")}</p>
                  <h2 id="calendar-delete-title" className="mt-1 truncate text-xl font-bold text-white">
                    {isRecurring ? tx("Delete recurring event?") : tx("Delete this event?")}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    “{calendarDeleteEvent.title}” · {eventDateLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeGoogleCalendarDeleteDialog}
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Cancel delete"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-slate-300">
                These choices control what is hidden in <strong>{tx("WJ Study")}</strong>. Your Google Calendar itself is not changed.
              </div>

              {isRecurring ? (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => deleteGoogleCalendarEvent(calendarDeleteEvent.id, "this")}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left transition hover:border-violet-500/50 hover:bg-slate-800"
                  >
                    <span className="block text-sm font-semibold text-white">This event only</span>
                    <span className="mt-0.5 block text-xs text-slate-400">Hide only this occurrence ({eventDateLabel}).</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteGoogleCalendarEvent(calendarDeleteEvent.id, "following")}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left transition hover:border-violet-500/50 hover:bg-slate-800"
                  >
                    <span className="block text-sm font-semibold text-white">This and following</span>
                    <span className="mt-0.5 block text-xs text-slate-400">Hide this occurrence and all later occurrences in this series.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteGoogleCalendarEvent(calendarDeleteEvent.id, "all")}
                    className="w-full rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-left transition hover:border-rose-500/50 hover:bg-rose-500/10"
                  >
                    <span className="block text-sm font-semibold text-rose-200">Entire series</span>
                    <span className="mt-0.5 block text-xs text-slate-400">Hide every occurrence in this recurring series.</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => deleteGoogleCalendarEvent(calendarDeleteEvent.id, "this")}
                    className="w-full rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-left transition hover:border-rose-500/50 hover:bg-rose-500/10"
                  >
                    <span className="block text-sm font-semibold text-rose-200">{tx("Delete event")}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">Hide this event from WJ Study.</span>
                  </button>
                </div>
              )}

              <div className="mt-4 flex justify-end border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={closeGoogleCalendarDeleteDialog}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >{tx("Cancel")}</button>
              </div>
            </section>
          </div>
        );
      })()}

      {zoomedCalendarDate && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => {
            setZoomedCalendarDate(null);
            setEditingCalendarItemKey(null);
          }}
          role="presentation"
        >
          <section
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-day-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">{tx("Day view")}</p>
                <h2 id="calendar-day-title" className="mt-1 text-xl font-bold text-white">
                  {zoomedDateLabel}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {zoomedDayItems.length} event{zoomedDayItems.length === 1 ? "" : "s"} scheduled
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openManualEventModal(zoomedCalendarDate || undefined)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                >
                  <Plus size={14} />{tx("Add event")}</button>
              <button
                type="button"
                onClick={() => {
                  setZoomedCalendarDate(null);
                  setEditingCalendarItemKey(null);
                }}
                className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Close day view"
              >
                <X size={18} />
              </button>
              </div>
            </div>

            {zoomedDayItems.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                Nothing scheduled for this day — no Google Calendar events, personal events, classes, tasks, or club meetings.
              </p>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{tx("Events")}</h3>
                  {zoomedDayItems.map((item) => {
                    if (item.kind === "google") {
                      const event = item.event;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setEditingCalendarItemKey(item.id)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            editingCalendarItemKey === item.id
                              ? "border-violet-400 bg-slate-800"
                              : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold text-white"
                              style={{ backgroundColor: event.color }}
                            >
                              {event.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-100">{event.title}</span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                {event.allDay ? "All day" : `${event.startTime || "Time not set"}${event.endTime ? ` – ${event.endTime}` : ""}`}
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    }

                    if (item.kind === "manual") {
                      const event = item.event;
                      const display = item.display;
                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setEditingCalendarItemKey(item.id)}
                          onKeyDown={(keyEvent) => {
                            if (keyEvent.key === "Enter" || keyEvent.key === " ") setEditingCalendarItemKey(item.id);
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            editingCalendarItemKey === item.id
                              ? "border-violet-400 bg-slate-800"
                              : "border-emerald-500/20 bg-slate-950/60 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold text-white"
                              style={{ backgroundColor: display.color }}
                            >
                              {display.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-100">{display.title}</span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                {event.type} · {display.startTime || "Time not set"}{display.endTime ? ` – ${display.endTime}` : ""}
                              </span>
                              {display.details && (
                                <span className="mt-1 block whitespace-pre-wrap text-xs text-slate-500">{display.details}</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                if (window.confirm(`Delete “${display.title}”?`)) {
                                  deleteManualCalendarEvent(event.id);
                                  setEditingCalendarItemKey(null);
                                }
                              }}
                              className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                              title="Delete manual event"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (item.kind === "class") {
                      const display = item.display;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setEditingCalendarItemKey(item.id)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            editingCalendarItemKey === item.id
                              ? "border-violet-400 bg-slate-800"
                              : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: display.color }}>
                              {display.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-100">{display.title}</span>
                              <span className="mt-0.5 block text-xs text-slate-400">Class · {display.startTime || "Time not set"}{display.endTime ? ` – ${display.endTime}` : ""}</span>
                            </span>
                          </div>
                        </button>
                      );
                    }

                    const display = item.display;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setEditingCalendarItemKey(item.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          editingCalendarItemKey === item.id
                            ? "border-violet-400 bg-slate-800"
                            : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: display.color }}>
                            {display.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-100">{display.title}</span>
                            <span className="mt-0.5 block text-xs text-slate-400">
                              Club{display.startTime ? ` · ${display.startTime}${display.endTime ? ` – ${display.endTime}` : ""}` : ""}
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {editingCalendarItem ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    {(() => {
                      const display = editingCalendarItem.display;
                      const override = calendarEventOverrides[editingCalendarItem.id] || {};
                      const supportsAllDayToggle = editingCalendarItem.kind === "google";
                      const hasTime = Boolean(display.startTime || display.endTime);
                      return (
                        <>
                          <div className="mb-4 flex items-center gap-2">
                            <span
                              className="grid h-9 w-9 place-items-center rounded-lg text-base font-bold text-white"
                              style={{ backgroundColor: display.color }}
                            >
                              {display.icon}
                            </span>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-white">{tx("Customize event")}</h3>
                              <p className="text-[11px] text-slate-400">{display.sourceLabel} · changes are saved in this app only</p>
                            </div>
                          </div>

                          <label className="block text-xs font-semibold text-slate-300">{tx("Name")}<input
                              value={display.title}
                              onChange={(changeEvent) =>
                                updateCalendarEventOverride(editingCalendarItem.id, {
                                  title: changeEvent.target.value,
                                })
                              }
                              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
                            />
                          </label>

                          <label className="mt-3 block text-xs font-semibold text-slate-300">{tx("Date")}<input
                              type="date"
                              value={display.date}
                              onChange={(changeEvent) => {
                                const nextDate = changeEvent.target.value;
                                updateCalendarEventOverride(editingCalendarItem.id, { date: nextDate });
                                if (nextDate) setZoomedCalendarDate(nextDate);
                              }}
                              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
                            />
                          </label>

                          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                            <label className="block text-xs font-semibold text-slate-300">{tx("Logo / icon")}<input
                                value={display.icon}
                                onChange={(changeEvent) =>
                                  updateCalendarEventOverride(editingCalendarItem.id, {
                                    icon: changeEvent.target.value.slice(0, 4) || "✦",
                                  })
                                }
                                maxLength={4}
                                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
                                placeholder="📚"
                              />
                            </label>
                            <label className="block text-xs font-semibold text-slate-300">{tx("Color")}<input
                                type="color"
                                value={display.color}
                                onChange={(changeEvent) =>
                                  updateCalendarEventOverride(editingCalendarItem.id, {
                                    color: changeEvent.target.value,
                                  })
                                }
                                className="mt-1.5 h-9 w-14 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-1"
                              />
                            </label>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <label className="block text-xs font-semibold text-slate-300">{tx("Start time")}<input
                                type="time"
                                value={display.startTime || ""}
                                onChange={(changeEvent) =>
                                  updateCalendarEventOverride(editingCalendarItem.id, {
                                    startTime: changeEvent.target.value,
                                    allDay: false,
                                  })
                                }
                                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
                              />
                            </label>
                            <label className="block text-xs font-semibold text-slate-300">{tx("End time")}<input
                                type="time"
                                value={display.endTime || ""}
                                onChange={(changeEvent) =>
                                  updateCalendarEventOverride(editingCalendarItem.id, {
                                    endTime: changeEvent.target.value,
                                    allDay: false,
                                  })
                                }
                                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
                              />
                            </label>
                          </div>

                          {supportsAllDayToggle && (
                            <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-xs font-semibold text-slate-300">
                              <input
                                type="checkbox"
                                checked={Boolean(display.allDay && !hasTime)}
                                onChange={(changeEvent) =>
                                  updateCalendarEventOverride(editingCalendarItem.id, {
                                    allDay: changeEvent.target.checked,
                                    ...(changeEvent.target.checked ? { startTime: "", endTime: "" } : {}),
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500"
                              />{tx("All-day event")}</label>
                          )}

                          {display.details && (
                            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-400">
                              <p className="font-semibold text-slate-300">{tx("Details")}</p>
                              <p className="mt-1 whitespace-pre-wrap">{display.details}</p>
                            </div>
                          )}

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => resetCalendarEventOverride(editingCalendarItem.id)}
                              disabled={Object.keys(override).length === 0}
                              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >{tx("Reset customization")}</button>
                            {(editingCalendarItem.kind === "google") && (
                              <button
                                type="button"
                                onClick={() => openGoogleCalendarDeleteDialog(editingCalendarItem.event.id)}
                                className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                              >
                                <Trash2 size={14} className="mr-1.5 inline" />{tx("Delete")}</button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid place-items-center rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                    Select any calendar event to customize its name, color, logo, date, and time. Date changes for Google and personal events are saved in WJ Study and do not change the original calendar source.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900/95 px-2 pt-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-center gap-1">
          <button type="button" onClick={() => setMobileTab("home")} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${mobileBottomGroup === "home" ? "bg-blue-600/15 text-blue-400" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"}`}><House size={18} /><span>{tx("Home")}</span></button>
          <button type="button" onClick={() => { setMobileTab("calendar"); setActiveTab("calendar"); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${mobileBottomGroup === "calendar" ? "bg-blue-600/15 text-blue-400" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"}`}><Calendar size={18} /><span>{tx("Calendar")}</span></button>
          <button type="button" onClick={() => { setMobileTab("clan"); setActiveTab("clan"); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${mobileBottomGroup === "clan" ? "bg-violet-600/15 text-violet-400" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"}`}><Trophy size={18} /><span>{tx("Clan")}</span></button>
          <button type="button" onClick={() => { setMobileTab("learning"); setActiveTab("learning"); if (!learningClassId && classes[0]?.id) setLearningClassId(classes[0].id); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${mobileBottomGroup === "learning" ? "bg-blue-600/15 text-blue-400" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"}`}><BookOpen size={18} /><span>{tx("Learning")}</span></button>
          <button type="button" onClick={() => setMobileTab("more")} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${mobileBottomGroup === "more" ? "bg-slate-700/70 text-white" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"}`}><MoreHorizontal size={19} /><span>{tx("More")}</span></button>
        </div>
      </nav>
    </div>
  );
}

