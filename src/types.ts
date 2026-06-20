/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'google' | 'email';
  createdAt: string;
}

export type MeetingStatus = 'draft' | 'recording' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface TranscriptSegment {
  startTimeSec: number;
  endTimeSec: number;
  speakerLabel: string;
  text: string;
}

export interface MeetingSummary {
  shortSummary: string;
  detailedSummary: string;
  keywords: string[];
  risks: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: 'pending' | 'completed';
}

export interface Decision {
  id: string;
  title: string;
  description: string;
}

export interface Meeting {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: string;
  language: string;
  status: MeetingStatus;
  durationSec: number;
  createdAt: string;
  audioUrl?: string;
  processingError?: string;
  transcript?: TranscriptSegment[];
  summary?: MeetingSummary;
  actionItems?: ActionItem[];
  decisions?: Decision[];
}

export interface DashboardStats {
  totalMeetings: number;
  totalMinutes: number;
  processingCount: number;
  completedCount: number;
  actionItemsPending: number;
}
