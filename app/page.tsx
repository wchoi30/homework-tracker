"use client";

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
} from "lucide-react";

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
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:30"
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
  score?: StandardLevel;
};

export type StreakHabit = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  completedDates: Record<string, boolean>; // Key format "YYYY-MM-DD"
};

export const CLUB_ICON_OPTIONS = ["👥", "🤖", "🏐", "⚽", "🏀", "🎨", "🎭", "🎵", "♟️", "💻", "🚀", "📖"];

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

// Date Key Helper ("YYYY-MM-DD")
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Week Dates Helper (Returns array of 7 Date objects starting from Monday)
export function getWeekDates(baseDate: Date): Date[] {
  const dayOfWeek = baseDate.getDay(); // 0 is Sun, 1 is Mon...
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

// Calculate Current Streak Length
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

// Calculate Longest/Best Streak
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

// Data Migration Helper for legacy Club formats
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

// --- MAIN COMPONENT ---
export default function AcademicOSDashboard() {
  // Navigation & Layout States
  const [mobileTab, setMobileTab] = useState<
    "classes" | "tasks" | "calendar" | "timetable" | "ai" | "simulator" | "streaks"
  >("tasks");
  const [activeTab, setActiveTab] = useState<
    "standards" | "calendar" | "timetable" | "grades" | "simulator" | "syllabus" | "streaks"
  >("standards");

  // Filtering & Sorting States
  const [taskFilter, setTaskFilter] = useState<
    "all" | "pending" | "completed" | "tests" | "homework"
  >("all");
  const [taskSort, setTaskSort] = useState<"dueDate" | "priority" | "title">(
    "dueDate"
  );

  // Calendar Dynamic Navigation State
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // Data States
  const [classes, setClasses] = useState<ClassItem[]>([
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
  ]);

  const [clubs, setClubs] = useState<ClubItem[]>([
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
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "101",
      title: "Midterm Physics Exam",
      classId: "2",
      dueDate: "2026-09-25",
      type: "test",
      estimatedHours: 4,
      actualHours: 1.5,
      completed: false,
      score: undefined,
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
  ]);

  // Streaks State
  const [streaks, setStreaks] = useState<StreakHabit[]>([
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
    {
      id: "str-3",
      name: "Exercise / Gym",
      color: "#F59E0B",
      createdAt: "2026-09-10",
      completedDates: {
        "2026-09-19": true,
        "2026-09-21": true,
      },
    },
  ]);

  const [selectedClassId, setSelectedClassId] = useState<string>("1");
  const [selectedClubId, setSelectedClubId] = useState<string>("c1");

  // Sync & Load States
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">(
    "synced"
  );
  const [userId, setUserId] = useState<string | null>(null);
  const isSavingRef = useRef(false);
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevClassIdRef = useRef<string>(selectedClassId);

  // Class Form States
  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState("#3B82F6");
  const [newStandardName, setNewStandardName] = useState("");

  // Club Form States
  const [newClubName, setNewClubName] = useState("");
  const [newClubRole, setNewClubRole] = useState("");
  const [newClubIcon, setNewClubIcon] = useState("👥");
  const [newClubMeetingDay, setNewClubMeetingDay] = useState<DayOfWeek>("Thursday");
  const [newClubColor, setNewClubColor] = useState("#EC4899");
  const [newClubStartTime, setNewClubStartTime] = useState("16:00");
  const [newClubEndTime, setNewClubEndTime] = useState("17:30");

  // Club Extra Timeslot Form States
  const [addClubSlotDay, setAddClubSlotDay] = useState<DayOfWeek>("Tuesday");
  const [addClubSlotStart, setAddClubSlotStart] = useState("15:30");
  const [addClubSlotEnd, setAddClubSlotEnd] = useState("17:00");

  // Task Form States
  const [taskTitle, setTaskTitle] = useState("");
  const [taskClassId, setTaskClassId] = useState("1");
  const [taskType, setTaskType] = useState<TaskCategory>("homework");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskHours, setTaskHours] = useState("1");

  // Streak Form & Navigation States
  const [newStreakName, setNewStreakName] = useState("");
  const [newStreakColor, setNewStreakColor] = useState("#3B82F6");
  const [streakWeekBaseDate, setStreakWeekBaseDate] = useState<Date>(new Date());

  // Timetable Add Session Form States
  const [timetableClassId, setTimetableClassId] = useState<string>("1");
  const [timetableDay, setTimetableDay] = useState<DayOfWeek>("Monday");
  const [timetableStartTime, setTimetableStartTime] = useState<string>("09:00");
  const [timetableEndTime, setTimetableEndTime] = useState<string>("10:30");

  // Pomodoro Timer States
  const [selectedTimerTaskId, setSelectedTimerTaskId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");

  // Syllabus Parsing States
  const [isParsing, setIsParsing] = useState(false);
  const [rawSyllabusText, setRawSyllabusText] = useState("");
  const [parsedItems, setParsedItems] = useState<Partial<Task>[]>([]);

  // Grade Simulator States
  const [simCurrentGrade, setSimCurrentGrade] = useState<StandardLevel>("B+");
  const [simTargetGrade, setSimTargetGrade] = useState<StandardLevel>("A");

  // Init Data from Supabase / LocalStorage Fallback
  useEffect(() => {
    async function initUserAndData() {
      setSyncStatus("syncing");
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const currentUserId = user?.id ?? "anonymous_user";
        setUserId(currentUserId);

        const { data, error } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", currentUserId)
          .single();

        if (!error && data && data.data) {
          if (Array.isArray(data.data.classes)) setClasses(data.data.classes);
          if (Array.isArray(data.data.clubs)) setClubs(normalizeClubsData(data.data.clubs));
          if (Array.isArray(data.data.tasks)) setTasks(data.data.tasks);
          if (Array.isArray(data.data.streaks)) setStreaks(data.data.streaks);
          setSyncStatus("synced");
        } else {
          setClasses((prev) => safeStorageGet("tracker_classes_v8", prev));
          setClubs((prev) => normalizeClubsData(safeStorageGet("tracker_clubs_v8", prev)));
          setTasks((prev) => safeStorageGet("tracker_tasks_v8", prev));
          setStreaks((prev) => safeStorageGet("tracker_streaks_v8", prev));
          setSyncStatus("synced");
        }
      } catch (err) {
        setSyncStatus("error");
      } finally {
        setIsLoaded(true);
      }
    }
    initUserAndData();
    return () => {
      if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    };
  }, []);

  // Supabase Realtime Listener
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
              setClasses(payload.new.data.classes);
            if (Array.isArray(payload.new.data.clubs))
              setClubs(normalizeClubsData(payload.new.data.clubs));
            if (Array.isArray(payload.new.data.tasks))
              setTasks(payload.new.data.tasks);
            if (Array.isArray(payload.new.data.streaks))
              setStreaks(payload.new.data.streaks);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Persist Data Local & Supabase
  useEffect(() => {
    if (!isLoaded || !userId) return;
    localStorage.setItem("tracker_classes_v8", JSON.stringify(classes));
    localStorage.setItem("tracker_clubs_v8", JSON.stringify(clubs));
    localStorage.setItem("tracker_tasks_v8", JSON.stringify(tasks));
    localStorage.setItem("tracker_streaks_v8", JSON.stringify(streaks));

    async function saveData() {
      setSyncStatus("syncing");
      isSavingRef.current = true;
      try {
        const { error } = await supabase.from("user_data").upsert(
          {
            user_id: userId,
            data: { classes, clubs, tasks, streaks },
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
  }, [classes, clubs, tasks, streaks, isLoaded, userId]);

  // Keep task selection and timetable selection valid when classes change
  useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.id === taskClassId)) {
      setTaskClassId(classes[0].id);
    }
    if (classes.length > 0 && !classes.some((c) => c.id === timetableClassId)) {
      setTimetableClassId(classes[0].id);
    }
  }, [classes, taskClassId, timetableClassId]);

  // Derived Calculations
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

  // Active objects & Calendar calculations
  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const activeClub = clubs.find((c) => c.id === selectedClubId) || clubs[0];

  const existingTestCount = useMemo(() => {
    if (!activeClass || !activeClass.standards) return 0;
    return activeClass.standards.reduce(
      (acc, std) => acc + (std.levels ? std.levels.length : 0),
      0
    );
  }, [activeClass]);

  // Required Grade Calculation for Next Test
  const requiredFinalGrade = useMemo(() => {
    const N = Math.max(1, existingTestCount);
    const currPts = parseGradeToPoints(simCurrentGrade) ?? 3.0;
    const targetPts = parseGradeToPoints(simTargetGrade) ?? 4.0;

    const reqPts = (N + 1) * targetPts - N * currPts;

    return {
      letter: pointsToLetter(Math.max(0, reqPts)),
      points: Math.round(reqPts * 100) / 100,
    };
  }, [simCurrentGrade, simTargetGrade, existingTestCount]);

  // Sync current selected class grade & target into simulator when class changes
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

  // Pomodoro Timer Logic
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          if (timerMode === "work") {
            if (selectedTimerTaskId) {
              setTasks((prevTasks) =>
                prevTasks.map((t) =>
                  t.id === selectedTimerTaskId
                    ? {
                        ...t,
                        actualHours: +(
                          (t.actualHours || 0) +
                          25 / 60
                        ).toFixed(2),
                      }
                    : t
                )
              );
            }
            setTimerMode("break");
            return 5 * 60;
          } else {
            setTimerMode("work");
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timerMode, selectedTimerTaskId]);

  const toggleTimer = () => {
    if (!selectedTimerTaskId && timerMode === "work" && !isTimerRunning) {
      alert("Please select a target task first to track focus time!");
      return;
    }
    setIsTimerRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMode === "work" ? 25 * 60 : 5 * 60);
  };

  // Logic Handlers: Class Roster
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

  const updateManualGrade = (classId: string, grade: string) => {
    const val =
      grade.trim() === ""
        ? undefined
        : (grade.trim().toUpperCase() as StandardLevel);
    setClasses((prev) =>
      prev.map((cls) => (cls.id === classId ? { ...cls, manualGrade: val } : cls))
    );
  };

  // Logic Handlers: Timetable Sessions
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

  // Logic Handlers: Standards
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

  // Logic Handlers: Clubs & Multiple Timeslots
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

  // Logic Handlers: Streaks & Habits
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

  // Logic Handlers: Tasks
  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const validClassId = classes.some((c) => c.id === taskClassId)
      ? taskClassId
      : classes[0]?.id ?? "1";
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

  const toggleTask = (id: string) =>
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );

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

  // Syllabus Parsing Handler
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
      classes.find((c) => c.id === selectedClassId)?.id || classes[0]?.id || "1";
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

  // Calendar Calculation derived from currentCalendarDate State
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

  // Navigation Handlers for Month Switch
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 lg:pb-6 font-sans">
      {/* TOP HEADER */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>🎓</span> Academic OS & Tracker
          </h1>
          <p className="text-xs text-slate-400">
            Standards-Based Grading, Habit Streaks, Focus Timer, Timetable & Grade Calculator
          </p>
        </div>

        {/* Header Widgets */}
        <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
          {/* GPA Summary */}
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
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

          {/* Pomodoro Timer Widget */}
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-3">
            <div>
              <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Flame size={12} className="text-amber-500" /> Focus ({timerMode})
              </div>
              <div className="text-sm font-mono font-bold text-blue-400">
                {Math.floor(timeLeft / 60)}:
                {timeLeft % 60 < 10 ? "0" : ""}
                {timeLeft % 60}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={toggleTimer}
                className="p-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition"
                title={isTimerRunning ? "Pause" : "Start"}
              >
                {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <button
                type="button"
                onClick={resetTimer}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                title="Reset"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto w-full flex-1">
        {/* LEFT PANEL */}
        <aside
          className={`${
            mobileTab === "classes" ? "block" : "hidden"
          } lg:block lg:col-span-4 space-y-6`}
        >
          {/* CLASS ROSTER & CLUBS PANEL */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
            {/* Class Roster Section */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <BookOpen size={14} className="text-blue-400" /> Class Roster
              </h2>
              <form onSubmit={addClass} className="flex gap-2">
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
                  className="h-8 w-8 bg-transparent cursor-pointer rounded border border-slate-800"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </form>

              <div className="space-y-2.5 pt-1">
                {classes.map((cls) => {
                  const sbgGrade = calculateOverallGrade(cls.standards);
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
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cls.color }}
                          />
                          <span className="font-semibold text-sm">
                            {cls.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteClass(cls.id)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {cls.roomNumber && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin size={10} /> {cls.roomNumber} {cls.professorName ? `• ${cls.professorName}` : ""}
                        </div>
                      )}
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
                          <span className="font-extrabold text-emerald-400 text-xs">
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
              <h2 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Users size={14} className="text-blue-400" /> Clubs
              </h2>

              <form onSubmit={addClub} className="space-y-2">
                <div className="flex gap-2 items-center">
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
                    className="w-16 bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-xs focus:outline-none"
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
                  <div className="flex gap-1.5 items-center">
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
                      className="w-20 bg-slate-950 border border-slate-800 px-1 py-1 rounded text-[11px] focus:outline-none text-slate-200"
                      title="Start Time"
                    />
                    <span className="text-slate-500 text-xs">-</span>
                    <input
                      type="time"
                      value={newClubEndTime}
                      onChange={(e) => setNewClubEndTime(e.target.value)}
                      className="w-20 bg-slate-950 border border-slate-800 px-1 py-1 rounded text-[11px] focus:outline-none text-slate-200"
                      title="End Time"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition mt-1"
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

          {/* TIMER TARGET PICKER */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Clock size={14} className="text-blue-400" /> Focus Target
            </h3>
            <select
              value={selectedTimerTaskId}
              onChange={(e) => setSelectedTimerTaskId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Choose Focus Task --</option>
              {tasks
                .filter((t) => !t.completed)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.type.toUpperCase()}] {t.title}
                  </option>
                ))}
            </select>
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
            {/* Priority Banner */}
            {topPriorityTask && (
              <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between gap-4">
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
                  onClick={() => setSelectedTimerTaskId(topPriorityTask.id)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg text-white whitespace-nowrap transition"
                >
                  Start Focus
                </button>
              </div>
            )}

            {/* Add Task Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
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
                    className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                  >
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
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-xs transition"
                >
                  <Plus size={16} className="inline mr-2" /> Add Task
                </button>
              </form>
            </div>

            {/* Task List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <List size={18} className="text-blue-400" /> Schedule & Tasks
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-[11px]">
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
                      className={`flex items-center justify-between p-3 rounded-lg border transition ${
                        task.completed
                          ? "bg-slate-950/40 border-slate-800/50 opacity-60 line-through"
                          : "bg-slate-950/80 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
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
                          <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                            {task.dueDate && <span>Due: {task.dueDate}</span>}
                            <span>
                              {task.actualHours || 0}/{task.estimatedHours} hrs
                              logged
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
              mobileTab === "streaks"
                ? "block"
                : "hidden"
            } lg:block space-y-6`}
          >
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <LayoutDashboard size={18} className="text-blue-400" /> Academic
                  Workspace
                </h2>
                <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab("standards")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
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
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      activeTab === "streaks"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Flame size={13} className="text-amber-400" /> Streaks
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("calendar")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      activeTab === "calendar"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Calendar size={13} /> Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("timetable")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
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
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
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
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
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
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      activeTab === "syllabus"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Upload size={13} /> Syllabus
                  </button>
                </div>
              </div>

              {/* TAB 1: STANDARDS */}
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
                              <div className="text-lg font-black text-emerald-400">
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

              {/* TAB 2: STREAKS */}
              {activeTab === "streaks" && (
                <div className="space-y-5 pt-1">
                  {/* Header & Week Navigation Controls */}
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
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition"
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

                  {/* Add New Habit Form */}
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

                  {/* Streaks Week Grid */}
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
                                    {/* Habit Info Header */}
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
                                        {/* Streak Badge */}
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

                                    {/* Week Days Checkmarks */}
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

                                            {/* Interactive Checkmark Button */}
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

              {/* TAB 3: CALENDAR */}
              {activeTab === "calendar" && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-200">{currentMonth}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={prevMonth}
                        className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 transition"
                        title="Previous Month"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={resetToToday}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] font-semibold text-slate-300 transition"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={nextMonth}
                        className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 transition"
                        title="Next Month"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <div
                        key={d}
                        className="text-[10px] font-bold text-slate-400 text-center"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: firstDayOffset }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="min-h-[60px] p-1.5 rounded-lg bg-slate-950/20"
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

                      const dayTasks = tasks.filter(
                        (t) => t.dueDate === dateStr
                      );
                      const currentDayDate = new Date(
                        currentCalendarDate.getFullYear(),
                        currentCalendarDate.getMonth(),
                        day
                      );
                      
                      const dayOfWeekName = [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ][currentDayDate.getDay()] as DayOfWeek;

                      const dayClassMeetings = classes.flatMap((cls) =>
                        (cls.meetingTimes || [])
                          .filter((m) => m.day === dayOfWeekName)
                          .map((m) => ({ cls, meeting: m }))
                      );

                      const dayClubMeetings = clubs.flatMap((club) => {
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

                      return (
                        <div
                          key={day}
                          className={`min-h-[60px] p-1.5 rounded-lg border flex flex-col gap-1 ${
                            isToday
                              ? "bg-blue-950/40 border-blue-500/50"
                              : "bg-slate-950 border-slate-800"
                          }`}
                        >
                          <span className={`text-[10px] font-bold ${isToday ? "text-blue-400" : "text-slate-400"}`}>
                            {day}
                          </span>
                          <div className="space-y-1">
                            {dayClassMeetings.map(({ cls, meeting }, idx) => (
                              <div
                                key={`cls-${cls.id}-${idx}`}
                                className="text-[9px] truncate px-1 py-0.5 rounded text-white font-semibold flex justify-between items-center"
                                style={{ backgroundColor: `${cls.color}CC` }}
                                title={`${cls.name} (${meeting.startTime} - ${meeting.endTime})`}
                              >
                                <span>📖 {cls.name}</span>
                                <span className="text-[8px] font-mono opacity-80">{meeting.startTime}</span>
                              </div>
                            ))}

                            {dayTasks.map((t) => (
                              <div
                                key={t.id}
                                className={`text-[9px] truncate px-1 py-0.5 rounded text-white ${
                                  t.type === "test"
                                    ? "bg-rose-600"
                                    : "bg-blue-600"
                                }`}
                              >
                                {t.title}
                              </div>
                            ))}

                            {dayClubMeetings.map(({ club, slot }, idx) => (
                              <div
                                key={`c-${club.id}-${idx}`}
                                className="text-[9px] truncate px-1 py-0.5 rounded text-white font-semibold flex justify-between items-center"
                                style={{ backgroundColor: `${club.color || "#8B5CF6"}CC` }}
                                title={`${club.name} ${slot.startTime ? `(${slot.startTime}-${slot.endTime})` : ""}`}
                              >
                                <span>{club.icon || "👥"} {club.name}</span>
                                {slot.startTime && (
                                  <span className="text-[8px] font-mono opacity-80">{slot.startTime}</span>
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

              {/* TAB 4: TIMETABLE */}
              {activeTab === "timetable" && (
                <div className="space-y-4 pt-1 overflow-x-auto pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold">Weekly Class Schedule</h3>
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
                          className="w-full bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                        >
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
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <Plus size={14} /> Add Slot
                      </button>
                    </form>
                  </div>

                  {/* VISUAL TIMETABLE GRID */}
                  <div className="min-w-[700px] border border-slate-800 rounded-xl bg-slate-950/50 flex select-none">
                    <div className="w-16 border-r border-slate-800 shrink-0">
                      <div className="h-10 border-b border-slate-800 bg-slate-900/50"></div>
                      {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => (
                        <div key={hour} className="h-[60px] border-b border-slate-800/50 relative">
                          <span className="absolute -top-2.5 right-2 text-[10px] text-slate-500 font-medium">
                            {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-1">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                        <div key={day} className="flex-1 border-r border-slate-800 last:border-r-0 relative min-h-[600px]">
                          <div className="h-10 border-b border-slate-800 bg-slate-900/50 flex items-center justify-center text-xs font-bold text-slate-300">
                            {day}
                          </div>
                          
                          <div className="absolute top-10 bottom-0 left-0 right-0 pointer-events-none">
                            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => (
                              <div key={`grid-${hour}`} className="h-[60px] border-b border-slate-800/30"></div>
                            ))}
                          </div>
                          
                          {classes.map((cls) =>
                            cls.meetingTimes
                              ?.filter((m) => m.day === day)
                              .map((meeting, i) => {
                                const startMins =
                                  parseInt(meeting.startTime.split(":")[0]) * 60 +
                                  parseInt(meeting.startTime.split(":")[1]);
                                const endMins =
                                  parseInt(meeting.endTime.split(":")[0]) * 60 +
                                  parseInt(meeting.endTime.split(":")[1]);

                                const topOffset = startMins - 480;
                                const duration = endMins - startMins;

                                return (
                                  <div
                                    key={`${cls.id}-${i}`}
                                    className="absolute left-1 right-1 rounded-md p-1.5 overflow-hidden border transition-all hover:z-10 hover:scale-[1.02] shadow-lg shadow-black/20 group"
                                    style={{
                                      top: `${topOffset + 40}px`,
                                      height: `${duration}px`,
                                      backgroundColor: `${cls.color}20`,
                                      borderColor: `${cls.color}50`,
                                      borderLeftWidth: "4px",
                                      borderLeftColor: cls.color,
                                    }}
                                  >
                                    <div className="flex justify-between items-start gap-1">
                                      <div
                                        className="text-[10px] font-bold leading-tight truncate"
                                        style={{ color: cls.color }}
                                      >
                                        {cls.name}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMeetingTimeFromClass(cls.id, i);
                                        }}
                                        className="text-slate-400 hover:text-rose-400 transition opacity-0 group-hover:opacity-100 p-0.5"
                                        title="Remove class session"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                    <div className="text-[9px] text-slate-300 font-mono mt-0.5">
                                      {meeting.startTime} - {meeting.endTime}
                                    </div>
                                    {cls.roomNumber && (
                                      <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                                        <MapPin size={9} /> {cls.roomNumber}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: GRADES */}
              {activeTab === "grades" && (
                <div className="space-y-3 pt-1">
                  <h3 className="text-sm font-bold">Class Grade Dashboard</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {classes.map((c) => {
                      const grade = calculateOverallGrade(c.standards);
                      return (
                        <div
                          key={c.id}
                          className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1"
                        >
                          <div
                            className="font-bold text-xs"
                            style={{ color: c.color }}
                          >
                            {c.name}
                          </div>
                          <div className="text-xl font-black text-emerald-400">
                            {c.manualGrade !== undefined &&
                            c.manualGrade !== null &&
                            String(c.manualGrade).trim() !== ""
                              ? `${c.manualGrade} (Manual)`
                              : `${grade.letter} (${grade.gpa.toFixed(2)})`}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {grade.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 6: GRADE SIMULATOR & CALCULATOR */}
              {activeTab === "simulator" && (
                <div className="space-y-6 pt-1">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-10 rounded-full"
                        style={{ backgroundColor: activeClass?.color || "#3B82F6" }}
                      />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Simulating For
                        </span>
                        <h3 className="text-base font-extrabold text-white">
                          {activeClass?.name || "Select a Class"} ({simCurrentGrade})
                        </h3>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">
                        Select Class
                      </label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.manualGrade ?? "Auto"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-blue-400 border-b border-slate-800 pb-2">
                      <Target size={16} /> Upcoming Test Required Grade Calculator
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-400 text-[11px] font-medium block">
                          Current Grade
                        </label>
                        <select
                          value={simCurrentGrade}
                          onChange={(e) =>
                            setSimCurrentGrade(e.target.value as StandardLevel)
                          }
                          className="w-full bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-bold text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          {GRADE_TARGETS.map((target) => (
                            <option key={target.value} value={target.value}>
                              {target.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 text-[11px] font-medium block">
                          Target Grade
                        </label>
                        <select
                          value={simTargetGrade}
                          onChange={(e) =>
                            setSimTargetGrade(e.target.value as StandardLevel)
                          }
                          className="w-full bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-bold text-emerald-400 focus:outline-none focus:border-blue-500"
                        >
                          {GRADE_TARGETS.map((target) => (
                            <option key={target.value} value={target.value}>
                              {target.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 text-[11px] font-medium block">
                          Past Tests Taken
                        </label>
                        <div className="w-full bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg font-bold text-slate-400 flex items-center justify-between">
                          <span>{existingTestCount}</span>
                          <span className="text-[9px] font-normal text-slate-500">Auto-calculated</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div>
                        <div className="text-[10px] uppercase text-slate-400 font-bold">
                          REQUIRED GRADE ON NEXT TEST (EQUAL WEIGHT: 1 / {existingTestCount + 1} OF FINAL GRADE)
                        </div>
                        <div className="text-3xl font-black text-blue-400 font-mono">
                          {requiredFinalGrade.letter}{" "}
                          <span className="text-sm font-normal text-slate-400">
                            ({requiredFinalGrade.points} GPA pts)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Current: <strong className="text-slate-200">{simCurrentGrade}</strong> ({existingTestCount} equal test{existingTestCount !== 1 ? "s" : ""}) → Target: <strong className="text-emerald-400">{simTargetGrade}</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            requiredFinalGrade.points <= 2.33
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : requiredFinalGrade.points <= 3.67
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {requiredFinalGrade.points <= 3.0
                            ? "Achievable Target"
                            : requiredFinalGrade.points <= 4.0
                            ? "Challenging"
                            : "Distinction Needed"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: SYLLABUS PARSER */}
              {activeTab === "syllabus" && (
                <div className="space-y-4 pt-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-400" /> Auto Syllabus Parser
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400 font-medium block">
                        Paste Syllabus Text
                      </label>
                      <textarea
                        rows={6}
                        placeholder="Paste syllabus text, exam schedules, assignment dates here..."
                        value={rawSyllabusText}
                        onChange={(e) => setRawSyllabusText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={processRawSyllabus}
                        disabled={isParsing}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                      >
                        {isParsing ? "Extracting Tasks..." : "Parse Text Syllabus"}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-slate-400 font-medium block">
                        Or Upload Syllabus Document
                      </label>
                      <label className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition h-[152px] bg-slate-950/40">
                        <Upload size={24} className="text-slate-500 mb-2" />
                        <span className="text-xs text-slate-300 font-semibold">
                          Click or drag syllabus file
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1">
                          PDF, DOCX, TXT supported
                        </span>
                        <input
                          type="file"
                          onChange={handleSyllabusUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {parsedItems.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-400 uppercase">
                          Extracted ({parsedItems.length} tasks found)
                        </span>
                        <button
                          type="button"
                          onClick={importParsedTasks}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition"
                        >
                          Import All to Selected Class
                        </button>
                      </div>

                      <div className="space-y-2">
                        {parsedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center"
                          >
                            <div>
                              <div className="text-xs font-semibold">{item.title}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>Due: {item.dueDate}</span>
                                <span>• {item.estimatedHours} hrs</span>
                                <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-slate-800 text-blue-400 font-bold">
                                  {item.type}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 flex justify-around items-center z-50">
        <button
          type="button"
          onClick={() => setMobileTab("classes")}
          className={`flex flex-col items-center gap-1 text-[10px] ${
            mobileTab === "classes" ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <BookOpen size={18} />
          Classes
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("tasks")}
          className={`flex flex-col items-center gap-1 text-[10px] ${
            mobileTab === "tasks" ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <List size={18} />
          Tasks
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab("streaks");
            setActiveTab("streaks");
          }}
          className={`flex flex-col items-center gap-1 text-[10px] ${
            mobileTab === "streaks" || (mobileTab === "calendar" && activeTab === "streaks")
              ? "text-blue-400 font-bold"
              : "text-slate-400"
          }`}
        >
          <Flame size={18} className="text-amber-500" />
          Streaks
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab("calendar");
            setActiveTab("calendar");
          }}
          className={`flex flex-col items-center gap-1 text-[10px] ${
            mobileTab === "calendar" && activeTab === "calendar" ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <Calendar size={18} />
          Calendar
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab("timetable");
            setActiveTab("timetable");
          }}
          className={`flex flex-col items-center gap-1 text-[10px] ${
            mobileTab === "timetable" ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <CalendarDays size={18} />
          Timetable
        </button>
      </div>
    </div>
  );
}
