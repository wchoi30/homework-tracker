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
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Calculator,
  Upload,
  Flame,
  Trash2,
  ChevronRight,
  Cloud,
  CloudOff,
  X,
  Award,
  GraduationCap,
  LayoutDashboard,
  Users,
  Filter,
  CheckSquare,
  XSquare,
  AlertCircle,
  Edit3,
} from "lucide-react";

// --- TYPES & CONSTANTS ---
export type StandardLevel = "A+" | "A-" | "C+" | "D" | "F";

export const STANDARD_SCALE: Record<
  StandardLevel,
  { points: number; label: string; color: string }
> = {
  "A+": {
    points: 4.33,
    label: "Meeting with Excellence",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  "A-": {
    points: 3.67,
    label: "Meeting",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  "C+": {
    points: 2.33,
    label: "Developing",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
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

export type StandardItem = {
  id: string;
  name: string;
  levels: StandardLevel[];
};

export type ClassItem = {
  id: string;
  name: string;
  color: string;
  targetGrade: number;
  manualGrade?: number | string;
  standards: StandardItem[];
};

export type AttendanceStatus = "present" | "absent" | "excused";

export type ClubItem = {
  id: string;
  name: string;
  role: string;
  meetingDay: string;
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
  score?: number;
};

// --- HELPER FUNCTIONS ---
export function parseGradeToPoints(
  grade: number | string | null | undefined
): number | null {
  if (grade === null || grade === undefined || String(grade).trim() === "") {
    return null;
  }
  const strVal = String(grade).trim();
  if (!isNaN(Number(strVal))) {
    const num = Number(strVal);
    if (num <= 4.33) return Math.max(0, num);
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
  const letterMap: Record<string, number> = {
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
    "D-": 0.67,
    F: 0.0,
  };
  return letterMap[strVal.toUpperCase()] ?? null;
}

export function calculateOverallGrade(standards: StandardItem[] = []) {
  const evaluated = (standards || []).filter(
    (s) => s && Array.isArray(s.levels) && s.levels.length > 0
  );
  if (evaluated.length === 0) {
    return {
      letter: "N/A",
      label: "No Standards Evaluated",
      gpa: 0,
      evaluatedCount: 0,
    };
  }
  const standardGpas = evaluated.map((s) => {
    const sum = s.levels.reduce(
      (acc, lvl) => acc + (STANDARD_SCALE[lvl]?.points ?? 0),
      0
    );
    return sum / s.levels.length;
  });
  const avgGpa =
    standardGpas.reduce((acc, gpa) => acc + gpa, 0) / standardGpas.length;

  let letter = "F";
  let label = "Not Yet Evident";

  if (avgGpa >= 4.17) {
    letter = "A+";
    label = "Meeting with High Distinction";
  } else if (avgGpa >= 3.84) {
    letter = "A";
    label = "Meeting with Excellence";
  } else if (avgGpa >= 3.5) {
    letter = "A-";
    label = "Meeting Standards";
  } else if (avgGpa >= 3.17) {
    letter = "B+";
    label = "Above Average";
  } else if (avgGpa >= 2.84) {
    letter = "B";
    label = "Proficient";
  } else if (avgGpa >= 2.5) {
    letter = "B-";
    label = "Approaching Proficiency";
  } else if (avgGpa >= 2.17) {
    letter = "C+";
    label = "Developing";
  } else if (avgGpa >= 1.84) {
    letter = "C";
    label = "Sufficient";
  } else if (avgGpa >= 1.5) {
    letter = "C-";
    label = "Below Average";
  } else if (avgGpa >= 0.5) {
    letter = "D";
    label = "Beginning";
  }

  return { letter, label, gpa: avgGpa, evaluatedCount: evaluated.length };
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
    "classes" | "tasks" | "calendar" | "ai"
  >("tasks");
  const [sidebarView, setSidebarView] = useState<"classes" | "clubs">("classes");
  const [activeTab, setActiveTab] = useState<
    "standards" | "calendar" | "grades" | "syllabus"
  >("standards");

  // Filtering & Sorting States
  const [taskFilter, setTaskFilter] = useState<
    "all" | "pending" | "completed" | "tests" | "homework"
  >("all");
  const [taskSort, setTaskSort] = useState<"dueDate" | "priority" | "title">(
    "dueDate"
  );

  // Data States
  const [classes, setClasses] = useState<ClassItem[]>([
    {
      id: "1",
      name: "Mathematics",
      color: "#3B82F6",
      targetGrade: 90,
      standards: [
        { id: "s1", name: "S1: Linear Equations & Systems", levels: ["A+", "A-"] },
        { id: "s2", name: "S2: Quadratic & Polynomial Functions", levels: ["A-"] },
        { id: "s3", name: "S3: Vector Analysis & Matrices", levels: ["C+"] },
      ],
    },
    {
      id: "2",
      name: "Physics",
      color: "#10B981",
      targetGrade: 85,
      standards: [
        { id: "s4", name: "S1: Newtonian Kinematics", levels: ["A-"] },
        { id: "s5", name: "S2: Thermodynamics & Heat", levels: ["C+"] },
        { id: "s6", name: "S3: Electromagnetic Waves", levels: ["D"] },
      ],
    },
    {
      id: "3",
      name: "Literature & Composition",
      color: "#8B5CF6",
      targetGrade: 92,
      standards: [
        { id: "s7", name: "S1: Critical Thesis Development", levels: ["A+", "A+"] },
        { id: "s8", name: "S2: Textual Analysis & Evidence", levels: ["A-"] },
      ],
    },
  ]);

  const [clubs, setClubs] = useState<ClubItem[]>([
    {
      id: "c1",
      name: "Robotics Club",
      role: "Lead Engineer",
      meetingDay: "Thursdays",
      attendance: {
        "2026-09-10": "present",
        "2026-09-17": "present",
        "2026-09-24": "present",
      },
    },
    {
      id: "c2",
      name: "Debate Society",
      role: "Member",
      meetingDay: "Tuesdays",
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
      score: 95,
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

  const [selectedClassId, setSelectedClassId] = useState<string>("1");
  const [selectedClubId, setSelectedClubId] = useState<string>("c1");

  // Sync & Load States
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">(
    "synced"
  );
  const [userId, setUserId] = useState<string | null>(null);
  const isSavingRef = useRef(false);
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form States
  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState("#3B82F6");
  const [newStandardName, setNewStandardName] = useState("");
  const [newClubName, setNewClubName] = useState("");
  const [newClubRole, setNewClubRole] = useState("");
  const [newClubMeetingDay, setNewClubMeetingDay] = useState("Thursdays");
  const [newWeeklyMeetingDate, setNewWeeklyMeetingDate] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskClassId, setTaskClassId] = useState("1");
  const [taskType, setTaskType] = useState<TaskCategory>("homework");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskHours, setTaskHours] = useState("1");

  // Pomodoro Timer States
  const [selectedTimerTaskId, setSelectedTimerTaskId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");

  // Syllabus Parsing States
  const [isParsing, setIsParsing] = useState(false);
  const [rawSyllabusText, setRawSyllabusText] = useState("");
  const [parsedItems, setParsedItems] = useState<Partial<Task>[]>([]);

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
          if (Array.isArray(data.data.clubs)) setClubs(data.data.clubs);
          if (Array.isArray(data.data.tasks)) setTasks(data.data.tasks);
          setSyncStatus("synced");
        } else {
          setClasses(safeStorageGet("tracker_classes_v8", classes));
          setClubs(safeStorageGet("tracker_clubs_v8", clubs));
          setTasks(safeStorageGet("tracker_tasks_v8", tasks));
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
              setClubs(payload.new.data.clubs);
            if (Array.isArray(payload.new.data.tasks))
              setTasks(payload.new.data.tasks);
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

    async function saveData() {
      setSyncStatus("syncing");
      isSavingRef.current = true;
      try {
        const { error } = await supabase.from("user_data").upsert(
          {
            user_id: userId,
            data: { classes, clubs, tasks },
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
  }, [classes, clubs, tasks, isLoaded, userId]);

  // Keep task selection valid when classes change
  useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.id === taskClassId)) {
      setTaskClassId(classes[0].id);
    }
  }, [classes, taskClassId]);

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

  // Pomodoro Logic
  useEffect(() => {
    if (!isTimerRunning) return;
    if (timeLeft <= 0) {
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
        setTimeLeft(5 * 60);
        alert("Pomodoro work session finished! 25 minutes logged. Time for a break.");
      } else {
        setTimerMode("work");
        setTimeLeft(25 * 60);
        alert("Break finished! Back to focus.");
      }
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, timerMode, selectedTimerTaskId]);

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
      targetGrade: 90,
      standards: [],
    };
    setClasses((prev) => [...prev, newClass]);
    setSelectedClassId(newClass.id);
    setNewClassName("");
  };

  const deleteClass = (id: string) => {
    setClasses((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (selectedClassId === id) setSelectedClassId(remaining[0]?.id ?? "");
      return remaining;
    });
    setTasks((prev) => prev.filter((t) => t.classId !== id));
  };

  const updateManualGrade = (classId: string, grade: string) => {
    const val = grade.trim() === "" ? undefined : grade;
    setClasses((prev) =>
      prev.map((cls) => (cls.id === classId ? { ...cls, manualGrade: val } : cls))
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

  // Logic Handlers: Clubs
  const addClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim()) return;
    const newClub: ClubItem = {
      id: Date.now().toString(),
      name: newClubName.trim(),
      role: newClubRole.trim() || "Member",
      meetingDay: newClubMeetingDay || "Thursdays",
      attendance: {},
    };
    setClubs((prev) => [...prev, newClub]);
    setSelectedClubId(newClub.id);
    setNewClubName("");
    setNewClubRole("");
  };

  const deleteClub = (id: string) => {
    setClubs((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (selectedClubId === id) setSelectedClubId(remaining[0]?.id ?? "");
      return remaining;
    });
  };

  const addWeeklyMeetingDate = (clubId: string) => {
    if (!newWeeklyMeetingDate) return;
    setClubs((prev) =>
      prev.map((c) => {
        if (c.id !== clubId) return c;
        const currentAttendance = c.attendance || {};
        if (currentAttendance[newWeeklyMeetingDate]) return c;
        return {
          ...c,
          attendance: { ...currentAttendance, [newWeeklyMeetingDate]: "present" },
        };
      })
    );
    setNewWeeklyMeetingDate("");
  };

  const setMyAttendance = (
    clubId: string,
    dateStr: string,
    status: AttendanceStatus
  ) => {
    setClubs((prev) =>
      prev.map((c) =>
        c.id !== clubId
          ? c
          : { ...c, attendance: { ...(c.attendance || {}), [dateStr]: status } }
      )
    );
  };

  const deleteAttendanceDate = (clubId: string, dateStr: string) => {
    setClubs((prev) =>
      prev.map((c) => {
        if (c.id !== clubId) return c;
        const updated = { ...(c.attendance || {}) };
        delete updated[dateStr];
        return { ...c, attendance: updated };
      })
    );
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
    const val = scoreStr.trim();
    const parsed = val === "" ? undefined : parseFloat(val);
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, score: parsed === undefined || isNaN(parsed) ? undefined : parsed }
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

      setParsedItems(extracted.length > 0 ? extracted.slice(0, 6) : [
        { title: "Syllabus Overview Quiz", dueDate: "2026-09-24", type: "homework", estimatedHours: 1 },
        { title: "Midterm Examination", dueDate: "2026-10-10", type: "test", estimatedHours: 5 },
        { title: "Term Research Paper", dueDate: "2026-11-05", type: "homework", estimatedHours: 6 },
      ]);
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

  // Active objects & Calendar calculations
  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const activeClub = clubs.find((c) => c.id === selectedClubId) || clubs[0];

  const today = new Date();
  const currentMonth = today.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const daysArray = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );
  const firstDayOfMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  ).getDay();
  const firstDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 lg:pb-6 font-sans">
      {/* 1. TOP HEADER */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>📘</span> Academic OS & Tracker
          </h1>
          <p className="text-xs text-slate-400">
            Standards-Based Grading, Focus Timer, Clubs & Assignment Schedule
          </p>
        </div>

        {/* Header Widgets */}
        <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
          {/* GPA Summary */}
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <GraduationCap size={18} className="text-emerald-400" />
            <div>
              <div className="text-[9px] text-slate-400 font-bold uppercase">
                Cum GPA
              </div>
              <div className="text-sm font-extrabold text-emerald-400 font-mono">
                {cumulativeGPA > 0 ? cumulativeGPA.toFixed(2) : "N/A"}
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

      {/* 2. MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto w-full flex-1">
        {/* LEFT PANEL: Class Roster, Clubs & Timer Target */}
        <aside
          className={`${
            mobileTab === "classes" ? "block" : "hidden"
          } lg:block lg:col-span-4 space-y-6`}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSidebarView("classes")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  sidebarView === "classes"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen size={14} /> Class Roster
              </button>
              <button
                type="button"
                onClick={() => setSidebarView("clubs")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  sidebarView === "clubs"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users size={14} /> Clubs
              </button>
            </div>

            {/* CLASS ROSTER VIEW */}
            {sidebarView === "classes" && (
              <div className="space-y-4">
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
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">
                              Grade:
                            </span>
                            <input
                              type="text"
                              placeholder="Auto"
                              value={cls.manualGrade ?? ""}
                              onChange={(e) =>
                                updateManualGrade(cls.id, e.target.value)
                              }
                              className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-center font-bold text-emerald-400 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-emerald-400 text-xs">
                              {sbgGrade.letter}
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
            )}

            {/* CLUBS VIEW */}
            {sidebarView === "clubs" && (
              <div className="space-y-4">
                <form onSubmit={addClub} className="space-y-2">
                  <div className="flex gap-2">
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
                      className="w-24 bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={newClubMeetingDay}
                      onChange={(e) => setNewClubMeetingDay(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-xs focus:outline-none"
                    >
                      <option value="Mondays">Mondays</option>
                      <option value="Tuesdays">Tuesdays</option>
                      <option value="Wednesdays">Wednesdays</option>
                      <option value="Thursdays">Thursdays</option>
                      <option value="Fridays">Fridays</option>
                      <option value="Saturdays">Saturdays</option>
                      <option value="Sundays">Sundays</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  {clubs.map((club) => {
                    const isSelected = selectedClubId === club.id;
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
                            <Users size={16} className="text-blue-400" />
                            <span className="font-semibold text-sm">
                              {club.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
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
                        <div className="text-[11px] text-slate-400 flex justify-between">
                          <span>
                            Meets:{" "}
                            <strong className="text-slate-200">
                              {club.meetingDay}
                            </strong>
                          </span>
                          <span className="text-emerald-400">
                            {
                              Object.values(club.attendance || {}).filter(
                                (s) => s === "present"
                              ).length
                            }{" "}
                            Attended
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeClub && (
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-3 mt-4">
                    <div className="border-b border-slate-800 pb-2">
                      <h3 className="text-xs font-bold text-blue-400 uppercase">
                        Attendance Record: {activeClub.name}
                      </h3>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={newWeeklyMeetingDate}
                        onChange={(e) => setNewWeeklyMeetingDate(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addWeeklyMeetingDate(activeClub.id)}
                        className="bg-blue-600 px-3 py-1 rounded text-xs font-semibold text-white hover:bg-blue-500"
                      >
                        + Add Date
                      </button>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {Object.entries(activeClub.attendance || {})
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([dateStr, status]) => (
                          <div
                            key={dateStr}
                            className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between text-xs items-center"
                          >
                            <span className="font-mono text-slate-200 text-xs">
                              {dateStr}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setMyAttendance(
                                    activeClub.id,
                                    dateStr,
                                    "present"
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  status === "present"
                                    ? "bg-emerald-600 text-white"
                                    : "text-slate-400 bg-slate-800 hover:text-white"
                                }`}
                              >
                                P
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setMyAttendance(
                                    activeClub.id,
                                    dateStr,
                                    "absent"
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  status === "absent"
                                    ? "bg-rose-600 text-white"
                                    : "text-slate-400 bg-slate-800 hover:text-white"
                                }`}
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setMyAttendance(
                                    activeClub.id,
                                    dateStr,
                                    "excused"
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  status === "excused"
                                    ? "bg-amber-600 text-white"
                                    : "text-slate-400 bg-slate-800 hover:text-white"
                                }`}
                              >
                                E
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteAttendanceDate(activeClub.id, dateStr)
                                }
                                className="text-slate-500 hover:text-rose-400 ml-1"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
                  {/* Filter Selector */}
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
                        <input
                          type="number"
                          placeholder="Score %"
                          value={task.score ?? ""}
                          onChange={(e) =>
                            updateTaskScore(task.id, e.target.value)
                          }
                          className="w-14 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none"
                        />
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
              mobileTab === "calendar" || mobileTab === "ai"
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
                        placeholder="Add standard (e.g., S1: Linear Modeling)..."
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
                            <div className="flex justify-between">
                              <h4 className="font-medium text-xs">{st.name}</h4>
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

              {/* TAB 2: CALENDAR */}
              {activeTab === "calendar" && (
                <div className="space-y-3 pt-1">
                  <h3 className="text-sm font-bold">{currentMonth}</h3>
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
                      const dateStr = `${today.getFullYear()}-${String(
                        today.getMonth() + 1
                      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const dayTasks = tasks.filter(
                        (t) => t.dueDate === dateStr
                      );
                      const currentDayDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        day
                      );
                      const dayOfWeekStr = [
                        "Sundays",
                        "Mondays",
                        "Tuesdays",
                        "Wednesdays",
                        "Thursdays",
                        "Fridays",
                        "Saturdays",
                      ][currentDayDate.getDay()];
                      const uniqueDayClubs = Array.from(
                        new Set(
                          clubs
                            .filter(
                              (c) =>
                                c.meetingDay === dayOfWeekStr ||
                                c.attendance?.[dateStr]
                            )
                            .map((c) => c.id)
                        )
                      ).map((id) => clubs.find((c) => c.id === id)!);

                      return (
                        <div
                          key={day}
                          className={`min-h-[60px] p-1.5 rounded-lg border flex flex-col gap-1 ${
                            day === today.getDate()
                              ? "bg-blue-950/40 border-blue-500/50"
                              : "bg-slate-950 border-slate-800"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-400">
                            {day}
                          </span>
                          <div className="space-y-1">
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
                            {uniqueDayClubs.map((c) => (
                              <div
                                key={`c-${c.id}`}
                                className="text-[9px] truncate px-1 py-0.5 rounded text-white bg-purple-600/80"
                              >
                                {c.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: GRADES */}
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

              {/* TAB 4: SYLLABUS PARSER */}
              {activeTab === "syllabus" && (
                <div className="space-y-4 pt-1">
                  <h3 className="text-sm font-bold">AI Syllabus & Assignment Extractor</h3>
                  
                  {/* File Upload Zone */}
                  <div className="border border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950 rounded-xl p-6 text-center cursor-pointer transition">
                    <input
                      type="file"
                      onChange={handleSyllabusUpload}
                      className="hidden"
                      id="syllabus-upload"
                    />
                    <label
                      htmlFor="syllabus-upload"
                      className="cursor-pointer space-y-1 block"
                    >
                      <Upload className="mx-auto text-blue-400" size={24} />
                      <span className="text-xs font-semibold text-slate-300 block">
                        {isParsing
                          ? "Extracting tasks..."
                          : "Click to upload syllabus file"}
                      </span>
                    </label>
                  </div>

                  {/* Manual Syllabus Text Input */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 block font-semibold">
                      Or paste syllabus text directly:
                    </label>
                    <textarea
                      rows={4}
                      value={rawSyllabusText}
                      onChange={(e) => setRawSyllabusText(e.target.value)}
                      placeholder="Paste course schedule, assignment dates, or exam list..."
                      className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={processRawSyllabus}
                      disabled={isParsing || !rawSyllabusText.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-xs disabled:opacity-50 transition"
                    >
                      {isParsing ? "Processing Text..." : "Parse Text"}
                    </button>
                  </div>

                  {/* Extracted Tasks Output */}
                  {parsedItems.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
                      <h4 className="font-semibold text-xs text-emerald-400">
                        Extracted Task Candidates:
                      </h4>
                      <div className="space-y-1.5">
                        {parsedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-slate-900 p-2 rounded-lg flex justify-between items-center border border-slate-800"
                          >
                            <span className="font-medium">{item.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.dueDate}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={importParsedTasks}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-xs transition mt-2"
                      >
                        Import Tasks to Schedule
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 p-3 flex justify-around items-center z-50 lg:hidden">
        <button
          onClick={() => setMobileTab("classes")}
          className={`flex flex-col items-center gap-1 text-xs ${
            mobileTab === "classes" ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <span>📚</span> Classes
        </button>
        <button
          onClick={() => setMobileTab("tasks")}
          className={`flex flex-col items-center gap-1 text-xs ${
            mobileTab === "tasks" ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <span>📝</span> Tasks
        </button>
        <button
          onClick={() => {
            setMobileTab("calendar");
            setActiveTab("calendar");
          }}
          className={`flex flex-col items-center gap-1 text-xs ${
            mobileTab === "calendar" ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <span>📅</span> Calendar
        </button>
        <button
          onClick={() => {
            setMobileTab("ai");
            setActiveTab("syllabus");
          }}
          className={`flex flex-col items-center gap-1 text-xs ${
            mobileTab === "ai" ? "text-blue-400 font-bold" : "text-slate-400"
          }`}
        >
          <span>🤖</span> AI
        </button>
      </nav>
    </div>
  );
}
