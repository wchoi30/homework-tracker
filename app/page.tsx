"use client";

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
  // 2026 Fall Semester
  { name: "Labor Day Holiday", startDate: "2026-09-01", endDate: "2026-09-02", type: "break" },
  { name: "Mid-Autumn Festival Break", startDate: "2026-09-25", endDate: "2026-09-28", type: "break" },
  { name: "October Fall Break", startDate: "2026-10-19", endDate: "2026-10-23", type: "break" },
  { name: "Teacher PD Day (No School)", startDate: "2026-11-06", endDate: "2026-11-06", type: "staff_only" },
  { name: "Thanksgiving Break", startDate: "2026-11-26", endDate: "2026-11-27", type: "break" },
  { name: "Winter Break", startDate: "2026-12-18", endDate: "2027-01-08", type: "break" },

  // 2027 Spring Semester
  { name: "Tet Lunar New Year Break", startDate: "2027-02-05", endDate: "2027-02-15", type: "break" },
  { name: "Teacher PD Day (No School)", startDate: "2027-03-12", endDate: "2027-03-12", type: "staff_only" },
  { name: "Spring Break", startDate: "2027-03-29", endDate: "2027-04-02", type: "break" },
  { name: "Hung Kings & Reunification Break", startDate: "2027-04-29", endDate: "2027-05-03", type: "break" },
  { name: "Summer Break Starts", startDate: "2027-06-11", endDate: "2027-08-10", type: "break" },

  // Regular Monthly Early Dismissal Days
  { name: "Early Dismissal (12:15)", startDate: "2026-09-16", endDate: "2026-09-16", type: "early_dismissal" },
  { name: "Early Dismissal (12:15)", startDate: "2026-10-14", endDate: "2026-10-14", type: "early_dismissal" },
  { name: "Early Dismissal (12:15)", startDate: "2026-11-18", endDate: "2026-11-18", type: "early_dismissal" },
  { name: "Early Dismissal (12:15)", startDate: "2026-12-16", endDate: "2026-12-16", type: "early_dismissal" },
  { name: "Early Dismissal (12:15)", startDate: "2027-01-20", endDate: "2027-01-20", type: "early_dismissal" },
  { name: "Early Dismissal (12:15)", startDate: "2027-02-24", endDate: "2027-02-24", type: "early_dismissal" },
  { name: "Early Dismissal (12:15)", startDate: "2027-03-17", endDate: "2027-03-17", type: "early_dismissal" },
  { name: "Early Dismissal (12:15)", startDate: "2027-04-21", endDate: "2027-04-21", type: "early_dismissal" },
  { name: "Early Dismissal (12:15)", startDate: "2027-05-19", endDate: "2027-05-19", type: "early_dismissal" },
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
};

type GoogleCalendarApiEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
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
    }];
  });
}

function normalizeGoogleEventIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string"))];
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

