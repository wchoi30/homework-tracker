"use client";

import { supabase } from './supabase';
import { useState, useEffect } from "react";
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
  Award,
  ChevronRight,
  Cloud,
  CloudOff,
} from "lucide-react";

// Standards-Based Grading Scale Definition on 4.33 Scale
type StandardLevel = "A+" | "A-" | "C+" | "D" | "F";

const STANDARD_SCALE: Record<
  StandardLevel,
  { points: number; label: string; color: string }
> = {
  "A+": { points: 4.33, label: "Meeting with Excellence", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  "A-": { points: 3.67, label: "Meeting", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  "C+": { points: 2.33, label: "Developing", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  D: { points: 1.00, label: "Beginning", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  F: { points: 0.00, label: "Not Yet Evident", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

type StandardItem = {
  id: string;
  name: string;
  level?: StandardLevel;
};

type ClassItem = {
  id: string;
  name: string;
  color: string;
  targetGrade: number;
  manualGrade?: number;
  standards: StandardItem[];
};

type Task = {
  id: string;
  title: string;
  classId: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  completed: boolean;
  weight?: number;
  score?: number;
};

export default function Home() {
  const [classes, setClasses] = useState<ClassItem[]>([
    {
      id: "1",
      name: "Math",
      color: "#3B82F6",
      targetGrade: 90,
      standards: [
        { id: "s1", name: "S1: Linear Equations", level: "A+" },
        { id: "s2", name: "S2: Quadratic Functions", level: "A-" },
      ],
    },
    {
      id: "2",
      name: "Science",
      color: "#10B981",
      targetGrade: 85,
      standards: [
        { id: "s4", name: "S1: Experimental Design", level: "A-" },
        { id: "s5", name: "S2: Chemical Bonding", level: "C+" },
      ],
    },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "101",
      title: "Midterm Exam",
      classId: "1",
      dueDate: "2026-09-25",
      estimatedHours: 4,
      actualHours: 1.5,
      completed: false,
      weight: 25,
      score: 98,
    },
    {
      id: "102",
      title: "Weekly Homework 1",
      classId: "1",
      dueDate: "2026-09-22",
      estimatedHours: 1,
      actualHours: 1,
      completed: true,
      weight: 0,
    },
  ]);

  const [activeTab, setActiveTab] = useState<
    "standards" | "list" | "calendar" | "grades" | "syllabus"
  >("standards");
  const [selectedClassId, setSelectedClassId] = useState<string>("1");
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  // Form states
  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState("#3B82F6");
  const [newStandardName, setNewStandardName] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskClassId, setTaskClassId] = useState("1");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskHours, setTaskHours] = useState("1");
  const [taskWeight, setTaskWeight] = useState("");

  // Pomodoro Timer State
  const [selectedTimerTaskId, setSelectedTimerTaskId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");

  // Syllabus Parsing State
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<Partial<Task>[]>([]);

  // Initial Load from Supabase with LocalStorage Fallback
  useEffect(() => {
    async function loadData() {
      setSyncStatus('syncing');
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('data')
          .eq('user_id', 'my_sync_key')
          .single();

        if (data && data.data) {
          if (data.data.classes) setClasses(data.data.classes);
          if (data.data.tasks) setTasks(data.data.tasks);
          setSyncStatus('synced');
        } else {
          // LocalStorage fallback
          const savedClasses = localStorage.getItem("tracker_classes_v4");
          const savedTasks = localStorage.getItem("tracker_tasks_v4");
          if (savedClasses) setClasses(JSON.parse(savedClasses));
          if (savedTasks) setTasks(JSON.parse(savedTasks));
          setSyncStatus('synced');
        }
      } catch (err) {
        console.error('Data load error:', err);
        setSyncStatus('error');
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, []);

  // Save to Supabase and LocalStorage on change
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem("tracker_classes_v4", JSON.stringify(classes));
    localStorage.setItem("tracker_tasks_v4", JSON.stringify(tasks));

    async function saveData() {
      setSyncStatus('syncing');
      try {
        const { error } = await supabase
          .from('user_data')
          .upsert(
            {
              user_id: 'my_sync_key',
              data: { classes, tasks },
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) setSyncStatus('error');
        else setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
      }
    }

    const timeout = setTimeout(saveData, 500);
    return () => clearTimeout(timeout);
  }, [classes, tasks, isLoaded]);

  // Convert average 4.33 GPA points back to overall letter grade
  const calculateOverallGrade = (standards: StandardItem[]) => {
    const evaluated = standards.filter((s) => s.level);
    if (evaluated.length === 0)
      return { letter: "N/A", label: "No Standards Evaluated", gpa: 0 };

    const totalPoints = evaluated.reduce(
      (sum, s) => sum + STANDARD_SCALE[s.level!].points,
      0
    );
    const avgGpa = totalPoints / evaluated.length;

    if (avgGpa >= 4.17)
      return { letter: "A+", label: "Meeting with High Distinction", gpa: avgGpa };
    if (avgGpa >= 3.84)
      return { letter: "A", label: "Meeting with Excellence", gpa: avgGpa };
    if (avgGpa >= 3.50)
      return { letter: "A-", label: "Meeting Standards", gpa: avgGpa };
    if (avgGpa >= 3.17)
      return { letter: "B+", label: "Above Average", gpa: avgGpa };
    if (avgGpa >= 2.84)
      return { letter: "B", label: "Proficient", gpa: avgGpa };
    if (avgGpa >= 2.50)
      return { letter: "B-", label: "Approaching Proficiency", gpa: avgGpa };
    if (avgGpa >= 2.17)
      return { letter: "C+", label: "Developing", gpa: avgGpa };
    if (avgGpa >= 1.84)
      return { letter: "C", label: "Sufficient", gpa: avgGpa };
    if (avgGpa >= 1.50)
      return { letter: "C-", label: "Below Average", gpa: avgGpa };
    if (avgGpa >= 0.50)
      return { letter: "D", label: "Beginning", gpa: avgGpa };
    return { letter: "F", label: "Not Yet Evident", gpa: avgGpa };
  };

  // Weighted Percentage Grade Calculation
  const getClassGradePercentage = (cls: ClassItem): number | null => {
    if (cls.manualGrade !== undefined && !isNaN(cls.manualGrade)) {
      return cls.manualGrade;
    }
    const classTasks = tasks.filter((t) => t.classId === cls.id);
    const gradedTasks = classTasks.filter(
      (t) => t.score !== undefined && (t.weight || 0) > 0
    );

    const totalWeight = gradedTasks.reduce((sum, t) => sum + (t.weight || 0), 0);
    if (totalWeight === 0) return null;

    const weightedPoints = gradedTasks.reduce(
      (sum, t) => sum + ((t.score || 0) * (t.weight || 0)) / 100,
      0
    );

    return parseFloat(((weightedPoints / totalWeight) * 100).toFixed(1));
  };

  const updateManualGrade = (classId: string, grade: string) => {
    const val = grade === "" ? undefined : parseFloat(grade);
    setClasses(
      classes.map((cls) =>
        cls.id === classId ? { ...cls, manualGrade: val } : cls
      )
    );
  };

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      if (timerMode === "work" && selectedTimerTaskId) {
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === selectedTimerTaskId
              ? { ...t, actualHours: +(t.actualHours + 25 / 60).toFixed(2) }
              : t
          )
        );
        alert("Pomodoro session complete! 25 minutes logged to your task.");
        setTimerMode("break");
        setTimeLeft(5 * 60);
      } else {
        alert("Break is over! Time to focus.");
        setTimerMode("work");
        setTimeLeft(25 * 60);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft, timerMode, selectedTimerTaskId]);

  const toggleTimer = () => {
    if (!selectedTimerTaskId && timerMode === "work") {
      alert("Please select a task to track focus time for!");
      return;
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMode === "work" ? 25 * 60 : 5 * 60);
  };

  // Classes & Standards Actions
  const addClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const newClass: ClassItem = {
      id: Date.now().toString(),
      name: newClassName,
      color: newClassColor,
      targetGrade: 90,
      standards: [],
    };
    setClasses([...classes, newClass]);
    setNewClassName("");
  };

  const deleteClass = (id: string) => {
    setClasses(classes.filter((c) => c.id !== id));
    setTasks(tasks.filter((t) => t.classId !== id));
  };

  const updateStandardGrade = (
    classId: string,
    standardId: string,
    level: StandardLevel
  ) => {
    setClasses((prev) =>
      prev.map((cls) => {
        if (cls.id !== classId) return cls;
        return {
          ...cls,
          standards: cls.standards.map((st) =>
            st.id === standardId ? { ...st, level } : st
          ),
        };
      })
    );
  };

  const addStandardToClass = (classId: string) => {
    if (!newStandardName.trim()) return;
    const newStd: StandardItem = {
      id: Date.now().toString(),
      name: newStandardName,
    };
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === classId ? { ...cls, standards: [...cls.standards, newStd] } : cls
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
              standards: cls.standards.filter((s) => s.id !== standardId),
            }
          : cls
      )
    );
  };

  // Task Actions
  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskTitle,
      classId: taskClassId || (classes[0]?.id ?? "1"),
      dueDate: taskDueDate,
      estimatedHours: parseFloat(taskHours) || 1,
      actualHours: 0,
      completed: false,
      weight: taskWeight !== "" ? parseFloat(taskWeight) : 0,
    };
    setTasks([...tasks, newTask]);
    setTaskTitle("");
    setTaskDueDate("");
    setTaskWeight("");
  };

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const updateTaskScore = (id: string, score: number) => {
    setTasks(
      tasks.map((task) => (task.id === id ? { ...task, score } : task))
    );
  };

  // Priority Calculation Engine
  const calculatePriorityScore = (task: Task): number => {
    if (task.completed) return -1;
    let score = 0;

    if (task.dueDate) {
      const today = new Date();
      const due = new Date(task.dueDate);
      const diffDays = Math.ceil(
        (due.getTime() - today.getTime()) / (1000 * 3600 * 24)
      );
      if (diffDays <= 0) score += 100;
      else if (diffDays <= 2) score += 80;
      else if (diffDays <= 7) score += 50;
      else score += 20;
    }

    score += (task.weight || 0) * 1.5;
    if (task.estimatedHours > 0) {
      score += Math.min(20, 30 / task.estimatedHours);
    }

    return score;
  };

  const topPriorityTask = [...tasks]
    .filter((t) => !t.completed)
    .sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a))[0];

  // Syllabus Parser Upload Mock
  const handleSyllabusUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setTimeout(() => {
      const mockExtracted: Partial<Task>[] = [
        {
          title: "Syllabus Quiz",
          dueDate: "2026-09-24",
          estimatedHours: 1,
          weight: 5,
        },
        {
          title: "Research Paper Draft",
          dueDate: "2026-10-10",
          estimatedHours: 5,
          weight: 20,
        },
        {
          title: "Final Presentation",
          dueDate: "2026-11-15",
          estimatedHours: 6,
          weight: 30,
        },
      ];
      setParsedItems(mockExtracted);
      setIsParsing(false);
    }, 1500);
  };

  const importParsedTasks = () => {
    const imported: Task[] = parsedItems.map((item, i) => ({
      id: (Date.now() + i).toString(),
      title: item.title || "Imported Task",
      classId: selectedClassId || classes[0]?.id || "1",
      dueDate: item.dueDate || "",
      estimatedHours: item.estimatedHours || 2,
      actualHours: 0,
      completed: false,
      weight: item.weight || 0,
    }));
    setTasks([...tasks, ...imported]);
    setParsedItems([]);
    alert(`Successfully imported ${imported.length} tasks!`);
  };

  const activeClass =
    classes.find((c) => c.id === selectedClassId) || classes[0];

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
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="text-blue-500" /> Academic OS & Standards Tracker
            </h1>
            <p className="text-slate-400 mt-1">
              4.33 GPA Standards Average, What-If Grades, AI Priority & Focus Timer.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              {syncStatus === 'synced' && <><Cloud className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Cloud Synced</span></>}
              {syncStatus === 'syncing' && <><Cloud className="w-4 h-4 text-amber-400 animate-pulse" /><span className="text-amber-400">Syncing...</span></>}
              {syncStatus === 'error' && <><CloudOff className="w-4 h-4 text-rose-400" /><span className="text-rose-400">Sync Error</span></>}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-4">
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                  <Flame size={14} className="text-amber-500" /> Focus Timer ({timerMode})
                </div>
                <div className="text-2xl font-mono font-bold text-blue-400">
                  {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? "0" : ""}
                  {timeLeft % 60}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={toggleTimer}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                >
                  {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  onClick={resetTimer}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Priority Banner */}
        {topPriorityTask && (
          <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                <Sparkles size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Smart Priority Recommendation
                </span>
                <h3 className="font-semibold text-base text-white">
                  Work on: <span className="underline">{topPriorityTask.title}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Calculated based on deadline urgency, weight impact ({topPriorityTask.weight || 0}%), and effort.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTimerTaskId(topPriorityTask.id)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-medium rounded-lg whitespace-nowrap"
            >
              Start Focus Session
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <section className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h2 className="text-xl font-semibold mb-4">Classes</h2>
              <form onSubmit={addClass} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="New Class..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm flex-1 focus:outline-none"
                />
                <input
                  type="color"
                  value={newClassColor}
                  onChange={(e) => setNewClassColor(e.target.value)}
                  className="h-10 w-10 bg-transparent cursor-pointer rounded"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 p-2 rounded-lg"
                >
                  <Plus size={20} />
                </button>
              </form>

              <div className="space-y-3">
                {classes.map((cls) => {
                  const sbgGrade = calculateOverallGrade(cls.standards);
                  const gradePercent = getClassGradePercentage(cls);

                  return (
                    <div
                      key={cls.id}
                      className={`p-3 rounded-lg border transition space-y-2 ${
                        selectedClassId === cls.id
                          ? "bg-slate-800 border-blue-500/50"
                          : "bg-slate-800/40 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cls.color }}
                          />
                          <span className="font-semibold text-sm">{cls.name}</span>
                        </div>
                        <button
                          onClick={() => deleteClass(cls.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Manual %:</span>
                          <input
                            type="number"
                            placeholder="Auto"
                            value={cls.manualGrade ?? (gradePercent ?? "")}
                            onChange={(e) =>
                              updateManualGrade(cls.id, e.target.value)
                            }
                            className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-center font-bold text-emerald-400 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400 text-sm">
                            {sbgGrade.letter}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedClassId(cls.id);
                              setActiveTab("standards");
                            }}
                            className="px-2 py-1 bg-blue-600/30 text-blue-400 hover:bg-blue-600/50 rounded flex items-center gap-1 font-medium text-[11px]"
                          >
                            Standards <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Clock size={16} className="text-blue-400" /> Link Task to Focus Timer
              </h3>
              <select
                value={selectedTimerTaskId}
                onChange={(e) => setSelectedTimerTaskId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-200"
              >
                <option value="">-- Select Focus Task --</option>
                {tasks
                  .filter((t) => !t.completed)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.actualHours}/{t.estimatedHours} hrs logged)
                    </option>
                  ))}
              </select>
            </div>
          </section>

          {/* Main Area */}
          <section className="md:col-span-2 space-y-6">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
              <h2 className="text-xl font-semibold">Add Task / Assignment</h2>
              <form onSubmit={addTask} className="space-y-4">
                <input
                  type="text"
                  placeholder="Task title (e.g., Essay, Chapter 4 Review, Midterm)"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm focus:outline-none"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <select
                    value={taskClassId}
                    onChange={(e) => setTaskClassId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm focus:outline-none"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm focus:outline-none"
                  />

                  <input
                    type="number"
                    step="0.5"
                    placeholder="Est. Hrs"
                    value={taskHours}
                    onChange={(e) => setTaskHours(e.target.value)}
                    className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm focus:outline-none"
                  />

                  <input
                    type="number"
                    placeholder="Weight % (Opt.)"
                    value={taskWeight}
                    onChange={(e) => setTaskWeight(e.target.value)}
                    className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
                >
                  <Plus size={18} /> Add Task
                </button>
              </form>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <h2 className="text-xl font-semibold">Workspace</h2>
                <div className="flex flex-wrap gap-2 bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab("standards")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      activeTab === "standards"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    <Award size={14} /> Standards (4.33 Scale)
                  </button>
                  <button
                    onClick={() => setActiveTab("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      activeTab === "list"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    <List size={14} /> Schedule
                  </button>
                  <button
                    onClick={() => setActiveTab("calendar")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      activeTab === "calendar"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    <Calendar size={14} /> Calendar
                  </button>
                  <button
                    onClick={() => setActiveTab("grades")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      activeTab === "grades"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    <Calculator size={14} /> What-If Grades
                  </button>
                  <button
                    onClick={() => setActiveTab("syllabus")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      activeTab === "syllabus"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    <Upload size={14} /> Syllabus AI
                  </button>
                </div>
              </div>

              {/* TAB 1: STANDARDS EDITOR (4.33 Scale) */}
              {activeTab === "standards" && activeClass && (
                <div className="space-y-6 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: activeClass.color }}
                      />
                      <div>
                        <h3 className="text-lg font-bold">{activeClass.name} Standards</h3>
                        <p className="text-xs text-slate-400">
                          Letter grade calculated from standard 4.33 GPA point averages.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const grade = calculateOverallGrade(activeClass.standards);
                        return (
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="text-2xl font-black text-emerald-400">
                                {grade.letter}{" "}
                                {grade.gpa > 0 && `(${grade.gpa.toFixed(2)})`}
                              </div>
                              <div className="text-xs text-slate-400">{grade.label}</div>
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
                      className="flex-1 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm focus:outline-none"
                    />
                    <button
                      onClick={() => addStandardToClass(activeClass.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 font-medium text-xs rounded-lg flex items-center gap-2"
                    >
                      <Plus size={16} /> Add Standard
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activeClass.standards.map((st) => (
                      <div
                        key={st.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-800/60 rounded-xl border border-slate-800 gap-3"
                      >
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm">{st.name}</h4>
                          <span
                            className={`inline-block text-[11px] px-2 py-0.5 rounded border font-medium ${
                              st.level
                                ? STANDARD_SCALE[st.level].color
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            {st.level
                              ? `${st.level} (${STANDARD_SCALE[st.level].points.toFixed(
                                  2
                                )} pts) - ${STANDARD_SCALE[st.level].label}`
                              : "Not Evaluated"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <select
                            value={st.level || ""}
                            onChange={(e) =>
                              updateStandardGrade(
                                activeClass.id,
                                st.id,
                                e.target.value as StandardLevel
                              )
                            }
                            className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none text-slate-200"
                          >
                            <option value="">-- Select Standard Level --</option>
                            <option value="A+">A+ (4.33 pts - Meeting with Excellence)</option>
                            <option value="A-">A- (3.67 pts - Meeting)</option>
                            <option value="C+">C+ (2.33 pts - Developing)</option>
                            <option value="D">D (1.00 pt - Beginning)</option>
                            <option value="F">F (0.00 pts - Not Yet Evident)</option>
                          </select>

                          <button
                            onClick={() => deleteStandard(activeClass.id, st.id)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {activeClass.standards.length === 0 && (
                      <p className="text-slate-500 text-xs text-center py-6">
                        No standards added for this course yet.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: SCHEDULE LIST */}
              {activeTab === "list" && (
                <div className="space-y-3 pt-2">
                  {tasks.map((task) => {
                    const cls = classes.find((c) => c.id === task.classId);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3.5 bg-slate-800/40 rounded-xl border border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                              task.completed
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "border-slate-600 hover:border-blue-400"
                            }`}
                          >
                            {task.completed && <Check size={14} />}
                          </button>
                          <div>
                            <span
                              className={`text-sm font-medium ${
                                task.completed ? "line-through text-slate-500" : ""
                              }`}
                            >
                              {task.title}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              {cls && (
                                <span className="flex items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: cls.color }}
                                  />
                                  {cls.name}
                                </span>
                              )}
                              {task.dueDate && <span>• Due {task.dueDate}</span>}
                              {task.weight ? <span>• {task.weight}% Weight</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 font-mono">
                            {task.actualHours}/{task.estimatedHours} hrs
                          </span>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-slate-500 hover:text-red-400 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-6">
                      No tasks found. Add a task above to get started.
                    </p>
                  )}
                </div>
              )}

              {/* TAB 3: CALENDAR VIEW */}
              {activeTab === "calendar" && (
                <div className="pt-2 space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>{currentMonth}</span>
                    <span className="text-xs font-normal text-slate-400">
                      Deadlines mapped to dates
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="font-semibold text-slate-500 py-1">
                        {d}
                      </div>
                    ))}
                    {daysArray.map((day) => {
                      const dayStr = `2026-09-${day < 10 ? "0" + day : day}`;
                      const dayTasks = tasks.filter((t) => t.dueDate === dayStr);

                      return (
                        <div
                          key={day}
                          className="min-h-[60px] bg-slate-800/30 border border-slate-800/60 rounded-lg p-1 text-left flex flex-col justify-between"
                        >
                          <span className="text-[10px] text-slate-500 font-bold">
                            {day}
                          </span>
                          <div className="space-y-1">
                            {dayTasks.map((t) => {
                              const cls = classes.find((c) => c.id === t.classId);
                              return (
                                <div
                                  key={t.id}
                                  className="text-[9px] px-1 py-0.5 rounded truncate text-white font-medium"
                                  style={{
                                    backgroundColor: cls?.color || "#3B82F6",
                                  }}
                                  title={t.title}
                                >
                                  {t.title}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: WHAT-IF GRADECALCULATOR */}
              {activeTab === "grades" && (
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-slate-400">
                    Input scores to simulate your hypothetical weighted average percentage for each class.
                  </p>
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const cls = classes.find((c) => c.id === task.classId);
                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs"
                        >
                          <div>
                            <span className="font-semibold">{task.title}</span>
                            <div className="text-slate-400">
                              {cls?.name} • Weight: {task.weight || 0}%
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Score %:</span>
                            <input
                              type="number"
                              placeholder="e.g. 95"
                              value={task.score ?? ""}
                              onChange={(e) =>
                                updateTaskScore(
                                  task.id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-16 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-right font-mono font-bold text-blue-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: SYLLABUS AI UPLOADER */}
              {activeTab === "syllabus" && (
                <div className="space-y-4 pt-2 text-center">
                  <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 transition flex flex-col items-center justify-center gap-3">
                    <Upload size={32} className="text-blue-400" />
                    <div>
                      <h3 className="font-bold text-sm">
                        Upload Syllabus PDF / Document
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Extract key dates, weights, and assignments automatically.
                      </p>
                    </div>
                    <label className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-medium rounded-lg cursor-pointer">
                      Select File
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleSyllabusUpload}
                      />
                    </label>
                  </div>

                  {isParsing && (
                    <p className="text-xs text-blue-400 animate-pulse">
                      Parsing syllabus structure with AI...
                    </p>
                  )}

                  {parsedItems.length > 0 && (
                    <div className="text-left space-y-3 pt-4 border-t border-slate-800">
                      <h4 className="text-xs font-bold text-slate-300">
                        Parsed Assignments Preview:
                      </h4>
                      {parsedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-800/40 rounded-lg text-xs flex justify-between"
                        >
                          <span>{item.title}</span>
                          <span className="text-slate-400">
                            Due {item.dueDate} • Weight {item.weight}%
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={importParsedTasks}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-lg mt-2"
                      >
                        Import Parsed Tasks
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}