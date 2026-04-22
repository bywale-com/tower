// ─── Database row shapes (matches Supabase table columns exactly) ─────────────

export type ContentType = "reel" | "video" | "image";

export type SignalStatus = "true" | "false" | "privated";

export interface Post {
  id: string;
  title: string | null;
  caption: string | null;
  hashtags: string[] | null;
  content_type: ContentType | null;
  thumbnail_url: string | null;
  video_url: string | null;
  url: string | null;
  like_count: number | null;
  comments_count: number | null;
  view_count: number | null;
  duration_seconds: number | null;
  posted_at: string | null;
  last_comment_at: string | null;
  urgency_score: number | null;
  analyzed_signal_count: number | null;
  high_urgency_signal_count: number | null;
  engagement_rate: number | null;
  ai_summary: string | null;
  surface_id: string | null;
  surface_username: string | null;
}

export interface Surface {
  username: string;
  full_name: string | null;
  followers: number | null;
  is_verified: boolean | null;
  avatar_url: string | null;
  incumbency_score: number | null;
}

export interface Signal {
  id: string;
  text: string | null;
  urgency_score: number | null;
  intent_label: string | null;
  is_answered: SignalStatus | null;
  status: string | null;
  claimed_by: string | null;
  commented_at: string | null;
  commenter_username: string | null;
}

export interface TranscriptSegment {
  start_time: string;
  text: string;
}

export interface Transcript {
  segments: TranscriptSegment[] | null;
}