// --- MAIN COMPONENT ---
// --- LANDING PAGE (shown before sign-in / sign-up) ---
function LandingPage({
  onSignIn,
  onSignUp,
}: {
  onSignIn: () => void;
  onSignUp: () => void;
}) {
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
    {
      icon: Upload,
      title: "Syllabus task extractor",
      text: "Upload a syllabus and turn it into tasks and due dates automatically.",
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
          <span className="text-lg font-bold tracking-tight text-white">WJ Study</span>
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
              <Sparkles size={13} /> Built for students
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Study smarter.
              <br />
              <span className="text-blue-400">Know exactly where you stand.</span>
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
              >
                Get started free <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                I already have an account
              </button>
            </div>
          </div>

          {/* Example preview card (illustrative numbers) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sliders size={16} className="text-blue-400" /> Target Grade Simulator
              </div>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Example
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-slate-500">Current grade</div>
                <div className="mt-1 text-base font-bold text-emerald-400">B+</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-slate-500">Target grade</div>
                <div className="mt-1 text-base font-bold text-blue-400">A-</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-center">
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Required average on upcoming standards
              </div>
              <div className="mt-2 text-6xl font-extrabold text-emerald-400">A</div>
              <div className="mt-1 text-sm text-slate-400">
                about <span className="font-mono font-bold text-white">4.01</span> pts
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section className="border-y border-slate-900 bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-2xl font-bold text-white md:text-3xl">
            Everything you need to stay on top of school
          </h2>
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
        <h2 className="text-center text-2xl font-bold text-white md:text-3xl">How it works</h2>
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
          <h2 className="text-2xl font-bold text-white md:text-3xl">Ready to level up your grades?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-300">
            Create your WJ Study account and set up your first class in minutes.
          </p>
          <button
            type="button"
            onClick={onSignUp}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Create your account <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 space-y-2">
        <div>© {new Date().getFullYear()} WJ Study</div>
        <div>
          <a href="/privacy" className="hover:text-slate-300 hover:underline transition">
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function AcademicOSDashboard() {
  const [mobileTab, setMobileTab] = useState<
    "classes" | "tasks" | "calendar" | "timetable" | "ai" | "simulator" | "streaks" | "planner" | "analytics" | "clan"
  >("tasks");
  const [activeTab, setActiveTab] = useState<
    "standards" | "calendar" | "timetable" | "grades" | "simulator" | "syllabus" | "streaks" | "planner" | "analytics" | "clan"
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
  const [calendarSyncState, setCalendarSyncState] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [calendarSyncMessage, setCalendarSyncMessage] = useState<string | null>(null);
  const [zoomedCalendarDate, setZoomedCalendarDate] = useState<string | null>(null);
  const [editingGoogleEventId, setEditingGoogleEventId] = useState<string | null>(null);

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
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const [isParsing, setIsParsing] = useState(false);
  const [rawSyllabusText, setRawSyllabusText] = useState("");
  const [parsedItems, setParsedItems] = useState<Partial<Task>[]>([]);

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
        .select("data")
        .eq("user_id", currentUserId)
        .single();

      if (!error && data && data.data) {
        setClasses(
          withoutLegacyDemoItems(
            Array.isArray(data.data.classes) ? data.data.classes : EMPTY_CLASSES,
            LEGACY_DEMO_CLASS_IDS
          )
        );
        setClubs(
          normalizeClubsData(
            withoutLegacyDemoItems(
              Array.isArray(data.data.clubs) ? data.data.clubs : EMPTY_CLUBS,
              LEGACY_DEMO_CLUB_IDS
            )
          )
        );
        setTasks(
          withoutLegacyDemoItems(
            Array.isArray(data.data.tasks) ? data.data.tasks : EMPTY_TASKS,
            LEGACY_DEMO_TASK_IDS
          )
        );
        setStreaks(
          withoutLegacyDemoItems(
            Array.isArray(data.data.streaks) ? data.data.streaks : EMPTY_STREAKS,
            LEGACY_DEMO_STREAK_IDS
          )
        );
        setStudySessions(
          Array.isArray(data.data.studySessions)
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
          typeof data.data.gamificationXp === "number"
            ? Math.max(0, Math.floor(data.data.gamificationXp))
            : 0
        );
        setGoogleCalendarEvents(normalizeGoogleCalendarEvents(data.data.googleCalendarEvents));
        const savedHiddenGoogleEventIds = normalizeGoogleEventIds(
          data.data.hiddenGoogleEventIds
        );
        setGoogleCalendarEvents(
          normalizeGoogleCalendarEvents(data.data.googleCalendarEvents).filter(
            (event) => !savedHiddenGoogleEventIds.includes(event.id)
          )
        );
        setHiddenGoogleEventIds(savedHiddenGoogleEventIds);
        setSyncStatus("synced");
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
        const localGoogleCalendarEvents = normalizeGoogleCalendarEvents(
          safeStorageGet(`tracker_google_calendar_events_v1_${currentUserId}`, [])
        );
        const localHiddenGoogleEventIds = normalizeGoogleEventIds(
          safeStorageGet(`tracker_hidden_google_event_ids_v1_${currentUserId}`, [])
        );

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
        setGoogleCalendarEvents(localGoogleCalendarEvents);
        setGoogleCalendarEvents(
          localGoogleCalendarEvents.filter(
            (event) => !localHiddenGoogleEventIds.includes(event.id)
          )
        );
        setHiddenGoogleEventIds(localHiddenGoogleEventIds);
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

  const loadClan = async (currentUserId: string) => {
    setClanLoading(true);
    setClanError(null);

    const saved = readLocalClan(currentUserId);
    if (saved?.clan?.join_code) {
      setClanStorageMode("local");
      setClan(saved.clan as ClanInfo);
      setClanDisplayName(saved.displayName || "Student");
      setClanStudyMinutes(Math.max(0, Number(saved.studyMinutes || 0)));
      // Restore the Clan screen after a full page reload so a saved
      // membership does not appear to disappear just because the default
      // workspace tab was reset during the new React mount.
      setActiveTab("clan");
      setMobileTab("clan");
      setClanMembers([
        {
          user_id: currentUserId,
          display_name: saved.displayName || "Student",
          study_minutes: Math.max(0, Number(saved.studyMinutes || 0)),
          joined_at: saved.joinedAt || new Date().toISOString(),
        },
      ]);
    } else {
      setClanStorageMode(null);
      setClan(null);
      setClanMembers([]);
      setClanStudyMinutes(0);
    }

    setClanLoading(false);
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
    setClan(null);
    setClanMembers([]);
    setClanStudyMinutes(0);
    setClanStorageMode(null);
    setClanMessage("You left the clan.");
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
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (data.user && !data.session) {
        setAuthMessage("Account created! Please check your email inbox to confirm registration.");
      } else {
        setAuthMessage("Account created and logged in!");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign up.");
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

      const importedEvents = normalizeGoogleCalendarEvents(allGoogleEvents).filter(
        (event) => !hiddenGoogleEventIds.includes(event.id)
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
      setCalendarSyncState("success");
      setCalendarSyncMessage(`${importedEvents.length} Google Calendar event${importedEvents.length === 1 ? "" : "s"} imported into this app.`);
    } catch (err: unknown) {
      setCalendarSyncState("error");
      setCalendarSyncMessage(
        err instanceof Error
          ? err.message
          : "Google Calendar import failed. Please try again."
      );
    }
  };

  const openCalendarDay = (date: string, googleEventId?: string) => {
    setZoomedCalendarDate(date);
    setEditingGoogleEventId(googleEventId || null);
  };

  const updateGoogleCalendarEvent = (
    eventId: string,
    updates: Partial<Pick<SyncedGoogleCalendarEvent, "title" | "color" | "icon">>
  ) => {
    setGoogleCalendarEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === eventId ? { ...event, ...updates } : event
      )
    );
  };

  const deleteGoogleCalendarEvent = (eventId: string) => {
    setGoogleCalendarEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== eventId)
    );
    setHiddenGoogleEventIds((currentIds) =>
      currentIds.includes(eventId) ? currentIds : [...currentIds, eventId]
    );
    setEditingGoogleEventId(null);
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

  const organizeCalendarWithAI = () => {
    type MatchTarget = { name: string; color: string; icon?: string };
    const targets: MatchTarget[] = [
      ...classes.map((c) => ({ name: c.name, color: c.color, icon: "📘" })),
      ...clubs.map((c) => ({ name: c.name, color: c.color || "#8B5CF6", icon: c.icon || "👥" })),
    ];

    let recoloredCount = 0;
    let dedupedCount = 0;

    setGoogleCalendarEvents((currentEvents) => {
      // 1. De-duplicate exact repeats: same title + same start date/time
      const seen = new Set<string>();
      const deduped = currentEvents.filter((event) => {
        const key = `${event.title.trim().toLowerCase()}|${event.startDate}|${event.startTime ?? ""}`;
        if (seen.has(key)) {
          dedupedCount += 1;
          return false;
        }
        seen.add(key);
        return true;
      });

      // 2. Match remaining events to a class/club by name and recolor + re-icon
      const recolored = deduped.map((event) => {
        let best: MatchTarget | undefined;
        let bestScore = 0;

        // Use a for...of loop so TypeScript can correctly narrow `best` below.
        for (const target of targets) {
          const score = nameSimilarity(event.title, target.name);
          if (score > bestScore) {
            bestScore = score;
            best = target;
          }
        }

        if (best && bestScore >= 0.5 && (event.color !== best.color || event.icon !== best.icon)) {
          recoloredCount += 1;
          return { ...event, color: best.color, icon: best.icon ?? event.icon };
        }
        return event;
      });

      return recolored;
    });

    setTimeout(() => {
      if (recoloredCount === 0 && dedupedCount === 0) {
        alert("✨ Your calendar is already organized — no changes needed.");
      } else {
        alert(
          `✨ Calendar organized!\n${recoloredCount} event${recoloredCount === 1 ? "" : "s"} matched to your classes/clubs and recolored.\n${dedupedCount} duplicate event${dedupedCount === 1 ? "" : "s"} removed.`
        );
      }
    }, 0);
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
    setGoogleCalendarEvents([]);
    setHiddenGoogleEventIds([]);
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
      setIsLoaded(false);
      loadUserData(activeId);
    } else {
      loadedUserIdRef.current = null;
      setClasses([]);
      setClubs([]);
      setTasks([]);
      setStreaks([]);
      setStudySessions([]);
      setGamificationXp(0);
      setGoogleCalendarEvents([]);
      setHiddenGoogleEventIds([]);
      setCalendarSyncState("idle");
      setCalendarSyncMessage(null);
      setIsLoaded(true);
    }
  });

  return () => {
    subscription.unsubscribe();
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
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
            if (Array.isArray(payload.new.data.classes))
              setClasses(
                withoutLegacyDemoItems(
                  payload.new.data.classes,
                  LEGACY_DEMO_CLASS_IDS
                )
              );
            if (Array.isArray(payload.new.data.clubs))
              setClubs(
                normalizeClubsData(
                  withoutLegacyDemoItems(
                    payload.new.data.clubs,
                    LEGACY_DEMO_CLUB_IDS
                  )
                )
              );
            if (Array.isArray(payload.new.data.tasks))
              setTasks(
                withoutLegacyDemoItems(
                  payload.new.data.tasks,
                  LEGACY_DEMO_TASK_IDS
                )
              );
            if (Array.isArray(payload.new.data.streaks))
              setStreaks(
                withoutLegacyDemoItems(
                  payload.new.data.streaks,
                  LEGACY_DEMO_STREAK_IDS
                )
              );
            if (Array.isArray(payload.new.data.studySessions))
              setStudySessions(
                payload.new.data.studySessions.filter(
                  (session: any) =>
                    session &&
                    typeof session.id === "string" &&
                    typeof session.date === "string" &&
                    typeof session.minutes === "number"
                )
              );
            if (typeof payload.new.data.gamificationXp === "number")
              setGamificationXp(Math.max(0, Math.floor(payload.new.data.gamificationXp)));
            const updatedHiddenGoogleEventIds = normalizeGoogleEventIds(
              payload.new.data.hiddenGoogleEventIds
            );
            setGoogleCalendarEvents(
              normalizeGoogleCalendarEvents(
                payload.new.data.googleCalendarEvents
              ).filter((event) => !updatedHiddenGoogleEventIds.includes(event.id))
            );
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

  // Immediately lock local state from Realtime overwrites during the 600ms debounce
  isSavingRef.current = true;

  localStorage.setItem(`tracker_classes_v8_${userId}`, JSON.stringify(classes));
  localStorage.setItem(`tracker_clubs_v8_${userId}`, JSON.stringify(clubs));
  localStorage.setItem(`tracker_tasks_v8_${userId}`, JSON.stringify(tasks));
  localStorage.setItem(`tracker_streaks_v8_${userId}`, JSON.stringify(streaks));
  localStorage.setItem(`tracker_study_sessions_v1_${userId}`, JSON.stringify(studySessions));
  localStorage.setItem(`tracker_gamification_xp_v1_${userId}`, JSON.stringify(gamificationXp));
  localStorage.setItem(
    `tracker_google_calendar_events_v1_${userId}`,
    JSON.stringify(googleCalendarEvents)
  );
  localStorage.setItem(
    `tracker_hidden_google_event_ids_v1_${userId}`,
    JSON.stringify(hiddenGoogleEventIds)
  );

  async function saveData() {
    setSyncStatus("syncing");
    try {
      const { error } = await supabase.from("user_data").upsert(
        {
          user_id: userId,
          data: {
            classes,
            clubs,
            tasks,
            streaks,
            studySessions,
            gamificationXp,
            googleCalendarEvents,
            hiddenGoogleEventIds,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) setSyncStatus("error");
      else setSyncStatus("synced");
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
  googleCalendarEvents,
  hiddenGoogleEventIds,
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
      setClasses((prev) => [...prev, ...extractedClasses]);
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
      setClubs((prev) => [...prev, ...extractedClubs]);
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
    const totalStudyHours = studySessions.reduce((sum, session) => sum + session.minutes / 60, 0);
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const completedTaskCount = tasks.filter((task) => task.completed).length;
    const pendingTaskCount = tasks.filter((task) => !task.completed).length;
    const missedDeadlineTasks = tasks.filter((task) => {
      if (task.completed || !task.dueDate) return false;
      const due = new Date(`${task.dueDate}T23:59:59`);
      return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
    });

    const classStudy = classes.map((cls) => {
      // Analytics should reflect completed focus sessions, not estimated/planned
      // task time. This prevents unfinished homework from looking like study time.
      const hours = studySessions
        .filter((session) => session.taskId)
        .filter((session) => {
          const task = tasks.find((candidate) => candidate.id === session.taskId);
          return task?.classId === cls.id;
        })
        .reduce((sum, session) => sum + session.minutes / 60, 0);
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
    }).sort((a, b) => b.hours - a.hours);

    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = formatDateKey(date);
      const minutes = studySessions
        .filter((session) => session.date === key)
        .reduce((sum, session) => sum + session.minutes, 0);
      const completed = tasks.filter((task) => task.completedAt?.slice(0, 10) === key).length;
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        minutes,
        hours: Number((minutes / 60).toFixed(1)),
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

    const weeklyGoalHours = 10;
    const weekHours = last7Days.reduce((sum, day) => sum + day.hours, 0);
    const weekCompleted = last7Days.reduce((sum, day) => sum + day.completed, 0);

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
      completionRate: tasks.length ? completedTaskCount / tasks.length : 0,
      todayLabel: today.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };
  }, [classes, tasks, studySessions, streaks]);

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

  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
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
            // The full 25-minute block is now fully recorded. Switch to break.
            focusRunRecordedMinutesRef.current = 25;
            focusRunBaseElapsedSecondsRef.current = 25 * 60;
            focusRunStartedAtRef.current = null;
            setIsTimerRunning(false);
            setTimerMode("break");
            setTimeLeft(5 * 60);
            return;
          }
        }
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setTimerMode("work");
            setTimeLeft(25 * 60);
            return 25 * 60;
          }
          return prev - 1;
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isTimerRunning, timerMode, selectedTimerTaskId, userId]);

  const toggleTimer = () => {
    if (timerMode === "work") {
      if (!selectedTimerTaskId && !isTimerRunning) {
        alert("Please select a target task first to track focus time!");
        return;
      }

      if (isTimerRunning) {
        endWorkRun();
        setIsTimerRunning(false);
        return;
      }

      focusRunTaskIdRef.current = selectedTimerTaskId;
      beginWorkRun(selectedTimerTaskId, false);
      setIsTimerRunning(true);
      return;
    }

    setIsTimerRunning((prev) => !prev);
  };

  // Start a fresh work session for a specific task. Partial minutes are still
  // recorded when the student pauses or resets before the timer reaches zero.
  const startFocusForTask = (taskId: string) => {
    if (!taskId) return;
    const taskExists = tasks.some((task) => task.id === taskId && !task.completed);
    if (!taskExists) return;

    setSelectedTimerTaskId(taskId);
    setTimerMode("work");
    setTimeLeft(25 * 60);
    beginWorkRun(taskId, true);
    setIsTimerRunning(true);
    setMobileTab("tasks");
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
    }
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
    setClasses((prev) => [...prev, newClass]);
    setSelectedClassId(newClass.id);
    setNewClassName("");
  };

  const deleteClass = (id: string) => {
    const remaining = classes.filter((c) => c.id !== id);
    setClasses(remaining);
    if (selectedClassId === id) {
      setSelectedClassId(remaining[0]?.id ?? "");
    }
    setTasks((prev) => prev.filter((t) => t.classId !== id));
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
    setClasses((prev) =>
      prev.map((c) =>
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
      )
    );
    cancelEditClass();
  };

  const updateManualGrade = (classId: string, grade: string) => {
    const val =
      grade.trim() === ""
        ? undefined
        : (grade.trim().toUpperCase() as StandardLevel);
    setClasses((prev) =>
      prev.map((cls) => (cls.id === classId ? { ...cls, manualGrade: val } : cls))
    );
  };

  const addMeetingTimeToClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetableClassId) return;

    const newMeeting: MeetingTime = {
      day: timetableDay,
      startTime: timetableStartTime,
      endTime: timetableEndTime,
    };

    setClasses((prev) =>
      prev.map((c) => {
        if (c.id !== timetableClassId) return c;
        return {
          ...c,
          meetingTimes: [...(c.meetingTimes || []), newMeeting],
        };
      })
    );
  };

  const removeMeetingTimeFromClass = (classId: string, indexToRemove: number) => {
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id !== classId) return c;
        return {
          ...c,
          meetingTimes: (c.meetingTimes || []).filter(
            (_, idx) => idx !== indexToRemove
          ),
        };
      })
    );
  };

  const addStandardToClass = (classId: string) => {
    if (!newStandardName.trim()) return;
    const newStd: StandardItem = {
      id: Date.now().toString(),
      name: newStandardName.trim(),
      levels: [],
    };
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === classId
          ? { ...cls, standards: [...(cls.standards || []), newStd] }
          : cls
      )
    );
    setNewStandardName("");
  };

  const deleteStandard = (classId: string, standardId: string) => {
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === classId
          ? {
              ...cls,
              standards: (cls.standards || []).filter((s) => s.id !== standardId),
            }
          : cls
      )
    );
  };

  const addGradeToStandard = (
    classId: string,
    standardId: string,
    level: StandardLevel
  ) => {
    setClasses((prev) =>
      prev.map((cls) =>
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
      )
    );
  };

  const removeGradeFromStandard = (
    classId: string,
    standardId: string,
    indexToRemove: number
  ) => {
    setClasses((prev) =>
      prev.map((cls) =>
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
      )
    );
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
    setClubs((prev) => [...prev, newClub]);
    setSelectedClubId(newClub.id);
    setNewClubName("");
    setNewClubRole("");
  };

  const updateClubIcon = (clubId: string, icon: string) => {
    setClubs((prev) =>
      prev.map((c) => (c.id === clubId ? { ...c, icon } : c))
    );
  };

  const deleteClub = (id: string) => {
    const remaining = clubs.filter((c) => c.id !== id);
    setClubs(remaining);
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
    setClubs((prev) =>
      prev.map((c) =>
        c.id !== clubId
          ? c
          : { ...c, meetingTimes: [...(c.meetingTimes || []), newSlot] }
      )
    );
  };

  const removeTimeslotFromClub = (clubId: string, indexToRemove: number) => {
    setClubs((prev) =>
      prev.map((c) =>
        c.id !== clubId
          ? c
          : {
              ...c,
              meetingTimes: (c.meetingTimes || []).filter(
                (_, idx) => idx !== indexToRemove
              ),
            }
      )
    );
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
    setStreaks((prev) => [...prev, newHabit]);
    setNewStreakName("");
  };

  const toggleStreakDate = (habitId: string, dateKey: string) => {
    setStreaks((prev) =>
      prev.map((habit) => {
        if (habit.id !== habitId) return habit;
        const updated = { ...habit.completedDates };
        if (updated[dateKey]) {
          delete updated[dateKey];
        } else {
          updated[dateKey] = true;
        }
        return { ...habit, completedDates: updated };
      })
    );
  };

  const deleteStreak = (habitId: string) => {
    setStreaks((prev) => prev.filter((h) => h.id !== habitId));
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
    setTasks((prev) => [...prev, newTask]);
    setTaskTitle("");
    setTaskDueDate("");
  };

  const toggleTask = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;

    const completing = !target.completed;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        return {
          ...task,
          completed: completing,
          completedAt: completing ? new Date().toISOString() : undefined,
          // Award completion XP only once for this task. Pre-existing completed
          // tasks have no xpAwarded flag and therefore do not grant XP at startup.
          xpAwarded: completing ? (task.xpAwarded ?? false) : task.xpAwarded,
        };
      })
    );

    if (completing && !target.xpAwarded) {
      setGamificationXp((prevXp) => prevXp + XP_PER_COMPLETED_TASK);
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, xpAwarded: true } : task
        )
      );
    }
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTimerTaskId === id) setSelectedTimerTaskId("");
  };

  const updateTaskScore = (id: string, scoreStr: string) => {
    const val = scoreStr.trim().toUpperCase();
    const isValidScore = (Object.keys(LETTER_POINTS) as string[]).includes(val);
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              score: isValidScore ? (val as StandardLevel) : undefined,
            }
          : task
      )
    );
  };

  const processRawSyllabus = () => {
    if (!rawSyllabusText.trim()) return;
    setIsParsing(true);
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);

    parseTimerRef.current = setTimeout(() => {
      const lines = rawSyllabusText.split("\n");
      const extracted: Partial<Task>[] = [];

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const dateMatch = trimmed.match(
          /\b(20\d\d[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d\d|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2})\b/i
        );

        const isExam = /exam|test|quiz|midterm|final/i.test(trimmed);

        if (dateMatch || isExam || trimmed.length > 5) {
          extracted.push({
            title: trimmed.replace(/[-:]/g, " ").slice(0, 45),
            dueDate: dateMatch ? "2026-10-01" : "2026-10-15",
            type: isExam ? "test" : "homework",
            estimatedHours: isExam ? 4 : 2,
          });
        }
      });

      setParsedItems(
        extracted.length > 0
          ? extracted.slice(0, 6)
          : [
              { title: "Syllabus Overview Quiz", dueDate: "2026-09-24", type: "homework", estimatedHours: 1 },
              { title: "Midterm Examination", dueDate: "2026-10-10", type: "test", estimatedHours: 5 },
              { title: "Term Research Paper", dueDate: "2026-11-05", type: "homework", estimatedHours: 6 },
            ]
      );
      setIsParsing(false);
    }, 1200);
  };

  const handleSyllabusUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);

    parseTimerRef.current = setTimeout(() => {
      const mockExtracted: Partial<Task>[] = [
        { title: `${file.name.replace(/\.[^/.]+$/, "")} Quiz`, dueDate: "2026-09-28", type: "homework", estimatedHours: 1 },
        { title: "Unit Assessment", dueDate: "2026-10-12", type: "test", estimatedHours: 4 },
        { title: "Final Cumulative Exam", dueDate: "2026-11-20", type: "test", estimatedHours: 6 },
      ];
      setParsedItems(mockExtracted);
      setIsParsing(false);
      e.target.value = "";
    }, 1500);
  };

  const importParsedTasks = () => {
    const targetClassId =
      classes.find((c) => c.id === selectedClassId)?.id || classes[0]?.id;
    if (!targetClassId) {
      alert("Add a class before importing tasks from a syllabus.");
      return;
    }
    const imported: Task[] = parsedItems.map((item, i) => ({
      id: (Date.now() + i).toString(),
      title: item.title || "Imported Task",
      classId: targetClassId,
      dueDate: item.dueDate || "",
      type: item.type || "homework",
      estimatedHours: item.estimatedHours || 2,
      actualHours: 0,
      completed: false,
    }));
    setTasks((prev) => [...prev, ...imported]);
    setParsedItems([]);
    alert(`Successfully imported ${imported.length} tasks!`);
  };

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
        ? googleCalendarEvents.filter((event) =>
            googleEventOccursOnDate(event, zoomedCalendarDate)
          )
        : [],
    [googleCalendarEvents, zoomedCalendarDate]
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

  const zoomedTasks = useMemo(
    () => (zoomedCalendarDate ? tasks.filter((t) => t.dueDate === zoomedCalendarDate) : []),
    [tasks, zoomedCalendarDate]
  );

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
    | { kind: "google"; sortKey: string; id: string; event: SyncedGoogleCalendarEvent }
    | { kind: "task"; sortKey: string; id: string; task: Task }
    | { kind: "class"; sortKey: string; id: string; cls: ClassItem; slot: MeetingTime }
    | { kind: "club"; sortKey: string; id: string; club: ClubItem; slot: ClubMeetingTime };

  // Everything on the zoomed day — Google Calendar events, tasks, Timetable
  // class sessions, and club meetings — merged into one time-ordered list.
  const zoomedDayItems = useMemo<ZoomedDayItem[]>(() => {
    const items: ZoomedDayItem[] = [];
    zoomedGoogleEvents.forEach((event) => {
      items.push({
        kind: "google",
        sortKey: event.allDay ? "0000" : event.startTime || "0000",
        id: `g-${event.id}`,
        event,
      });
    });
    zoomedTasks.forEach((task) => {
      items.push({ kind: "task", sortKey: "0000", id: `t-${task.id}`, task });
    });
    zoomedClassMeetings.forEach(({ cls, slot }, idx) => {
      items.push({
        kind: "class",
        sortKey: slot.startTime || "0000",
        id: `c-${cls.id}-${idx}`,
        cls,
        slot,
      });
    });
    zoomedClubMeetings.forEach(({ club, slot }, idx) => {
      items.push({
        kind: "club",
        sortKey: slot.startTime || "0000",
        id: `cl-${club.id}-${idx}`,
        club,
        slot,
      });
    });
    return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [zoomedGoogleEvents, zoomedTasks, zoomedClassMeetings, zoomedClubMeetings]);

  const editingGoogleEvent = googleCalendarEvents.find(
    (event) => event.id === editingGoogleEventId
  );
  const zoomedDateLabel = zoomedCalendarDate
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${zoomedCalendarDate}T12:00:00`))
    : "";

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
            <ChevronLeft size={14} /> Back to home
          </button>
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 mb-2">
              <GraduationCap size={36} />
            </div>
            <h1 className="text-2xl font-bold text-white">WJ Study</h1>
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
              <label className="text-xs font-semibold text-slate-300 block">School Email</label>
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
              <label className="text-xs font-semibold text-slate-300 block">Password</label>
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
                  <UserPlus size={16} /> Create Account
                </>
              ) : (
                <>
                  <LogIn size={16} /> Sign In
                </>
              )}
            </button>
          </form>

          {!isSignUp && (
            <div className="space-y-4">
              <div className="flex items-center gap-3" aria-hidden="true">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Or continue with
                </span>
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
                </span>
                Sign in with Google
              </button>
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

  // --- RENDER AUTHENTICATED DASHBOARD ---
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col pb-24 lg:pb-6 font-sans">
      {/* TOP HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between px-3 py-3 sm:p-4 bg-slate-900/80 border-b border-slate-800 gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <span>🎓</span> WJ Study
          </h1>
          <p className="hidden sm:block text-xs text-slate-400">
            PowerSchool & SchoolsBuddy AI Photo Scan, School Break Calendar, SBG Evaluation, Habit Streaks, XP & Schedule
          </p>
        </div>

        {/* Header Widgets */}
        <div className="flex w-full lg:w-auto flex-nowrap items-center gap-2.5 overflow-x-auto pb-1 self-start lg:self-auto">
          {/* User Account & Logout */}
          <div className="shrink-0 flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg text-xs min-h-10">
            <Users size={14} className="text-blue-400" />
            <span className="text-slate-300 font-medium truncate max-w-[120px] sm:max-w-[200px]">
              {session?.user?.email || "Student"}
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
              <div className="text-[9px] text-slate-400 font-bold uppercase">
                Cum GPA / Grade
              </div>
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
                aria-label="Reset focus timer"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* Focus Target Selector — kept beside the timer for quick access */}
          <div className="shrink-0 min-w-[275px] bg-slate-950/90 border border-slate-800 px-3.5 py-2.5 rounded-xl">
            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5 mb-1.5">
              <Clock size={14} className="text-blue-400" /> Focus Target
            </div>
            <select
              value={selectedTimerTaskId}
              onChange={(e) => setSelectedTimerTaskId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 px-2.5 py-2 rounded-lg text-xs sm:text-[11px] font-semibold text-white focus:outline-none focus:border-blue-500"
              aria-label="Focus target task"
            >
              <option value="">-- Choose a task --</option>
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
                <span className="text-[10px] text-emerald-400 hidden sm:inline">
                  Synced
                </span>
              </>
            )}
            {syncStatus === "syncing" && (
              <>
                <Cloud size={14} className="text-amber-400 animate-pulse" />
                <span className="text-[10px] text-amber-400 hidden sm:inline">
                  Syncing...
                </span>
              </>
            )}
            {syncStatus === "error" && (
              <>
                <CloudOff size={14} className="text-rose-400" />
                <span className="text-[10px] text-rose-400 hidden sm:inline">
                  Error
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 p-3 sm:p-4 max-w-7xl mx-auto w-full flex-1">
        {/* LEFT PANEL */}
        <aside
          className={`${
            mobileTab === "classes" ? "block" : "hidden"
          } lg:block lg:col-span-4 space-y-4 sm:space-y-6`}
        >
          {/* CLASS ROSTER WITH AI POWERSCHOOL PHOTO ANALYZER */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 space-y-4 sm:space-y-6 shadow-sm">
            {/* Class Roster Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <BookOpen size={14} className="text-blue-400" /> Class Roster
                </h2>

                {/* AI PHOTO SCAN BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  className="shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-2.5 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md transition min-h-9"
                  title="Scan PowerSchool Screenshot to add classes"
                >
                  <Sparkles size={13} className="animate-pulse" />
                  <span className="hidden sm:inline">AI PowerSchool Scan</span>
                </button>
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
                  <Plus size={14} /> Add
                </button>
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
                    <h3 className="text-xs font-bold text-white">
                      AI PowerSchool Photo Analyzer
                    </h3>
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
                        <span className="text-xs font-semibold text-slate-200">
                          Click to upload PowerSchool screenshot
                        </span>
                        <span className="text-[9px] text-slate-500">
                          Supports PNG, JPG, WEBP screenshots
                        </span>
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
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition"
                          >
                            Save
                          </button>
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
                          <span className="text-[10px] text-slate-400">
                            Grade:
                          </span>
                          <select
                            value={cls.manualGrade ?? ""}
                            onChange={(e) =>
                              updateManualGrade(cls.id, e.target.value)
                            }
                            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-center font-bold text-emerald-400 focus:outline-none"
                          >
                            <option value="">Auto</option>
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
                          >
                            Standards <ChevronRight size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clubs Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Users size={14} className="text-blue-400" /> Clubs
                </h2>

                {/* AI SCHOOLSBUDDY PHOTO SCAN BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowClubPhotoModal(true)}
                  className="shrink-0 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white px-2.5 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md transition min-h-9"
                  title="Scan SchoolsBuddy Screenshot to add clubs"
                >
                  <Sparkles size={13} className="animate-pulse" />
                  <span className="hidden sm:inline">AI SchoolsBuddy Scan</span>
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
                    <h3 className="text-xs font-bold text-white">
                      AI SchoolsBuddy Photo Analyzer
                    </h3>
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
                        <span className="text-xs font-semibold text-slate-200">
                          Click to upload SchoolsBuddy screenshot
                        </span>
                        <span className="text-[9px] text-slate-500">
                          Supports PNG, JPG, WEBP screenshots
                        </span>
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
                  <span className="text-[10px] text-slate-400 font-semibold block">Add Timeslot:</span>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <select
                      value={newClubMeetingDay}
                      onChange={(e) => setNewClubMeetingDay(e.target.value as DayOfWeek)}
                      className="flex-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-xs focus:outline-none text-slate-200"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
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
                  <Plus size={14} /> Add Club
                </button>
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
                          <div className="text-[10px] text-slate-500 italic">
                            No timeslots assigned
                          </div>
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
                              <Plus size={10} /> Slot
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </aside>

        {/* CENTER / MAIN PANEL */}
        <main className="lg:col-span-8 space-y-6">
          {/* TASKS VIEW */}
          <div
            className={`${
              mobileTab === "tasks" ? "block" : "hidden"
            } lg:block space-y-6`}
          >
            {/* MOBILE FOCUS TIMER */}
            <div className="lg:hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 via-slate-900 to-slate-950 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-300">
                    <Clock size={14} /> {timerMode === "work" ? "Focus" : "Break"}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-white">
                    {selectedTimerTaskId
                      ? tasks.find((task) => task.id === selectedTimerTaskId)?.title || "Focus session"
                      : "Choose a task to start focusing"}
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
                  {isTimerRunning ? "Pause" : "Start focus"}
                </button>
                <button
                  type="button"
                  onClick={resetTimer}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-300 transition hover:bg-slate-800"
                  aria-label="Reset focus timer"
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
                    <span className="text-[10px] font-bold text-blue-400 uppercase">
                      Recommended Focus Target
                    </span>
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
                >
                  Start Focus
                </button>
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
                      <option value="">Add a class first</option>
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
                    <span className="text-xs text-slate-400 pl-1">hrs</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={classes.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-xs transition"
                >
                  <Plus size={16} className="inline mr-2" /> Add Task
                </button>
              </form>
            </div>

            {/* Task List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <List size={18} className="text-blue-400" /> Schedule & Tasks
                </h2>
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
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter("pending")}
                      className={`px-2 py-0.5 rounded ${
                        taskFilter === "pending"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter("completed")}
                      className={`px-2 py-0.5 rounded ${
                        taskFilter === "completed"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {filteredTasks.length === 0 && (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No tasks match the filter.
                  </p>
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
                              {task.type}
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
              mobileTab === "planner" ||
              mobileTab === "analytics" ||
              mobileTab === "clan"
                ? "block"
                : "hidden"
            } lg:block space-y-6`}
          >
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <LayoutDashboard size={18} className="text-blue-400" /> Academic
                  Workspace
                </h2>
                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab("calendar")}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "calendar"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Calendar size={13} /> Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("standards")}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "standards"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Award size={13} /> Standards
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("streaks")}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "streaks"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Flame size={13} className="text-amber-400" /> Streaks
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("timetable")}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "timetable"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <CalendarDays size={13} /> Timetable
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("grades")}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "grades"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Calculator size={13} /> Grades
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("simulator")}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "simulator"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Sliders size={13} /> Grade Simulator
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("syllabus")}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "syllabus"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Upload size={13} /> Syllabus
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("planner");
                      setMobileTab("planner");
                    }}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "planner"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Brain size={13} /> AI Planner
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("analytics");
                      setMobileTab("analytics");
                    }}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "analytics"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <BarChart3 size={13} /> Analytics
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("clan");
                      setMobileTab("clan");
                    }}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-md text-xs font-semibold transition min-h-9 ${
                      activeTab === "clan"
                        ? "bg-violet-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Trophy size={13} /> Clan
                  </button>
                </div>
              </div>

              {/* TAB: CLAN */}
              {activeTab === "clan" && (
                <div className="space-y-4 pt-1">
                  <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 via-slate-950 to-slate-950 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <Trophy size={18} className="text-violet-400" /> Study Clan
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          Join a clan and compete on actual study time recorded by Focus sessions.
                        </p>
                      </div>
                      {clan && (
                        <div className="rounded-xl border border-violet-500/20 bg-slate-950/70 px-4 py-3 text-center">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">Your rank</div>
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
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                        <div className="text-sm font-bold text-white">Create a clan</div>
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
                          <span className="inline-flex items-center justify-center gap-2"><Trophy size={15} /> Create clan</span>
                        </button>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                        <div className="text-sm font-bold text-white">Join a clan</div>
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
                          <span className="inline-flex items-center justify-center gap-2"><UserPlus size={15} /> Join clan</span>
                        </button>
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
                          <div className="flex items-center gap-2 text-sm font-bold text-white"><Trophy size={16} className="text-amber-400" /> Study leaderboard</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">{clanStorageMode === "local" ? "Live" : "All-time"}</div>
                        </div>
                        <div className="divide-y divide-slate-800/70">
                          {clanMembers.map((member, index) => (
                            <div key={member.user_id} className={`flex items-center gap-3 px-4 py-3 ${member.user_id === userId ? "bg-violet-500/5" : ""}`}>
                              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${index === 0 ? "bg-amber-500/15 text-amber-300" : index === 1 ? "bg-slate-700/40 text-slate-200" : index === 2 ? "bg-orange-500/10 text-orange-300" : "bg-slate-900 text-slate-500"}`}>{index + 1}</div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-100">{member.display_name}{member.user_id === userId ? " (You)" : ""}</div>
                                <div className="mt-0.5 text-[10px] text-slate-500">Focus time</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-extrabold text-violet-300">{(member.study_minutes / 60).toFixed(1)}h</div>
                                <div className="text-[10px] text-slate-500">{member.study_minutes} min</div>
                              </div>
                            </div>
                          ))}
                          {clanMembers.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-500">No members yet.</div>}
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
                          <Brain size={18} className="text-blue-400" /> AI Study Planner
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          Builds a 7-day plan from work that still has time remaining, deadlines, tests, and time already logged. Planned time is not counted as completed study time.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center sm:min-w-44">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                          <div className="text-lg font-extrabold text-white">{aiStudyPlan.pendingCount}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Tasks</div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                          <div className="text-lg font-extrabold text-blue-400">{(aiStudyPlan.totalScheduledMinutes / 60).toFixed(1)}h</div>
                          <div className="text-[10px] text-slate-500 uppercase">Planned time</div>
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
                              <div className="rounded-xl border border-dashed border-slate-800 p-3 text-xs text-slate-500">
                                Use this as catch-up, review, or rest time.
                              </div>
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
                                  <Play size={12} /> Start focus on this task
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {aiStudyPlan.unscheduledTasks.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300"><AlertTriangle size={14} /> Some work does not fit in the next 7 days</div>
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
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Study time</div>
                      <div className="mt-1 text-2xl font-extrabold text-blue-400">{analytics.totalStudyHours.toFixed(1)}h</div>
                      <div className="mt-1 text-[10px] text-slate-500">tracked focus sessions</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Task completion</div>
                      <div className="mt-1 text-2xl font-extrabold text-emerald-400">{Math.round(analytics.completionRate * 100)}%</div>
                      <div className="mt-1 text-[10px] text-slate-500">{analytics.completedTaskCount} of {tasks.length}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">This week</div>
                      <div className="mt-1 text-2xl font-extrabold text-violet-400">{analytics.weekHours.toFixed(1)}h</div>
                      <div className="mt-1 text-[10px] text-slate-500">{analytics.weekCompleted} completed</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Missed deadlines</div>
                      <div className="mt-1 text-2xl font-extrabold text-rose-400">{analytics.missedDeadlineTasks.length}</div>
                      <div className="mt-1 text-[10px] text-slate-500">unfinished past due</div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><TrendingUp size={16} className="text-blue-400" /> Weekly study time</h3>
                          <p className="mt-0.5 text-[10px] text-slate-500">Focus sessions recorded by the app</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">Goal {analytics.weeklyGoalHours}h</span>
                      </div>
                      <div className="mt-5 flex h-40 items-end gap-2">
                        {analytics.last7Days.map((day) => {
                          const height = Math.max(6, Math.min(100, day.hours / 3 * 100));
                          return (
                            <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                              <span className="text-[10px] font-semibold text-slate-400">{day.hours ? `${day.hours}h` : ""}</span>
                              <div className="w-full max-w-10 rounded-t-lg bg-slate-900" style={{ height: `${height}%` }}>
                                <div className="h-full w-full rounded-t-lg bg-blue-500/70" />
                              </div>
                              <span className="text-[10px] text-slate-500">{day.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><BarChart3 size={16} className="text-emerald-400" /> Study time vs. grades</h3>
                          <p className="mt-0.5 text-[10px] text-slate-500">Hours logged on tasks for each class</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {analytics.classStudy.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">Add classes and log focus sessions to see class analytics.</div>
                        ) : analytics.classStudy.slice(0, 6).map((item) => {
                          const maxHours = Math.max(1, ...analytics.classStudy.map((entry) => entry.hours));
                          return (
                            <div key={item.id}>
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="min-w-0 truncate font-semibold text-slate-300">{item.name}</span>
                                <span className="shrink-0 font-mono text-slate-400">{item.letter} · {item.hours.toFixed(1)}h</span>
                              </div>
                              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-900">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(4, item.hours / maxHours * 100)}%`, backgroundColor: item.color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Flame size={16} className="text-amber-400" /> Streaks</h3>
                      <div className="mt-3 space-y-2">
                        {analytics.streakAnalytics.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-xs text-slate-500">Create a habit to start tracking streaks.</div>
                        ) : analytics.streakAnalytics.map((habit) => (
                          <div key={habit.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: habit.color }} />
                              <span className="truncate text-xs font-semibold text-slate-300">{habit.name}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3 text-[10px]">
                              <span className="text-amber-400 font-bold">🔥 {habit.current}</span>
                              <span className="text-slate-500">Best {habit.best}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-white"><AlertTriangle size={16} className="text-rose-400" /> Missed deadlines</h3>
                      <div className="mt-3 space-y-2">
                        {analytics.missedDeadlineTasks.length === 0 ? (
                          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-300"><CheckCircle2 size={15} /> No unfinished tasks are past due.</div>
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
                              >
                                Open
                              </button>
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
                      <p className="text-[11px] text-slate-400">
                        Academic Calendar showing school days, official breaks, and holidays.
                      </p>
                    </div>

                    <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 self-start sm:self-auto">
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
                        onClick={organizeCalendarWithAI}
                        disabled={googleCalendarEvents.length === 0}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                        title="Match synced events to your classes/clubs and clean up duplicates"
                      >
                        <Sparkles size={14} />
                        Organize with AI
                      </button>
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
                        >
                          Today
                        </button>
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
                    <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mr-1">
                      Legend:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-emerald-500/40 bg-slate-900" />
                      <span className="text-slate-300">School Day</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-amber-800/50 bg-amber-950/40" />
                      <span className="text-amber-200/90 font-medium">School Break / Holiday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-indigo-800/50 bg-indigo-950/40" />
                      <span className="text-indigo-200/90 font-medium">Staff PD (No Students)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-cyan-800/50 bg-cyan-950/40" />
                      <span className="text-cyan-200/90 font-medium">Early Dismissal</span>
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

                      // Filtered events
                      const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
                      const dayGoogleEvents = googleCalendarEvents.filter((event) =>
                        googleEventOccursOnDate(event, dateStr)
                      );

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
                              <span className="text-[8px] bg-blue-500/20 text-blue-300 font-bold px-1 rounded border border-blue-500/30">
                                Today
                              </span>
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
                            {dayGoogleEvents.map((event) => (
                              <button
                                type="button"
                                key={event.id}
                                onClick={(clickEvent) => {
                                  clickEvent.stopPropagation();
                                  openCalendarDay(dateStr, event.id);
                                }}
                                className="w-full text-left text-[9px] truncate px-1.5 py-0.5 rounded text-white font-medium transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/70"
                                style={{ backgroundColor: event.color }}
                                title={`${event.title}${event.startTime ? ` (${event.startTime}${event.endTime ? `–${event.endTime}` : ""})` : ""}${event.description ? `\n${event.description}` : ""}`}
                              >
                                <span className="mr-1 opacity-80">{event.icon}</span>
                                {event.title}
                                {event.startTime && (
                                  <span className="ml-1 font-mono opacity-80">{event.startTime}</span>
                                )}
                              </button>
                            ))}
                            {dayTasks.map((t) => (
                              <div
                                key={t.id}
                                className={`text-[9px] truncate px-1.5 py-0.5 rounded text-white font-medium ${
                                  t.type === "test"
                                    ? "bg-rose-600/90"
                                    : "bg-blue-600/90"
                                }`}
                                title={`Task: ${t.title}`}
                              >
                                {t.title}
                              </div>
                            ))}

                            {dayClassMeetings.map(({ cls, slot }, idx) => (
                              <div
                                key={`k-${cls.id}-${idx}`}
                                className="text-[9px] truncate px-1.5 py-0.5 rounded text-white font-semibold flex justify-between items-center"
                                style={{ backgroundColor: `${cls.color}CC` }}
                                title={`${cls.name} ${slot.startTime ? `(${slot.startTime}-${slot.endTime})` : ""}`}
                              >
                                <span className="truncate">📘 {cls.name}</span>
                                {slot.startTime && (
                                  <span className="text-[8px] font-mono opacity-80 shrink-0 ml-1">
                                    {slot.startTime}
                                  </span>
                                )}
                              </div>
                            ))}

                            {dayClubMeetings.map(({ club, slot }, idx) => (
                              <div
                                key={`c-${club.id}-${idx}`}
                                className="text-[9px] truncate px-1.5 py-0.5 rounded text-white font-semibold flex justify-between items-center"
                                style={{ backgroundColor: `${club.color || "#8B5CF6"}CC` }}
                                title={`${club.name} ${slot.startTime ? `(${slot.startTime}-${slot.endTime})` : ""}`}
                              >
                                <span className="truncate">{club.icon || "👥"} {club.name}</span>
                                {slot.startTime && (
                                  <span className="text-[8px] font-mono opacity-80 shrink-0 ml-1">
                                    {slot.startTime}
                                  </span>
                                )}
                              </div>
                            ))}
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
                          <p className="text-[10px] text-slate-400">
                            Standards-Based Grade Evaluation
                          </p>
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
                      >
                        Add
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {!activeClass.standards ||
                      activeClass.standards.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">
                          No standards added yet.
                        </p>
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
                  <p className="text-xs text-slate-500 text-center py-6">
                    No class selected.
                  </p>
                ))}

              {/* TAB: STREAKS */}
              {activeTab === "streaks" && (
                <div className="space-y-5 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 gap-3">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                        <Flame size={18} className="text-amber-500 fill-amber-500" /> Habit Streaks
                      </h3>
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
                      >
                        This Week
                      </button>
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
                      <Plus size={14} /> Add New Habit Streak
                    </h4>
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
                        <Plus size={14} /> Create Streak
                      </button>
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
                            <span className="text-[10px] text-slate-500">
                              Click checkmark to toggle
                            </span>
                          </div>

                          {streaks.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-xs">
                              No habit streaks created yet. Create one above to begin!
                            </div>
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
                                        <div className="text-[10px] text-slate-400 font-mono bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">
                                          Best: <strong className="text-slate-200">{bestStreak}d</strong>
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

              {/* TAB: TIMETABLE */}
              {activeTab === "timetable" && (() => {
                const weekDates = getWeekDates(timetableWeekBaseDate);
                const weekDateKeys = weekDates.map(formatDateKey);
                const todayKey = formatDateKey(new Date());
                const daysOfWeek: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

                // Google Calendar events + tasks are date-specific, so they're
                // resolved against the selected week (Mon–Sun) rather than
                // repeating every week like classes/clubs do.
                const weekGoogleEvents = weekDateKeys.map((dateKey) =>
                  googleCalendarEvents.filter((event) => googleEventOccursOnDate(event, dateKey))
                );
                const weekAllDayGoogleEvents = weekGoogleEvents.map((events) =>
                  events.filter((event) => event.allDay || !event.startTime)
                );
                const weekTimedGoogleEvents = weekGoogleEvents.map((events) =>
                  events.filter((event) => !event.allDay && event.startTime)
                );
                const weekTasks = weekDateKeys.map((dateKey) => tasks.filter((t) => t.dueDate === dateKey));

                return (
                <div className="space-y-4 pt-1 overflow-x-auto pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold">Weekly Class Schedule</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Week of {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · classes &amp; clubs repeat every week; Google Calendar events &amp; tasks shown are for this week
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
                        This Week
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

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1.5">
                      <Plus size={14} /> Add Class Session to Timetable
                    </h4>
                    <form
                      onSubmit={addMeetingTimeToClass}
                      className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
                    >
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">
                          Select Class
                        </label>
                        <select
                          value={timetableClassId}
                          onChange={(e) => setTimetableClassId(e.target.value)}
                          disabled={classes.length === 0}
                          className="w-full bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                        >
                          {classes.length === 0 && (
                            <option value="">Add a class first</option>
                          )}
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">
                          Day
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
                          {[
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                            "Sunday",
                          ].map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={timetableStartTime}
                          onChange={(e) => setTimetableStartTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={timetableEndTime}
                          onChange={(e) => setTimetableEndTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={classes.length === 0}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <Plus size={14} /> Add Slot
                      </button>
                    </form>
                  </div>

                  <div className="min-w-[700px] border border-slate-800 rounded-xl bg-slate-950/50 flex flex-col overflow-hidden select-none">
                    <div className="grid grid-cols-8 border-b border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 text-center py-2.5">
                      <div className="text-[10px] text-slate-500 flex items-center justify-center">Time</div>
                      {daysOfWeek.map((d, i) => (
                        <div key={d} className="flex flex-col items-center gap-0.5">
                          <span className={weekDateKeys[i] === todayKey ? "text-blue-400" : undefined}>{d.slice(0, 3)}</span>
                          <span className={`text-[9px] font-mono font-normal ${weekDateKeys[i] === todayKey ? "text-blue-400" : "text-slate-600"}`}>
                            {weekDates[i].getDate()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-8 border-b border-slate-800/80 bg-slate-950/70 min-h-[38px]">
                      <div className="p-1.5 border-r border-slate-800/80 text-[9px] font-mono text-slate-500 text-center flex items-center justify-center uppercase tracking-wide">
                        All day
                      </div>
                      {daysOfWeek.map((day, dayIndex) => (
                        <div key={day} className="p-1 border-r border-slate-800/40 space-y-1">
                          {weekAllDayGoogleEvents[dayIndex].map((event) => (
                            <div
                              key={`g-allday-${event.id}`}
                              className="px-1.5 py-0.5 rounded text-[9px] text-white font-semibold truncate flex items-center gap-1"
                              style={{ backgroundColor: event.color }}
                              title={event.title}
                            >
                              <span className="opacity-80 shrink-0">{event.icon}</span>
                              <span className="truncate">{event.title}</span>
                            </div>
                          ))}
                          {weekTasks[dayIndex].map((task) => (
                            <div
                              key={`task-${task.id}`}
                              className={`px-1.5 py-0.5 rounded text-[9px] text-white font-semibold truncate ${
                                task.type === "test" ? "bg-rose-600/90" : "bg-blue-600/90"
                              }`}
                              title={`Task: ${task.title}`}
                            >
                              {task.title}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
                      {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => {
                        const timeLabel = `${hour.toString().padStart(2, "0")}:00`;

                        return (
                          <div key={hour} className="grid grid-cols-8 min-h-[50px]">
                            <div className="p-2 border-r border-slate-800/80 text-[10px] font-mono text-slate-500 text-center flex items-center justify-center bg-slate-900/30">
                              {timeLabel}
                            </div>
                            {daysOfWeek.map((day, dayIndex) => {
                              const classMatches = classes.flatMap((cls) =>
                                (cls.meetingTimes || [])
                                  .filter((m) => {
                                    if (m.day !== day) return false;
                                    const startHour = parseInt(m.startTime.split(":")[0], 10);
                                    return startHour === hour;
                                  })
                                  .map((m, idx) => ({ cls, meeting: m, index: idx }))
                              );

                              const clubMatches = clubs.flatMap((club) =>
                                (club.meetingTimes || [])
                                  .filter((m) => {
                                    if (m.day !== day) return false;
                                    const startHour = parseInt(m.startTime.split(":")[0], 10);
                                    return startHour === hour;
                                  })
                                  .map((m) => ({ club, meeting: m }))
                              );

                              const googleMatches = weekTimedGoogleEvents[dayIndex].filter((event) => {
                                const startHour = parseInt((event.startTime as string).split(":")[0], 10);
                                return startHour === hour;
                              });

                              return (
                                <div key={day} className="p-1 border-r border-slate-800/40 relative space-y-1">
                                  {classMatches.map(({ cls, meeting, index }) => (
                                    <div
                                      key={`c-slot-${cls.id}-${index}`}
                                      className="p-1.5 rounded text-[10px] text-white font-semibold flex flex-col justify-between shadow-sm group relative"
                                      style={{ backgroundColor: cls.color }}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold truncate">{cls.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => removeMeetingTimeFromClass(cls.id, index)}
                                          className="opacity-0 group-hover:opacity-100 transition text-white hover:text-rose-200"
                                          title="Remove session"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                      <div className="text-[9px] opacity-90 font-mono">
                                        {meeting.startTime} - {meeting.endTime}
                                      </div>
                                    </div>
                                  ))}

                                  {clubMatches.map(({ club, meeting }, cIdx) => (
                                    <div
                                      key={`club-slot-${club.id}-${cIdx}`}
                                      className="p-1.5 rounded text-[10px] text-white font-semibold flex flex-col justify-between shadow-sm"
                                      style={{ backgroundColor: club.color || "#8B5CF6" }}
                                    >
                                      <div className="font-bold truncate flex items-center gap-1">
                                        <span>{club.icon || "👥"}</span>
                                        <span>{club.name}</span>
                                      </div>
                                      <div className="text-[9px] opacity-90 font-mono">
                                        {meeting.startTime} - {meeting.endTime}
                                      </div>
                                    </div>
                                  ))}

                                  {googleMatches.map((event) => (
                                    <div
                                      key={`g-slot-${event.id}`}
                                      className="p-1.5 rounded text-[10px] text-white font-semibold flex flex-col justify-between shadow-sm"
                                      style={{ backgroundColor: event.color }}
                                    >
                                      <div className="font-bold truncate flex items-center gap-1">
                                        <span>{event.icon}</span>
                                        <span className="truncate">{event.title}</span>
                                      </div>
                                      <div className="text-[9px] opacity-90 font-mono">
                                        {event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
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
                        <GraduationCap size={18} className="text-emerald-400" /> Academic Performance Summary
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Overview of current grades, targets, and cumulative GPA status across all enrolled subjects.
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Cumulative GPA</span>
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
                                <span className="text-[10px] text-slate-400 block font-semibold">Target Grade</span>
                                <select
                                  value={cls.targetGrade || "A"}
                                  onChange={(e) => {
                                    const val = e.target.value as StandardLevel;
                                    setClasses((prev) =>
                                      prev.map((c) => (c.id === cls.id ? { ...c, targetGrade: val } : c))
                                    );
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
                                <span className="text-[10px] text-slate-400 block font-semibold">Current Grade</span>
                                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                                  {currentGrade} {sbg.gpa > 0 && !cls.manualGrade ? `(${sbg.gpa.toFixed(2)})` : ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-[11px]">Status:</span>
                              {currentGrade === "N/A" ? (
                                <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                                  No evaluations yet
                                </span>
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
                      <Sliders size={18} className="text-blue-400" /> Target Grade Simulator
                    </h3>
                    <p className="text-xs text-slate-400">
                      Calculate required average scores on upcoming standards to reach your target grade.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Parameters Form */}
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-4">
                      <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1.5">
                        <Target size={14} /> Course Parameters
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-400 font-semibold block mb-1">
                            Active Course
                          </label>
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
                          <label className="text-xs text-slate-400 font-semibold block mb-1">
                            Current Grade Level
                          </label>
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
                          <label className="text-xs text-slate-400 font-semibold block mb-1">
                            Desired Target Grade
                          </label>
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
                            <span>Select Standard(s) Being Tested:</span>
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
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                      SIMULATION RESULT
                    </h3>
                    <h2 className="mt-1 text-lg font-bold text-white">
                      Required Score on Selected Standard(s)
                    </h2>

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
                          <span>✨</span> Target Breakdown:
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          {requiredFinalGrade.message}
                        </p>
                      </div>
                    </div>
                  </div>

                      <div className="text-[11px] text-slate-400 space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800/60">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                          <Sparkles size={13} className="text-amber-400" /> Target Breakdown:
                        </div>
                      <p className="leading-relaxed">
                        To achieve <strong className="text-blue-400">{simTargetGrade}</strong>,
                        you must score an average of at least{" "}
                        <strong className="text-emerald-400">{requiredFinalGrade.letter}</strong> ({requiredFinalGrade.points} pts) on the{" "}
                        <strong>{selectedStandardsForExam.length}</strong> selected standard(s).
                      </p>
                      </div>
                    </div>
                  </div>
              )}

              {/* TAB: SYLLABUS */}
              {activeTab === "syllabus" && (
                <div className="space-y-4 pt-1">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Upload size={18} className="text-blue-400" /> Syllabus AI Task Extractor
                    </h3>
                    <p className="text-xs text-slate-400">
                      Paste syllabus text or upload course outline to automatically extract key exam dates, homework deadlines, and import them into your schedule.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1.5">
                        <BookOpen size={14} /> Paste or Upload Syllabus
                      </h4>

                      <textarea
                        rows={6}
                        placeholder="Paste raw course syllabus, schedule, or assessment dates here..."
                        value={rawSyllabusText}
                        onChange={(e) => setRawSyllabusText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-200"
                      />

                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <button
                          type="button"
                          onClick={processRawSyllabus}
                          disabled={isParsing || !rawSyllabusText.trim()}
                          className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          {isParsing ? (
                            <Sparkles size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          {isParsing ? "Extracting..." : "Parse Text"}
                        </button>

                        <label className="w-full sm:w-auto cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-300 font-semibold flex items-center justify-center gap-1.5 transition">
                          <Upload size={14} />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept=".txt,.pdf,.doc,.docx"
                            onChange={handleSyllabusUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1.5">
                            <Check size={14} /> Extracted Items ({parsedItems.length})
                          </h4>
                          {parsedItems.length > 0 && (
                            <button
                              type="button"
                              onClick={importParsedTasks}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded transition flex items-center gap-1"
                            >
                              <Plus size={12} /> Import All
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto">
                          {isParsing && (
                            <p className="text-xs text-slate-400 py-8 text-center animate-pulse">
                              Analyzing syllabus text & dates...
                            </p>
                          )}
                          {!isParsing && parsedItems.length === 0 && (
                            <p className="text-xs text-slate-500 py-8 text-center">
                              No items extracted yet. Paste text or upload a syllabus file to preview detected assignments.
                            </p>
                          )}
                          {!isParsing &&
                            parsedItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-slate-200 block truncate">
                                    {item.title}
                                  </span>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                    <span>Due: {item.dueDate || "N/A"}</span>
                                    <span>Est: {item.estimatedHours}h</span>
                                  </div>
                                </div>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                                    item.type === "test"
                                      ? "bg-rose-500/20 text-rose-400"
                                      : "bg-indigo-500/20 text-indigo-400"
                                  }`}
                                >
                                  {item.type}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {parsedItems.length > 0 && (
                        <div className="text-[10px] text-slate-400 italic bg-slate-900/50 p-2 rounded border border-slate-800 text-center">
                          Imported tasks will be assigned to{" "}
                          <strong className="text-slate-200">{activeClass?.name || "selected course"}</strong>.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {zoomedCalendarDate && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => {
            setZoomedCalendarDate(null);
            setEditingGoogleEventId(null);
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
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Day view</p>
                <h2 id="calendar-day-title" className="mt-1 text-xl font-bold text-white">
                  {zoomedDateLabel}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {zoomedDayItems.length} event{zoomedDayItems.length === 1 ? "" : "s"} scheduled
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setZoomedCalendarDate(null);
                  setEditingGoogleEventId(null);
                }}
                className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Close day view"
              >
                <X size={18} />
              </button>
            </div>

            {zoomedDayItems.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                Nothing scheduled for this day — no Google Calendar events, classes, tasks, or club meetings.
              </p>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Events</h3>
                  {zoomedDayItems.map((item) => {
                    if (item.kind === "google") {
                      const event = item.event;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setEditingGoogleEventId(event.id)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            editingGoogleEventId === event.id
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

                    if (item.kind === "task") {
                      const task = item.task;
                      const taskClass = classes.find((c) => c.id === task.classId);
                      return (
                        <div
                          key={item.id}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold text-white ${
                                task.type === "test" ? "bg-rose-600" : "bg-blue-600"
                              }`}
                            >
                              {task.type === "test" ? "📝" : "📚"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-100">{task.title}</span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                {taskClass ? `${taskClass.name} · ` : ""}{task.type === "test" ? "Test" : "Homework"}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (item.kind === "class") {
                      const { cls, slot } = item;
                      return (
                        <div
                          key={item.id}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold text-white"
                              style={{ backgroundColor: cls.color }}
                            >
                              📘
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-100">{cls.name}</span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                Class (Timetable){slot.startTime ? ` · ${slot.startTime}${slot.endTime ? ` – ${slot.endTime}` : ""}` : ""}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const { club, slot } = item;
                    return (
                      <div
                        key={item.id}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold text-white"
                            style={{ backgroundColor: club.color || "#8B5CF6" }}
                          >
                            {club.icon || "👥"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-100">{club.name}</span>
                            <span className="mt-0.5 block text-xs text-slate-400">
                              Club{slot.startTime ? ` · ${slot.startTime}${slot.endTime ? ` – ${slot.endTime}` : ""}` : ""}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {editingGoogleEvent ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <span
                        className="grid h-8 w-8 place-items-center rounded-lg text-base font-bold text-white"
                        style={{ backgroundColor: editingGoogleEvent.color }}
                      >
                        {editingGoogleEvent.icon}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white">Customize event</h3>
                        <p className="text-[11px] text-slate-400">Saved in this app only</p>
                      </div>
                    </div>

                    <label className="block text-xs font-semibold text-slate-300">
                      Name
                      <input
                        value={editingGoogleEvent.title}
                        onChange={(changeEvent) =>
                          updateGoogleCalendarEvent(editingGoogleEvent.id, {
                            title: changeEvent.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
                      />
                    </label>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
                      <label className="block text-xs font-semibold text-slate-300">
                        Logo / icon
                        <input
                          value={editingGoogleEvent.icon}
                          onChange={(changeEvent) =>
                            updateGoogleCalendarEvent(editingGoogleEvent.id, {
                              icon: changeEvent.target.value.slice(0, 4) || "G",
                            })
                          }
                          maxLength={4}
                          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-300">
                        Color
                        <input
                          type="color"
                          value={editingGoogleEvent.color}
                          onChange={(changeEvent) =>
                            updateGoogleCalendarEvent(editingGoogleEvent.id, {
                              color: changeEvent.target.value,
                            })
                          }
                          className="mt-1.5 h-9 w-14 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-1"
                        />
                      </label>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-400">
                      <p>
                        {editingGoogleEvent.allDay
                          ? "All-day event"
                          : `${editingGoogleEvent.startTime || "Time not set"}${editingGoogleEvent.endTime ? ` – ${editingGoogleEvent.endTime}` : ""}`}
                      </p>
                      {editingGoogleEvent.description && (
                        <p className="mt-2 whitespace-pre-wrap text-slate-300">{editingGoogleEvent.description}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete “${editingGoogleEvent.title}” from this app? It will remain in Google Calendar.`
                          )
                        ) {
                          deleteGoogleCalendarEvent(editingGoogleEvent.id);
                        }
                      }}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                    >
                      <Trash2 size={14} /> Delete from this app
                    </button>
                  </div>
                ) : (
                  <div className="grid place-items-center rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                    Select a Google Calendar event to customize it. Classes, tasks, and club meetings are managed from their own tabs.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900/95 px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
        <div className="mx-auto grid max-w-xl grid-cols-6 items-center">
          <button type="button" onClick={() => setMobileTab("classes")} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${mobileTab === "classes" ? "text-blue-400" : "text-slate-400"}`}><BookOpen size={18} /><span>Classes</span></button>
          <button type="button" onClick={() => setMobileTab("tasks")} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${mobileTab === "tasks" ? "text-blue-400" : "text-slate-400"}`}><List size={18} /><span>Tasks</span></button>
          <button type="button" onClick={() => { setMobileTab("planner"); setActiveTab("planner"); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${mobileTab === "planner" ? "text-blue-400" : "text-slate-400"}`}><Brain size={18} /><span>Planner</span></button>
          <button type="button" onClick={() => { setMobileTab("analytics"); setActiveTab("analytics"); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${mobileTab === "analytics" ? "text-violet-400" : "text-slate-400"}`}><BarChart3 size={18} /><span>Analytics</span></button>
          <button type="button" onClick={() => { setMobileTab("calendar"); setActiveTab("calendar"); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${mobileTab === "calendar" && activeTab === "calendar" ? "text-blue-400" : "text-slate-400"}`}><Calendar size={18} /><span>Calendar</span></button>
          <button type="button" onClick={() => { setMobileTab("clan"); setActiveTab("clan"); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${mobileTab === "clan" ? "text-violet-400" : "text-slate-400"}`}><Trophy size={18} /><span>Clan</span></button>
        </div>
      </nav>
    </div>
  );
}


