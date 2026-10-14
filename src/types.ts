export type Activity = {
  id: string; title: string; kind: "task" | "event"; date: string | null;
  time: string | null; duration: number; nextStep: string; note: string;
  status: "pending" | "done"; color: "pink" | "mint" | "peach" | "blue";
  recurrence: "none" | "daily" | "weekly" | "annual";
  completedDates?: string[]; source: "hilo" | "google"; reminder: boolean;
  googleId?: string; googleEtag?: string; sync?: "pending" | "synced" | "conflict";
  estimated?: boolean; ambiguous?: string; revision?: number;
};
export type FocusSession = { activityId: string; status: "running" | "paused"; startedAt: number | null; elapsed: number; note: string; duration: number };
export type Settings = { name: string; timezone: string; hideTimer: boolean; quietStart: string; quietEnd: string; demo: boolean };
export type GoogleStatus = { configured: boolean; connected: boolean; needsReconnect?: boolean; calendarId?: string; readCalendar?: string; lastSync?: number };
export type AppState = { activities: Activity[]; session: FocusSession | null; settings: Settings; google: GoogleStatus; voiceConfigured: boolean; remindersConfigured: boolean; authenticated: boolean };
