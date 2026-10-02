export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string;
          active_provider: "openai" | "gemini";
          openai_api_key: string | null;
          gemini_api_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          active_provider?: "openai" | "gemini";
          openai_api_key?: string | null;
          gemini_api_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          active_provider?: "openai" | "gemini";
          openai_api_key?: string | null;
          gemini_api_key?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          password_hash: string;
          created_at?: string;
        };
        Update: {
          username?: string;
          password_hash?: string;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          title: string;
          workspace_type: "oracle" | "aegis" | string;
          model: string;
          persona: "doctor" | "patient" | string;
          created_at: string;
          updated_at: string;
          last_message_at: string;
          elevenlabs_conversation_id?: string | null;
          user_id?: string | null;
          metadata?: Json | null;
        };
        Insert: {
          id?: string;
          title?: string;
          workspace_type?: "oracle" | "aegis" | string;
          model?: string;
          persona?: "doctor" | "patient" | string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
          elevenlabs_conversation_id?: string | null;
          user_id?: string | null;
          metadata?: Json | null;
        };
        Update: {
          title?: string;
          workspace_type?: "oracle" | "aegis" | string;
          model?: string;
          persona?: "doctor" | "patient" | string;
          updated_at?: string;
          last_message_at?: string;
          elevenlabs_conversation_id?: string | null;
          user_id?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          status: "pending" | "streaming" | "completed" | "error" | string;
          created_at: string;
          updated_at: string;
          user_id?: string | null;
          metadata?: Json | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          status?: "pending" | "streaming" | "completed" | "error" | string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          metadata?: Json | null;
        };
        Update: {
          content?: string;
          role?: "user" | "assistant" | "system";
          status?: "pending" | "streaming" | "completed" | "error" | string;
          user_id?: string | null;
          updated_at?: string;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          id: string;
          session_id: string;
          message_id?: string | null;
          user_id?: string | null;
          storage_path?: string | null;
          file_name: string;
          mime_type: string;
          file_size?: number | null;
          created_at: string;
          metadata?: Json | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          message_id?: string | null;
          user_id?: string | null;
          storage_path?: string | null;
          file_name: string;
          mime_type: string;
          file_size?: number | null;
          created_at?: string;
          metadata?: Json | null;
        };
        Update: {
          session_id?: string;
          message_id?: string | null;
          user_id?: string | null;
          storage_path?: string | null;
          file_name?: string;
          mime_type?: string;
          file_size?: number | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_reports: {
        Row: {
          id: string;
          session_id: string;
          user_id?: string | null;
          file_name: string;
          mime_type: string;
          file_size?: number | null;
          report_type?: string | null;
          storage_path?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id?: string | null;
          file_name: string;
          mime_type: string;
          file_size?: number | null;
          report_type?: string | null;
          storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          file_name?: string;
          mime_type?: string;
          file_size?: number | null;
          report_type?: string | null;
          storage_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medical_reports_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      report_analyses: {
        Row: {
          id: string;
          report_id?: string | null;
          session_id: string;
          user_id?: string | null;
          report_type?: string | null;
          overall_summary?: string | null;
          key_findings?: Json | null;
          tests?: Json | null;
          red_flags?: Json | null;
          questions_for_doctor?: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id?: string | null;
          session_id: string;
          user_id?: string | null;
          report_type?: string | null;
          overall_summary?: string | null;
          key_findings?: Json | null;
          tests?: Json | null;
          red_flags?: Json | null;
          questions_for_doctor?: Json | null;
          created_at?: string;
        };
        Update: {
          report_type?: string | null;
          overall_summary?: string | null;
          key_findings?: Json | null;
          tests?: Json | null;
          red_flags?: Json | null;
          questions_for_doctor?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "report_analyses_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
