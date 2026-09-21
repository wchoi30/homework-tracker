"use client";

import { supabase } from "./supabase";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  CalendarPlus,
} from "lucide-react";

type StandardLevel = "A+" | "A-" | "C+" | "D" | "F";

const STANDARD_SCALE: Record<
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

type StandardItem = {
  id: string;
  name: string;
  levels: StandardLevel[];
};

type ClassItem = {
  id: string;
  name: string;
  color: string;
  targetGrade: number;
  manualGrade?: number | string;
  standards: StandardItem[];
};

type AttendanceStatus = "present" | "absent" | "excused";

type ClubItem = {
  id: string;
  name: string;
  role: string;
  meetingDay: string; // e.g. "Thursdays"
  attendance?: Record<string, AttendanceStatus>; // key: YYYY-MM-DD
};

type TaskCategory = "test" | "homework";

type Task = {
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

function parseGradeToPoints(
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

function calculateOverallGrade(standards: StandardItem[] = []) {
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
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
};

export default function Home() {
  const [classes, setClasses] = useState<ClassItem[]>([
    {
      id: "1",
      name: "Math",
      color: "#3B82F6",
      targetGrade: 90,
      standards: [
        { id: "s1", name: "S1: Linear Equations", levels: ["A+", "A-"] },
        { id: "s2", name: "S2: Quadratic Functions", levels: ["A-"] },
      ],
    },
    {
      id: "2",
      name: "Science",
      color: "#10B981",
      targetGrade: 85,
      standards: [
        { id: "s4", name: "S1: Experimental Design", levels: ["A-"] },
        { id: "s5", name: "S2: Chemical Bonding", levels: ["C+"] },
      ],
    },
  ]);

  const [clubs, setClubs] = useState<ClubItem[]>([
    {
      id: "c1",
      name: "Robotics Club",
      role: "President",
      meetingDay: "Thursdays",
      attendance: { "2026-09-17": "present", "2026-09-24": "present" },
    },
    {
      id: "c2",
      name: "Chess Club",
      role: "Member",
      meetingDay: "Tuesdays",
      attendance: { "2026-09-15": "present", "2026-09-22": "present" },
    },
    {
      id: "c3",
      name: "Debate Team",
      role: "Member",
      meetingDay: "Mondays",
      attendance: { "2026-09-14": "present", "2026-09-21": "present" },
    },
    {
      id: "c4",
      name: "Science Olympiad",
      role: "Officer",
      meetingDay: "Fridays",
      attendance: { "2026-09-18": "present" },
    },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "101",
      title: "Midterm Exam",
      classId: "1",
      dueDate: "2026-09-25",
      type: "test",
      estimatedHours: 4,
      actualHours: 1.5,
      completed: false,
      score: 98,
    },
    {
      id: "102",
      title: "Weekly Homework 1",
      classId: "1",
      dueDate: "2026-09-22",
      type: "homework",
      estimatedHours: 1,
      actualHours: 1,
      completed: true,
    },
  ]);

  const [sidebarView, setSidebarView] = useState<"classes" | "clubs">("classes");
  const [activeTab, setActiveTab] = useState<
    "standards" | "calendar" | "grades" | "syllabus"
  >("standards");
  const [selectedClassId, setSelectedClassId] = useState<string>("1");
  const [selectedClubId, setSelectedClubId] = useState<string>("c1");

  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">(
    "synced"
  );
  const [userId, setUserId] = useState<string | null>(null);

  const isSavingRef = useRef(false);
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Class & Standard Form states
  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState("#3B82F6");
  const [newStandardName, setNewStandardName] = useState("");

  // Club Form States
  const [newClubName, setNewClubName] = useState("");
  const [newClubRole, setNewClubRole] = useState("");
  const [newClubMeetingDay, setNewClubMeetingDay] = useState("Thursdays");
  const [newWeeklyMeetingDate, setNewWeeklyMeetingDate] = useState("");

  // Task Form States
  const [taskTitle, setTaskTitle] = useState("");
  const [taskClassId, setTaskClassId] = useState("1");
  const [taskType, setTaskType] = useState<TaskCategory>("homework");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskHours, setTaskHours] = useState("1");

  // Pomodoro Timer State
  const [selectedTimerTaskId, setSelectedTimerTaskId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");

  // Syllabus Parsing State
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<Partial<Task>[]>([]);

  // Load User Data
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
          setClasses(safeStorageGet("tracker_classes_v7", classes));
          setClubs(safeStorageGet("tracker_clubs_v7", clubs));
          setTasks(safeStorageGet("tracker_tasks_v7", tasks));
          setSyncStatus("synced");
        }
      } catch (err) {
        console.error("Data load error:", err);
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

  // Supabase Realtime Subscription
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
            if (Array.isArray(payload.new.data.classes)) setClasses(payload.new.data.classes);
            if (Array.isArray(payload.new.data.clubs)) setClubs(payload.new.data.clubs);
            if (Array.isArray(payload.new.data.tasks)) setTasks(payload.new.data.tasks);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Persist State to LocalStorage & Supabase
  useEffect(() => {
    if (!isLoaded || !userId) return;

    localStorage.setItem("tracker_classes_v7", JSON.stringify(classes));
    localStorage.setItem("tracker_clubs_v7", JSON.stringify(clubs));
    localStorage.setItem("tracker_tasks_v7", JSON.stringify(tasks));

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

    const timeout = setTimeout(saveData, 500);
    return () => clearTimeout(timeout);
  }, [classes, clubs, tasks, isLoaded, userId]);

  // Synchronize taskClassId with existing classes when classes array changes
  useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.id === taskClassId)) {
      setTaskClassId(classes[0].id);
    }
  }, [classes, taskClassId]);

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
        if (sbg.evaluatedCount > 0) {
          classPoints = sbg.gpa;
        }
      }

      if (classPoints === null) continue;

      totalPoints += classPoints;
      count += 1;
    }

    if (count === 0) return 0;
    return Math.round((totalPoints / count) * 100) / 100;
  }, [classes]);

  const updateManualGrade = (classId: string, grade: string) => {
    const val = grade.trim() === "" ? undefined : grade;
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === classId ? { ...cls, manualGrade: val } : cls
      )
    );
  };

  // Pomodoro Timer Effect
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
                    actualHours: +((t.actualHours || 0) + 25 / 60).toFixed(2),
                  }
                : t
            )
          );
        }
        setTimerMode("break");
        setTimeLeft(5 * 60);
        setTimeout(() => alert("Pomodoro session complete! 25 minutes logged."), 10);
      } else {
        setTimerMode("work");
        setTimeLeft(25 * 60);
        setTimeout(() => alert("Break is over! Time to focus."), 10);
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
      alert("Please select a task to track focus time for!");
      return;
    }
    setIsTimerRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMode === "work" ? 25 * 60 : 5 * 60);
  };

  // Class Management
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
      if (selectedClassId === id) {
        setSelectedClassId(remaining[0]?.id ?? "");
      }
      return remaining;
    });
    setTasks((prev) => prev.filter((t) => t.classId !== id));
  };

  // Club Management
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
      if (selectedClubId === id) {
        setSelectedClubId(remaining[0]?.id ?? "");
      }
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
          attendance: {
            ...currentAttendance,
            [newWeeklyMeetingDate]: "present",
          },
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
      prev.map((c) => {
        if (c.id !== clubId) return c;
        return {
          ...c,
          attendance: {
            ...(c.attendance || {}),
            [dateStr]: status,
          },
        };
      })
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

  const addGradeToStandard = (
    classId: string,
    standardId: string,
    level: StandardLevel
  ) => {
    setClasses((prev) =>
      prev.map((cls) => {
        if (cls.id !== classId) return cls;
        return {
          ...cls,
          standards: (cls.standards || []).map((st) => {
            if (st.id !== standardId) return st;
            return { ...st, levels: [...(st.levels || []), level] };
          }),
        };
      })
    );
  };

  const removeGradeFromStandard = (
    classId: string,
    standardId: string,
    indexToRemove: number
  ) => {
    setClasses((prev) =>
      prev.map((cls) => {
        if (cls.id !== classId) return cls;
        return {
          ...cls,
          standards: (cls.standards || []).map((st) => {
            if (st.id !== standardId) return st;
            return {
              ...st,
              levels: (st.levels || []).filter(
                (_, idx) => idx !== indexToRemove
              ),
            };
          }),
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

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTimerTaskId === id) {
      setSelectedTimerTaskId("");
    }
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

  const calculatePriorityScore = useCallback((task: Task): number => {
    if (task.completed) return -1;
    let score = 0;

    if (task.type === "test") score += 30;

    if (task.dueDate && task.dueDate.trim() !== "") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(task.dueDate + "T00:00:00");
      if (!isNaN(due.getTime())) {
        const diffDays = Math.ceil(
          (due.getTime() - today.getTime()) / (1000 * 3600 * 24)
        );
        if (diffDays <= 0) score += 100;
        else if (diffDays <= 2) score += 80;
        else if (diffDays <= 7) score += 50;
        else score += 20;
      }
    }

    if (task.estimatedHours > 0) {
      score += Math.min(20, 30 / task.estimatedHours);
    }

    return score;
  }, []);

  const topPriorityTask = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.completed);
    if (activeTasks.length === 0) return null;
    return [...activeTasks].sort(
      (a, b) => calculatePriorityScore(b) - calculatePriorityScore(a)
    )[0];
  }, [tasks, calculatePriorityScore]);

  const handleSyllabusUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);

    parseTimerRef.current = setTimeout(() => {
      const mockExtracted: Partial<Task>[] = [
        {
          title: "Syllabus Quiz",
          dueDate: "2026-09-24",
          type: "homework",
          estimatedHours: 1,
        },
        {
          title: "Midterm Exam",
          dueDate: "2026-10-10",
          type: "test",
          estimatedHours: 5,
        },
        {
          title: "Final Exam",
          dueDate: "2026-11-15",
          type: "test",
          estimatedHours: 6,
        },
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

  const activeClass =
    classes.find((c) => c.id === selectedClassId) || classes[0];
  const activeClub =
    clubs.find((c) => c.id === selectedClubId) || clubs[0];

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

  // Calculate the day of the week the month starts on (adjusted for Monday start)
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const firstDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP BAR / NAVIGATION HEADER */}
        <header className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <BookOpen size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Academic OS & Tracker
              </h1>
              <p className="text-xs text-slate-400">
                Classes, Clubs, Focus Timer & Assignment Schedule
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* GPA Widget */}
            <div className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <GraduationCap size={20} />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Cumulative GPA
                </div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono">
                  {cumulativeGPA > 0 ? cumulativeGPA.toFixed(2) : "N/A"}
                </div>
              </div>
            </div>

            {/* Pomodoro Timer */}
            <div className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Flame size={12} className="text-amber-500" /> Focus ({timerMode})
                </div>
                <div className="text-xl font-mono font-bold text-blue-400">
                  {Math.floor(timeLeft / 60)}:
                  {timeLeft % 60 < 10 ? "0" : ""}
                  {timeLeft % 60}
                </div>
              </div>
              <div className="flex gap-1 pl-1">
                <button
                  type="button"
                  onClick={toggleTimer}
                  className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition"
                >
                  {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  onClick={resetTimer}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* Sync Indicator */}
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
              {syncStatus === "synced" && (
                <>
                  <Cloud size={16} className="text-emerald-400" />
                  <span className="text-emerald-400 font-medium hidden sm:inline">
                    Synced
                  </span>
                </>
              )}
              {syncStatus === "syncing" && (
                <>
                  <Cloud size={16} className="text-amber-400 animate-pulse" />
                  <span className="text-amber-400 font-medium hidden sm:inline">
                    Syncing...
                  </span>
                </>
              )}
              {syncStatus === "error" && (
                <>
                  <CloudOff size={16} className="text-rose-400" />
                  <span className="text-rose-400 font-medium hidden sm:inline">
                    Error
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Priority Banner */}
        {topPriorityTask && (
          <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  Smart Priority Recommendation
                </span>
                <h3 className="font-semibold text-sm text-white">
                  Focus on: <span className="underline">{topPriorityTask.title}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ml-2 ${
                      topPriorityTask.type === "test"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    }`}
                  >
                    {topPriorityTask.type}
                  </span>
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTimerTaskId(topPriorityTask.id)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg text-white transition whitespace-nowrap"
            >
              Start Focus
            </button>
          </div>
        )}

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR: CLASSES & CLUBS (4 COLUMNS) */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              {/* TOP TOGGLE BUTTONS */}
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

              {/* VIEW 1: CLASS ROSTER */}
              {sidebarView === "classes" && (
                <div className="space-y-4">
                  {/* Add Class Form */}
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
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </form>

                  {/* Class List */}
                  <div className="space-y-2.5 pt-1">
                    {classes.map((cls) => {
                      const sbgGrade = calculateOverallGrade(cls.standards);

                      return (
                        <div
                          key={cls.id}
                          className={`p-3 rounded-xl border transition space-y-2 ${
                            selectedClassId === cls.id
                              ? "bg-slate-800/80 border-blue-500/50"
                              : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
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
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-medium">
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
                                }}
                                className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded flex items-center gap-1 text-[10px] font-bold transition"
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

              {/* VIEW 2: CLUBS */}
              {sidebarView === "clubs" && (
                <div className="space-y-4">
                  {/* Add Club Form */}
                  <form onSubmit={addClub} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Club name..."
                        value={newClubName}
                        onChange={(e) => setNewClubName(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"
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
                        className="flex-1 bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none"
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
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Plus size={14} /> Add Club
                      </button>
                    </div>
                  </form>

                  {/* Club Cards */}
                  <div className="space-y-2.5">
                    {clubs.map((club) => {
                      const isSelected = selectedClubId === club.id;
                      const attendanceEntries = Object.entries(club.attendance || {}).sort();

                      return (
                        <div
                          key={club.id}
                          onClick={() => setSelectedClubId(club.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer space-y-2 ${
                            isSelected
                              ? "bg-slate-800/80 border-blue-500/50"
                              : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
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
                                className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Meets once/week: <strong className="text-slate-200">{club.meetingDay}</strong></span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              {attendanceEntries.filter(([, status]) => status === "present").length} Attended
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Club Weekly Attendance Section */}
                  {activeClub && (
                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-3 mt-4">
                      <div className="border-b border-slate-800 pb-2">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                          My Weekly Attendance: {activeClub.name}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Meets weekly on {activeClub.meetingDay}
                        </p>
                      </div>

                      {/* Log Weekly Date */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <CalendarPlus size={12} /> Log Weekly Meeting Date
                        </label>
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
                            className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-xs font-semibold text-white transition"
                          >
                            + Add Date
                          </button>
                        </div>
                      </div>

                      {/* Weekly Attendance Log List */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        {Object.keys(activeClub.attendance || {}).length === 0 ? (
                          <p className="text-[10px] text-slate-500 text-center py-2">
                            No meeting dates recorded yet for this club.
                          </p>
                        ) : (
                          Object.entries(activeClub.attendance || {})
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([dateStr, status]) => (
                              <div
                                key={dateStr}
                                className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
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
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                      status === "present"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-950 text-slate-400 hover:text-emerald-400"
                                    }`}
                                  >
                                    Present
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
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                      status === "absent"
                                        ? "bg-rose-600 text-white"
                                        : "bg-slate-950 text-slate-400 hover:text-rose-400"
                                    }`}
                                  >
                                    Absent
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
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                      status === "excused"
                                        ? "bg-amber-600 text-white"
                                        : "bg-slate-950 text-slate-400 hover:text-amber-400"
                                    }`}
                                  >
                                    Excused
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteAttendanceDate(activeClub.id, dateStr)
                                    }
                                    className="text-slate-500 hover:text-rose-400 p-1 ml-1"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pomodoro Link Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-blue-400" /> Track Task in Focus Timer
              </h3>
              <select
                value={selectedTimerTaskId}
                onChange={(e) => setSelectedTimerTaskId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-none"
              >
                <option value="">-- Choose Focus Task --</option>
                {tasks
                  .filter((t) => !t.completed)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.type.toUpperCase()}] {t.title} ({t.actualHours || 0}/{t.estimatedHours}h)
                    </option>
                  ))}
              </select>
            </div>
          </aside>

          {/* MAIN CONTENT AREA (8 COLUMNS) */}
          <section className="lg:col-span-8 space-y-6">
            {/* ADD TASK / ASSIGNMENT PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Plus size={18} className="text-blue-400" /> Quick Add Assignment
              </h2>
              <form onSubmit={addTask} className="space-y-3">
                <input
                  type="text"
                  placeholder="Task title (e.g., Chapter 4 Test, Essay Draft)..."
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
                    onChange={(e) => setTaskType(e.target.value as TaskCategory)}
                    className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none text-slate-200"
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

                  {/* Hours input with inline "hours" text label */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 px-2.5 rounded-lg focus-within:border-blue-500">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="1"
                      value={taskHours}
                      onChange={(e) => setTaskHours(e.target.value)}
                      className="w-full bg-transparent py-1.5 text-xs focus:outline-none text-slate-100"
                    />
                    <span className="text-xs text-slate-400 font-medium pl-1">
                      hours
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-xs transition"
                >
                  <Plus size={16} /> Add Task
                </button>
              </form>
            </div>

            {/* SCHEDULE & ASSIGNMENT TRACKER */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <List size={18} className="text-blue-400" /> Schedule & Assignments
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  {tasks.filter((t) => !t.completed).length} Pending
                </span>
              </div>

              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No tasks added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => {
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
                                : "border-slate-600 hover:border-slate-400"
                            }`}
                          >
                            {task.completed && <Check size={12} />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs text-slate-100">
                                {task.title}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  task.type === "test"
                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                    : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
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
                                {task.actualHours || 0}/{task.estimatedHours} hrs logged
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
                            className="w-14 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="text-slate-500 hover:text-rose-400 transition p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TABBED WORKSPACE SECTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <LayoutDashboard size={18} className="text-blue-400" /> Academic Workspace
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
                    <Calculator size={13} /> Grade Dashboard
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
                    <Upload size={13} /> Syllabus AI
                  </button>
                </div>
              </div>

              {/* TAB 1: STANDARDS */}
              {activeTab === "standards" && (
                activeClass ? (
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
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
                            Letter grade generated from 4.33 standards point average.
                          </p>
                        </div>
                      </div>
                      <div>
                        {(() => {
                          const grade = calculateOverallGrade(
                            activeClass.standards
                          );
                          return (
                            <div className="text-right">
                              <div className="text-lg font-black text-emerald-400">
                                {grade.letter}{" "}
                                {grade.gpa > 0 && `(${grade.gpa.toFixed(2)})`}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {grade.label}
                              </div>
                            </div>
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
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Add Standard
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(!activeClass.standards || activeClass.standards.length === 0) ? (
                        <p className="text-xs text-slate-500 text-center py-4">
                          No standards added for this class yet.
                        </p>
                      ) : (
                        activeClass.standards.map((st) => (
                          <div
                            key={st.id}
                            className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-xs text-slate-200">
                                {st.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteStandard(activeClass.id, st.id)
                                }
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {(st.levels || []).map((lvl, idx) => (
                                <span
                                  key={`${lvl}-${idx}`}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${STANDARD_SCALE[lvl]?.color}`}
                                >
                                  {lvl}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeGradeFromStandard(
                                        activeClass.id,
                                        st.id,
                                        idx
                                      )
                                    }
                                    className="hover:text-white"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>

                            <div className="flex flex-wrap gap-1 pt-1">
                              {(
                                Object.keys(
                                  STANDARD_SCALE
                                ) as StandardLevel[]
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
                                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-medium text-slate-300 transition"
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
                    No active class selected. Please add or select a class.
                  </p>
                )
              )}

              {/* TAB 2: CALENDAR */}
              {activeTab === "calendar" && (
                <div className="space-y-3 pt-1">
                  <h3 className="text-sm font-bold">{currentMonth}</h3>
                  
                  {/* Days of the Week Header */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
                      <div
                        key={dayName}
                        className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mb-1"
                      >
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {/* Empty padding for the first week */}
                    {Array.from({ length: firstDayOffset }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-[60px] p-1.5 rounded-lg bg-slate-950/20 border border-transparent" />
                    ))}

                    {/* Actual Days */}
                    {daysArray.map((day) => {
                      const dateStr = `${today.getFullYear()}-${String(
                        today.getMonth() + 1
                      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const dayTasks = tasks.filter(
                        (t) => t.dueDate === dateStr
                      );

                      // Determine day of the week to match club meetings
                      const currentDayDate = new Date(today.getFullYear(), today.getMonth(), day);
                      const dayOfWeekStr = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][currentDayDate.getDay()];
                      
                      // Find clubs that meet on this day or have an explicit attendance entry
                      const dayClubs = clubs.filter((c) => c.meetingDay === dayOfWeekStr || c.attendance?.[dateStr]);
                      // Ensure unique clubs if someone explicitly logs attendance on the normal meeting day
                      const uniqueDayClubs = Array.from(new Set(dayClubs.map(c => c.id))).map(id => dayClubs.find(c => c.id === id)!);

                      return (
                        <div
                          key={day}
                          className={`min-h-[60px] p-1.5 rounded-lg border flex flex-col justify-start gap-1 ${
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
                                className={`text-[9px] truncate px-1 py-0.5 rounded text-white font-medium ${
                                  t.type === "test"
                                    ? "bg-rose-600"
                                    : "bg-blue-600"
                                }`}
                                title={t.title}
                              >
                                {t.title}
                              </div>
                            ))}
                            {uniqueDayClubs.map((c) => {
                               const status = c.attendance?.[dateStr];
                               let statusIndicator = "";
                               if (status === "present") statusIndicator = " ✓";
                               if (status === "absent") statusIndicator = " ✗";
                               if (status === "excused") statusIndicator = " (E)";

                               return (
                                <div
                                  key={`club-${c.id}`}
                                  className="text-[9px] truncate px-1 py-0.5 rounded text-white font-medium bg-purple-600/80 border border-purple-500/50 flex justify-between"
                                  title={c.name}
                                >
                                  <span>{c.name}</span>
                                  <span>{statusIndicator}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: GRADE DASHBOARD */}
              {activeTab === "grades" && (
                <div className="space-y-3 pt-1">
                  <h3 className="text-sm font-bold">Grade Dashboard</h3>
                  {classes.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No classes added yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {classes.map((c) => {
                        const grade = calculateOverallGrade(c.standards);
                        return (
                          <div
                            key={c.id}
                            className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className="font-bold text-xs"
                                style={{ color: c.color }}
                              >
                                {c.name}
                              </span>
                            </div>
                            <div className="text-xl font-black text-emerald-400">
                              {c.manualGrade !== undefined &&
                              c.manualGrade !== null &&
                              String(c.manualGrade).trim() !== ""
                                ? `${c.manualGrade} (Manual Override)`
                                : `${grade.letter} (${grade.gpa.toFixed(2)})`}
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {grade.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SYLLABUS */}
              {activeTab === "syllabus" && (
                <div className="space-y-3 pt-1">
                  <h3 className="text-sm font-bold">Syllabus Parser</h3>
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
                          ? "Parsing file..."
                          : "Click to upload syllabus document"}
                      </span>
                    </label>
                  </div>

                  {parsedItems.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
                      <h4 className="font-semibold text-xs text-emerald-400">
                        Extracted Items:
                      </h4>
                      <div className="space-y-1">
                        {parsedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-slate-900 p-1.5 rounded flex justify-between"
                          >
                            <span>
                              {item.title} ({item.type})
                            </span>
                            <span className="text-slate-400">
                              Due: {item.dueDate}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={importParsedTasks}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 rounded-lg text-xs transition"
                      >
                        Import All Extracted Tasks
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
