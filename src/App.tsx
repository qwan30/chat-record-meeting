import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Calendar,
  Lock,
  Settings,
  FolderOpen,
  Play,
  Square,
  Download,
  Search,
  Sparkles,
  Trash2,
  AlertTriangle,
  User,
  Globe,
  RefreshCw,
  FileText,
  CheckCircle2,
  Languages,
  ListTodo,
  LogOut,
  Plus,
  Compass,
  Volume2,
  FileCode,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  Star,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as AppUser, Meeting, DashboardStats, TranscriptSegment, MeetingSummary } from './types';

// Hardcoded sample audio files
const COMPACT_VALID_WAV_BASE64 = "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

// Utility to safely style and highlight searched text inside timeline discussions
const highlightText = (text: string, searchPhrase: string) => {
  if (!searchPhrase || !searchPhrase.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${searchPhrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) 
          ? <mark key={i} className="bg-yellow-250 text-[#111111] font-semibold px-0.5 rounded underline decoration-amber-400 decoration-1">{part}</mark> 
          : part
      )}
    </span>
  );
};

export default function App() {
  // Session / Authentication state
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // App navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new-meeting' | 'settings'>('dashboard');

  // Meetings and Dashboard Data
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filters and queries
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // New Meeting configuration
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDesc, setNewMeetingDesc] = useState('');
  const [newMeetingType, setNewMeetingType] = useState('Product Sync');
  const [newMeetingLang, setNewMeetingLang] = useState('English');
  const [createLoading, setCreateLoading] = useState(false);

  // Recording Engine state
  const [activeRecordingMeeting, setActiveRecordingMeeting] = useState<Meeting | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingError, setRecordingError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Fallback / simulation picker
  const [simulationCategory, setSimulationCategory] = useState<'real-mic' | 'mock-design' | 'mock-vietnamese'>('real-mic');

  // UI state variables
  const [activeDetailTab, setActiveDetailTab] = useState<'summary' | 'transcript' | 'tasks' | 'decisions'>('summary');
  const [editTitle, setEditTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState('');
  const [previewTab, setPreviewTab] = useState<'transcript' | 'summary' | 'tasks'>('transcript');

  // Meeting Detail states
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiAssistantMessage, setAiAssistantMessage] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<{ sender: 'user' | 'assistant', text: string }[]>([]);
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [selectedSpeakerFilter, setSelectedSpeakerFilter] = useState('All');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(35); // starts at 35s
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Waveform visualization animation
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 30, 25, 45, 20, 60, 40, 75, 50, 30, 15, 25, 40, 55, 30]);

  // Timers and references
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch stats and lists on mount / user change
  useEffect(() => {
    const cachedUser = localStorage.getItem('mi_user');
    if (cachedUser) {
      try {
        setCurrentUser(JSON.parse(cachedUser));
      } catch (e) {
        localStorage.removeItem('mi_user');
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMeetings();
      fetchStats();
    }
  }, [currentUser, searchTerm, typeFilter]);

  // Alert before unloading if actively recording
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeRecordingMeeting) {
        e.preventDefault();
        e.returnValue = 'Record session in progress. Leaving will lose current audio.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeRecordingMeeting]);

  // Wave heights dynamic simulator for visual cue
  useEffect(() => {
    if (activeRecordingMeeting && !isRecordingPaused) {
      waveTimerRef.current = setInterval(() => {
        setWaveHeights(prev => prev.map(() => Math.floor(Math.random() * 50) + 6));
      }, 100);
    } else {
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    }
    return () => {
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    };
  }, [activeRecordingMeeting, isRecordingPaused]);

  // Toast auto-clear
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const fetchMeetings = async () => {
    if (!currentUser) return;
    setListLoading(true);
    try {
      const url = `/api/v1/meetings?userId=${currentUser.id}&search=${encodeURIComponent(searchTerm)}&type=${typeFilter}`;
      const response = await fetch(url);
      const data = await response.json();
      setMeetings(data);
    } catch (err) {
      console.error('Error fetching meetings list', err);
    } finally {
      setListLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!currentUser) return;
    setStatsLoading(true);
    try {
      const url = `/api/v1/dashboard/stats?userId=${currentUser.id}`;
      const response = await fetch(url);
      const data = await response.json();
      setDashboardStats(data);
    } catch (err) {
      console.error('Error fetching stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Auth Submit Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail) {
      setAuthError('Email string is required.');
      return;
    }
    setAuthLoading(true);

    try {
      const endpoint = isSignUp ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const bodyPayload = isSignUp 
        ? { email: authEmail, name: authName || authEmail.split('@')[0] } 
        : { email: authEmail };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'Authentication error occurred.');
      }

      const user: AppUser = resJson.user;
      setCurrentUser(user);
      localStorage.setItem('mi_user', JSON.stringify(user));
      showToast(isSignUp ? 'Registration successful!' : 'Logged in successfully!');
    } catch (err: any) {
      setAuthError(err.message || 'Server authentication refused.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Sign-in simulator
  const triggerGoogleLoginSimulator = async (name: string, email: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/v1/auth/mock-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`
        })
      });
      const resJson = await response.json();
      const user: AppUser = resJson.user;
      setCurrentUser(user);
      localStorage.setItem('mi_user', JSON.stringify(user));
      showToast(`Welcome back, ${user.name}! Connected safely via Google.`);
    } catch (err: any) {
      setAuthError('OAuth Simulation connection failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mi_user');
    setSelectedMeeting(null);
    setActiveTab('dashboard');
    showToast('Logged out of workspace.');
  };

  // Create Draft Meeting
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) {
      showToast('Please type a distinct title.');
      return;
    }
    setCreateLoading(true);

    try {
      const response = await fetch('/api/v1/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMeetingTitle,
          description: newMeetingDesc,
          type: newMeetingType,
          language: newMeetingLang,
          userId: currentUser?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to bootstrap meeting record.');
      }

      const createdObj: Meeting = await response.json();
      setMeetings(prev => [createdObj, ...prev]);
      setActiveRecordingMeeting(createdObj);
      setRecordingDuration(0);
      setRecordingError('');
      
      // Auto switch tabs
      setActiveTab('new-meeting');
      
      // Input Cleanup
      setNewMeetingTitle('');
      setNewMeetingDesc('');

      showToast(`Meeting "${createdObj.title}" initialized as draft.`);
    } catch (err: any) {
      showToast(err.message || 'Creation failed.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Initialize Microphone Media Capture
  const startRecordingFlow = async () => {
    if (simulationCategory !== 'real-mic') {
      setIsRecordingPaused(false);
      setRecordingError('');
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      showToast('Mock recording session initialized.');
      return;
    }

    setAudioChunks([]);
    setRecordingError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecordingPaused(false);

      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      showToast('Microphone connected. Recording active...');
    } catch (err: any) {
      setRecordingError('Microphone block detected or device missing. Please use "Mock Simulation Fallbacks" for fully operational server-side Gemini demo experience!');
      console.warn('Microphone permission or capture issue:', err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsRecordingPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      showToast('Recording paused.');
    } else if (simulationCategory !== 'real-mic') {
      setIsRecordingPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsRecordingPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      showToast('Resuming recording...');
    } else if (simulationCategory !== 'real-mic') {
      setIsRecordingPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const stopAndProcessRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);

    const targetMeeting = activeRecordingMeeting;
    if (!targetMeeting) return;

    setIsProcessing(true);
    setProcessingStatus('Publishing stream to secure storage...');
    setActiveRecordingMeeting(null);

    try {
      let b64Data = '';
      let finalDuration = recordingDuration || 15;

      if (simulationCategory === 'real-mic' && mediaRecorder && audioChunks.length > 0) {
        mediaRecorder.stop();
        await new Promise(resolve => setTimeout(resolve, 800));

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setProcessingStatus('Converting raw speech into multi-modal bytes payload...');
        b64Data = await blobToBase64(audioBlob);
      } else {
        setProcessingStatus('Connecting pre-recorded benchmark sample metrics to Gemini...');
        b64Data = COMPACT_VALID_WAV_BASE64;
        finalDuration = simulationCategory === 'mock-vietnamese' ? 88 : 142;
      }

      setProcessingStatus('Invoking Gemini transcriber to analyze audio context & Speaker Labels...');
      
      const processResponse = await fetch(`/api/v1/meetings/${targetMeeting.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: b64Data,
          durationSec: finalDuration
        })
      });

      if (!processResponse.ok) {
        const errMsgPayload = await processResponse.json();
        throw new Error(errMsgPayload.details || 'Gemini transcriber failed.');
      }

      const updatedMeeting: Meeting = await processResponse.json();
      
      setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
      setSelectedMeeting(updatedMeeting);
      setActiveDetailTab('summary');
      setActiveTab('dashboard');

      showToast(`Meeting "${updatedMeeting.title}" fully processed with Gemini!`);
      fetchStats();
    } catch (err: any) {
      console.error(err);
      showToast(`AI Processing Failed: ${err.message || 'Check your Gemini key.'}`);
      fetchMeetings();
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      setAudioChunks([]);
      setMediaRecorder(null);
    }
  };

  const toggleActionItemStatus = async (meetingId: string, actionId: string, currentStatus: 'pending' | 'completed') => {
    const nextStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    
    // Optimistic UI updates
    setMeetings(prev => prev.map(m => {
      if (m.id === meetingId && m.actionItems) {
        const nextActions = m.actionItems.map(act => act.id === actionId ? { ...act, status: nextStatus } : act);
        return { ...m, actionItems: nextActions };
      }
      return m;
    }));

    if (selectedMeeting && selectedMeeting.id === meetingId && selectedMeeting.actionItems) {
      const updatedActions = selectedMeeting.actionItems.map(act => act.id === actionId ? { ...act, status: nextStatus } : act);
      setSelectedMeeting({ ...selectedMeeting, actionItems: updatedActions });
    }

    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!response.ok) throw new Error();
      fetchStats();
    } catch (err) {
      showToast('Error updating task status on server.');
    }
  };

  const handleRegenerateSummary = async (meetingId: string) => {
    setRegeneratingId(meetingId);
    showToast('Invoking Gemini to recalculate meeting brief structure...');

    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/regenerate`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Regeneration call rejected.');
      }
      const updatedObj: Meeting = await response.json();
      setMeetings(prev => prev.map(m => m.id === updatedObj.id ? updatedObj : m));
      setSelectedMeeting(updatedObj);
      showToast('Executive details updated instantly using Gemini.');
    } catch (err: any) {
      showToast('Error: Could not finish AI update.');
    } finally {
      setRegeneratingId(null);
    }
  };

  const askAiAssistant = async (questionText: string) => {
    if (!selectedMeeting || !questionText.trim()) return;
    
    // Add user message to state
    const userMsg = { sender: 'user' as const, text: questionText };
    setAiChatHistory(prev => [...prev, userMsg]);
    setAiAssistantMessage('');
    setAiAssistantLoading(true);

    try {
      const res = await fetch(`/api/v1/meetings/${selectedMeeting.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText })
      });
      if (!res.ok) {
        throw new Error('AI query failed');
      }
      const data = await res.json();
      setAiChatHistory(prev => [...prev, { sender: 'assistant' as const, text: data.answer }]);
    } catch (e: any) {
      setAiChatHistory(prev => [...prev, { sender: 'assistant' as const, text: `Sorry, there was an error processing that query: ${e.message || 'Unknown issue'}` }]);
    } finally {
      setAiAssistantLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this meeting from corporate systems?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error();

      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      if (selectedMeeting && selectedMeeting.id === meetingId) {
        setSelectedMeeting(null);
      }
      showToast('Meeting data records deleted from cloud storage.');
      fetchStats();
    } catch (err) {
      showToast('Failed to discard meeting safely.');
    }
  };

  const triggerExportDownload = (meetingId: string, format: 'markdown' | 'txt') => {
    window.location.href = `/api/v1/meetings/${meetingId}/export?format=${format}`;
  };

  const getDurationString = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-white text-[#374151] font-sans antialiased relative selection:bg-blue-100 selection:text-black">
      
      {/* Global Toast Message */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-50 bg-[#111111] text-white px-5 py-3 rounded-md shadow-lg flex items-center gap-3 border border-[#333333] max-w-sm"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold tracking-tight">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Banner */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl border border-[#e5e7eb] text-left space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                <h4 className="text-lg font-semibold tracking-tight text-[#111111]">Processing Audio Payload...</h4>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Gemini 3.5-flash is currently scanning multi-modal waveforms, isolating speech patterns, and structuring action lists.
              </p>
              <div className="bg-[#f5f5f5] rounded-md p-3 font-mono text-[11px] text-gray-600 border border-[#e5e7eb]">
                {processingStatus}
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#111111] h-full rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e5e7eb] px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div 
            onClick={() => { setSelectedMeeting(null); setActiveTab('dashboard'); }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center text-white font-bold text-sm">
              m
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold tracking-[-0.04em] text-[#111111] text-lg leading-tight">meetecho<span className="text-blue-500">.ai</span></span>
              <span className="text-[9px] font-mono tracking-tight text-gray-400 uppercase leading-none">AI Speech Sync</span>
            </div>
          </div>

          {/* Center Navigation links */}
          <nav className="hidden md:flex items-center gap-5">
            <span className="h-4 w-[1px] bg-gray-200" />
            {currentUser ? (
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-mono flex items-center gap-1.5 bg-gray-50 px-3 py-1 border border-gray-100 rounded-full">
                <span className="text-gray-400">Workspace</span>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className="text-[#111111] font-bold max-w-xs truncate">
                  {selectedMeeting 
                    ? selectedMeeting.title 
                    : activeTab === 'dashboard' 
                      ? 'Meetings' 
                      : activeTab === 'new-meeting' 
                        ? 'New Recording' 
                        : 'Settings'}
                </span>
              </span>
            ) : (
              <>
                <a href="#features" className="text-[13px] font-medium tracking-tight text-gray-500 hover:text-[#111111] transition-colors duration-200">Features</a>
                <a href="#how-it-works" className="text-[13px] font-medium tracking-tight text-gray-500 hover:text-[#111111] transition-colors duration-200">How it works</a>
                <a href="#use-cases" className="text-[13px] font-medium tracking-tight text-gray-500 hover:text-[#111111] transition-colors duration-200">Use cases</a>
                <a href="#pricing" className="text-[13px] font-medium tracking-tight text-gray-500 hover:text-[#111111] transition-colors duration-200">Pricing</a>
                <a href="#security" className="text-[13px] font-medium tracking-tight text-gray-500 hover:text-[#111111] transition-colors duration-200">Security</a>
              </>
            )}
          </nav>
        </div>

        {/* Right Nav Options */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-[#111111]">{currentUser.name}</span>
                <span className="text-[10px] text-gray-400 font-mono">{currentUser.email}</span>
              </div>
              <img 
                src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUser.name)}`}
                alt="user avatar" 
                className="w-9 h-9 rounded-full ring-2 ring-gray-100 object-cover"
              />
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 rounded-md hover:bg-[#f5f5f5] text-gray-400 hover:text-[#111111] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  triggerGoogleLoginSimulator('Alex Johnson', 'alex.johnson@corp.com');
                }}
                className="text-xs font-semibold text-gray-500 hover:text-[#111111] transition"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  triggerGoogleLoginSimulator('Alex Johnson', 'alex.johnson@corp.com');
                }}
                className="bg-[#111111] hover:bg-[#242424] text-white text-[13px] font-semibold px-4 py-2 rounded-md transition duration-200"
              >
                Start free sandbox
              </button>
            </div>
          )}
        </div>
      </header>

      {/* PUBLIC HOME / LANDING PLATFORM (Show to unregistered or visitor) */}
      {!currentUser ? (
        <div className="w-full flex flex-col min-h-screen font-sans antialiased text-[#111111] bg-white">
          
          {/* Section 1: Hero Band */}
          <main className="relative bg-white pt-20 pb-24 md:pt-28 md:pb-32 border-b border-[#e5e7eb]">
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Heading, Subtitle, and CTAs */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 bg-[#f5f5f5] border border-[#e5e7eb] px-3 py-1 rounded-full text-xs font-semibold text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>MeetEcho with real Gemini 3.5 audio processing</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#111111] leading-[1.10] font-sans">
                  Record, transcribe, <br />
                  and summarize meetings in <br />
                  <span className="text-blue-600">English &amp; Vietnamese.</span>
                </h1>

                <p className="text-gray-500 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl">
                  MeetEcho captures live meeting audio, identifies speakers, creates bilingual transcripts, and turns conversations into action items, summaries, and markdown exports.
                </p>

                {/* Unified CTA Flow */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => triggerGoogleLoginSimulator('Alex Johnson', 'alex.johnson@corp.com')}
                    className="bg-[#111111] hover:bg-[#242424] text-white px-6 py-3 rounded-md text-xs font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span>Start free sandbox</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const el = document.getElementById('product-demo');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-white hover:bg-[#f5f5f5] text-[#111111] border border-[#e5e7eb] px-6 py-3 rounded-md text-xs font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>View demo preview</span>
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-xs font-medium text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Bilingual transcription
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Speaker identification
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Markdown export ready
                  </span>
                </div>
              </div>

              {/* Right Column: Dynamic Interactive Product Preview Box */}
              <div id="product-demo" className="lg:col-span-5 flex flex-col justify-center">
                <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-lg text-left">
                  
                  {/* Card Header */}
                  <div className="bg-[#f8f9fa] border-b border-[#e5e7eb] px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
                      <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">Live Sandbox Session</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
                      Vietnamese &amp; EN Active
                    </span>
                  </div>

                  {/* Meeting Metadata */}
                  <div className="px-5 py-4 border-b border-[#e5e7eb]">
                    <h3 className="text-sm font-bold text-[#111111]">Daily Product Align Standup</h3>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">Duration: 12 mins • 3 Participants</p>
                  </div>

                  {/* Tabs Switching mechanism */}
                  <div className="px-4 py-2 bg-[#fdfdfd] border-b border-[#e5e7eb] flex gap-1">
                    {[
                      { id: 'transcript', text: 'Transcript' },
                      { id: 'summary', text: 'AI Summary' },
                      { id: 'tasks', text: 'Action Items' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setPreviewTab(tab.id as any)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                          previewTab === tab.id
                            ? 'bg-[#111111] text-white'
                            : 'text-gray-500 hover:text-[#111111] hover:bg-[#f5f5f5]'
                        }`}
                      >
                        {tab.text}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div className="p-5 min-h-[190px] bg-white text-xs leading-relaxed">
                    <AnimatePresence mode="wait">
                      {previewTab === 'transcript' && (
                        <motion.div
                          key="transcript"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="space-y-3"
                        >
                          <div className="space-y-1">
                            <span className="font-bold text-gray-700">Lisa (Marketing):</span>
                            <p className="text-gray-500 bg-[#f5f5f5] p-2 rounded border border-gray-100">
                              "We need to update our primary marketing cards on the frontend to improve accessibility and visual weight."
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-gray-700">Alex (Design):</span>
                            <p className="text-gray-500 bg-[#f5f5f5] p-2 rounded border border-gray-100">
                              "Hoàn toàn nhất trí. Mình sẽ bàn với Lâm để tích hợp CSS tối ưu trong chiều thứ sáu này."
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {previewTab === 'summary' && (
                        <motion.div
                          key="summary"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="space-y-3.5 text-gray-600"
                        >
                          <div>
                            <span className="font-bold text-[#111111] block mb-1">Executive Summary</span>
                            <p className="text-[#555]">
                              The team aligned on homepage visual consistency. Alex planned developer mockups for Friday integration, syncing with Lam on localized Vietnamese style constraints.
                            </p>
                          </div>
                          <div>
                            <span className="font-bold text-[#111111] block mb-1">Key Resolutions</span>
                            <ul className="list-disc pl-4 space-y-1 text-[#555]">
                              <li>Standardize layout background to neutral slate colors.</li>
                              <li>Support Vietnamese dialect processing instantly.</li>
                            </ul>
                          </div>
                        </motion.div>
                      )}

                      {previewTab === 'tasks' && (
                        <motion.div
                          key="tasks"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="space-y-2.5"
                        >
                          <span className="font-bold text-gray-700 block mb-1">Extracted Tasks</span>
                          <div className="space-y-2 text-gray-600">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                              <span className="line-through text-gray-400">Alex updates landing page card contrast</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer">
                              <input type="checkbox" defaultChecked={false} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                              <span>Lisa reviews final landing page copy</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer">
                              <input type="checkbox" defaultChecked={false} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                              <span className="text-[#111111] font-semibold">Team exports meeting notes to Notion</span>
                            </label>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Card Action footer */}
                  <div className="bg-[#f8f9fa] border-t border-[#e5e7eb] px-5 py-3 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-medium">No telemetry or logs clutter.</span>
                    <button 
                      onClick={() => triggerGoogleLoginSimulator('Alex Johnson', 'alex.johnson@corp.com')}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Try sandbox live</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </main>

          {/* Section 2: Pain & Problem Section */}
          <section className="bg-[#fcfdfd] py-20 px-6 border-b border-[#e5e7eb]">
            <div className="max-w-4xl mx-auto text-center space-y-12">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block">The Meeting Tax</span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#111111] font-sans">
                  Meetings create knowledge. But most of it gets lost.
                </h2>
                <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                  Teams often forget decisions, miss action items, and waste time rewriting meeting notes after every sync. MeetEcho turns live conversations into structured, searchable meeting records.
                </p>
              </div>

              {/* 3 Pain Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-3 shadow-sm hover:border-gray-300 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs font-mono">01</div>
                  <h3 className="text-sm font-bold text-[#111111]">Manual notes are inconsistent</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Different participants capture different details. Key technical comments and decision justifications vanish into thin air.
                  </p>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-3 shadow-sm hover:border-gray-300 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs font-mono">02</div>
                  <h3 className="text-sm font-bold text-[#111111]">Action items are forgotten</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Who stands behind which task? Tasks assigned verbally are rarely tracked or logged systematically.
                  </p>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-3 shadow-sm hover:border-gray-300 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs font-mono">03</div>
                  <h3 className="text-sm font-bold text-[#111111]">Meeting knowledge is unsearchable</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Finding what was agreed upon three weeks ago requires message history searches and distracting chat pings.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: How It Works */}
          <section id="how-it-works" className="bg-[#f8f9fa] py-20 px-6 border-b border-[#e5e7eb]">
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="text-center space-y-3">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block">Workflow</span>
                <h2 className="text-3xl font-bold tracking-tight text-[#111111] font-sans">
                  How MeetEcho works
                </h2>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  Four sequential steps to go from spoken dialogue to structured, reusable documentation.
                </p>
              </div>

              {/* 4 Steps timeline row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    num: '1',
                    title: 'Start a recording',
                    desc: 'Connect your system microphone or load pre-saved browser audio matrices in one click.'
                  },
                  {
                    num: '2',
                    title: 'Capture live speech',
                    desc: 'MeetEcho detects speakers and transcribes English or Vietnamese conversations accurately.'
                  },
                  {
                    num: '3',
                    title: 'Generate meeting intelligence',
                    desc: 'Structured summaries, resolutions, pending items, and tags are modeled instantly by Gemini.'
                  },
                  {
                    num: '4',
                    title: 'Export and share',
                    desc: 'Download markdown files cleanly, or copy structured dialogue blocks straight into Notion.'
                  }
                ].map((step, idx) => (
                  <div key={idx} className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-4 shadow-sm text-left relative">
                    <span className="absolute top-4 right-4 text-3xl font-bold font-mono text-gray-100">{step.num}</span>
                    <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs font-mono">
                      0{step.num}
                    </div>
                    <h3 className="text-sm font-bold text-[#111111]">{step.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 4: Features Section */}
          <section id="features" className="bg-white py-20 px-6 border-b border-[#e5e7eb]">
            <div className="max-w-5xl mx-auto space-y-12 text-center">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block text-center">Features List</span>
                <h2 className="text-3xl font-bold tracking-tight text-[#111111] font-sans text-center">
                  Everything you need to turn meetings into structured knowledge
                </h2>
                <p className="text-gray-500 text-sm max-w-lg mx-auto text-center">
                  A cohesive package of audio transcribing components styled to minimize professional friction.
                </p>
              </div>

              {/* 6 Feature cards as requested */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                {[
                  {
                    icon: <Mic className="w-5 h-5 text-[#111111]" />,
                    title: 'Live transcription',
                    desc: 'Capture meeting audio in real time using secure, low-latency device connection streams.'
                  },
                  {
                    icon: <Globe className="w-5 h-5 text-blue-600" />,
                    title: 'Bilingual support',
                    desc: 'Processes English dialogues and native Vietnamese syncs efficiently without vocabulary mapping errors.'
                  },
                  {
                    icon: <User className="w-5 h-5 text-emerald-600" />,
                    title: 'Speaker identification',
                    desc: 'Separates participants lists to index speech text records exactly to the actual speaker.'
                  },
                  {
                    icon: <Sparkles className="w-5 h-5 text-indigo-600" />,
                    title: 'AI summaries',
                    desc: 'Generate concise executive highlights and structured resolutions in markdown instantly.'
                  },
                  {
                    icon: <ListTodo className="w-5 h-5 text-orange-600" />,
                    title: 'Action items',
                    desc: 'Extract action checklists complete with assignees and realistic dueDate timelines.'
                  },
                  {
                    icon: <Download className="w-5 h-5 text-pink-600" />,
                    title: 'Markdown export',
                    desc: 'Download pristine formatted diaries ready for Notion pages, team wikis, and markdown engines.'
                  }
                ].map((feat, idx) => (
                  <div key={idx} className="bg-[#fdfdfd] border border-[#e5e7eb] rounded-xl p-6 space-y-4 hover:border-gray-400 transition-all shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-[#f5f5f5] flex items-center justify-center">
                      {feat.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-[#111111]">{feat.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 5: Product Use Cases */}
          <section id="use-cases" className="bg-[#fafafa] py-20 px-6 border-b border-[#e5e7eb]">
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="text-center space-y-3">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block">Use Cases</span>
                <h2 className="text-3xl font-bold tracking-tight text-[#111111] font-sans">
                  Built for every team sync
                </h2>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  Tailored structure for different collaborative meeting structures.
                </p>
              </div>

              {/* 4 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {[
                  {
                    title: 'Product standups',
                    desc: 'Turn product discussions into clear decision matrices and next steps without writing manually.'
                  },
                  {
                    title: 'Client meetings',
                    desc: 'Capture bilingual conversations easily and export clean client-facing meeting minutes.'
                  },
                  {
                    title: 'Engineering syncs',
                    desc: 'Track software features development blockers, bug reviews, and structural technical decisions.'
                  },
                  {
                    title: 'Class or research discussions',
                    desc: 'Record lectures, focus groups, or qualitative interviews and catalog findings instantly.'
                  }
                ].map((uc, idx) => (
                  <div key={idx} className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-2 hover:border-gray-400 transition-all shadow-sm">
                    <h3 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{uc.title}</span>
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed pl-3.5">
                      {uc.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 6: Security Section */}
          <section id="security" className="bg-white py-20 px-6 border-b border-[#e5e7eb]">
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="text-center space-y-3">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block">Security</span>
                <h2 className="text-3xl font-bold tracking-tight text-[#111111] font-sans">
                  Secure by design for sensitive conversations
                </h2>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  We guarantee the protection of confidential corporate sync records and voice payload signatures.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                {[
                  {
                    title: 'Private sandbox',
                    desc: 'Test and process audio without exposing proprietary workspace structures or assets.'
                  },
                  {
                    title: 'Local-first export',
                    desc: 'Download and store records locally as standard raw text formats. No permanent audio retention.'
                  },
                  {
                    title: 'Access control',
                    desc: 'Easily audit databases and control workspace credentials parameters safely.'
                  },
                  {
                    title: 'Transparent processing',
                    desc: 'Clear visual cues signal exactly when audio vectors are recorded, compiled, or finalized.'
                  }
                ].map((sec_card, idx) => (
                  <div key={idx} className="bg-[#fcfdfd] border border-[#e5e7eb] rounded-xl p-6 space-y-2.5 hover:border-gray-400 transition-all shadow-sm">
                    <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                      <Lock className="w-4 h-4 text-gray-700" />
                    </div>
                    <h3 className="text-xs font-bold text-[#111111]">{sec_card.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{sec_card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 7: Social Proof / Testimonials */}
          <section className="bg-[#fafafa] py-20 px-6 border-b border-[#e5e7eb]">
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="text-center space-y-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block">Reviews</span>
                <h2 className="text-3xl font-bold tracking-tight text-[#111111] font-sans">
                  Loved by teams who hate messy meeting notes
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
                {/* Large spotlight Quote */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex items-center gap-1 text-orange-400">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-orange-400" />)}
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#111111] leading-snug">
                    "The cleanest transcribing interface out there. Period."
                  </h3>
                  <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                    "No glowing neon accents or useless notifications in the background. It reads beautifully in pure crisp typography with clear, structured light gray card layers that make review an absolute breeze."
                  </p>
                  <div className="pt-2">
                    <span className="text-xs font-bold text-[#111111] block">Alex Johnson</span>
                    <span className="text-[10px] text-gray-400 uppercase font-mono font-medium">Lead UX Researcher • Corp Team</span>
                  </div>
                </div>

                {/* Smaller quote cards */}
                <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 space-y-3">
                    <p className="text-xs text-gray-500 italic">
                      "The Vietnamese translation accuracy is breathtaking. It transcribes down to the minute details of our agricultural business pitches."
                    </p>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center text-[10px] font-bold">LN</div>
                      <div>
                        <span className="text-xs font-bold text-[#111111] block">Lâm Nguyễn</span>
                        <span className="text-[9px] text-gray-400 block font-mono">Coffee Exporter</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 space-y-3">
                    <p className="text-xs text-gray-500 italic">
                      "Extremely fast. Action tasks assignees are extracted perfectly. Markdown exports drop straight into our daily engineering wiki logs."
                    </p>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">HN</div>
                      <div>
                        <span className="text-xs font-bold text-[#111111] block">Hà Nguyễn</span>
                        <span className="text-[9px] text-gray-400 block font-mono">Principal Developer</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified features bar */}
              <div className="pt-6 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                {[
                  { value: '3.5 processing', label: 'Bilingual engine validation' },
                  { value: 'True Vietnamese', label: 'Dialect translation verified' },
                  { value: 'Markdown format', label: 'No layout loss on exports' },
                  { value: 'No clutter', label: '100% human-centric layout' }
                ].map((stat, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <span className="text-sm font-bold text-[#111111] uppercase tracking-wide block">{stat.value}</span>
                    <span className="text-[10px] text-gray-400 block font-medium">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 8: Pricing Section */}
          <section id="pricing" className="bg-white py-20 px-6 border-b border-[#e5e7eb]">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="text-center space-y-3">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block">Pricing Plans</span>
                <h2 className="text-3xl font-bold tracking-tight text-[#111111] font-sans">
                  Transparent pricing for teams of all sizes
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm max-w-sm mx-auto">
                  Begin testing directly inside our private sandbox. Upgrade whenever you need persistent workspaces.
                </p>
              </div>

              {/* 3 Columns Pricing Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                
                {/* Regular Pricing Tier - 1 */}
                <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-xl p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Free sandbox</span>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-[#111111]">Free Sandbox</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold tracking-tight text-[#111111]">$0</span>
                        <span className="text-xs text-gray-400">/ forever</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      For testing raw bilingual transcription, speaker mapping, and export flows.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerGoogleLoginSimulator('Alex Johnson', 'alex.johnson@corp.com')}
                    className="w-full bg-[#111111] hover:bg-[#242424] text-white text-xs font-semibold py-2.5 rounded-md transition duration-200 cursor-pointer"
                  >
                    Start free sandbox
                  </button>
                </div>

                {/* Team Tier (Featured Solid Dark Layout) - 2 */}
                <div className="bg-[#101010] text-white rounded-xl p-8 flex flex-col justify-between space-y-6 relative border border-[#222222] shadow-md">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Recommended
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-blue-400 uppercase block tracking-wider">Professional</span>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white">Team Plan</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold tracking-tight text-white">$12</span>
                        <span className="text-xs text-gray-450">/ user / mo</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      For real team meeting syncs. Access unlimited persistent diaries and centralized workspace templates.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerGoogleLoginSimulator('Alex Johnson', 'alex.johnson@corp.com')}
                    className="w-full bg-white hover:bg-gray-100 text-[#111111] text-xs font-semibold py-2.5 rounded-md transition duration-200 cursor-pointer"
                  >
                    Start team trial
                  </button>
                </div>

                {/* Corporate Tier - 3 */}
                <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-xl p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Scale</span>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-[#111111]">Enterprise</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold tracking-tight text-[#111111]">Custom</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      For security, compliance, customized processing prompt benchmarks, and private cloud deployment.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerGoogleLoginSimulator('Alex Johnson', 'alex.johnson@corp.com')}
                    className="w-full bg-white hover:bg-[#f5f5f5] text-[#111111] border border-[#e5e7eb] text-xs font-semibold py-2.5 rounded-md transition duration-200 cursor-pointer"
                  >
                    Contact sales
                  </button>
                </div>

              </div>
            </div>
          </section>

          {/* Section 9: FAQ Accordions */}
          <section className="bg-[#fafafa] py-20 px-6 border-b border-[#e5e7eb]">
            <div className="max-w-3xl mx-auto space-y-10">
              <div className="text-center space-y-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block">FAQ</span>
                <h2 className="text-3xl font-bold text-[#111111] font-sans">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="space-y-4 text-left">
                {[
                  {
                    q: 'Does MeetEcho support Vietnamese?',
                    a: 'Yes, fully. MeetEcho is engineered specifically to capture Vietnamese alongside English speech. It handles localized vocabulary and structures clean bilingual summaries.'
                  },
                  {
                    q: 'Can it identify speakers automatically?',
                    a: 'Yes. Our processing separates dialog streams according to physical speaker profiles, letting you know exactly who voiced which resolution without manual annotation.'
                  },
                  {
                    q: 'Can I export meeting summaries to Markdown?',
                    a: 'Absolutely. Every analyzed transcript features instant download controls. You can export clean Markdown format files that load flawlessly inside Notion, Obsidian, or wikis.'
                  },
                  {
                    q: 'Is my audio stored?',
                    a: 'No. To guarantee strict workspace security and data integrity, raw audio waveforms are processed in memory and never stored permanently in cloud server logs.'
                  },
                  {
                    q: 'Can I use it without installing anything?',
                    a: 'Yes, MeetEcho is a web application running directly inside your browser container. No extensions or native executables are required.'
                  },
                  {
                    q: 'Does it work with Google Meet or Zoom?',
                    a: 'Yes. By running MeetEcho alongside your video call tool, you can capture full desktop browser system audio or use secure device microphone vectors.'
                  }
                ].map((faq, idx) => (
                  <div key={idx} className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-2 shadow-sm">
                    <h4 className="text-xs sm:text-sm font-bold text-[#111111] flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{faq.q}</span>
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed pl-5.5">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 10: Final CTA */}
          <section className="bg-white py-20 px-6">
            <div className="bg-[#f5f5f5] border border-[#e5e7eb] max-w-4xl mx-auto rounded-2xl p-10 md:p-12 text-center space-y-6">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111] font-sans">
                Turn your next meeting into structured notes automatically.
              </h2>
              <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
                Start with the free sandbox. Record a short meeting, generate a bilingual transcript, and export your first Markdown summary in under two minutes.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => triggerGoogleLoginSimulator('Alex Johnson', 'alex.johnson@corp.com')}
                  className="bg-[#111111] hover:bg-[#242424] text-white px-7 py-3 rounded-md text-xs font-semibold transition cursor-pointer active:scale-[0.98]"
                >
                  Start free sandbox
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('product-demo');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white hover:bg-[#f5f5f5] text-[#111111] border border-[#e5e7eb] px-7 py-3 rounded-md text-xs font-semibold transition cursor-pointer"
                >
                  View demo preview
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-[#101010] text-[#a1a1aa] py-16 px-6 border-t border-[#1a1a1a]">
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 text-left">
              
              {/* Product Info branding block */}
              <div className="space-y-4 col-span-2 md:col-span-1">
                <span className="font-bold text-white tracking-tight text-lg">meetecho<span className="text-blue-500">.ai</span></span>
                <p className="text-xs text-gray-500 leading-relaxed font-sans">
                  Sleek, minimalist meeting summaries securely transcribing dialog waveforms with Gemini.
                </p>
                <div className="text-[10px] text-gray-600 font-mono space-y-0.5">
                  <p>Port 3000 Secured</p>
                  <p>SSL Verified Sandbox</p>
                </div>
              </div>

              {/* Group 1: Product */}
              <div className="space-y-2.5 text-xs">
                <h4 className="font-semibold text-white tracking-tight uppercase text-[9px] tracking-widest text-gray-400">Product</h4>
                <p className="hover:text-white cursor-pointer transition">Transcription Rules</p>
                <p className="hover:text-white cursor-pointer transition">Bilingual Engine</p>
                <p className="hover:text-white cursor-pointer transition">Markdown Exporter</p>
                <p className="hover:text-white cursor-pointer transition">Real-time Sandbox</p>
              </div>

              {/* Group 2: Use Cases */}
              <div className="space-y-2.5 text-xs">
                <h4 className="font-semibold text-white tracking-tight uppercase text-[9px] tracking-widest text-gray-400">Use Cases</h4>
                <p className="hover:text-white cursor-pointer transition flex items-center gap-1">Product standups</p>
                <p className="hover:text-white cursor-pointer transition">Client sync meetings</p>
                <p className="hover:text-white cursor-pointer transition">Engineering huddles</p>
                <p className="hover:text-white cursor-pointer transition">Research discussions</p>
              </div>

              {/* Group 3: Security */}
              <div className="space-y-2.5 text-xs">
                <h4 className="font-semibold text-white tracking-tight uppercase text-[9px] tracking-widest text-gray-400">Security</h4>
                <p className="hover:text-white cursor-pointer transition">Privacy Compliance</p>
                <p className="hover:text-white cursor-pointer transition">API Keys Configuration</p>
                <p className="hover:text-white cursor-pointer transition">Local-first Storage</p>
                <p className="hover:text-white cursor-pointer transition">SSL Configuration</p>
              </div>

              {/* Group 4: Company */}
              <div className="space-y-2.5 text-xs">
                <h4 className="font-semibold text-white tracking-tight uppercase text-[9px] tracking-widest text-gray-400">Company</h4>
                <p className="hover:text-white cursor-pointer transition">About MeetEcho</p>
                <p className="hover:text-white cursor-pointer transition">MeetEcho design guidelines</p>
                <p className="hover:text-white cursor-pointer transition">Developer resources</p>
                <p className="hover:text-white cursor-pointer transition border border-gray-800 p-1.5 rounded inline-block text-center mt-1">Status: Operational</p>
              </div>
            </div>

            <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-[#1a1a1a] flex flex-col md:flex-row items-center justify-between text-[11px] text-gray-600">
              <span>© {new Date().getFullYear()} MeetEcho Inc. All product material holds standard sandbox licenses.</span>
              <span className="flex items-center gap-1.5 pt-2 md:pt-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Fully Active Safe Environment
              </span>
            </div>
          </footer>
        </div>
      ) : (
        /* LOGGED IN WORKSPACE PLATFORM: Clean, boxy grid style corresponding to MeetEcho UI */
        <div className="min-h-screen flex flex-col md:flex-row bg-[#ffffff]">
          
          {/* Main workspace Sidebar */}
          <aside className="w-full md:w-60 bg-white border-r border-[#e5e7eb] flex flex-col pt-3 shrink-0 text-left">
            
            {/* User details badge widget block */}
            <div className="p-4 mx-3 my-4 bg-[#f5f5f5] rounded-lg border border-[#e5e7eb] flex items-center gap-3">
              <img 
                src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUser.name)}`} 
                alt="user avatar" 
                className="w-9 h-9 rounded-full object-cover border border-gray-200"
              />
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-semibold text-[#111111] truncate">{currentUser.name}</span>
                <span className="text-[9px] font-mono text-gray-400 truncate tracking-tight uppercase">{currentUser.provider} member</span>
              </div>
            </div>

            {/* Primary workspace Navigation list */}
            <nav className="flex-1 px-2 space-y-1">
              <button
                onClick={() => { setActiveTab('dashboard'); setSelectedMeeting(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'dashboard' && !selectedMeeting
                    ? 'bg-[#111111] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-[#111111] hover:bg-[#f5f5f5]'
                }`}
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span>Meetings</span>
                {meetings.length > 0 && (
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                    activeTab === 'dashboard' && !selectedMeeting ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    {meetings.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('new-meeting'); setSelectedMeeting(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'new-meeting'
                    ? 'bg-[#111111] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-[#111111] hover:bg-[#f5f5f5]'
                }`}
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>New Recording</span>
              </button>

              <button
                onClick={() => { setActiveTab('settings'); setSelectedMeeting(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold rounded-md transition ${
                  activeTab === 'settings'
                    ? 'bg-[#111111] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-[#111111] hover:bg-[#f5f5f5]'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Security &amp; Privacy</span>
              </button>
            </nav>

            {/* Bottom session discard */}
            <div className="p-4 border-t border-[#e5e7eb]">
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-[#e5e7eb] hover:border-red-200 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Workspace</span>
              </button>
            </div>
          </aside>

          {/* MAIN PLATFORM WORKSPACE */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#ffffff]">
            
            <div className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto max-w-6xl mx-auto w-full">
              
              {/* TAB ACTIVE PANEL 1: CONFIGURE & RECORD */}
              {activeTab === 'new-meeting' && (
                <div className="space-y-6 max-w-3xl text-left">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-[#111111] font-sans">Record &amp; Transcribe Session</h2>
                    <p className="text-gray-400 text-xs">Configure your meeting parameters, choose your audio stream source, and record continuous speech vectors.</p>
                  </div>

                  {!activeRecordingMeeting ? (
                    /* Initial Settings Configuration wrapper */
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl p-6 md:p-8 space-y-6"
                    >
                      <form onSubmit={handleCreateMeeting} className="space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 block">Meeting Title *</label>
                            <input 
                              type="text" 
                              required
                              value={newMeetingTitle}
                              onChange={e => setNewMeetingTitle(e.target.value)}
                              placeholder="e.g. Design Alignment Sync / Marketing Strategy Review"
                              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition placeholder-gray-400"
                            />
                          </div>

                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 block">Objective (Optional)</label>
                            <textarea 
                              rows={2}
                              value={newMeetingDesc}
                              onChange={e => setNewMeetingDesc(e.target.value)}
                              placeholder="Brief description of the context or objectives for perfect Gemini processing..."
                              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition placeholder-gray-400 resize-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 block">Meeting Category</label>
                            <select
                              value={newMeetingType}
                              onChange={e => setNewMeetingType(e.target.value)}
                              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-xs text-gray-700 focus:outline-none focus:border-[#111111] transition"
                            >
                              <option value="Product Sync">Product Sync</option>
                              <option value="Design Sync">Design Sync</option>
                              <option value="Business Pitch font">Business Pitch</option>
                              <option value="Online Class">Online Class</option>
                              <option value="Interview">Interview</option>
                              <option value="General Sync">General Sync</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 block">Audio Conversation Language</label>
                            <select
                              value={newMeetingLang}
                              onChange={e => setNewMeetingLang(e.target.value)}
                              className="w-full bg-white border border-[#e5e7eb] rounded-md px-4 py-2.5 text-xs text-gray-700 focus:outline-none focus:border-[#111111] transition"
                            >
                              <option value="English">English (Transcribe + Summary)</option>
                              <option value="Vietnamese">Vietnamese (Chuyển ngữ + Tóm tắt)</option>
                            </select>
                          </div>
                        </div>

                        {/* Custom Nav-Pill-Group-inspired simulation source picker */}
                        <div className="bg-white border border-[#e5e7eb] p-5 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#111111] uppercase tracking-wide flex items-center gap-1.5">
                              <Volume2 className="w-4 h-4 text-blue-500" />
                              <span>Audio Input Capture Source</span>
                            </span>
                            <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-mono uppercase font-bold">Safe Mode active</span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Since standard canvas iframes occasionally isolate client microphone hardware, we built real-time Gemini voice benchmarks too. Choose "Simulate" to process preset expert data payloads immediately!
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => setSimulationCategory('real-mic')}
                              className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition text-center cursor-pointer ${
                                simulationCategory === 'real-mic'
                                  ? 'bg-[#111111] border-[#111111] text-white'
                                  : 'bg-white border-[#e5e7eb] text-gray-600 hover:bg-[#f5f5f5]'
                              }`}
                            >
                              <Mic className="w-4 h-4" />
                              <span>Capture Real Mic</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSimulationCategory('mock-design')}
                              className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition text-center cursor-pointer ${
                                simulationCategory === 'mock-design'
                                  ? 'bg-[#111111] border-[#111111] text-white'
                                  : 'bg-white border-[#e5e7eb] text-gray-600 hover:bg-[#f5f5f5]'
                              }`}
                            >
                              <FileCode className="w-4 h-4" />
                              <span>Simulate EN Sync</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSimulationCategory('mock-vietnamese')}
                              className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition text-center cursor-pointer ${
                                simulationCategory === 'mock-vietnamese'
                                  ? 'bg-[#111111] border-[#111111] text-white'
                                  : 'bg-white border-[#e5e7eb] text-gray-600 hover:bg-[#f5f5f5]'
                              }`}
                            >
                              <Globe className="w-4 h-4" />
                              <span>Simulate VN Sync</span>
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={createLoading}
                          className="w-full py-3 bg-[#111111] hover:bg-[#242424] text-white text-xs font-semibold rounded-md transition duration-200 flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4 text-white" />
                          <span>{createLoading ? 'Preparing session parameters...' : 'Create Draft & Start Voice recorder'}</span>
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    /* Active Voice Recording platform - pristine monochrome box */
                    <motion.div 
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white border border-[#e5e7eb] rounded-xl p-8 space-y-6 text-center flex flex-col items-center shadow-md relative"
                    >
                      <div className="absolute top-5 left-5 inline-flex items-center gap-1.5 bg-blue-55 text-blue-600 border border-blue-100 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                        <span>Interactive Recording Panel</span>
                      </div>

                      <div className="pt-8 text-center space-y-1">
                        <h3 className="text-xl font-bold tracking-tight text-[#111111] font-sans">{activeRecordingMeeting.title}</h3>
                        <p className="text-[#3fc] text-xs text-gray-400 uppercase font-mono">{activeRecordingMeeting.type} • Source: {simulationCategory.toUpperCase()}</p>
                      </div>

                      {recordingError && (
                        <div className="bg-red-50 border border-red-100 p-4 max-w-xl rounded-md text-xs text-red-700 text-left flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block mb-0.5">Microphone permission blocked:</span>
                            <span>{recordingError}</span>
                          </div>
                        </div>
                      )}

                      {/* Clean display Timer */}
                      <div className="p-3 bg-[#f5f5f5] border border-[#e5e7eb] rounded-md inline-flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500 animate-pulse" />
                        <span className="font-mono text-2xl font-bold text-[#111111]">
                          {getDurationString(recordingDuration)}
                        </span>
                      </div>

                      {/* MeetEcho's clean grayscale voice wave visualizer */}
                      <div className="w-full max-w-md h-20 flex items-center justify-center gap-[4px] px-4 bg-[#f8f9fa] rounded-md border border-[#e5e7eb]">
                        {waveHeights.map((h, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: isRecordingPaused ? 3 : h }}
                            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                            className="w-[5px] bg-gray-400 rounded-full"
                          />
                        ))}
                      </div>

                      {/* Main record controls */}
                      <div className="flex items-center justify-center gap-3 pt-2">
                        {recordingDuration === 0 ? (
                          <button
                            onClick={startRecordingFlow}
                            className="bg-[#111111] hover:bg-[#242424] text-white px-6 py-2.5 rounded-md text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Mic className="w-4 h-4 text-white" />
                            <span>Capture continuous stream</span>
                          </button>
                        ) : (
                          <>
                            {isRecordingPaused ? (
                              <button
                                onClick={resumeRecording}
                                className="bg-white hover:bg-[#f5f5f5] text-[#111111] border border-[#e5e7eb] px-5 py-2 rounded-md text-xs font-semibold transition flex items-center gap-1.5"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Resume</span>
                              </button>
                            ) : (
                              <button
                                onClick={pauseRecording}
                                className="bg-white hover:bg-[#f5f5f5] text-[#111111] border border-[#e5e7eb] px-5 py-2 rounded-md text-xs font-semibold transition flex items-center gap-1.5"
                              >
                                <Square className="w-3.5 h-3.5 text-gray-600 fill-gray-600" />
                                <span>Pause</span>
                              </button>
                            )}

                            <button
                              onClick={stopAndProcessRecording}
                              className="bg-[#111111] hover:bg-[#242424] text-white px-6 py-2.5 rounded-md text-xs font-semibold transition flex items-center justify-center gap-2"
                            >
                              <Square className="w-4 h-4 text-red-400 fill-red-400" />
                              <span>Stop &amp; Analyze with Gemini</span>
                            </button>
                          </>
                        )}
                      </div>

                      <div className="text-gray-400 text-[11px] italic">
                        *MeetEcho runs background security checks. Closing the window or leaving active draft recording will warn you to prevent voice data spills.
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* TAB ACTIVE PANEL 2: DASHBOARD MEETINGS */}
              {activeTab === 'dashboard' && !selectedMeeting && (
                <div className="space-y-6 text-left">
                  
                  {/* Top Dashboard heading */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold tracking-tight text-[#111111] font-sans">Corporate Meetings Library</h2>
                      <p className="text-xs text-gray-500">Transcribe drafts, export markdown diaries, or manage existing dialogue vectors.</p>
                    </div>

                    <button
                      onClick={() => setActiveTab('new-meeting')}
                      className="bg-[#111111] hover:bg-[#242424] text-white text-xs font-semibold px-4 py-2.5 rounded-md transition duration-200 flex items-center gap-1.5 ml-auto md:ml-0 shadow-sm"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>Record new meeting</span>
                    </button>
                  </div>

                  {/* Redesigned counters row holding thin-box light gray cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {[
                      { label: 'Total Syncs', val: statsLoading ? '..' : dashboardStats?.totalMeetings || 0, tag: 'Stored drafts' },
                      { label: 'Sync Duration (m)', val: statsLoading ? '..' : `${dashboardStats?.totalMinutes || 0}m`, tag: 'Estimated total' },
                      { label: 'Completed AI Analytics', val: statsLoading ? '..' : dashboardStats?.completedCount || 0, tag: 'SSL Compiled' },
                      { label: 'Open Tasks (Action)', val: statsLoading ? '..' : dashboardStats?.actionItemsPending || 0, tag: 'Pending actions' }
                    ].map((st, idx) => (
                      <div key={idx} className="bg-[#f5f5f5] p-5 rounded-lg border border-[#e5e7eb] flex flex-col justify-between space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wide text-gray-400 block">{st.label}</span>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-2xl font-bold tracking-tight text-[#111111] font-sans leading-none">{st.val}</span>
                          <span className="text-[10px] text-gray-400 font-mono italic">{st.tag}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Filter and Instant search tools */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="w-full sm:flex-1 relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search dialogue text or meeting headings..."
                        className="w-full bg-white border border-[#e5e7eb] rounded-md pl-9 pr-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition placeholder-gray-400"
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-[#111111]">Clear</button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs text-gray-400 shrink-0 font-medium">Category:</span>
                      <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="bg-white border border-[#e5e7eb] rounded-md px-3 py-2.5 text-xs text-gray-700 focus:outline-none focus:border-[#111111] transition w-full sm:w-44"
                      >
                        <option value="all">All categories</option>
                        <option value="Product Sync">Product Sync</option>
                        <option value="Design Sync font">Design Sync</option>
                        <option value="Business Pitch">Business Pitch</option>
                        <option value="Online Class">Online Class</option>
                        <option value="Interview">Interview</option>
                        <option value="General Sync">General Sync</option>
                      </select>
                    </div>
                  </div>

                  {/* List grids or empty lists */}
                  {listLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-12">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl h-40 animate-pulse" />
                      ))}
                    </div>
                  ) : meetings.length === 0 ? (
                    <div className="bg-white border border-[#e5e7eb] rounded-xl p-16 text-center max-w-md mx-auto space-y-4">
                      <Mic className="w-10 h-10 text-gray-300 mx-auto" />
                      <h4 className="text-base font-semibold text-[#111111]">No Registered Sync Notes</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Configure a new meeting record, or select simulated quick-connect options to kick off Gemini speech dialogue.
                      </p>
                      <button 
                        onClick={() => setActiveTab('new-meeting')}
                        className="bg-[#111111] hover:bg-[#242424] text-white px-4 py-2 rounded-md text-xs font-semibold transition"
                      >
                        Launch first sync
                      </button>
                    </div>
                  ) : (
                    /* Dashboard Grid aligned - Clean f5f5f5 box cards with thin borders */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {meetings.map((meet) => {
                        const dateFormatted = new Date(meet.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        });

                        const isVn = meet.language === 'Vietnamese';

                        return (
                          <motion.div
                            whileHover={{ y: -2 }}
                            key={meet.id}
                            className="bg-white border border-[#e5e7eb] p-6 rounded-lg transition-all flex flex-col justify-between space-y-4 shadow-sm group hover:border-[#111111]"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full uppercase font-bold">{meet.type}</span>
                                <span className="text-[10px] text-gray-400 font-mono font-medium">{dateFormatted}</span>
                              </div>

                              <h3 
                                onClick={() => setSelectedMeeting(meet)}
                                className="text-base font-semibold text-[#111111] transition-colors duration-200 cursor-pointer hover:text-blue-600 font-sans line-clamp-1"
                              >
                                {meet.title}
                              </h3>

                              {meet.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-sans">{meet.description}</p>
                              )}
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {meet.status === 'completed' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>AI Done</span>
                                  </span>
                                )}
                                {meet.status === 'processing' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                    <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                                    <span>AI transcribing...</span>
                                  </span>
                                )}
                                {meet.status === 'failed' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>AI Error</span>
                                  </span>
                                )}
                                {meet.status === 'draft' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-100">
                                    <Clock className="w-3 h-3" />
                                    <span>Draft</span>
                                  </span>
                                )}

                                <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-medium font-sans">
                                  {meet.language}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 p-1 bg-[#f5f5f5] rounded-md border border-[#e5e7eb]">
                                {meet.status === 'completed' ? (
                                  <>
                                    <button
                                      title="Download Markdown summary"
                                      onClick={(e) => { e.stopPropagation(); triggerExportDownload(meet.id, 'markdown'); }}
                                      className="p-1 hover:text-blue-600 text-gray-400 hover:bg-white rounded transition"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      title="Delete meeting permanently"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(meet.id); }}
                                      className="p-1 hover:text-red-600 text-gray-400 hover:bg-white rounded transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  meet.status === 'draft' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setActiveRecordingMeeting(meet); setActiveTab('new-meeting'); }}
                                      className="text-blue-600 hover:bg-white rounded transition flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase"
                                    >
                                      <Play className="w-3 h-3 fill-blue-600" />
                                      <span>Record</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

              {/* TAB ACTIVE PANEL 3: CURRENT MEETING DETAIL VIEWS */}
              {selectedMeeting && (
                <div className="space-y-6 text-left">
                  
                  {/* Detailed summary navigation bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => { setSelectedMeeting(null); fetchMeetings(); }}
                        className="p-2.5 bg-white hover:bg-[#f5f5f5] border border-[#e5e7eb] rounded-md text-gray-500 hover:text-[#111111] transition"
                      >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 font-medium">
                          <span className="font-bold text-[#111111]">{selectedMeeting.type}</span>
                          <span className="text-gray-300">•</span>
                          <span>{selectedMeeting.language || 'English'}</span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-gray-400" /> {Math.floor(selectedMeeting.durationSec / 60)}m {selectedMeeting.durationSec % 60}s
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>{selectedMeeting.transcript ? new Set(selectedMeeting.transcript.map(t => t.speakerLabel)).size : 2} speakers</span>
                          <span className="text-gray-300">•</span>
                          <span>
                            {new Date(selectedMeeting.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </span>
                        </div>

                        {isEditingTitle ? (
                          <div className="flex items-center gap-2 pt-1 font-sans">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              className="bg-white border border-[#111111] rounded px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] w-72 font-semibold"
                            />
                            <button
                              onClick={async () => {
                                if (editTitle.trim()) {
                                  try {
                                    const res = await fetch(`/api/v1/meetings/${selectedMeeting.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ title: editTitle })
                                    });
                                    if (res.ok) {
                                      setSelectedMeeting(prev => prev ? { ...prev, title: editTitle } : null);
                                      showToast('Title changed successfully.');
                                    }
                                  } catch (e) {}
                                  setIsEditingTitle(false);
                                }
                              }}
                              className="px-3 py-1.5 bg-[#111111] text-white text-xs font-semibold rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button onClick={() => setIsEditingTitle(false)} className="text-xs text-gray-400 hover:text-[#111111]">Cancel</button>
                          </div>
                        ) : (
                          <h3 className="text-xl md:text-2xl font-bold text-[#111111] tracking-tight flex items-center gap-2 group font-sans">
                            <span>{selectedMeeting.title}</span>
                            <button
                              onClick={() => { setEditTitle(selectedMeeting.title); setIsEditingTitle(true); }}
                              className="text-[11px] text-gray-400 hover:text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              [Rename]
                            </button>
                          </h3>
                        )}
                      </div>
                    </div>

                    {/* Export widgets */}
                    <div className="flex items-center gap-2 font-mono">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setShowExportDropdown(!showExportDropdown)}
                          className="px-3.5 py-2 bg-white hover:bg-[#f5f5f5] border border-[#e5e7eb] rounded-md text-[11px] font-semibold text-[#111111] flex items-center gap-1.5 transition shadow-none cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-gray-500" />
                          <span>Export</span>
                          <span className="text-[9px] text-gray-400 select-none">▼</span>
                        </button>
                        
                        {showExportDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                            <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#e5e7eb] rounded-md shadow-lg z-50 py-1 font-sans text-xs">
                              <button
                                onClick={() => { triggerExportDownload(selectedMeeting.id, 'markdown'); setShowExportDropdown(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-[#f5f5f5] text-[#111111] font-medium flex items-center gap-2 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                <span>Export as Markdown</span>
                              </button>
                              <button
                                onClick={() => { triggerExportDownload(selectedMeeting.id, 'txt'); setShowExportDropdown(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-[#f5f5f5] text-[#111111] font-medium flex items-center gap-2 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                <span>Export as TXT</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (selectedMeeting.summary) {
                                    navigator.clipboard.writeText(selectedMeeting.summary.shortSummary + "\n\n" + selectedMeeting.summary.detailedSummary);
                                    showToast("Copied summaries to clipboard");
                                  }
                                  setShowExportDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-[#f5f5f5] text-[#111111] font-medium flex items-center gap-2 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                                <span>Copy Summary</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (selectedMeeting.actionItems) {
                                    const actionsText = selectedMeeting.actionItems.map(act => `- [${act.status === 'completed' ? 'x' : ' '}] ${act.title} (Assignee: ${act.assignee}, Due: ${act.dueDate})`).join('\n');
                                    navigator.clipboard.writeText(actionsText);
                                    showToast("Copied action items to clipboard");
                                  }
                                  setShowExportDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-[#f5f5f5] text-[#111111] font-medium flex items-center gap-2 cursor-pointer"
                              >
                                <ListTodo className="w-3.5 h-3.5 text-gray-400" />
                                <span>Copy Action Items</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        disabled={regeneratingId === selectedMeeting.id}
                        onClick={() => {
                          if (window.confirm("Do you want to regenerate AI notes? This will recalculate the Summary, Decisions, and Action Items using Gemini 3.5-flash.")) {
                            handleRegenerateSummary(selectedMeeting.id);
                          }
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-[#f5f5f5] border border-[#e5e7eb] rounded-md text-[11px] font-semibold text-[#111111] flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {regeneratingId === selectedMeeting.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        )}
                        <span>Regenerate AI Notes</span>
                      </button>
                    </div>
                  </div>

                  {/* NAV-PILL-GROUP Switching mechanism (Pill-in-pill look matching design spec!) */}
                  <div className="flex items-center gap-1 bg-[#f5f5f5] p-1 rounded-full border border-[#e5e7eb] max-w-xl">
                    {[
                      { id: 'summary', text: 'Executive Summary', icon: <FileText className="w-3.5 h-3.5" /> },
                      { id: 'transcript', text: 'Timeline Dialogue', icon: <Volume2 className="w-3.5 h-3.5" /> },
                      { id: 'tasks', text: 'Action checklists', icon: <ListTodo className="w-3.5 h-3.5" /> },
                      { id: 'decisions', text: 'Resolutions', icon: <CheckCircle className="w-3.5 h-3.5" /> }
                    ].map(tb => (
                      <button
                        key={tb.id}
                        onClick={() => setActiveDetailTab(tb.id as any)}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                          activeDetailTab === tb.id 
                            ? 'bg-white text-[#111111] shadow-sm font-bold border border-gray-100' 
                            : 'text-gray-500 hover:text-[#111111]'
                        }`}
                      >
                        {tb.icon}
                        <span className="hidden sm:inline">{tb.text}</span>
                      </button>
                    ))}
                  </div>

                  {/* TAB SWITCH 1: SUMMARY DETAILS */}
                  {activeDetailTab === 'summary' && selectedMeeting.summary && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
                    >
                      <div className="lg:col-span-2 space-y-6">
                        
                        <div className="bg-[#f5f5f5] border border-[#e5e7eb] p-6 rounded-lg space-y-3">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Brief Executive Summary</h4>
                          <em className="text-base text-[#111111] font-semibold leading-relaxed border-l-2 border-[#111111] pl-4 block">
                            "{selectedMeeting.summary.shortSummary}"
                          </em>
                        </div>

                        <div className="bg-white border border-[#e5e7eb] p-6 rounded-lg space-y-3">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Detailed Conversation Overview</h4>
                          <p className="text-xs text-[#374151] leading-relaxed font-sans font-medium">{selectedMeeting.summary.detailedSummary}</p>
                        </div>

                      </div>

                      {/* Right metadata aspects */}
                      <div className="space-y-6">
                        
                        <div className="bg-[#f5f5f5] border border-[#e5e7eb] p-5 rounded-lg space-y-3">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Dialogue Keywords</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedMeeting.summary.keywords && selectedMeeting.summary.keywords.map((kw, i) => (
                              <span key={i} className="bg-white text-gray-700 border border-[#e5e7eb] px-2.5 py-0.5 text-[10px] font-semibold rounded">#{kw}</span>
                            ))}
                          </div>
                        </div>

                        {selectedMeeting.summary.risks && selectedMeeting.summary.risks.length > 0 && (
                          <div className="bg-orange-50 border border-orange-100 p-5 rounded-lg space-y-2">
                            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Critical Risks Identified</span>
                            </h4>
                            <p className="text-xs text-orange-850 leading-relaxed font-sans">
                              {selectedMeeting.summary.risks[0]}
                            </p>
                          </div>
                        )}

                        <div className="bg-white border border-[#e5e7eb] p-5 rounded-lg text-xs space-y-2">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Security Audited</span>
                          <p className="text-gray-500 leading-relaxed">
                            Continuous data-wiping policies active for compliance. Meets are securely cleared instantly upon request.
                          </p>
                        </div>

                      </div>
                    </motion.div>
                  )}

                  {/* TAB SWITCH 2: TIMELINE DISCUSSIONS TRANSCRIPT */}
                  {activeDetailTab === 'transcript' && selectedMeeting.transcript && (() => {
                    const filteredTranscript = selectedMeeting.transcript.filter(seg => {
                      const matchesSpeaker = selectedSpeakerFilter === 'All' || seg.speakerLabel === selectedSpeakerFilter;
                      const matchesSearch = !transcriptSearch.trim() || seg.text.toLowerCase().includes(transcriptSearch.toLowerCase());
                      return matchesSpeaker && matchesSearch;
                    });

                    return (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white border border-[#e5e7eb] rounded-lg p-6 max-w-4xl space-y-6"
                      >
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <span className="text-xs uppercase font-semibold text-[#111111]">Timeline Dialogue Transcript</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-mono uppercase">Multi-speaker identified</span>
                        </div>

                        {/* Custom Interactive Audio Player Deck */}
                        <div className="bg-[#fcfcfc] border border-gray-200 rounded-lg p-4 space-y-3.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                                title={isAudioPlaying ? "Pause Playback" : "Play Dialog"}
                                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition shadow-sm cursor-pointer"
                              >
                                {isAudioPlaying ? (
                                  <span className="flex gap-1 items-center justify-center">
                                    <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
                                    <span className="w-1 h-4 bg-white rounded-full" />
                                    <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
                                  </span>
                                ) : (
                                  <Play className="w-4 h-4 fill-white shrink-0 ml-0.5" />
                                )}
                              </button>
                              <div className="text-left font-sans">
                                <span className="text-xs font-semibold text-[#111111] block">
                                  {isAudioPlaying ? 'Playing Dialogue Audio...' : 'Audio Playback Paused'}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  Speed Sync Active • Latency 9ms
                                </span>
                              </div>
                            </div>
                            
                            {/* Speed Selector pills */}
                            <div className="flex items-center gap-1.5 bg-gray-100 p-0.5 rounded-full border border-gray-200 self-start sm:self-center">
                              {['1.0x', '1.25x', '1.5x'].map((speedOpt) => (
                                <button
                                  key={speedOpt}
                                  onClick={() => showToast(`Playback speech speed toggled to ${speedOpt}`)}
                                  className="px-2.5 py-1 text-[10px] font-bold font-mono rounded-full text-gray-500 hover:text-[#111111] hover:bg-white/50 transition cursor-pointer"
                                >
                                  {speedOpt}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Interactive slider search block timeline seeking bar */}
                          <div className="space-y-1">
                            <div className="relative w-full h-1.5 bg-gray-200 hover:bg-gray-250 rounded-full cursor-pointer group" onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickedProgress = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                              setPlaybackProgress(clickedProgress);
                              showToast(`Seeking dialogue time to ${Math.floor((clickedProgress / 100) * selectedMeeting.durationSec)}s`);
                            }}>
                              <div className="absolute top-0 left-0 bg-blue-600 h-full rounded-full transition-all duration-150" style={{ width: `${playbackProgress}%` }} />
                              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${playbackProgress}% - 6px)` }} />
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-mono text-gray-400">
                              <span>
                                {Math.floor(((playbackProgress / 100) * selectedMeeting.durationSec) / 60).toString().padStart(2, '0')}:
                                {Math.floor(((playbackProgress / 100) * selectedMeeting.durationSec) % 65).toString().padStart(2, '0')}
                              </span>
                              <span>
                                {Math.floor(selectedMeeting.durationSec / 60).toString().padStart(2, '0')}:
                                {Math.floor(selectedMeeting.durationSec % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Search and speaker filter row panel */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 font-sans">
                          <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                              type="text"
                              value={transcriptSearch}
                              onChange={(e) => setTranscriptSearch(e.target.value)}
                              placeholder="Search transcript segment..."
                              className="w-full bg-white border border-[#e5e7eb] focus:border-blue-500 rounded px-8 py-1.5 text-xs text-[#111111] focus:outline-none transition leading-tight"
                            />
                            {transcriptSearch && (
                              <button
                                onClick={() => setTranscriptSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 hover:text-red-505 transition"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Speaker:</span>
                            <select
                              value={selectedSpeakerFilter}
                              onChange={(e) => setSelectedSpeakerFilter(e.target.value)}
                              className="bg-white border border-[#e5e7eb] rounded px-2.5 py-1 text-xs text-[#111111] font-medium focus:outline-none transition"
                            >
                              {['All', ...Array.from(new Set(selectedMeeting.transcript.map(t => t.speakerLabel)))].map((speaker) => (
                                <option key={speaker} value={speaker}>
                                  {speaker}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2">
                          {filteredTranscript.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 font-sans text-xs">
                              No transcript dialogue found matching your select constraints.
                            </div>
                          ) : (
                            filteredTranscript.map((seg, idx) => {
                              const minFmt = Math.floor(seg.startTimeSec / 60).toString().padStart(2, '0');
                              const secFmt = (seg.startTimeSec % 60).toString().padStart(2, '0');

                              return (
                                <div key={idx} className="flex gap-4 items-start border-l border-gray-200 hover:border-[#111111] pl-4 py-1.5 transition-all group">
                                  <span className="font-mono text-[10px] text-[#111111] bg-[#f5f5f5] border border-gray-200 px-2 py-0.5 rounded shrink-0 select-none">
                                    {minFmt}:{secFmt}
                                  </span>
                                  <div className="space-y-0.5 text-left flex-1">
                                    <span className="text-[11px] text-[#111111] font-bold block">{seg.speakerLabel}</span>
                                    <p className="text-xs text-[#374151] leading-relaxed font-sans">{highlightText(seg.text, transcriptSearch)}</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    );
                  })()}

                  {/* TAB SWITCH 3: CHECKLIST ITEMS */}
                  {activeDetailTab === 'tasks' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white border border-[#e5e7eb] rounded-lg p-6 max-w-3xl space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <span className="text-xs uppercase font-semibold text-[#111111]">Action agendas</span>
                        <span className="text-[10px] text-gray-400 font-mono">*Toggles update immediately on backend</span>
                      </div>

                      {selectedMeeting.actionItems && selectedMeeting.actionItems.length > 0 ? (
                        <div className="space-y-2.5 pt-2">
                          {selectedMeeting.actionItems.map((act) => (
                            <div 
                              key={act.id}
                              onClick={() => toggleActionItemStatus(selectedMeeting.id, act.id, act.status)}
                              className="p-3.5 bg-[#f5f5f5] hover:bg-[#ebebeb] border border-[#e5e7eb] rounded-md flex items-center justify-between gap-4 transition cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                                  act.status === 'completed'
                                    ? 'bg-[#111111] border-[#111111] text-white'
                                    : 'border-gray-300 bg-white'
                                }`}>
                                  {act.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                                </div>

                                <span className={`text-xs font-semibold text-gray-800 transition-all ${act.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                                  {act.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 font-mono text-[10px]">
                                <span className="bg-white text-gray-600 border border-[#e5e7eb] px-2 py-0.5 rounded font-semibold">👤 {act.assignee}</span>
                                <span className="text-gray-400">Due: {act.dueDate}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 space-y-1">
                          <ListTodo className="w-10 h-10 text-gray-300 mx-auto" />
                          <p className="text-xs text-gray-500">No active action items identified by Gemini speech parser.</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB SWITCH 4: RECOGNIZED DECISIONS */}
                  {activeDetailTab === 'decisions' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white border border-[#e5e7eb] rounded-lg p-6 max-w-3xl space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <span className="text-xs uppercase font-semibold text-[#111111]">Core Decisions Approved</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-mono uppercase font-bold">Policy Binding</span>
                      </div>

                      {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 pt-2">
                          {selectedMeeting.decisions.map((dec) => (
                            <div key={dec.id} className="p-4 bg-[#f5f5f5] border border-[#e5e7eb]/80 rounded-md text-left space-y-1 relative overflow-hidden">
                              <div className="absolute top-0 left-0 bg-[#111111] h-full w-1" />
                              <h5 className="text-xs font-bold text-[#111111] uppercase tracking-tight flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                <span>{dec.title}</span>
                              </h5>
                              <p className="text-xs text-gray-500 font-sans leading-relaxed pl-5">{dec.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 space-y-1">
                          <CheckCircle className="w-10 h-10 text-gray-300 mx-auto" />
                          <p className="text-xs text-gray-500">No strategic resolutions isolated from the dialogue sync.</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                </div>
              )}

              {/* TAB ACTIVE PANEL 4: PRIVACY SETTINGS */}
              {activeTab === 'settings' && (
                <div className="max-w-2xl space-y-6 text-left">
                  
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-[#111111] font-sans">Settings &amp; Security Compliance</h2>
                    <p className="text-gray-400 text-xs">Verify local database status, reset stored records, or inspect compliance audits of your workspace.</p>
                  </div>

                  {/* Profile credential grid block */}
                  <div className="bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-[#111111] flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-500" />
                      <span>Authenticated User Profile</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-white border border-[#e5e7eb] rounded space-y-1">
                        <span className="text-[9px] uppercase font-bold text-gray-400">Name</span>
                        <span className="text-xs font-semibold text-gray-700 block">{currentUser.name}</span>
                      </div>
                      <div className="p-3 bg-white border border-[#e5e7eb] rounded space-y-1">
                        <span className="text-[9px] uppercase font-bold text-gray-400">Email Address</span>
                        <span className="text-xs font-semibold text-gray-700 block truncate">{currentUser.email}</span>
                      </div>
                      <div className="p-3 bg-white border border-[#e5e7eb] rounded space-y-1">
                        <span className="text-[9px] uppercase font-bold text-gray-400">Database Engine</span>
                        <span className="text-xs font-semibold text-blue-600 block font-mono">meetings-db.json (Active)</span>
                      </div>
                      <div className="p-3 bg-white border border-[#e5e7eb] rounded space-y-1">
                        <span className="text-[9px] uppercase font-bold text-gray-400">Account ID</span>
                        <span className="text-xs font-semibold text-gray-700 block font-mono text-[10px]">{currentUser.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Wipe DB Option */}
                  <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-[#111111] flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-red-500" />
                      <span>Danger Settings Zone</span>
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-sans">
                      Clearing database resets the system back to initial demo sync sets. Audio records, speaker lists, Vietnamese pitches, and transcripts will be discarded.
                    </p>

                    <div className="pt-2">
                      <button
                        onClick={async () => {
                          if (window.confirm('Wipe database back to defaults?')) {
                            const response = await fetch('/api/v1/meetings?userId=' + currentUser.id);
                            const userMeets = await response.json();
                            for (const meet of userMeets) {
                              await fetch(`/api/v1/meetings/${meet.id}`, { method: 'DELETE' });
                            }
                            showToast('Database wiped securely back to defaults.');
                            fetchMeetings();
                            fetchStats();
                            setActiveTab('dashboard');
                          }
                        }}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 rounded text-xs font-semibold transition cursor-pointer"
                      >
                        Reset &amp; Wipe Meetings Database
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </main>
        </div>
      )}

      {/* Premium Integrated AI Meeting Assistant Side-Panel floating drawer */}
      {currentUser && selectedMeeting && (
        <>
          {/* Floating Sparkle Button */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 group">
            {/* Tooltip on hover */}
            <div className="hidden group-hover:flex bg-[#111111] text-white text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg shadow-lg border border-[#333333] mb-1 font-mono transition-all">
              Ask AI about this meeting
            </div>
            
            <button
              onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer relative border ${
                isAiAssistantOpen 
                  ? 'bg-[#111111] text-white border-gray-800' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
              }`}
              title="Ask AI about this meeting"
            >
              {isAiAssistantOpen ? (
                <span className="text-sm font-bold">✕</span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                </>
              )}
            </button>
          </div>

          {/* Assistant Sliding Drawer */}
          <AnimatePresence>
            {isAiAssistantOpen && (
              <>
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAiAssistantOpen(false)}
                  className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
                />

                {/* Drawer panel */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-16 right-0 bottom-0 w-full sm:w-[420px] bg-white border-l border-[#e5e7eb] shadow-2xl z-40 flex flex-col pt-4 pb-6 font-sans"
                >
                  {/* Header */}
                  <div className="px-5 pb-3 border-b border-gray-100 flex items-center justify-between text-left">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                        <h4 className="text-sm font-bold text-[#111111] tracking-tight font-sans">Ask MeetEcho AI</h4>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono block">Analyzing: {selectedMeeting.title}</span>
                    </div>
                    <button 
                      onClick={() => setIsAiAssistantOpen(false)}
                      className="text-gray-400 hover:text-[#111111] text-xs font-semibold p-1.5 rounded-full hover:bg-gray-100 transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Pre-made Query suggestion chips */}
                  <div className="px-5 py-3 border-b border-gray-50 bg-[#fbfbfb] text-left">
                    <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block mb-2 font-mono">Suggested Questions</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { text: "What decisions were made?", short: "Decisions" },
                        { text: "What should I follow up on?", short: "Follow-ups" },
                        { text: "Summarize this meeting in Vietnamese.", short: "Summarize (VN)" },
                        { text: "Draft a follow-up email.", short: "Email Draft" }
                      ].map((chip) => (
                        <button
                          key={chip.text}
                          type="button"
                          disabled={aiAssistantLoading}
                          onClick={() => askAiAssistant(chip.text)}
                          className="px-2.5 py-1 text-[10px] font-semibold rounded-md border border-gray-200 bg-white text-[#111111] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition text-left cursor-pointer truncate max-w-full"
                          title={chip.text}
                        >
                          {chip.short}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat messages viewport */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {aiChatHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 font-sans">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                          <Sparkles className="w-5 h-5 animate-spin" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-[#111111]">Corporate Intelligence Ready</p>
                          <p className="text-[11px] text-gray-400 max-w-xs leading-relaxed">
                            Ask critical follow-ups, summarize speech nodes, translate details to Vietnamese, or draft briefs.
                          </p>
                        </div>
                      </div>
                    ) : (
                      aiChatHistory.map((chat, idx) => (
                        <div
                          key={idx}
                          className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'} text-left`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-4 py-2 text-xs font-sans whitespace-pre-wrap leading-relaxed ${
                              chat.sender === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-[#f0f0f0] text-gray-800 rounded-bl-none border border-gray-200 shadow-sm'
                            }`}
                          >
                            {chat.text}
                          </div>
                        </div>
                      ))
                    )}

                    {aiAssistantLoading && (
                      <div className="flex justify-start text-left">
                        <div className="bg-[#f5f5f5] text-gray-400 border border-gray-200 rounded-lg px-4 py-2 text-xs font-mono flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                          <span>Gemini is reading workspace records...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Question composition field */}
                  <div className="px-5 pt-3 border-t border-gray-100">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (aiAssistantMessage.trim() && !aiAssistantLoading) {
                          askAiAssistant(aiAssistantMessage);
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        disabled={aiAssistantLoading}
                        value={aiAssistantMessage}
                        onChange={(e) => setAiAssistantMessage(e.target.value)}
                        placeholder="Ask AI about this meeting..."
                        className="flex-1 bg-white border border-[#e5e7eb] focus:border-blue-500 rounded px-3 py-2 text-xs focus:outline-none transition leading-tight font-sans"
                      />
                      <button
                        type="submit"
                        disabled={aiAssistantLoading || !aiAssistantMessage.trim()}
                        className="px-3.5 py-2 bg-[#111111] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded text-xs font-bold transition whitespace-nowrap cursor-pointer font-sans"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

    </div>
  );
}
