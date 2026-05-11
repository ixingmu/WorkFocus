import { useState } from 'react';
import { Plus, Timer, MoreVertical, Search, CheckCircle2, GripVertical } from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';
import { Task, PomodoroSession } from '../types';

interface TaskListProps {
  tasks: Task[];
  onAddTask: (title: string, expected: number) => void;
  onToggleTask: (id: string) => void;
  onStartTask: (id: string) => void;
  sessions: PomodoroSession[];
  onUpdateOrder: (tasks: Task[]) => void;
}

interface SortableItemProps {
  task: Task;
  onToggleTask: (id: string) => void;
  onStartTask: (id: string) => void;
  key?: string;
}

function SortableTaskItem({ task, onToggleTask, onStartTask }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "bento-card p-6 flex flex-col justify-between group cursor-pointer hover:-translate-y-1 hover:shadow-md h-full relative",
        task.completedAt && "opacity-60"
      )}
      onClick={() => !task.completedAt && onStartTask(task.id)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
            className={cn(
              "w-6 h-6 rounded-lg border-2 border-gray-200 group-hover:border-primary transition-all flex items-center justify-center hover:bg-primary/5",
              task.completedAt && "bg-secondary/10 border-secondary"
            )}
          >
            {task.completedAt ? (
              <CheckCircle2 className="w-4 h-4 text-secondary" />
            ) : (
              <div className="w-2.5 h-2.5 bg-primary rounded-sm scale-0 group-hover:scale-100 transition-transform" />
            )}
          </button>
          <div 
            {...attributes} {...listeners}
            className="p-1 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-gray-50 px-3 py-1 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {task.pomodoros}/{task.expectedPomodoros} 番茄
        </div>
      </div>
      
      <h4 className={cn(
        "text-lg font-bold text-gray-900 mb-6 truncate",
        task.completedAt && "line-through text-gray-400"
      )}>
        {task.title}
      </h4>
      
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-hidden">
          {task.progress > 0 && (
            <div className="absolute top-0 left-0 h-1 bg-primary/20 transition-all rounded-full" style={{ width: `${task.progress}%` }} />
          )}
          {[...Array(task.expectedPomodoros)].map((_, i) => (
             <div key={i} className={cn("w-1.5 h-4 rounded-full", i < task.pomodoros ? "bg-primary" : "bg-gray-100")} />
          ))}
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-gray-400">{Math.round(task.progress)}%</span>
           <button className="text-gray-300 hover:text-gray-900 transition-colors">
            <Timer className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskList({ tasks, onAddTask, onToggleTask, onStartTask, onUpdateOrder }: TaskListProps) {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      onUpdateOrder(arrayMove(tasks, oldIndex, newIndex));
    }
  };

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  const activeTasks = filteredTasks.filter(t => !t.completedAt);
  const completedTasks = filteredTasks.filter(t => t.completedAt);

  const handleAdd = () => {
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle, 1);
      setNewTaskTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto w-full pb-24 h-full flex flex-col gap-8">
      {/* Upper Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Task Search & Add Area */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">今日工作计划 <span className="text-primary">· Daily Plan</span></h3>
              <p className="text-sm text-gray-400 font-medium">规划您的深度专注时段，支持拖拽排序</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索任务标题..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Add Task Card */}
          <div className={cn(
            "bg-primary rounded-[2.5rem] p-8 text-white shadow-xl shadow-primary/20 transition-all duration-500 overflow-hidden relative",
            isAdding ? "h-auto" : "h-24 flex items-center justify-between cursor-pointer hover:scale-[1.01]"
          )}
          onClick={() => !isAdding && setIsAdding(true)}
          >
            {!isAdding ? (
              <>
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black">开启新任务项</h4>
                    <p className="text-sm opacity-70">点击此处快速添加任务，拖拽方块进行排序</p>
                  </div>
                </div>
                <div className="text-xs font-bold bg-white/20 px-4 py-2 rounded-xl">ADD TASK</div>
              </>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                <input
                  autoFocus
                  type="text"
                  placeholder="你想在接下来的专注时段完成什么？"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white text-xl font-bold placeholder-white/40 focus:outline-none focus:ring-4 ring-white/10"
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsAdding(false); }}
                    className="px-6 py-3 text-sm font-bold opacity-60 hover:opacity-100 uppercase tracking-widest"
                  >
                    取消
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                    className="px-8 py-3 bg-white text-primary rounded-2xl text-sm font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    确定添加
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tasks Container with DND */}
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
              <SortableContext 
                items={activeTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {activeTasks.map(task => (
                  <SortableTaskItem 
                    key={task.id} 
                    task={task} 
                    onToggleTask={onToggleTask}
                    onStartTask={onStartTask} 
                  />
                ))}
              </SortableContext>
              
              {/* Empty state if no active tasks */}
              {activeTasks.length === 0 && !isAdding && (
                <div className="col-span-full py-12 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center text-gray-400 gap-4">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                     <CheckCircle2 className="w-8 h-8 opacity-20" />
                   </div>
                   <p className="font-bold">暂无进行中的任务，休息一下？</p>
                </div>
              )}
            </div>
          </DndContext>

          {/* Completed Section (Compact) */}
          {completedTasks.length > 0 && (
            <div className="mt-8 space-y-4">
              <h5 className="text-[10px] uppercase font-black text-gray-400 tracking-[0.3em] px-2 mb-4">今日已完成事项</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedTasks.map(task => (
                  <div key={task.id} className="bg-white border border-gray-100 rounded-3xl p-5 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-4">
                      <button 
                         onClick={() => onToggleTask(task.id)}
                         className="bg-secondary/10 p-2 rounded-xl hover:bg-secondary/20 transition-all group"
                         title="恢复到计划"
                      >
                        <CheckCircle2 className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
                      </button>
                      <span className="font-bold text-gray-900 line-through">{task.title}</span>
                    </div>
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold text-gray-500 uppercase">{task.pomodoros} 番茄</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Today Summary Widget */}
        <div className="col-span-12 lg:col-span-4 hidden lg:block">
          <div className="bento-card p-10 space-y-10 h-full bg-surface-container/30 backdrop-blur-3xl sticky top-0">
             <div className="space-y-2">
                <h4 className="text-3xl font-black">计划仪表盘</h4>
                <p className="text-sm text-gray-400 font-medium">实时效率指数分析</p>
             </div>

             <div className="relative flex justify-center py-10">
                <div className="w-48 h-48 rounded-[3rem] border-[12px] border-gray-50 flex flex-col items-center justify-center relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
                    <rect 
                      x="10" y="10" width="180" height="180" rx="45"
                      className="fill-none stroke-gray-100 stroke-[12px]"
                    />
                    <rect 
                      x="10" y="10" width="180" height="180" rx="45"
                      className="fill-none stroke-primary stroke-[12px] transition-all duration-1000 ease-in-out"
                      strokeDasharray="645"
                      strokeDashoffset={645 - (645 * (tasks.length > 0 ? (completedTasks.length / tasks.length) : 0))}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-5xl font-black font-mono">{tasks.length > 0 ? Math.round((completedTasks.length / (tasks.length)) * 100) : 0}%</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">完成率</span>
                </div>
             </div>

             <div className="space-y-4">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">累计番茄总数</div>
                  <div className="text-2xl font-black text-gray-900">{tasks.reduce((acc, t) => acc + t.pomodoros, 0)} <span className="text-sm font-normal">session</span></div>
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">任务完成数</div>
                  <div className="text-2xl font-black text-gray-900">{completedTasks.length} <span className="text-sm font-normal">tasks</span></div>
                </div>
             </div>

             <div className="pt-10 flex border-t border-gray-100">
                <button className="w-full py-4 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 font-bold text-sm hover:border-gray-300 hover:text-gray-600 transition-all">
                  历史深度回顾
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
