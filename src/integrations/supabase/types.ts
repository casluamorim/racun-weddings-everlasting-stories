export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_design_presets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          design_settings: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          design_settings?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          design_settings?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_favorites: {
        Row: {
          created_at: string
          file_id: string
          gallery_id: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          gallery_id: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          gallery_id?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_favorites_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "gallery_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_favorites_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "wedding_galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_files: {
        Row: {
          created_at: string
          file_name: string
          gallery_id: string
          height: number | null
          id: string
          is_cover: boolean
          is_hero: boolean
          is_pinned: boolean
          kind: string
          mime_type: string | null
          original_path: string | null
          size_bytes: number | null
          sort_order: number
          thumb_path: string | null
          web_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          file_name: string
          gallery_id: string
          height?: number | null
          id?: string
          is_cover?: boolean
          is_hero?: boolean
          is_pinned?: boolean
          kind: string
          mime_type?: string | null
          original_path?: string | null
          size_bytes?: number | null
          sort_order?: number
          thumb_path?: string | null
          web_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string
          gallery_id?: string
          height?: number | null
          id?: string
          is_cover?: boolean
          is_hero?: boolean
          is_pinned?: boolean
          kind?: string
          mime_type?: string | null
          original_path?: string | null
          size_bytes?: number | null
          sort_order?: number
          thumb_path?: string | null
          web_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_files_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "wedding_galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          show_in_portfolio: boolean
          sort_order: number
          wedding_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          show_in_portfolio?: boolean
          sort_order?: number
          wedding_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          show_in_portfolio?: boolean
          sort_order?: number
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_photos_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_videos: {
        Row: {
          created_at: string
          id: string
          is_featured: boolean
          show_in_portfolio: boolean
          sort_order: number
          title: string | null
          wedding_id: string | null
          youtube_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_featured?: boolean
          show_in_portfolio?: boolean
          sort_order?: number
          title?: string | null
          wedding_id?: string | null
          youtube_url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_featured?: boolean
          show_in_portfolio?: boolean
          sort_order?: number
          title?: string | null
          wedding_id?: string | null
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_videos_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          badge: string | null
          category: string
          created_at: string
          display_name: string
          features: string[]
          id: string
          is_active: boolean
          is_highlighted: boolean
          name: string
          price: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category: string
          created_at?: string
          display_name: string
          features?: string[]
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          name: string
          price: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string
          display_name?: string
          features?: string[]
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          name?: string
          price?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          ceremony_location: string | null
          city: string | null
          created_at: string
          guest_count: number | null
          id: string
          message: string | null
          name: string
          notes: string | null
          phone: string
          plan_interest: string | null
          reception_location: string | null
          status: string
          updated_at: string
          wedding_date: string | null
        }
        Insert: {
          ceremony_location?: string | null
          city?: string | null
          created_at?: string
          guest_count?: number | null
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          phone: string
          plan_interest?: string | null
          reception_location?: string | null
          status?: string
          updated_at?: string
          wedding_date?: string | null
        }
        Update: {
          ceremony_location?: string | null
          city?: string | null
          created_at?: string
          guest_count?: number | null
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string
          plan_interest?: string | null
          reception_location?: string | null
          status?: string
          updated_at?: string
          wedding_date?: string | null
        }
        Relationships: []
      }
      reserved_dates: {
        Row: {
          couple_names: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          wedding_id: string | null
        }
        Insert: {
          couple_names?: string | null
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          wedding_id?: string | null
        }
        Update: {
          couple_names?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reserved_dates_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          id: string
          key: string
          section: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          section: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          section?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stories: {
        Row: {
          city: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          is_published: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
          venue: string | null
          wedding_date: string | null
          wedding_id: string | null
        }
        Insert: {
          city?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
          venue?: string | null
          wedding_date?: string | null
          wedding_id?: string | null
        }
        Update: {
          city?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
          venue?: string | null
          wedding_date?: string | null
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          couple_name: string
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          photo_url: string | null
          sort_order: number
          text: string
          updated_at: string
          wedding_id: string | null
        }
        Insert: {
          couple_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          photo_url?: string | null
          sort_order?: number
          text: string
          updated_at?: string
          wedding_id?: string | null
        }
        Update: {
          couple_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          photo_url?: string | null
          sort_order?: number
          text?: string
          updated_at?: string
          wedding_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wedding_galleries: {
        Row: {
          access_token: string
          city: string | null
          couple_names: string
          cover_url: string | null
          created_at: string
          description: string | null
          design_settings: Json
          download_count: number
          event_date: string | null
          featured_home: boolean
          hero_video_url: string | null
          id: string
          is_password_protected: boolean
          is_published: boolean
          keep_originals_forever: boolean
          originals_expire_at: string | null
          originals_removed_at: string | null
          password_hash: string | null
          retention_months: number
          show_in_portfolio: boolean
          slug: string
          story: string | null
          updated_at: string
          venue: string | null
          view_count: number
          wedding_id: string | null
        }
        Insert: {
          access_token?: string
          city?: string | null
          couple_names: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          design_settings?: Json
          download_count?: number
          event_date?: string | null
          featured_home?: boolean
          hero_video_url?: string | null
          id?: string
          is_password_protected?: boolean
          is_published?: boolean
          keep_originals_forever?: boolean
          originals_expire_at?: string | null
          originals_removed_at?: string | null
          password_hash?: string | null
          retention_months?: number
          show_in_portfolio?: boolean
          slug: string
          story?: string | null
          updated_at?: string
          venue?: string | null
          view_count?: number
          wedding_id?: string | null
        }
        Update: {
          access_token?: string
          city?: string | null
          couple_names?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          design_settings?: Json
          download_count?: number
          event_date?: string | null
          featured_home?: boolean
          hero_video_url?: string | null
          id?: string
          is_password_protected?: boolean
          is_published?: boolean
          keep_originals_forever?: boolean
          originals_expire_at?: string | null
          originals_removed_at?: string | null
          password_hash?: string | null
          retention_months?: number
          show_in_portfolio?: boolean
          slug?: string
          story?: string | null
          updated_at?: string
          venue?: string | null
          view_count?: number
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wedding_galleries_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          city: string | null
          couple_names: string
          cover_photo_url: string | null
          created_at: string
          date: string | null
          description: string | null
          id: string
          is_featured_home: boolean
          is_published: boolean
          slug: string
          style: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          city?: string | null
          couple_names: string
          cover_photo_url?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          is_featured_home?: boolean
          is_published?: boolean
          slug: string
          style?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          city?: string | null
          couple_names?: string
          cover_photo_url?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          is_featured_home?: boolean
          is_published?: boolean
          slug?: string
          style?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_gallery_by_token: {
        Args: { _slug: string; _token?: string }
        Returns: {
          city: string
          couple_names: string
          cover_url: string
          created_at: string
          description: string
          design_settings: Json
          download_count: number
          event_date: string
          featured_home: boolean
          hero_video_url: string
          id: string
          is_password_protected: boolean
          is_published: boolean
          keep_originals_forever: boolean
          originals_expire_at: string
          originals_removed_at: string
          retention_months: number
          show_in_portfolio: boolean
          slug: string
          story: string
          updated_at: string
          venue: string
          view_count: number
          wedding_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_gallery_view: {
        Args: { _gallery_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      remove_gallery_favorite: {
        Args: { _file_id: string; _session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
