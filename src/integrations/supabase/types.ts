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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      advocaten: {
        Row: {
          active: boolean | null
          company: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      aftersales_ai_messages: {
        Row: {
          channel: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          language: string | null
          mode: string
          result: Json | null
          sale_id: string
          task_id: string | null
        }
        Insert: {
          channel?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string | null
          mode: string
          result?: Json | null
          sale_id: string
          task_id?: string | null
        }
        Update: {
          channel?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string | null
          mode?: string
          result?: Json | null
          sale_id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aftersales_ai_messages_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "aftersales_ai_messages_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aftersales_ai_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "sale_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      aftersales_copilot_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          messages: Json
          sale_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          messages?: Json
          sale_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          messages?: Json
          sale_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aftersales_copilot_conversations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "aftersales_copilot_conversations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      aftersales_reminders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          milestone_id: string | null
          note: string
          reminder_date: string
          sale_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          milestone_id?: string | null
          note?: string
          reminder_date: string
          sale_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          milestone_id?: string | null
          note?: string
          reminder_date?: string
          sale_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "aftersales_reminders_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "sale_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aftersales_reminders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "aftersales_reminders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          model_id: string | null
          prompt_key: string
          prompt_text: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          model_id?: string | null
          prompt_key: string
          prompt_text: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          model_id?: string | null
          prompt_key?: string
          prompt_text?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      appointment_rooms: {
        Row: {
          contact_email: string
          contact_name: string
          created_at: string
          ghl_appointment_id: string
          guest_joined_at: string | null
          host_notified_at: string | null
          id: string
          room_expires_at: string
          scheduled_end: string
          scheduled_start: string
          updated_at: string
          whereby_host_room_url: string
          whereby_room_url: string
        }
        Insert: {
          contact_email: string
          contact_name: string
          created_at?: string
          ghl_appointment_id: string
          guest_joined_at?: string | null
          host_notified_at?: string | null
          id?: string
          room_expires_at: string
          scheduled_end: string
          scheduled_start: string
          updated_at?: string
          whereby_host_room_url: string
          whereby_room_url: string
        }
        Update: {
          contact_email?: string
          contact_name?: string
          created_at?: string
          ghl_appointment_id?: string
          guest_joined_at?: string | null
          host_notified_at?: string | null
          id?: string
          room_expires_at?: string
          scheduled_end?: string
          scheduled_start?: string
          updated_at?: string
          whereby_host_room_url?: string
          whereby_room_url?: string
        }
        Relationships: []
      }
      blog_feedback: {
        Row: {
          blog_post_id: string
          blog_post_slug: string
          comment: string | null
          created_at: string | null
          crm_user_id: string | null
          id: string
          missing_info: string | null
          rating: number | null
          suggested_topics: string[] | null
          user_id: string | null
          visitor_id: string | null
          was_helpful: boolean | null
        }
        Insert: {
          blog_post_id: string
          blog_post_slug: string
          comment?: string | null
          created_at?: string | null
          crm_user_id?: string | null
          id?: string
          missing_info?: string | null
          rating?: number | null
          suggested_topics?: string[] | null
          user_id?: string | null
          visitor_id?: string | null
          was_helpful?: boolean | null
        }
        Update: {
          blog_post_id?: string
          blog_post_slug?: string
          comment?: string | null
          created_at?: string | null
          crm_user_id?: string | null
          id?: string
          missing_info?: string | null
          rating?: number | null
          suggested_topics?: string[] | null
          user_id?: string | null
          visitor_id?: string | null
          was_helpful?: boolean | null
        }
        Relationships: []
      }
      blog_interest_analysis: {
        Row: {
          avg_time_per_article: number | null
          content_preferences: Json | null
          created_at: string | null
          crm_user_id: string | null
          id: string
          last_analyzed_at: string | null
          most_engaged_topics: string[] | null
          most_read_categories: string[] | null
          primary_interests: string[] | null
          secondary_interests: string[] | null
          stage_in_journey: string | null
          total_articles_read: number | null
          updated_at: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          avg_time_per_article?: number | null
          content_preferences?: Json | null
          created_at?: string | null
          crm_user_id?: string | null
          id?: string
          last_analyzed_at?: string | null
          most_engaged_topics?: string[] | null
          most_read_categories?: string[] | null
          primary_interests?: string[] | null
          secondary_interests?: string[] | null
          stage_in_journey?: string | null
          total_articles_read?: number | null
          updated_at?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          avg_time_per_article?: number | null
          content_preferences?: Json | null
          created_at?: string | null
          crm_user_id?: string | null
          id?: string
          last_analyzed_at?: string | null
          most_engaged_topics?: string[] | null
          most_read_categories?: string[] | null
          primary_interests?: string[] | null
          secondary_interests?: string[] | null
          stage_in_journey?: string | null
          total_articles_read?: number | null
          updated_at?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string
          content: Json
          created_at: string
          example_section: string | null
          featured_image: string | null
          id: string
          intro: string
          is_featured: boolean
          meta_description: string | null
          meta_keywords: string[] | null
          online_limitation: string | null
          portal_phases: string[] | null
          published: boolean
          published_at: string | null
          scheduled_at: string | null
          seo_bullets: string[]
          slug: string
          source_insight_id: string | null
          source_question_id: string | null
          source_tension_id: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category: string
          content: Json
          created_at?: string
          example_section?: string | null
          featured_image?: string | null
          id?: string
          intro: string
          is_featured?: boolean
          meta_description?: string | null
          meta_keywords?: string[] | null
          online_limitation?: string | null
          portal_phases?: string[] | null
          published?: boolean
          published_at?: string | null
          scheduled_at?: string | null
          seo_bullets?: string[]
          slug: string
          source_insight_id?: string | null
          source_question_id?: string | null
          source_tension_id?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string
          content?: Json
          created_at?: string
          example_section?: string | null
          featured_image?: string | null
          id?: string
          intro?: string
          is_featured?: boolean
          meta_description?: string | null
          meta_keywords?: string[] | null
          online_limitation?: string | null
          portal_phases?: string[] | null
          published?: boolean
          published_at?: string | null
          scheduled_at?: string | null
          seo_bullets?: string[]
          slug?: string
          source_insight_id?: string | null
          source_question_id?: string | null
          source_tension_id?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_source_insight_id_fkey"
            columns: ["source_insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_source_question_id_fkey"
            columns: ["source_question_id"]
            isOneToOne: false
            referencedRelation: "content_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_source_tension_id_fkey"
            columns: ["source_tension_id"]
            isOneToOne: false
            referencedRelation: "content_tensions"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_data_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          sale_customer_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          sale_customer_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          sale_customer_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_data_tokens_sale_customer_id_fkey"
            columns: ["sale_customer_id"]
            isOneToOne: false
            referencedRelation: "sale_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_form_activity_log: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          sale_customer_id: string | null
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          sale_customer_id?: string | null
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          sale_customer_id?: string | null
          token_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_form_activity_log_sale_customer_id_fkey"
            columns: ["sale_customer_id"]
            isOneToOne: false
            referencedRelation: "sale_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_form_activity_log_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "buyer_data_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      cached_pdfs: {
        Row: {
          content_hash: string
          created_at: string
          file_path: string
          file_url: string
          generated_at: string
          id: string
          pdf_type: string
          sale_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          file_path: string
          file_url: string
          generated_at?: string
          id?: string
          pdf_type: string
          sale_id: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          file_path?: string
          file_url?: string
          generated_at?: string
          id?: string
          pdf_type?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cached_pdfs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "cached_pdfs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_leads: {
        Row: {
          campaign_id: string
          clicked_at: string
          converted_at: string | null
          created_at: string
          crm_lead_id: string | null
          id: string
          source_platform: string
          utm_data: Json | null
          visitor_id: string | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string
          converted_at?: string | null
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          source_platform?: string
          utm_data?: Json | null
          visitor_id?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string
          converted_at?: string | null
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          source_platform?: string
          utm_data?: Json | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_leads_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_leads_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          bot_type: string
          completed_at: string | null
          converted: boolean
          created_at: string
          id: string
          metadata: Json
          project_id: string | null
          started_at: string
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          bot_type?: string
          completed_at?: string | null
          converted?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string | null
          started_at?: string
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          bot_type?: string
          completed_at?: string | null
          converted?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string | null
          started_at?: string
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages_old: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          session_id: string
          step: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type: string
          session_id: string
          step: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          session_id?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions_old"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions_old: {
        Row: {
          completed_at: string | null
          converted: boolean
          created_at: string
          final_email: string | null
          final_name: string | null
          id: string
          project_id: string
          started_at: string
          usage_type_choice: string | null
          visitor_id: string
        }
        Insert: {
          completed_at?: string | null
          converted?: boolean
          created_at?: string
          final_email?: string | null
          final_name?: string | null
          id?: string
          project_id: string
          started_at?: string
          usage_type_choice?: string | null
          visitor_id: string
        }
        Update: {
          completed_at?: string | null
          converted?: boolean
          created_at?: string
          final_email?: string | null
          final_name?: string | null
          id?: string
          project_id?: string
          started_at?: string
          usage_type_choice?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      chatbot_agent_tools: {
        Row: {
          created_at: string
          description: string
          display_name: string
          documentation: Json | null
          id: string
          is_enabled: boolean
          name: string
          order_priority: number
          parameters_schema: Json
          requires_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_name: string
          documentation?: Json | null
          id?: string
          is_enabled?: boolean
          name: string
          order_priority?: number
          parameters_schema?: Json
          requires_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_name?: string
          documentation?: Json | null
          id?: string
          is_enabled?: boolean
          name?: string
          order_priority?: number
          parameters_schema?: Json
          requires_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_feedback: {
        Row: {
          blog_post_slug: string | null
          created_at: string | null
          feedback_data: Json
          id: string
          page_type: string
          page_url: string
          project_id: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          blog_post_slug?: string | null
          created_at?: string | null
          feedback_data: Json
          id?: string
          page_type: string
          page_url: string
          project_id?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          blog_post_slug?: string | null
          created_at?: string | null
          feedback_data?: Json
          id?: string
          page_type?: string
          page_url?: string
          project_id?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_insights: {
        Row: {
          admin_notes: string | null
          affected_step: string | null
          conversation_id: string | null
          created_at: string | null
          description: string
          frequency: number | null
          id: string
          insight_type: string
          severity: string
          status: string
          suggested_fix: string | null
          title: string
        }
        Insert: {
          admin_notes?: string | null
          affected_step?: string | null
          conversation_id?: string | null
          created_at?: string | null
          description: string
          frequency?: number | null
          id?: string
          insight_type: string
          severity: string
          status?: string
          suggested_fix?: string | null
          title: string
        }
        Update: {
          admin_notes?: string | null
          affected_step?: string | null
          conversation_id?: string | null
          created_at?: string | null
          description?: string
          frequency?: number | null
          id?: string
          insight_type?: string
          severity?: string
          status?: string
          suggested_fix?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_insights_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_question_metrics: {
        Row: {
          avg_response_time_seconds: number | null
          drop_off_count: number | null
          id: string
          last_updated: string | null
          question_type: string
          success_rate: number | null
          total_answered: number | null
          total_asked: number | null
        }
        Insert: {
          avg_response_time_seconds?: number | null
          drop_off_count?: number | null
          id?: string
          last_updated?: string | null
          question_type: string
          success_rate?: number | null
          total_answered?: number | null
          total_asked?: number | null
        }
        Update: {
          avg_response_time_seconds?: number | null
          drop_off_count?: number | null
          id?: string
          last_updated?: string | null
          question_type?: string
          success_rate?: number | null
          total_answered?: number | null
          total_asked?: number | null
        }
        Relationships: []
      }
      chatbot_settings: {
        Row: {
          created_at: string
          description: string
          display_name: string
          documentation: Json | null
          enabled: boolean
          id: string
          order_index: number
          setting_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description: string
          display_name: string
          documentation?: Json | null
          enabled?: boolean
          id?: string
          order_index?: number
          setting_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          display_name?: string
          documentation?: Json | null
          enabled?: boolean
          id?: string
          order_index?: number
          setting_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      city_info_cache: {
        Row: {
          city: string
          country: string
          created_at: string | null
          description: string
          distance_to_airport_km: number | null
          distance_to_beach_km: number | null
          featured_image: string | null
          highlights: Json | null
          id: string
          investment_info: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          city: string
          country?: string
          created_at?: string | null
          description: string
          distance_to_airport_km?: number | null
          distance_to_beach_km?: number | null
          featured_image?: string | null
          highlights?: Json | null
          id?: string
          investment_info?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string | null
          description?: string
          distance_to_airport_km?: number | null
          distance_to_beach_km?: number | null
          featured_image?: string | null
          highlights?: Json | null
          id?: string
          investment_info?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      city_video_links: {
        Row: {
          city: string
          created_at: string
          id: string
          video_id: string
          visible_portal: boolean
          visible_public: boolean
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          video_id: string
          visible_portal?: boolean
          visible_public?: boolean
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          video_id?: string
          visible_portal?: boolean
          visible_public?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "city_video_links_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "project_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      content_archetypes: {
        Row: {
          classification_rules: Json | null
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          key: string
          label: string
          prompt_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          classification_rules?: Json | null
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          prompt_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          classification_rules?: Json | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          prompt_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      content_briefings: {
        Row: {
          article_data: Json | null
          briefing_data: Json
          category: string
          created_at: string
          id: string
          image_url: string | null
          raw_brainstorm: string | null
          seo_research: Json | null
          source_context: Json | null
          source_insight_id: string | null
          source_question_id: string | null
          source_text: string
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          article_data?: Json | null
          briefing_data?: Json
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          raw_brainstorm?: string | null
          seo_research?: Json | null
          source_context?: Json | null
          source_insight_id?: string | null
          source_question_id?: string | null
          source_text?: string
          source_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          article_data?: Json | null
          briefing_data?: Json
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          raw_brainstorm?: string | null
          seo_research?: Json | null
          source_context?: Json | null
          source_insight_id?: string | null
          source_question_id?: string | null
          source_text?: string
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_briefings_source_insight_id_fkey"
            columns: ["source_insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_briefings_source_question_id_fkey"
            columns: ["source_question_id"]
            isOneToOne: false
            referencedRelation: "content_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          angle: string
          archetype: string | null
          body: string
          created_at: string | null
          cta: string | null
          draft_data: Json | null
          edit_type: string | null
          editor_notes: string | null
          gatekeeper_data: Json | null
          hook: string
          hook_data: Json | null
          id: string
          insight_id: string | null
          parent_id: string | null
          platform: string
          qa_report: Json | null
          status: string | null
          strategy_data: Json | null
          version: number | null
          visual_concept: string | null
        }
        Insert: {
          angle: string
          archetype?: string | null
          body: string
          created_at?: string | null
          cta?: string | null
          draft_data?: Json | null
          edit_type?: string | null
          editor_notes?: string | null
          gatekeeper_data?: Json | null
          hook: string
          hook_data?: Json | null
          id?: string
          insight_id?: string | null
          parent_id?: string | null
          platform: string
          qa_report?: Json | null
          status?: string | null
          strategy_data?: Json | null
          version?: number | null
          visual_concept?: string | null
        }
        Update: {
          angle?: string
          archetype?: string | null
          body?: string
          created_at?: string | null
          cta?: string | null
          draft_data?: Json | null
          edit_type?: string | null
          editor_notes?: string | null
          gatekeeper_data?: Json | null
          hook?: string
          hook_data?: Json | null
          id?: string
          insight_id?: string | null
          parent_id?: string | null
          platform?: string
          qa_report?: Json | null
          status?: string | null
          strategy_data?: Json | null
          version?: number | null
          visual_concept?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pipeline_logs: {
        Row: {
          briefing_id: string | null
          created_at: string | null
          id: string
          input_context: Json | null
          model_id: string | null
          output_data: Json | null
          output_raw: string | null
          prompt_snapshot: string | null
          step: string
          version: number | null
        }
        Insert: {
          briefing_id?: string | null
          created_at?: string | null
          id?: string
          input_context?: Json | null
          model_id?: string | null
          output_data?: Json | null
          output_raw?: string | null
          prompt_snapshot?: string | null
          step: string
          version?: number | null
        }
        Update: {
          briefing_id?: string | null
          created_at?: string | null
          id?: string
          input_context?: Json | null
          model_id?: string | null
          output_data?: Json | null
          output_raw?: string | null
          prompt_snapshot?: string | null
          step?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_pipeline_logs_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "content_briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      content_questions: {
        Row: {
          buyer_phases: string[] | null
          created_at: string | null
          frequency: number | null
          id: string
          question: string
          search_intent: string
          search_volume_hint: string | null
          source_insight_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          buyer_phases?: string[] | null
          created_at?: string | null
          frequency?: number | null
          id?: string
          question: string
          search_intent?: string
          search_volume_hint?: string | null
          source_insight_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          buyer_phases?: string[] | null
          created_at?: string | null
          frequency?: number | null
          id?: string
          question?: string
          search_intent?: string
          search_volume_hint?: string | null
          source_insight_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      content_tensions: {
        Row: {
          category: string
          created_at: string
          emotional_undercurrent: string
          hook_angle: string
          id: string
          is_active: boolean
          new_reality: string
          old_belief: string
          tension_title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          category: string
          created_at?: string
          emotional_undercurrent: string
          hook_angle: string
          id?: string
          is_active?: boolean
          new_reality: string
          old_belief: string
          tension_title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          emotional_undercurrent?: string
          hook_angle?: string
          id?: string
          is_active?: boolean
          new_reality?: string
          old_belief?: string
          tension_title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      conversation_insights: {
        Row: {
          conversation_id: string
          created_at: string | null
          insight_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          insight_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          insight_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_insights_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_insights_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_topics: {
        Row: {
          created_at: string | null
          discussion_count: number | null
          display_order: number | null
          id: string
          is_active: boolean | null
          last_discussed_at: string | null
          topic_category: string | null
          topic_question: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discussion_count?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          last_discussed_at?: string | null
          topic_category?: string | null
          topic_question: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discussion_count?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          last_discussed_at?: string | null
          topic_category?: string | null
          topic_question?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          anonymized_notes: string | null
          buyer_phase: string | null
          conversation_richness: number | null
          created_at: string | null
          crm_lead_id: string | null
          id: string
          processed: boolean | null
          processing_error: string | null
          raw_notes: string
          sentiment: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          anonymized_notes?: string | null
          buyer_phase?: string | null
          conversation_richness?: number | null
          created_at?: string | null
          crm_lead_id?: string | null
          id?: string
          processed?: boolean | null
          processing_error?: string | null
          raw_notes: string
          sentiment?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          anonymized_notes?: string | null
          buyer_phase?: string | null
          conversation_richness?: number | null
          created_at?: string | null
          crm_lead_id?: string | null
          id?: string
          processed?: boolean | null
          processing_error?: string | null
          raw_notes?: string
          sentiment?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimate_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          cost_estimate_id: string
          created_at: string | null
          crm_lead_id: string
          customer_notes: string | null
          id: string
          status: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          cost_estimate_id: string
          created_at?: string | null
          crm_lead_id: string
          customer_notes?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          cost_estimate_id?: string
          created_at?: string | null
          crm_lead_id?: string
          customer_notes?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimate_assignments_cost_estimate_id_fkey"
            columns: ["cost_estimate_id"]
            isOneToOne: false
            referencedRelation: "cost_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimate_assignments_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimate_assignments_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimates: {
        Row: {
          base_price: number
          costs: Json | null
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          extras: Json | null
          id: string
          itp_rate: number | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          notes: string | null
          project_id: string | null
          project_image: string | null
          project_name: string
          property_type: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          costs?: Json | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          extras?: Json | null
          id?: string
          itp_rate?: number | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          project_id?: string | null
          project_image?: string | null
          project_name: string
          property_type?: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          costs?: Json | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          extras?: Json | null
          id?: string
          itp_rate?: number | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          project_id?: string | null
          project_image?: string | null
          project_name?: string
          property_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          admin_notes: string | null
          can_submit_external_urls: boolean
          country: string | null
          created_at: string | null
          crm_user_id: string | null
          date_of_birth: string | null
          dropped_off_at: string | null
          dropped_off_notes: string | null
          dropped_off_phase: string | null
          dropped_off_reason: string | null
          email: string | null
          feedback_received_at: string | null
          feedback_requested_at: string | null
          feedback_score: number | null
          feedback_text: string | null
          first_name: string | null
          first_visit_at: string | null
          follow_up_notes: string | null
          follow_up_status: string | null
          ghl_contact_id: string | null
          id: string
          journey_phase: string | null
          journey_phase_updated_at: string | null
          journey_phase_updated_by: string | null
          last_follow_up_at: string | null
          last_ghl_refresh_at: string | null
          last_magic_link_sent_at: string | null
          last_name: string | null
          last_visit_at: string | null
          linked_visitor_ids: string[] | null
          magic_link_sent_count: number | null
          merged_at: string | null
          nationality: string | null
          next_follow_up_at: string | null
          personal_data_complete: boolean | null
          personal_data_completed_at: string | null
          phone: string | null
          postal_code: string | null
          qualification_reason: string | null
          qualified_at: string | null
          reactivated_at: string | null
          recontact_after: string | null
          recontact_allowed: boolean | null
          referred_by_partner_id: string | null
          residence_city: string | null
          source_campaign: string | null
          source_email: string | null
          street_address: string | null
          tax_id_bsn: string | null
          tax_id_nie: string | null
          updated_at: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          can_submit_external_urls?: boolean
          country?: string | null
          created_at?: string | null
          crm_user_id?: string | null
          date_of_birth?: string | null
          dropped_off_at?: string | null
          dropped_off_notes?: string | null
          dropped_off_phase?: string | null
          dropped_off_reason?: string | null
          email?: string | null
          feedback_received_at?: string | null
          feedback_requested_at?: string | null
          feedback_score?: number | null
          feedback_text?: string | null
          first_name?: string | null
          first_visit_at?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string | null
          ghl_contact_id?: string | null
          id?: string
          journey_phase?: string | null
          journey_phase_updated_at?: string | null
          journey_phase_updated_by?: string | null
          last_follow_up_at?: string | null
          last_ghl_refresh_at?: string | null
          last_magic_link_sent_at?: string | null
          last_name?: string | null
          last_visit_at?: string | null
          linked_visitor_ids?: string[] | null
          magic_link_sent_count?: number | null
          merged_at?: string | null
          nationality?: string | null
          next_follow_up_at?: string | null
          personal_data_complete?: boolean | null
          personal_data_completed_at?: string | null
          phone?: string | null
          postal_code?: string | null
          qualification_reason?: string | null
          qualified_at?: string | null
          reactivated_at?: string | null
          recontact_after?: string | null
          recontact_allowed?: boolean | null
          referred_by_partner_id?: string | null
          residence_city?: string | null
          source_campaign?: string | null
          source_email?: string | null
          street_address?: string | null
          tax_id_bsn?: string | null
          tax_id_nie?: string | null
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          can_submit_external_urls?: boolean
          country?: string | null
          created_at?: string | null
          crm_user_id?: string | null
          date_of_birth?: string | null
          dropped_off_at?: string | null
          dropped_off_notes?: string | null
          dropped_off_phase?: string | null
          dropped_off_reason?: string | null
          email?: string | null
          feedback_received_at?: string | null
          feedback_requested_at?: string | null
          feedback_score?: number | null
          feedback_text?: string | null
          first_name?: string | null
          first_visit_at?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string | null
          ghl_contact_id?: string | null
          id?: string
          journey_phase?: string | null
          journey_phase_updated_at?: string | null
          journey_phase_updated_by?: string | null
          last_follow_up_at?: string | null
          last_ghl_refresh_at?: string | null
          last_magic_link_sent_at?: string | null
          last_name?: string | null
          last_visit_at?: string | null
          linked_visitor_ids?: string[] | null
          magic_link_sent_count?: number | null
          merged_at?: string | null
          nationality?: string | null
          next_follow_up_at?: string | null
          personal_data_complete?: boolean | null
          personal_data_completed_at?: string | null
          phone?: string | null
          postal_code?: string | null
          qualification_reason?: string | null
          qualified_at?: string | null
          reactivated_at?: string | null
          recontact_after?: string | null
          recontact_allowed?: boolean | null
          referred_by_partner_id?: string | null
          residence_city?: string | null
          source_campaign?: string | null
          source_email?: string | null
          street_address?: string | null
          tax_id_bsn?: string | null
          tax_id_nie?: string | null
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "crm_leads_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_hypotheek_data: {
        Row: {
          alimentatie: number | null
          autolening: number | null
          bruto_jaarinkomen: number | null
          burgerlijke_staat: string | null
          eigen_vermogen: number | null
          heeft_co_aanvrager: boolean | null
          heeft_overwaarde: boolean | null
          id: string
          inkomenstype: string | null
          is_pep: boolean | null
          openstaande_hypotheek: number | null
          partner_achternaam: string | null
          partner_bruto_jaarinkomen: number | null
          partner_geboortejaar: number | null
          partner_inkomenstype: string | null
          partner_voornaam: string | null
          persoonlijke_lening: number | null
          plannen: string | null
          updated_at: string | null
          user_id: string
          woningwaarde: number | null
          woonlasten: number | null
        }
        Insert: {
          alimentatie?: number | null
          autolening?: number | null
          bruto_jaarinkomen?: number | null
          burgerlijke_staat?: string | null
          eigen_vermogen?: number | null
          heeft_co_aanvrager?: boolean | null
          heeft_overwaarde?: boolean | null
          id?: string
          inkomenstype?: string | null
          is_pep?: boolean | null
          openstaande_hypotheek?: number | null
          partner_achternaam?: string | null
          partner_bruto_jaarinkomen?: number | null
          partner_geboortejaar?: number | null
          partner_inkomenstype?: string | null
          partner_voornaam?: string | null
          persoonlijke_lening?: number | null
          plannen?: string | null
          updated_at?: string | null
          user_id: string
          woningwaarde?: number | null
          woonlasten?: number | null
        }
        Update: {
          alimentatie?: number | null
          autolening?: number | null
          bruto_jaarinkomen?: number | null
          burgerlijke_staat?: string | null
          eigen_vermogen?: number | null
          heeft_co_aanvrager?: boolean | null
          heeft_overwaarde?: boolean | null
          id?: string
          inkomenstype?: string | null
          is_pep?: boolean | null
          openstaande_hypotheek?: number | null
          partner_achternaam?: string | null
          partner_bruto_jaarinkomen?: number | null
          partner_geboortejaar?: number | null
          partner_inkomenstype?: string | null
          partner_voornaam?: string | null
          persoonlijke_lening?: number | null
          plannen?: string | null
          updated_at?: string | null
          user_id?: string
          woningwaarde?: number | null
          woonlasten?: number | null
        }
        Relationships: []
      }
      customer_identity_documents: {
        Row: {
          created_at: string | null
          crm_lead_id: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string | null
          crm_lead_id: string
          document_type: string
          file_name: string
          file_url: string
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string | null
          crm_lead_id?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_identity_documents_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_identity_documents_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string | null
          crm_lead_id: string | null
          crm_user_id: string | null
          data_completeness_score: number | null
          engagement_data: Json | null
          explicit_preferences: Json | null
          favorite_projects: string[] | null
          first_touch_partner_at: string | null
          id: string
          inferred_preferences: Json | null
          last_aggregated_at: string | null
          lead_temperature: string | null
          linked_visitor_ids: string[] | null
          onboarding_completed_at: string | null
          orientation_progress: Json | null
          preferences_source: Json | null
          referred_by_partner_id: string | null
          updated_at: string | null
          user_id: string | null
          viewed_blog_posts: string[] | null
          viewed_projects: string[] | null
          viewed_stories: string[] | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string | null
          crm_lead_id?: string | null
          crm_user_id?: string | null
          data_completeness_score?: number | null
          engagement_data?: Json | null
          explicit_preferences?: Json | null
          favorite_projects?: string[] | null
          first_touch_partner_at?: string | null
          id?: string
          inferred_preferences?: Json | null
          last_aggregated_at?: string | null
          lead_temperature?: string | null
          linked_visitor_ids?: string[] | null
          onboarding_completed_at?: string | null
          orientation_progress?: Json | null
          preferences_source?: Json | null
          referred_by_partner_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          viewed_blog_posts?: string[] | null
          viewed_projects?: string[] | null
          viewed_stories?: string[] | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string | null
          crm_lead_id?: string | null
          crm_user_id?: string | null
          data_completeness_score?: number | null
          engagement_data?: Json | null
          explicit_preferences?: Json | null
          favorite_projects?: string[] | null
          first_touch_partner_at?: string | null
          id?: string
          inferred_preferences?: Json | null
          last_aggregated_at?: string | null
          lead_temperature?: string | null
          linked_visitor_ids?: string[] | null
          onboarding_completed_at?: string | null
          orientation_progress?: Json | null
          preferences_source?: Json | null
          referred_by_partner_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          viewed_blog_posts?: string[] | null
          viewed_projects?: string[] | null
          viewed_stories?: string[] | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: true
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: true
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "customer_profiles_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_project_selections: {
        Row: {
          admin_notes: string | null
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          crm_lead_id: string
          customer_notes: string | null
          id: string
          priority: number | null
          project_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          crm_lead_id: string
          customer_notes?: string | null
          id?: string
          priority?: number | null
          project_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          crm_lead_id?: string
          customer_notes?: string | null
          id?: string
          priority?: number | null
          project_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_project_selections_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_project_selections_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_project_selections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_project_selections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_travel_guide_pois: {
        Row: {
          created_at: string
          custom_note: string | null
          guide_id: string
          id: string
          order_index: number
          poi_id: string
        }
        Insert: {
          created_at?: string
          custom_note?: string | null
          guide_id: string
          id?: string
          order_index?: number
          poi_id: string
        }
        Update: {
          created_at?: string
          custom_note?: string | null
          guide_id?: string
          id?: string
          order_index?: number
          poi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_travel_guide_pois_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "customer_travel_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_travel_guide_pois_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "travel_guide_pois"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_travel_guides: {
        Row: {
          created_at: string
          created_by: string | null
          crm_lead_id: string
          id: string
          intro_text: string | null
          municipality: string | null
          region: string | null
          sale_id: string | null
          title: string
          updated_at: string
          viewing_trip_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crm_lead_id: string
          id?: string
          intro_text?: string | null
          municipality?: string | null
          region?: string | null
          sale_id?: string | null
          title?: string
          updated_at?: string
          viewing_trip_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crm_lead_id?: string
          id?: string
          intro_text?: string | null
          municipality?: string | null
          region?: string | null
          sale_id?: string | null
          title?: string
          updated_at?: string
          viewing_trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_travel_guides_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_travel_guides_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_travel_guides_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "customer_travel_guides_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_travel_guides_viewing_trip_id_fkey"
            columns: ["viewing_trip_id"]
            isOneToOne: false
            referencedRelation: "customer_viewing_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_viewing_trips: {
        Row: {
          accommodation_info: string | null
          admin_notes: string | null
          airport: string | null
          arrival_time: string | null
          created_at: string | null
          created_by: string | null
          crm_lead_id: string
          customer_notes: string | null
          departure_time: string | null
          flight_info: string | null
          id: string
          scheduled_viewings: Json | null
          status: string | null
          trip_end_date: string
          trip_start_date: string
          trip_type: string
          updated_at: string | null
        }
        Insert: {
          accommodation_info?: string | null
          admin_notes?: string | null
          airport?: string | null
          arrival_time?: string | null
          created_at?: string | null
          created_by?: string | null
          crm_lead_id: string
          customer_notes?: string | null
          departure_time?: string | null
          flight_info?: string | null
          id?: string
          scheduled_viewings?: Json | null
          status?: string | null
          trip_end_date: string
          trip_start_date: string
          trip_type?: string
          updated_at?: string | null
        }
        Update: {
          accommodation_info?: string | null
          admin_notes?: string | null
          airport?: string | null
          arrival_time?: string | null
          created_at?: string | null
          created_by?: string | null
          crm_lead_id?: string
          customer_notes?: string | null
          departure_time?: string | null
          flight_info?: string | null
          id?: string
          scheduled_viewings?: Json | null
          status?: string | null
          trip_end_date?: string
          trip_start_date?: string
          trip_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_viewing_trips_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_viewing_trips_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      customization_request_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          request_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          request_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          request_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customization_request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sale_customization_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      document_type_mappings: {
        Row: {
          confidence: number | null
          created_at: string
          created_by: string | null
          document_type: string
          id: string
          last_matched_at: string | null
          match_count: number | null
          pattern: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          document_type: string
          id?: string
          last_matched_at?: string | null
          match_count?: number | null
          pattern: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          id?: string
          last_matched_at?: string | null
          match_count?: number | null
          pattern?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_team_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          order_index: number
          team_member_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          order_index?: number
          team_member_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          order_index?: number
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_team_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "info_evening_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_team_members_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      external_assignment_status_history: {
        Row: {
          assignment_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          assignment_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          assignment_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_assignment_status_history_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "external_listing_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      external_listing_assignments: {
        Row: {
          admin_notes: string | null
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          crm_lead_id: string
          customer_notes: string | null
          external_listing_id: string
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          crm_lead_id: string
          customer_notes?: string | null
          external_listing_id: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          crm_lead_id?: string
          customer_notes?: string | null
          external_listing_id?: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_listing_assignments_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_listing_assignments_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_listing_assignments_external_listing_id_fkey"
            columns: ["external_listing_id"]
            isOneToOne: false
            referencedRelation: "external_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      external_listing_submissions: {
        Row: {
          admin_response: string | null
          created_at: string
          crm_lead_id: string
          customer_message: string | null
          external_listing_id: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_url: string
          status: string
          submitted_by_user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          crm_lead_id: string
          customer_message?: string | null
          external_listing_id?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_url: string
          status?: string
          submitted_by_user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          crm_lead_id?: string
          customer_message?: string | null
          external_listing_id?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_url?: string
          status?: string
          submitted_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_listing_submissions_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_listing_submissions_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_listing_submissions_external_listing_id_fkey"
            columns: ["external_listing_id"]
            isOneToOne: false
            referencedRelation: "external_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      external_listings: {
        Row: {
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          features: Json | null
          id: string
          images: string[] | null
          last_scrape_attempt: string | null
          plot_size_sqm: number | null
          price: number | null
          raw_scraped_data: Json | null
          region: string | null
          scrape_error: string | null
          scrape_status: string | null
          scraped_at: string | null
          source_platform: string
          source_url: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          images?: string[] | null
          last_scrape_attempt?: string | null
          plot_size_sqm?: number | null
          price?: number | null
          raw_scraped_data?: Json | null
          region?: string | null
          scrape_error?: string | null
          scrape_status?: string | null
          scraped_at?: string | null
          source_platform?: string
          source_url: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          images?: string[] | null
          last_scrape_attempt?: string | null
          plot_size_sqm?: number | null
          price?: number | null
          raw_scraped_data?: Json | null
          region?: string | null
          scrape_error?: string | null
          scrape_status?: string | null
          scraped_at?: string | null
          source_platform?: string
          source_url?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      faq_categories: {
        Row: {
          active: boolean
          category_key: string
          context_type: string
          context_value: string | null
          created_at: string
          display_name: string
          icon_name: string
          id: string
          order_index: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_key: string
          context_type: string
          context_value?: string | null
          created_at?: string
          display_name: string
          icon_name: string
          id?: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_key?: string
          context_type?: string
          context_value?: string | null
          created_at?: string
          display_name?: string
          icon_name?: string
          id?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          active: boolean
          answer: string
          category_id: string
          created_at: string
          cta_link: string | null
          cta_text: string | null
          id: string
          order_index: number
          question: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer: string
          category_id: string
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          order_index?: number
          question: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer?: string
          category_id?: string
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          order_index?: number
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_contact_appointments: {
        Row: {
          calendar_id: string | null
          client_pseudonym: string | null
          created_at: string
          crm_lead_id: string
          end_time: string
          ghl_appointment_id: string
          ghl_notes: string | null
          granola_meeting_id: string | null
          id: string
          is_summary_published: boolean | null
          key_topics: string[] | null
          local_notes: string | null
          start_time: string
          status: string | null
          summary_category: string | null
          summary_full: string | null
          summary_headline: string | null
          summary_short: string | null
          synced_at: string | null
          title: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          calendar_id?: string | null
          client_pseudonym?: string | null
          created_at?: string
          crm_lead_id: string
          end_time: string
          ghl_appointment_id: string
          ghl_notes?: string | null
          granola_meeting_id?: string | null
          id?: string
          is_summary_published?: boolean | null
          key_topics?: string[] | null
          local_notes?: string | null
          start_time: string
          status?: string | null
          summary_category?: string | null
          summary_full?: string | null
          summary_headline?: string | null
          summary_short?: string | null
          synced_at?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          calendar_id?: string | null
          client_pseudonym?: string | null
          created_at?: string
          crm_lead_id?: string
          end_time?: string
          ghl_appointment_id?: string
          ghl_notes?: string | null
          granola_meeting_id?: string | null
          id?: string
          is_summary_published?: boolean | null
          key_topics?: string[] | null
          local_notes?: string | null
          start_time?: string
          status?: string | null
          summary_category?: string | null
          summary_full?: string | null
          summary_headline?: string | null
          summary_short?: string | null
          synced_at?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_contact_appointments_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghl_contact_appointments_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_contact_notes: {
        Row: {
          body: string
          created_at: string
          crm_lead_id: string
          ghl_date_added: string | null
          ghl_note_id: string | null
          id: string
          source: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          crm_lead_id: string
          ghl_date_added?: string | null
          ghl_note_id?: string | null
          id?: string
          source?: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          crm_lead_id?: string
          ghl_date_added?: string | null
          ghl_note_id?: string | null
          id?: string
          source?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_contact_notes_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghl_contact_notes_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      google_business_connections: {
        Row: {
          access_token: string | null
          account_id: string
          account_name: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          location_id: string
          location_name: string | null
          refresh_token: string
          token_expires_at: string | null
          total_reviews_synced: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id: string
          account_name?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          location_id: string
          location_name?: string | null
          refresh_token: string
          token_expires_at?: string | null
          total_reviews_synced?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string
          account_name?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          location_id?: string
          location_name?: string | null
          refresh_token?: string
          token_expires_at?: string | null
          total_reviews_synced?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hypotheek_leads: {
        Row: {
          aankoopsom: number | null
          achternaam: string
          bruto_jaarinkomen: number | null
          burgerlijke_staat: string | null
          created_at: string | null
          eigen_vermogen: number | null
          eindscore_letter: string | null
          eindscore_percentage: number | null
          email: string
          geboortedatum: string | null
          heeft_co_aanvrager: boolean | null
          id: string
          inkomenstype: string | null
          is_pep: boolean | null
          land: string | null
          partner_bruto_jaarinkomen: number | null
          plannen: string | null
          provincie: string | null
          rapport_json: Json | null
          schulden_totaal: number | null
          telefoon: string | null
          telefoon_landcode: string | null
          user_id: string | null
          voornaam: string
          woning_type: string | null
        }
        Insert: {
          aankoopsom?: number | null
          achternaam: string
          bruto_jaarinkomen?: number | null
          burgerlijke_staat?: string | null
          created_at?: string | null
          eigen_vermogen?: number | null
          eindscore_letter?: string | null
          eindscore_percentage?: number | null
          email: string
          geboortedatum?: string | null
          heeft_co_aanvrager?: boolean | null
          id?: string
          inkomenstype?: string | null
          is_pep?: boolean | null
          land?: string | null
          partner_bruto_jaarinkomen?: number | null
          plannen?: string | null
          provincie?: string | null
          rapport_json?: Json | null
          schulden_totaal?: number | null
          telefoon?: string | null
          telefoon_landcode?: string | null
          user_id?: string | null
          voornaam: string
          woning_type?: string | null
        }
        Update: {
          aankoopsom?: number | null
          achternaam?: string
          bruto_jaarinkomen?: number | null
          burgerlijke_staat?: string | null
          created_at?: string | null
          eigen_vermogen?: number | null
          eindscore_letter?: string | null
          eindscore_percentage?: number | null
          email?: string
          geboortedatum?: string | null
          heeft_co_aanvrager?: boolean | null
          id?: string
          inkomenstype?: string | null
          is_pep?: boolean | null
          land?: string | null
          partner_bruto_jaarinkomen?: number | null
          plannen?: string | null
          provincie?: string | null
          rapport_json?: Json | null
          schulden_totaal?: number | null
          telefoon?: string | null
          telefoon_landcode?: string | null
          user_id?: string | null
          voornaam?: string
          woning_type?: string | null
        }
        Relationships: []
      }
      info_evening_events: {
        Row: {
          active: boolean | null
          created_at: string
          current_registrations: number | null
          date: string
          doors_open_time: string | null
          ghl_dropdown_value: string | null
          id: string
          location_address: string
          location_name: string
          max_capacity: number | null
          presentation_end_time: string | null
          presentation_start_time: string | null
          time: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          current_registrations?: number | null
          date: string
          doors_open_time?: string | null
          ghl_dropdown_value?: string | null
          id?: string
          location_address: string
          location_name: string
          max_capacity?: number | null
          presentation_end_time?: string | null
          presentation_start_time?: string | null
          time: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          current_registrations?: number | null
          date?: string
          doors_open_time?: string | null
          ghl_dropdown_value?: string | null
          id?: string
          location_address?: string
          location_name?: string
          max_capacity?: number | null
          presentation_end_time?: string | null
          presentation_start_time?: string | null
          time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      info_evening_registrations: {
        Row: {
          confirmed: boolean | null
          created_at: string
          crm_lead_id: string | null
          email: string
          event_id: string
          first_name: string
          ghl_contact_id: string | null
          ghl_synced_at: string | null
          id: string
          last_name: string
          number_of_persons: number | null
          phone: string | null
          registration_source: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string
          crm_lead_id?: string | null
          email: string
          event_id: string
          first_name: string
          ghl_contact_id?: string | null
          ghl_synced_at?: string | null
          id?: string
          last_name: string
          number_of_persons?: number | null
          phone?: string | null
          registration_source?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string
          crm_lead_id?: string | null
          email?: string
          event_id?: string
          first_name?: string
          ghl_contact_id?: string | null
          ghl_synced_at?: string | null
          id?: string
          last_name?: string
          number_of_persons?: number | null
          phone?: string | null
          registration_source?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "info_evening_registrations_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_evening_registrations_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_evening_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "info_evening_events"
            referencedColumns: ["id"]
          },
        ]
      }
      info_evening_waitlist: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          notified: boolean
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          notified?: boolean
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          notified?: boolean
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      insights: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          created_at: string | null
          extraction_confidence: number | null
          frequency: number | null
          icp_persona_match: string[] | null
          icp_score: number | null
          icp_validated: boolean | null
          icp_validation_notes: string | null
          id: string
          impact_score: string | null
          label: string
          normalized_insight: string
          raw_quote: string
          refined_insight: string | null
          structured_questions: Json | null
          subtheme: string | null
          suggested_archetype: string | null
          theme: string | null
          type: string
          underlying_questions: string[] | null
          updated_at: string | null
          validated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          extraction_confidence?: number | null
          frequency?: number | null
          icp_persona_match?: string[] | null
          icp_score?: number | null
          icp_validated?: boolean | null
          icp_validation_notes?: string | null
          id?: string
          impact_score?: string | null
          label: string
          normalized_insight: string
          raw_quote: string
          refined_insight?: string | null
          structured_questions?: Json | null
          subtheme?: string | null
          suggested_archetype?: string | null
          theme?: string | null
          type: string
          underlying_questions?: string[] | null
          updated_at?: string | null
          validated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          extraction_confidence?: number | null
          frequency?: number | null
          icp_persona_match?: string[] | null
          icp_score?: number | null
          icp_validated?: boolean | null
          icp_validation_notes?: string | null
          id?: string
          impact_score?: string | null
          label?: string
          normalized_insight?: string
          raw_quote?: string
          refined_insight?: string | null
          structured_questions?: Json | null
          subtheme?: string | null
          suggested_archetype?: string | null
          theme?: string | null
          type?: string
          underlying_questions?: string[] | null
          updated_at?: string | null
          validated_at?: string | null
        }
        Relationships: []
      }
      journey_milestones: {
        Row: {
          admin_only: boolean | null
          completed_at: string | null
          created_at: string | null
          crm_lead_id: string
          customer_visible: boolean | null
          description: string | null
          id: string
          metadata: Json | null
          order_index: number
          phase: string
          priority: string | null
          target_date: string | null
          template_key: string
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_only?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          crm_lead_id: string
          customer_visible?: boolean | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_index?: number
          phase: string
          priority?: string | null
          target_date?: string | null
          template_key: string
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_only?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          crm_lead_id?: string
          customer_visible?: boolean | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_index?: number
          phase?: string
          priority?: string | null
          target_date?: string | null
          template_key?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_milestones_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_milestones_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_nurture_actions: {
        Row: {
          action_result: string | null
          action_result_note: string | null
          action_type: string
          completed_at: string | null
          completed_by: string | null
          context_summary: string | null
          created_at: string
          crm_lead_id: string
          due_date: string | null
          feedback_due_at: string | null
          generated_message: string | null
          generated_message_subject: string | null
          id: string
          resource_type: string | null
          resource_url: string | null
          source_appointment_id: string | null
          suggested_action: string
          updated_at: string
        }
        Insert: {
          action_result?: string | null
          action_result_note?: string | null
          action_type?: string
          completed_at?: string | null
          completed_by?: string | null
          context_summary?: string | null
          created_at?: string
          crm_lead_id: string
          due_date?: string | null
          feedback_due_at?: string | null
          generated_message?: string | null
          generated_message_subject?: string | null
          id?: string
          resource_type?: string | null
          resource_url?: string | null
          source_appointment_id?: string | null
          suggested_action: string
          updated_at?: string
        }
        Update: {
          action_result?: string | null
          action_result_note?: string | null
          action_type?: string
          completed_at?: string | null
          completed_by?: string | null
          context_summary?: string | null
          created_at?: string
          crm_lead_id?: string
          due_date?: string | null
          feedback_due_at?: string | null
          generated_message?: string | null
          generated_message_subject?: string | null
          id?: string
          resource_type?: string | null
          resource_url?: string | null
          source_appointment_id?: string | null
          suggested_action?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_nurture_actions_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_nurture_actions_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          crm_lead_id: string
          description: string | null
          due_date: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          crm_lead_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          crm_lead_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_photo_library: {
        Row: {
          category: Database["public"]["Enums"]["linkedin_photo_category"]
          created_at: string
          id: string
          image_url: string
          is_archived: boolean
          is_favorite: boolean
          last_used_at: string | null
          tags: string[] | null
          times_used: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["linkedin_photo_category"]
          created_at?: string
          id?: string
          image_url: string
          is_archived?: boolean
          is_favorite?: boolean
          last_used_at?: string | null
          tags?: string[] | null
          times_used?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["linkedin_photo_category"]
          created_at?: string
          id?: string
          image_url?: string
          is_archived?: boolean
          is_favorite?: boolean
          last_used_at?: string | null
          tags?: string[] | null
          times_used?: number
        }
        Relationships: []
      }
      location_category_settings: {
        Row: {
          created_at: string | null
          google_type: string
          icon: string | null
          id: string
          is_active: boolean
          label: string
          label_singular: string
          max_results: number
          radius_meters: number
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          google_type: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          label_singular: string
          max_results?: number
          radius_meters?: number
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          google_type?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          label_singular?: string
          max_results?: number
          radius_meters?: number
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      manual_events: {
        Row: {
          client_pseudonym: string | null
          created_at: string
          created_by: string | null
          crm_lead_id: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          is_summary_published: boolean | null
          key_topics: string[] | null
          notes: string | null
          summary_category: string | null
          summary_full: string | null
          summary_headline: string | null
          summary_short: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_pseudonym?: string | null
          created_at?: string
          created_by?: string | null
          crm_lead_id: string
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_summary_published?: boolean | null
          key_topics?: string[] | null
          notes?: string | null
          summary_category?: string | null
          summary_full?: string | null
          summary_headline?: string | null
          summary_short?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_pseudonym?: string | null
          created_at?: string
          created_by?: string | null
          crm_lead_id?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_summary_published?: boolean | null
          key_topics?: string[] | null
          notes?: string | null
          summary_category?: string | null
          summary_full?: string | null
          summary_headline?: string | null
          summary_short?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_events_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_events_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      material_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          order_index: number | null
          project_id: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          order_index?: number | null
          project_id?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          order_index?: number | null
          project_id?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_option_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          option_id: string
          order_index: number
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          option_id: string
          order_index?: number
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          option_id?: string
          order_index?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_option_images_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "material_options"
            referencedColumns: ["id"]
          },
        ]
      }
      material_options: {
        Row: {
          brand: string | null
          color_code: string | null
          created_at: string
          description: string | null
          id: string
          is_chosen: boolean
          is_default: boolean
          name: string
          order_index: number
          price: number | null
          product_code: string | null
          selection_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_chosen?: boolean
          is_default?: boolean
          name: string
          order_index?: number
          price?: number | null
          product_code?: string | null
          selection_id: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_chosen?: boolean
          is_default?: boolean
          name?: string
          order_index?: number
          price?: number | null
          product_code?: string | null
          selection_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_options_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: false
            referencedRelation: "material_selections"
            referencedColumns: ["id"]
          },
        ]
      }
      material_rooms: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          order_index: number | null
          project_id: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          order_index?: number | null
          project_id?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          order_index?: number | null
          project_id?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_rooms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_rooms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_selections: {
        Row: {
          category: string
          chosen_option_id: string | null
          created_at: string
          customer_visible: boolean
          decided_at: string | null
          decided_by_name: string | null
          description: string | null
          id: string
          notes: string | null
          order_index: number
          room: string | null
          sale_id: string
          source_template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          chosen_option_id?: string | null
          created_at?: string
          customer_visible?: boolean
          decided_at?: string | null
          decided_by_name?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          room?: string | null
          sale_id: string
          source_template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          chosen_option_id?: string | null
          created_at?: string
          customer_visible?: boolean
          decided_at?: string | null
          decided_by_name?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          room?: string | null
          sale_id?: string
          source_template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_selections_chosen_option_id_fkey"
            columns: ["chosen_option_id"]
            isOneToOne: false
            referencedRelation: "material_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_selections_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "material_selections_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_selections_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "material_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      material_templates: {
        Row: {
          category: string
          created_at: string
          default_options: Json | null
          description: string | null
          id: string
          is_active: boolean
          order_index: number
          project_id: string | null
          room: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          default_options?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          project_id?: string | null
          room?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_options?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          project_id?: string | null
          room?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_knocks: {
        Row: {
          admitted_at: string | null
          admitted_by: string | null
          created_at: string
          guest_email: string | null
          guest_name: string
          id: string
          knocked_at: string
          session_id: string
          status: string
        }
        Insert: {
          admitted_at?: string | null
          admitted_by?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name: string
          id?: string
          knocked_at?: string
          session_id: string
          status?: string
        }
        Update: {
          admitted_at?: string | null
          admitted_by?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          id?: string
          knocked_at?: string
          session_id?: string
          status?: string
        }
        Relationships: []
      }
      orientation_guide_items: {
        Row: {
          active: boolean
          blog_post_id: string | null
          created_at: string
          custom_description: string | null
          custom_read_time_minutes: number | null
          custom_title: string | null
          id: string
          is_required: boolean
          order_index: number
          pillar: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          blog_post_id?: string | null
          created_at?: string
          custom_description?: string | null
          custom_read_time_minutes?: number | null
          custom_title?: string | null
          id?: string
          is_required?: boolean
          order_index?: number
          pillar: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          blog_post_id?: string | null
          created_at?: string
          custom_description?: string | null
          custom_read_time_minutes?: number | null
          custom_title?: string | null
          id?: string
          is_required?: boolean
          order_index?: number
          pillar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orientation_guide_items_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          active: boolean
          content: string
          created_at: string
          id: string
          order_index: number
          page_slug: string
          section_key: string
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          id?: string
          order_index?: number
          page_slug: string
          section_key: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          order_index?: number
          page_slug?: string
          section_key?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          order_index: number
          page_slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          order_index?: number
          page_slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          order_index?: number
          page_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_categories: {
        Row: {
          active: boolean
          category_key: string
          created_at: string
          display_name: string
          icon_name: string
          id: string
          intro_text: string
          order_index: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_key: string
          created_at?: string
          display_name: string
          icon_name: string
          id?: string
          intro_text: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_key?: string
          created_at?: string
          display_name?: string
          icon_name?: string
          id?: string
          intro_text?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_content_shares: {
        Row: {
          blog_post_id: string
          created_at: string | null
          id: string
          partner_id: string
          share_type: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string | null
          id?: string
          partner_id: string
          share_type: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string | null
          id?: string
          partner_id?: string
          share_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_content_shares_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_content_shares_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_content_shares_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_content_status: {
        Row: {
          blog_post_id: string
          created_at: string | null
          id: string
          partner_id: string
          status: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string | null
          id?: string
          partner_id: string
          status?: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string | null
          id?: string
          partner_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_content_status_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_content_status_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_content_status_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_lead_notes: {
        Row: {
          created_at: string
          crm_lead_id: string
          id: string
          note: string
          partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crm_lead_id: string
          id?: string
          note: string
          partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crm_lead_id?: string
          id?: string
          note?: string
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_lead_notes_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_lead_notes_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_lead_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_lead_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referrals: {
        Row: {
          converted_at: string | null
          converted_to_lead: boolean | null
          created_at: string | null
          crm_lead_id: string | null
          first_visit_at: string | null
          id: string
          last_visit_at: string | null
          partner_id: string | null
          total_page_views: number | null
          total_visits: number | null
          updated_at: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          converted_at?: string | null
          converted_to_lead?: boolean | null
          created_at?: string | null
          crm_lead_id?: string | null
          first_visit_at?: string | null
          id?: string
          last_visit_at?: string | null
          partner_id?: string | null
          total_page_views?: number | null
          total_visits?: number | null
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          converted_at?: string | null
          converted_to_lead?: boolean | null
          created_at?: string | null
          crm_lead_id?: string | null
          first_visit_at?: string | null
          id?: string
          last_visit_at?: string | null
          partner_id?: string | null
          total_page_views?: number | null
          total_visits?: number | null
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_scraped_data: {
        Row: {
          created_at: string | null
          extracted_data: Json | null
          id: string
          partner_id: string | null
          scraped_at: string | null
          scraped_content: string
          website_url: string
        }
        Insert: {
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          partner_id?: string | null
          scraped_at?: string | null
          scraped_content: string
          website_url: string
        }
        Update: {
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          partner_id?: string | null
          scraped_at?: string | null
          scraped_content?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_scraped_data_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_scraped_data_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          bio: string
          brand_color: string | null
          category: string
          certifications: Json | null
          company: string
          created_at: string
          description: string
          email: string | null
          ghl_tags: string[] | null
          hero_image_url: string | null
          hero_video_url: string | null
          id: string
          image_url: string | null
          landing_page_intro: string | null
          landing_page_title: string | null
          logo_url: string | null
          media_mentions: Json | null
          name: string
          office_locations: Json | null
          order_index: number
          partner_invite_code: string | null
          phone: string | null
          referral_code: string | null
          role: string
          services: Json | null
          show_on_overview: boolean | null
          slug: string | null
          social_links: Json | null
          specializations: Json | null
          statistics: Json | null
          team_size: number | null
          testimonials: Json | null
          updated_at: string
          user_id: string | null
          video_url: string | null
          website: string | null
          years_experience: number | null
        }
        Insert: {
          active?: boolean
          bio: string
          brand_color?: string | null
          category: string
          certifications?: Json | null
          company: string
          created_at?: string
          description: string
          email?: string | null
          ghl_tags?: string[] | null
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          image_url?: string | null
          landing_page_intro?: string | null
          landing_page_title?: string | null
          logo_url?: string | null
          media_mentions?: Json | null
          name: string
          office_locations?: Json | null
          order_index?: number
          partner_invite_code?: string | null
          phone?: string | null
          referral_code?: string | null
          role: string
          services?: Json | null
          show_on_overview?: boolean | null
          slug?: string | null
          social_links?: Json | null
          specializations?: Json | null
          statistics?: Json | null
          team_size?: number | null
          testimonials?: Json | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          active?: boolean
          bio?: string
          brand_color?: string | null
          category?: string
          certifications?: Json | null
          company?: string
          created_at?: string
          description?: string
          email?: string | null
          ghl_tags?: string[] | null
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          image_url?: string | null
          landing_page_intro?: string | null
          landing_page_title?: string | null
          logo_url?: string | null
          media_mentions?: Json | null
          name?: string
          office_locations?: Json | null
          order_index?: number
          partner_invite_code?: string | null
          phone?: string | null
          referral_code?: string | null
          role?: string
          services?: Json | null
          show_on_overview?: boolean | null
          slug?: string | null
          social_links?: Json | null
          specializations?: Json | null
          statistics?: Json | null
          team_size?: number | null
          testimonials?: Json | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      pending_ghl_syncs: {
        Row: {
          attempts: number
          created_at: string
          crm_lead_id: string | null
          email: string
          first_name: string | null
          ghl_contact_id: string | null
          id: string
          last_error: string | null
          last_name: string | null
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          crm_lead_id?: string | null
          email: string
          first_name?: string | null
          ghl_contact_id?: string | null
          id?: string
          last_error?: string | null
          last_name?: string | null
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          crm_lead_id?: string | null
          email?: string
          first_name?: string | null
          ghl_contact_id?: string | null
          id?: string
          last_error?: string | null
          last_name?: string | null
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_ghl_syncs_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_ghl_syncs_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_briefing_analyses: {
        Row: {
          brainstorm_approved_at: string | null
          brainstorm_edited: string | null
          brainstorm_insights: string | null
          created_at: string | null
          created_by: string | null
          formalized_result: Json | null
          id: string
          project_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          brainstorm_approved_at?: string | null
          brainstorm_edited?: string | null
          brainstorm_insights?: string | null
          created_at?: string | null
          created_by?: string | null
          formalized_result?: Json | null
          id?: string
          project_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          brainstorm_approved_at?: string | null
          brainstorm_edited?: string | null
          brainstorm_insights?: string | null
          created_at?: string | null
          created_by?: string | null
          formalized_result?: Json | null
          id?: string
          project_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_briefing_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefing_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contacts: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          phone: string | null
          project_id: string
          role: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          project_id: string
          role?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          project_id?: string
          role?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string | null
          description: string | null
          document_date: string | null
          document_type: string
          dropbox_modified: string | null
          dropbox_url: string | null
          file_name: string
          file_size: number | null
          file_url: string
          folder_path: string | null
          id: string
          is_pricelist: boolean
          order_index: number | null
          project_id: string
          sharepoint_url: string | null
          sync_source: string
          title: string
          updated_at: string | null
          visibility_phase: string | null
          visible_portal: boolean | null
          visible_public: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_date?: string | null
          document_type?: string
          dropbox_modified?: string | null
          dropbox_url?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          folder_path?: string | null
          id?: string
          is_pricelist?: boolean
          order_index?: number | null
          project_id: string
          sharepoint_url?: string | null
          sync_source?: string
          title: string
          updated_at?: string | null
          visibility_phase?: string | null
          visible_portal?: boolean | null
          visible_public?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_date?: string | null
          document_type?: string
          dropbox_modified?: string | null
          dropbox_url?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          folder_path?: string | null
          id?: string
          is_pricelist?: boolean
          order_index?: number | null
          project_id?: string
          sharepoint_url?: string | null
          sync_source?: string
          title?: string
          updated_at?: string | null
          visibility_phase?: string | null
          visible_portal?: boolean | null
          visible_public?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_dropbox_folders: {
        Row: {
          auto_check: boolean
          created_at: string
          dropbox_source_id: string
          file_count: number | null
          folder_name: string
          folder_path: string
          folder_type: string
          folder_url: string
          id: string
          last_checked_at: string | null
          skipped: boolean
        }
        Insert: {
          auto_check?: boolean
          created_at?: string
          dropbox_source_id: string
          file_count?: number | null
          folder_name: string
          folder_path: string
          folder_type?: string
          folder_url: string
          id?: string
          last_checked_at?: string | null
          skipped?: boolean
        }
        Update: {
          auto_check?: boolean
          created_at?: string
          dropbox_source_id?: string
          file_count?: number | null
          folder_name?: string
          folder_path?: string
          folder_type?: string
          folder_url?: string
          id?: string
          last_checked_at?: string | null
          skipped?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "project_dropbox_folders_dropbox_source_id_fkey"
            columns: ["dropbox_source_id"]
            isOneToOne: false
            referencedRelation: "project_dropbox_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      project_dropbox_sources: {
        Row: {
          created_at: string
          dropbox_root_url: string
          id: string
          last_full_sync_at: string | null
          project_id: string
          source_type: string | null
          sync_log: Json | null
          sync_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dropbox_root_url: string
          id?: string
          last_full_sync_at?: string | null
          project_id: string
          source_type?: string | null
          sync_log?: Json | null
          sync_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dropbox_root_url?: string
          id?: string
          last_full_sync_at?: string | null
          project_id?: string
          source_type?: string | null
          sync_log?: Json | null
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_dropbox_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_dropbox_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_feedback: {
        Row: {
          additional_comment: string | null
          created_at: string | null
          crm_user_id: string | null
          id: string
          missing_info: string[] | null
          project_id: string
          rating: boolean
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          additional_comment?: string | null
          created_at?: string | null
          crm_user_id?: string | null
          id?: string
          missing_info?: string[] | null
          project_id: string
          rating: boolean
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          additional_comment?: string | null
          created_at?: string | null
          crm_user_id?: string | null
          id?: string
          missing_info?: string[] | null
          project_id?: string
          rating?: boolean
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      project_sync_history: {
        Row: {
          completed_at: string | null
          created_at: string
          details: Json | null
          error_summary: string | null
          files_failed: number
          files_found: number
          files_imported: number
          id: string
          project_id: string
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          error_summary?: string | null
          files_failed?: number
          files_found?: number
          files_imported?: number
          id?: string
          project_id: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          error_summary?: string | null
          files_failed?: number
          files_found?: number
          files_imported?: number
          id?: string
          project_id?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sync_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sync_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_video_links: {
        Row: {
          created_at: string
          id: string
          is_featured: boolean | null
          order_index: number | null
          project_id: string
          video_id: string
          visible_portal: boolean | null
          visible_public: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_featured?: boolean | null
          order_index?: number | null
          project_id: string
          video_id: string
          visible_portal?: boolean | null
          visible_public?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          is_featured?: boolean | null
          order_index?: number | null
          project_id?: string
          video_id?: string
          visible_portal?: boolean | null
          visible_public?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project_video_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_video_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_video_links_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "project_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      project_videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_urls: Json | null
          media_type: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_date: string
          video_type: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: Json | null
          media_type?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_date: string
          video_type?: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: Json | null
          media_type?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_date?: string
          video_type?: string
          video_url?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          active: boolean | null
          ai_rewritten_at: string | null
          ai_rewritten_description: Json | null
          ai_unit_descriptions: Json | null
          city: string | null
          community_fees_monthly: number | null
          completion_date: string | null
          costa: string | null
          country: string | null
          created_at: string
          deep_analysis_brainstorm: string | null
          deep_analysis_structured: Json | null
          deep_analysis_updated_at: string | null
          default_commission_fixed: number | null
          default_commission_percentage: number | null
          default_commission_type: string | null
          description: string | null
          development_ref: string | null
          display_title: string | null
          distance_to_airport_km: number | null
          distance_to_beach_m: number | null
          distance_to_golf_m: number | null
          distance_to_shops_m: number | null
          energy_rating: string | null
          enrichment_status: string
          environment_video_url: string | null
          featured_image: string | null
          floor: number | null
          garbage_tax_yearly: number | null
          has_airconditioning: boolean | null
          has_alarm: boolean | null
          has_basement: boolean | null
          has_communal_pool: boolean | null
          has_elevator: boolean | null
          has_fireplace: boolean | null
          has_garage: boolean | null
          has_garden: boolean | null
          has_garden_views: boolean | null
          has_heating: boolean | null
          has_mountain_views: boolean | null
          has_open_views: boolean | null
          has_pool: boolean | null
          has_pool_views: boolean | null
          has_private_pool: boolean | null
          has_sea_views: boolean | null
          has_solarium: boolean | null
          has_storage_room: boolean | null
          highlights: Json | null
          ibi_tax_yearly: number | null
          id: string
          images: Json | null
          is_furnished: boolean | null
          is_key_ready: boolean | null
          is_resale: boolean | null
          latitude: number | null
          location: string | null
          location_intelligence: Json | null
          location_intelligence_updated_at: string | null
          longitude: number | null
          max_area: number | null
          max_bathrooms: number | null
          max_bedrooms: number | null
          min_area: number | null
          min_bathrooms: number | null
          min_bedrooms: number | null
          name: string
          orientation: string | null
          parking: number | null
          plot_size_sqm: number | null
          price_from: number | null
          price_to: number | null
          priority: number
          project_key: string | null
          property_count: number | null
          property_types: string[] | null
          publish_to_rentals: boolean
          region: string | null
          rewrite_status: string
          seo_data: Json | null
          showhouse_address: string | null
          showhouse_latitude: number | null
          showhouse_longitude: number | null
          showhouse_maps_url: string | null
          showhouse_notes: string | null
          showhouse_video_url: string | null
          slug: string | null
          source: string | null
          status: string | null
          terrace_area_sqm: number | null
          total_floors: number | null
          updated_at: string
          year_built: number | null
        }
        Insert: {
          active?: boolean | null
          ai_rewritten_at?: string | null
          ai_rewritten_description?: Json | null
          ai_unit_descriptions?: Json | null
          city?: string | null
          community_fees_monthly?: number | null
          completion_date?: string | null
          costa?: string | null
          country?: string | null
          created_at?: string
          deep_analysis_brainstorm?: string | null
          deep_analysis_structured?: Json | null
          deep_analysis_updated_at?: string | null
          default_commission_fixed?: number | null
          default_commission_percentage?: number | null
          default_commission_type?: string | null
          description?: string | null
          development_ref?: string | null
          display_title?: string | null
          distance_to_airport_km?: number | null
          distance_to_beach_m?: number | null
          distance_to_golf_m?: number | null
          distance_to_shops_m?: number | null
          energy_rating?: string | null
          enrichment_status?: string
          environment_video_url?: string | null
          featured_image?: string | null
          floor?: number | null
          garbage_tax_yearly?: number | null
          has_airconditioning?: boolean | null
          has_alarm?: boolean | null
          has_basement?: boolean | null
          has_communal_pool?: boolean | null
          has_elevator?: boolean | null
          has_fireplace?: boolean | null
          has_garage?: boolean | null
          has_garden?: boolean | null
          has_garden_views?: boolean | null
          has_heating?: boolean | null
          has_mountain_views?: boolean | null
          has_open_views?: boolean | null
          has_pool?: boolean | null
          has_pool_views?: boolean | null
          has_private_pool?: boolean | null
          has_sea_views?: boolean | null
          has_solarium?: boolean | null
          has_storage_room?: boolean | null
          highlights?: Json | null
          ibi_tax_yearly?: number | null
          id?: string
          images?: Json | null
          is_furnished?: boolean | null
          is_key_ready?: boolean | null
          is_resale?: boolean | null
          latitude?: number | null
          location?: string | null
          location_intelligence?: Json | null
          location_intelligence_updated_at?: string | null
          longitude?: number | null
          max_area?: number | null
          max_bathrooms?: number | null
          max_bedrooms?: number | null
          min_area?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          name: string
          orientation?: string | null
          parking?: number | null
          plot_size_sqm?: number | null
          price_from?: number | null
          price_to?: number | null
          priority?: number
          project_key?: string | null
          property_count?: number | null
          property_types?: string[] | null
          publish_to_rentals?: boolean
          region?: string | null
          rewrite_status?: string
          seo_data?: Json | null
          showhouse_address?: string | null
          showhouse_latitude?: number | null
          showhouse_longitude?: number | null
          showhouse_maps_url?: string | null
          showhouse_notes?: string | null
          showhouse_video_url?: string | null
          slug?: string | null
          source?: string | null
          status?: string | null
          terrace_area_sqm?: number | null
          total_floors?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          active?: boolean | null
          ai_rewritten_at?: string | null
          ai_rewritten_description?: Json | null
          ai_unit_descriptions?: Json | null
          city?: string | null
          community_fees_monthly?: number | null
          completion_date?: string | null
          costa?: string | null
          country?: string | null
          created_at?: string
          deep_analysis_brainstorm?: string | null
          deep_analysis_structured?: Json | null
          deep_analysis_updated_at?: string | null
          default_commission_fixed?: number | null
          default_commission_percentage?: number | null
          default_commission_type?: string | null
          description?: string | null
          development_ref?: string | null
          display_title?: string | null
          distance_to_airport_km?: number | null
          distance_to_beach_m?: number | null
          distance_to_golf_m?: number | null
          distance_to_shops_m?: number | null
          energy_rating?: string | null
          enrichment_status?: string
          environment_video_url?: string | null
          featured_image?: string | null
          floor?: number | null
          garbage_tax_yearly?: number | null
          has_airconditioning?: boolean | null
          has_alarm?: boolean | null
          has_basement?: boolean | null
          has_communal_pool?: boolean | null
          has_elevator?: boolean | null
          has_fireplace?: boolean | null
          has_garage?: boolean | null
          has_garden?: boolean | null
          has_garden_views?: boolean | null
          has_heating?: boolean | null
          has_mountain_views?: boolean | null
          has_open_views?: boolean | null
          has_pool?: boolean | null
          has_pool_views?: boolean | null
          has_private_pool?: boolean | null
          has_sea_views?: boolean | null
          has_solarium?: boolean | null
          has_storage_room?: boolean | null
          highlights?: Json | null
          ibi_tax_yearly?: number | null
          id?: string
          images?: Json | null
          is_furnished?: boolean | null
          is_key_ready?: boolean | null
          is_resale?: boolean | null
          latitude?: number | null
          location?: string | null
          location_intelligence?: Json | null
          location_intelligence_updated_at?: string | null
          longitude?: number | null
          max_area?: number | null
          max_bathrooms?: number | null
          max_bedrooms?: number | null
          min_area?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          name?: string
          orientation?: string | null
          parking?: number | null
          plot_size_sqm?: number | null
          price_from?: number | null
          price_to?: number | null
          priority?: number
          project_key?: string | null
          property_count?: number | null
          property_types?: string[] | null
          publish_to_rentals?: boolean
          region?: string | null
          rewrite_status?: string
          seo_data?: Json | null
          showhouse_address?: string | null
          showhouse_latitude?: number | null
          showhouse_longitude?: number | null
          showhouse_maps_url?: string | null
          showhouse_notes?: string | null
          showhouse_video_url?: string | null
          slug?: string | null
          source?: string | null
          status?: string | null
          terrace_area_sqm?: number | null
          total_floors?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          airconditioning: boolean | null
          alarm: boolean | null
          api_id: string | null
          api_source: string | null
          area_sqm: number | null
          availability_date: string | null
          basement: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          beds_double: number | null
          beds_single: number | null
          category_beach: boolean | null
          category_countryside: boolean | null
          category_first_line: boolean | null
          category_golf: boolean | null
          category_tourist: boolean | null
          category_urban: boolean | null
          city: string | null
          communal_pool: boolean | null
          community_fees_monthly: number | null
          costa: string | null
          country: string | null
          created_at: string
          delivery_date: string | null
          description: string | null
          description_en: string | null
          description_es: string | null
          development_id: string | null
          distance_to_airport_km: number | null
          distance_to_beach_m: number | null
          distance_to_golf_m: number | null
          distance_to_shops_m: number | null
          elevator: boolean | null
          energy_rating: string | null
          featured: boolean | null
          features: Json | null
          fireplace: boolean | null
          floor: string | null
          furnished: boolean | null
          garage: boolean | null
          garbage_tax_yearly: number | null
          garden: boolean | null
          garden_views: boolean | null
          heating: boolean | null
          ibi_tax_yearly: number | null
          id: string
          image_url: string | null
          images: Json | null
          key_ready: boolean | null
          latitude: number | null
          longitude: number | null
          mountain_views: boolean | null
          new_build: boolean | null
          off_plan: boolean | null
          open_views: boolean | null
          orientation: string | null
          parking: number | null
          pending_sold_at: string | null
          plot_size_sqm: number | null
          pool: boolean | null
          pool_views: boolean | null
          postal_code: string | null
          previous_price: number | null
          price: number | null
          price_changed_at: string | null
          price_reduced: boolean | null
          private_pool: boolean | null
          project_id: string | null
          property_type: string | null
          region: string | null
          sea_views: boolean | null
          show_house: boolean | null
          solarium: boolean | null
          status: string | null
          storage_room: boolean | null
          terrace_area_sqm: number | null
          title: string
          toilets: number | null
          total_floors: number | null
          updated_at: string
          usable_area_sqm: number | null
          video_url: string | null
          viewing_url: string | null
          village_views: boolean | null
          virtual_tour_url: string | null
          year_built: number | null
        }
        Insert: {
          address?: string | null
          airconditioning?: boolean | null
          alarm?: boolean | null
          api_id?: string | null
          api_source?: string | null
          area_sqm?: number | null
          availability_date?: string | null
          basement?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds_double?: number | null
          beds_single?: number | null
          category_beach?: boolean | null
          category_countryside?: boolean | null
          category_first_line?: boolean | null
          category_golf?: boolean | null
          category_tourist?: boolean | null
          category_urban?: boolean | null
          city?: string | null
          communal_pool?: boolean | null
          community_fees_monthly?: number | null
          costa?: string | null
          country?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          development_id?: string | null
          distance_to_airport_km?: number | null
          distance_to_beach_m?: number | null
          distance_to_golf_m?: number | null
          distance_to_shops_m?: number | null
          elevator?: boolean | null
          energy_rating?: string | null
          featured?: boolean | null
          features?: Json | null
          fireplace?: boolean | null
          floor?: string | null
          furnished?: boolean | null
          garage?: boolean | null
          garbage_tax_yearly?: number | null
          garden?: boolean | null
          garden_views?: boolean | null
          heating?: boolean | null
          ibi_tax_yearly?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          key_ready?: boolean | null
          latitude?: number | null
          longitude?: number | null
          mountain_views?: boolean | null
          new_build?: boolean | null
          off_plan?: boolean | null
          open_views?: boolean | null
          orientation?: string | null
          parking?: number | null
          pending_sold_at?: string | null
          plot_size_sqm?: number | null
          pool?: boolean | null
          pool_views?: boolean | null
          postal_code?: string | null
          previous_price?: number | null
          price?: number | null
          price_changed_at?: string | null
          price_reduced?: boolean | null
          private_pool?: boolean | null
          project_id?: string | null
          property_type?: string | null
          region?: string | null
          sea_views?: boolean | null
          show_house?: boolean | null
          solarium?: boolean | null
          status?: string | null
          storage_room?: boolean | null
          terrace_area_sqm?: number | null
          title: string
          toilets?: number | null
          total_floors?: number | null
          updated_at?: string
          usable_area_sqm?: number | null
          video_url?: string | null
          viewing_url?: string | null
          village_views?: boolean | null
          virtual_tour_url?: string | null
          year_built?: number | null
        }
        Update: {
          address?: string | null
          airconditioning?: boolean | null
          alarm?: boolean | null
          api_id?: string | null
          api_source?: string | null
          area_sqm?: number | null
          availability_date?: string | null
          basement?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds_double?: number | null
          beds_single?: number | null
          category_beach?: boolean | null
          category_countryside?: boolean | null
          category_first_line?: boolean | null
          category_golf?: boolean | null
          category_tourist?: boolean | null
          category_urban?: boolean | null
          city?: string | null
          communal_pool?: boolean | null
          community_fees_monthly?: number | null
          costa?: string | null
          country?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          development_id?: string | null
          distance_to_airport_km?: number | null
          distance_to_beach_m?: number | null
          distance_to_golf_m?: number | null
          distance_to_shops_m?: number | null
          elevator?: boolean | null
          energy_rating?: string | null
          featured?: boolean | null
          features?: Json | null
          fireplace?: boolean | null
          floor?: string | null
          furnished?: boolean | null
          garage?: boolean | null
          garbage_tax_yearly?: number | null
          garden?: boolean | null
          garden_views?: boolean | null
          heating?: boolean | null
          ibi_tax_yearly?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          key_ready?: boolean | null
          latitude?: number | null
          longitude?: number | null
          mountain_views?: boolean | null
          new_build?: boolean | null
          off_plan?: boolean | null
          open_views?: boolean | null
          orientation?: string | null
          parking?: number | null
          pending_sold_at?: string | null
          plot_size_sqm?: number | null
          pool?: boolean | null
          pool_views?: boolean | null
          postal_code?: string | null
          previous_price?: number | null
          price?: number | null
          price_changed_at?: string | null
          price_reduced?: boolean | null
          private_pool?: boolean | null
          project_id?: string | null
          property_type?: string | null
          region?: string | null
          sea_views?: boolean | null
          show_house?: boolean | null
          solarium?: boolean | null
          status?: string | null
          storage_room?: boolean | null
          terrace_area_sqm?: number | null
          title?: string
          toilets?: number | null
          total_floors?: number | null
          updated_at?: string
          usable_area_sqm?: number | null
          video_url?: string | null
          viewing_url?: string | null
          village_views?: boolean | null
          virtual_tour_url?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      property_price_history: {
        Row: {
          change_type: string
          changed_at: string
          created_at: string
          id: string
          new_price: number
          old_price: number | null
          price_difference: number | null
          property_id: string
          sync_source: string | null
        }
        Insert: {
          change_type?: string
          changed_at?: string
          created_at?: string
          id?: string
          new_price: number
          old_price?: number | null
          price_difference?: number | null
          property_id: string
          sync_source?: string | null
        }
        Update: {
          change_type?: string
          changed_at?: string
          created_at?: string
          id?: string
          new_price?: number
          old_price?: number | null
          price_difference?: number | null
          property_id?: string
          sync_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_price_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      question_answers: {
        Row: {
          answer_fragment: string
          confidence: number
          content_question_id: string
          conversation_id: string
          created_at: string
          id: string
        }
        Insert: {
          answer_fragment: string
          confidence?: number
          content_question_id: string
          conversation_id: string
          created_at?: string
          id?: string
        }
        Update: {
          answer_fragment?: string
          confidence?: number
          content_question_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_content_question_id_fkey"
            columns: ["content_question_id"]
            isOneToOne: false
            referencedRelation: "content_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      rental_comparables_cache: {
        Row: {
          bathrooms: number
          bedrooms: number
          comparables: Json | null
          created_at: string | null
          data: Json
          expires_at: string
          guests: number
          id: string
          latitude: number
          longitude: number
          project_id: string
        }
        Insert: {
          bathrooms: number
          bedrooms: number
          comparables?: Json | null
          created_at?: string | null
          data: Json
          expires_at: string
          guests: number
          id?: string
          latitude: number
          longitude: number
          project_id: string
        }
        Update: {
          bathrooms?: number
          bedrooms?: number
          comparables?: Json | null
          created_at?: string | null
          data?: Json
          expires_at?: string
          guests?: number
          id?: string
          latitude?: number
          longitude?: number
          project_id?: string
        }
        Relationships: []
      }
      reservation_details: {
        Row: {
          city: string | null
          completed_at: string | null
          country: string | null
          created_at: string
          data_complete: boolean
          date_of_birth: string | null
          id: string
          nationality: string | null
          postal_code: string | null
          sale_customer_id: string
          street_address: string | null
          tax_id_bsn: string | null
          tax_id_nie: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          completed_at?: string | null
          country?: string | null
          created_at?: string
          data_complete?: boolean
          date_of_birth?: string | null
          id?: string
          nationality?: string | null
          postal_code?: string | null
          sale_customer_id: string
          street_address?: string | null
          tax_id_bsn?: string | null
          tax_id_nie?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          completed_at?: string | null
          country?: string | null
          created_at?: string
          data_complete?: boolean
          date_of_birth?: string | null
          id?: string
          nationality?: string | null
          postal_code?: string | null
          sale_customer_id?: string
          street_address?: string | null
          tax_id_bsn?: string | null
          tax_id_nie?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_details_sale_customer_id_fkey"
            columns: ["sale_customer_id"]
            isOneToOne: true
            referencedRelation: "sale_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          reservation_detail_id: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          reservation_detail_id: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          reservation_detail_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_documents_reservation_detail_id_fkey"
            columns: ["reservation_detail_id"]
            isOneToOne: false
            referencedRelation: "reservation_details"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          active: boolean
          brainstorm_insights: string | null
          card_subtitle: string | null
          content: string | null
          context_tags: string[] | null
          created_at: string
          crm_lead_id: string | null
          customer_name: string
          customer_type: string | null
          featured: boolean
          full_story: string | null
          google_author_name: string | null
          google_author_photo_url: string | null
          google_profile_url: string | null
          google_review_reply: string | null
          google_review_reply_time: string | null
          google_review_time: string | null
          has_full_story: boolean
          id: string
          image_url: string | null
          import_status: string | null
          imported_at: string | null
          interview_data: Json | null
          investment_type: string | null
          location: string
          photo_urls: string[] | null
          photos_skipped: boolean
          property_type: string | null
          quote: string
          quote_concrete: string | null
          quote_emotional: string | null
          rating: number
          review_status: string | null
          sale_id: string | null
          social_snippet: string | null
          source: string | null
          source_review_id: string | null
          story_content: string | null
          story_content_html: string | null
          story_featured_image: string | null
          story_intro: string | null
          story_phase: string | null
          story_sections: Json | null
          story_slug: string | null
          story_title: string | null
          story_versions: Json | null
          updated_at: string
          video_skipped: boolean
          video_transcript: string | null
          video_url: string | null
          voice_memo_url: string | null
          year: number | null
        }
        Insert: {
          active?: boolean
          brainstorm_insights?: string | null
          card_subtitle?: string | null
          content?: string | null
          context_tags?: string[] | null
          created_at?: string
          crm_lead_id?: string | null
          customer_name: string
          customer_type?: string | null
          featured?: boolean
          full_story?: string | null
          google_author_name?: string | null
          google_author_photo_url?: string | null
          google_profile_url?: string | null
          google_review_reply?: string | null
          google_review_reply_time?: string | null
          google_review_time?: string | null
          has_full_story?: boolean
          id?: string
          image_url?: string | null
          import_status?: string | null
          imported_at?: string | null
          interview_data?: Json | null
          investment_type?: string | null
          location: string
          photo_urls?: string[] | null
          photos_skipped?: boolean
          property_type?: string | null
          quote: string
          quote_concrete?: string | null
          quote_emotional?: string | null
          rating?: number
          review_status?: string | null
          sale_id?: string | null
          social_snippet?: string | null
          source?: string | null
          source_review_id?: string | null
          story_content?: string | null
          story_content_html?: string | null
          story_featured_image?: string | null
          story_intro?: string | null
          story_phase?: string | null
          story_sections?: Json | null
          story_slug?: string | null
          story_title?: string | null
          story_versions?: Json | null
          updated_at?: string
          video_skipped?: boolean
          video_transcript?: string | null
          video_url?: string | null
          voice_memo_url?: string | null
          year?: number | null
        }
        Update: {
          active?: boolean
          brainstorm_insights?: string | null
          card_subtitle?: string | null
          content?: string | null
          context_tags?: string[] | null
          created_at?: string
          crm_lead_id?: string | null
          customer_name?: string
          customer_type?: string | null
          featured?: boolean
          full_story?: string | null
          google_author_name?: string | null
          google_author_photo_url?: string | null
          google_profile_url?: string | null
          google_review_reply?: string | null
          google_review_reply_time?: string | null
          google_review_time?: string | null
          has_full_story?: boolean
          id?: string
          image_url?: string | null
          import_status?: string | null
          imported_at?: string | null
          interview_data?: Json | null
          investment_type?: string | null
          location?: string
          photo_urls?: string[] | null
          photos_skipped?: boolean
          property_type?: string | null
          quote?: string
          quote_concrete?: string | null
          quote_emotional?: string | null
          rating?: number
          review_status?: string | null
          sale_id?: string | null
          social_snippet?: string | null
          source?: string | null
          source_review_id?: string | null
          story_content?: string | null
          story_content_html?: string | null
          story_featured_image?: string | null
          story_intro?: string | null
          story_phase?: string | null
          story_sections?: Json | null
          story_slug?: string | null
          story_title?: string | null
          story_versions?: Json | null
          updated_at?: string
          video_skipped?: boolean
          video_transcript?: string | null
          video_url?: string | null
          voice_memo_url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "reviews_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      roi_scenarios: {
        Row: {
          annual_roe: number | null
          annual_roi: number | null
          appreciation_rate: number | null
          community_fees_monthly: number | null
          created_at: string
          garbage_tax_yearly: number | null
          high_season_rate: number | null
          ibi_yearly: number | null
          id: string
          inflation_rate: number | null
          insurance_yearly: number | null
          investment_years: number | null
          itp_rate: number | null
          low_season_rate: number | null
          maintenance_yearly: number | null
          management_fee_rate: number | null
          mortgage_amount: number | null
          mortgage_rate: number | null
          mortgage_term: number | null
          name: string
          net_rental_yield: number | null
          occupancy_rate: number | null
          owner_use_days: number | null
          property_type: string
          purchase_price: number
          region: string | null
          rental_property_type: string | null
          return_on_equity: number | null
          total_return: number | null
          total_roi: number | null
          updated_at: string
          use_mortgage: boolean | null
          user_id: string
          utilities_monthly: number | null
        }
        Insert: {
          annual_roe?: number | null
          annual_roi?: number | null
          appreciation_rate?: number | null
          community_fees_monthly?: number | null
          created_at?: string
          garbage_tax_yearly?: number | null
          high_season_rate?: number | null
          ibi_yearly?: number | null
          id?: string
          inflation_rate?: number | null
          insurance_yearly?: number | null
          investment_years?: number | null
          itp_rate?: number | null
          low_season_rate?: number | null
          maintenance_yearly?: number | null
          management_fee_rate?: number | null
          mortgage_amount?: number | null
          mortgage_rate?: number | null
          mortgage_term?: number | null
          name: string
          net_rental_yield?: number | null
          occupancy_rate?: number | null
          owner_use_days?: number | null
          property_type: string
          purchase_price: number
          region?: string | null
          rental_property_type?: string | null
          return_on_equity?: number | null
          total_return?: number | null
          total_roi?: number | null
          updated_at?: string
          use_mortgage?: boolean | null
          user_id: string
          utilities_monthly?: number | null
        }
        Update: {
          annual_roe?: number | null
          annual_roi?: number | null
          appreciation_rate?: number | null
          community_fees_monthly?: number | null
          created_at?: string
          garbage_tax_yearly?: number | null
          high_season_rate?: number | null
          ibi_yearly?: number | null
          id?: string
          inflation_rate?: number | null
          insurance_yearly?: number | null
          investment_years?: number | null
          itp_rate?: number | null
          low_season_rate?: number | null
          maintenance_yearly?: number | null
          management_fee_rate?: number | null
          mortgage_amount?: number | null
          mortgage_rate?: number | null
          mortgage_term?: number | null
          name?: string
          net_rental_yield?: number | null
          occupancy_rate?: number | null
          owner_use_days?: number | null
          property_type?: string
          purchase_price?: number
          region?: string | null
          rental_property_type?: string | null
          return_on_equity?: number | null
          total_return?: number | null
          total_roi?: number | null
          updated_at?: string
          use_mortgage?: boolean | null
          user_id?: string
          utilities_monthly?: number | null
        }
        Relationships: []
      }
      sale_advocaten: {
        Row: {
          advocaat_id: string
          created_at: string | null
          id: string
          notes: string | null
          sale_id: string
        }
        Insert: {
          advocaat_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          sale_id: string
        }
        Update: {
          advocaat_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_advocaten_advocaat_id_fkey"
            columns: ["advocaat_id"]
            isOneToOne: false
            referencedRelation: "advocaten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_advocaten_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_advocaten_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_choice_attachments: {
        Row: {
          choice_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_primary: boolean
          option_id: string | null
          order_index: number
          title: string | null
        }
        Insert: {
          choice_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          is_primary?: boolean
          option_id?: string | null
          order_index?: number
          title?: string | null
        }
        Update: {
          choice_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_primary?: boolean
          option_id?: string | null
          order_index?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_choice_attachments_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "sale_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_choice_attachments_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "sale_choice_options"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_choice_options: {
        Row: {
          brand: string | null
          choice_id: string
          color_code: string | null
          created_at: string
          description: string | null
          detailed_specs: string | null
          highlights: Json | null
          id: string
          is_chosen: boolean
          is_default: boolean
          is_recommended: boolean
          name: string
          order_index: number
          price: number | null
          product_code: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          choice_id: string
          color_code?: string | null
          created_at?: string
          description?: string | null
          detailed_specs?: string | null
          highlights?: Json | null
          id?: string
          is_chosen?: boolean
          is_default?: boolean
          is_recommended?: boolean
          name: string
          order_index?: number
          price?: number | null
          product_code?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          choice_id?: string
          color_code?: string | null
          created_at?: string
          description?: string | null
          detailed_specs?: string | null
          highlights?: Json | null
          id?: string
          is_chosen?: boolean
          is_default?: boolean
          is_recommended?: boolean
          name?: string
          order_index?: number
          price?: number | null
          product_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_choice_options_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "sale_choices"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_choices: {
        Row: {
          add_to_costs: boolean
          admin_answer: string | null
          admin_response: string | null
          category: string | null
          chosen_option_id: string | null
          created_at: string
          customer_choice_type: string | null
          customer_decision: string | null
          customer_decision_at: string | null
          customer_decision_reason: string | null
          customer_question: string | null
          customer_visible: boolean
          decided_at: string | null
          decided_by_name: string | null
          description: string | null
          gifted_by_tis: boolean
          id: string
          is_included: boolean
          legacy_source_id: string | null
          legacy_source_type: string | null
          linked_purchase_cost_id: string | null
          notes: string | null
          order_index: number
          payment_due_moment: string | null
          price: number | null
          quote_amount: number | null
          quote_requested_at: string | null
          quote_uploaded_at: string | null
          quote_url: string | null
          room: string | null
          sale_id: string
          status: string
          title: string
          type: string
          updated_at: string
          via_developer: boolean
          waiting_for: string | null
          waiting_since: string | null
        }
        Insert: {
          add_to_costs?: boolean
          admin_answer?: string | null
          admin_response?: string | null
          category?: string | null
          chosen_option_id?: string | null
          created_at?: string
          customer_choice_type?: string | null
          customer_decision?: string | null
          customer_decision_at?: string | null
          customer_decision_reason?: string | null
          customer_question?: string | null
          customer_visible?: boolean
          decided_at?: string | null
          decided_by_name?: string | null
          description?: string | null
          gifted_by_tis?: boolean
          id?: string
          is_included?: boolean
          legacy_source_id?: string | null
          legacy_source_type?: string | null
          linked_purchase_cost_id?: string | null
          notes?: string | null
          order_index?: number
          payment_due_moment?: string | null
          price?: number | null
          quote_amount?: number | null
          quote_requested_at?: string | null
          quote_uploaded_at?: string | null
          quote_url?: string | null
          room?: string | null
          sale_id: string
          status?: string
          title: string
          type: string
          updated_at?: string
          via_developer?: boolean
          waiting_for?: string | null
          waiting_since?: string | null
        }
        Update: {
          add_to_costs?: boolean
          admin_answer?: string | null
          admin_response?: string | null
          category?: string | null
          chosen_option_id?: string | null
          created_at?: string
          customer_choice_type?: string | null
          customer_decision?: string | null
          customer_decision_at?: string | null
          customer_decision_reason?: string | null
          customer_question?: string | null
          customer_visible?: boolean
          decided_at?: string | null
          decided_by_name?: string | null
          description?: string | null
          gifted_by_tis?: boolean
          id?: string
          is_included?: boolean
          legacy_source_id?: string | null
          legacy_source_type?: string | null
          linked_purchase_cost_id?: string | null
          notes?: string | null
          order_index?: number
          payment_due_moment?: string | null
          price?: number | null
          quote_amount?: number | null
          quote_requested_at?: string | null
          quote_uploaded_at?: string | null
          quote_url?: string | null
          room?: string | null
          sale_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          via_developer?: boolean
          waiting_for?: string | null
          waiting_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_choices_chosen_option_id_fkey"
            columns: ["chosen_option_id"]
            isOneToOne: false
            referencedRelation: "sale_choice_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_choices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_choices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_customers: {
        Row: {
          created_at: string
          crm_lead_id: string
          id: string
          role: Database["public"]["Enums"]["sale_customer_role"]
          sale_id: string
        }
        Insert: {
          created_at?: string
          crm_lead_id: string
          id?: string
          role?: Database["public"]["Enums"]["sale_customer_role"]
          sale_id: string
        }
        Update: {
          created_at?: string
          crm_lead_id?: string
          id?: string
          role?: Database["public"]["Enums"]["sale_customer_role"]
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_customers_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_customers_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_customers_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_customers_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_customization_requests: {
        Row: {
          add_to_costs: boolean | null
          additional_cost: number | null
          admin_response: string | null
          attachment_url: string | null
          category: string
          created_at: string
          created_by_user_id: string | null
          customer_decision: string | null
          customer_decision_at: string | null
          customer_decision_reason: string | null
          gifted_by_tis: boolean
          id: string
          linked_purchase_cost_id: string | null
          payment_due_moment: string | null
          quote_amount: number | null
          quote_requested_at: string | null
          quote_uploaded_at: string | null
          quote_url: string | null
          request_description: string
          request_title: string
          responded_at: string | null
          responded_by_user_id: string | null
          sale_id: string
          status: string
          updated_at: string
          via_developer: boolean
        }
        Insert: {
          add_to_costs?: boolean | null
          additional_cost?: number | null
          admin_response?: string | null
          attachment_url?: string | null
          category: string
          created_at?: string
          created_by_user_id?: string | null
          customer_decision?: string | null
          customer_decision_at?: string | null
          customer_decision_reason?: string | null
          gifted_by_tis?: boolean
          id?: string
          linked_purchase_cost_id?: string | null
          payment_due_moment?: string | null
          quote_amount?: number | null
          quote_requested_at?: string | null
          quote_uploaded_at?: string | null
          quote_url?: string | null
          request_description: string
          request_title: string
          responded_at?: string | null
          responded_by_user_id?: string | null
          sale_id: string
          status?: string
          updated_at?: string
          via_developer?: boolean
        }
        Update: {
          add_to_costs?: boolean | null
          additional_cost?: number | null
          admin_response?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          customer_decision?: string | null
          customer_decision_at?: string | null
          customer_decision_reason?: string | null
          gifted_by_tis?: boolean
          id?: string
          linked_purchase_cost_id?: string | null
          payment_due_moment?: string | null
          quote_amount?: number | null
          quote_requested_at?: string | null
          quote_uploaded_at?: string | null
          quote_url?: string | null
          request_description?: string
          request_title?: string
          responded_at?: string | null
          responded_by_user_id?: string | null
          sale_id?: string
          status?: string
          updated_at?: string
          via_developer?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sale_customization_requests_linked_purchase_cost_id_fkey"
            columns: ["linked_purchase_cost_id"]
            isOneToOne: false
            referencedRelation: "sale_purchase_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_customization_requests_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_customization_requests_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_documents: {
        Row: {
          customer_visible: boolean
          description: string | null
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          partner_visible: boolean
          requires_customer_signature: boolean
          requires_developer_signature: boolean
          sale_id: string
          signed_by_customer_at: string | null
          signed_by_developer_at: string | null
          title: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          customer_visible?: boolean
          description?: string | null
          document_type?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          partner_visible?: boolean
          requires_customer_signature?: boolean
          requires_developer_signature?: boolean
          sale_id: string
          signed_by_customer_at?: string | null
          signed_by_developer_at?: string | null
          title: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          customer_visible?: boolean
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          partner_visible?: boolean
          requires_customer_signature?: boolean
          requires_developer_signature?: boolean
          sale_id?: string
          signed_by_customer_at?: string | null
          signed_by_developer_at?: string | null
          title?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_documents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_documents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_extra_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_url: string
          id: string
          option_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_url: string
          id?: string
          option_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_url?: string
          id?: string
          option_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_extra_attachments_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "sale_extra_options"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_extra_categories: {
        Row: {
          actual_amount: number | null
          admin_answer: string | null
          admin_answer_at: string | null
          ambassador_terms_accepted_at: string | null
          ambassador_terms_required: boolean | null
          chosen_option_id: string | null
          created_at: string
          customer_approved_at: string | null
          customer_approved_by_name: string | null
          customer_approved_by_user_id: string | null
          customer_choice_type: string | null
          customer_notes: string | null
          customer_question: string | null
          customer_question_at: string | null
          customer_visible: boolean
          decided_at: string | null
          description: string | null
          gifted_by_tis: boolean
          id: string
          is_finalized: boolean | null
          is_included: boolean
          is_optional_category: boolean
          is_paid: boolean | null
          name: string
          notes: string | null
          order_index: number
          sale_id: string
          status: string
          updated_at: string
          via_developer: boolean
        }
        Insert: {
          actual_amount?: number | null
          admin_answer?: string | null
          admin_answer_at?: string | null
          ambassador_terms_accepted_at?: string | null
          ambassador_terms_required?: boolean | null
          chosen_option_id?: string | null
          created_at?: string
          customer_approved_at?: string | null
          customer_approved_by_name?: string | null
          customer_approved_by_user_id?: string | null
          customer_choice_type?: string | null
          customer_notes?: string | null
          customer_question?: string | null
          customer_question_at?: string | null
          customer_visible?: boolean
          decided_at?: string | null
          description?: string | null
          gifted_by_tis?: boolean
          id?: string
          is_finalized?: boolean | null
          is_included?: boolean
          is_optional_category?: boolean
          is_paid?: boolean | null
          name: string
          notes?: string | null
          order_index?: number
          sale_id: string
          status?: string
          updated_at?: string
          via_developer?: boolean
        }
        Update: {
          actual_amount?: number | null
          admin_answer?: string | null
          admin_answer_at?: string | null
          ambassador_terms_accepted_at?: string | null
          ambassador_terms_required?: boolean | null
          chosen_option_id?: string | null
          created_at?: string
          customer_approved_at?: string | null
          customer_approved_by_name?: string | null
          customer_approved_by_user_id?: string | null
          customer_choice_type?: string | null
          customer_notes?: string | null
          customer_question?: string | null
          customer_question_at?: string | null
          customer_visible?: boolean
          decided_at?: string | null
          description?: string | null
          gifted_by_tis?: boolean
          id?: string
          is_finalized?: boolean | null
          is_included?: boolean
          is_optional_category?: boolean
          is_paid?: boolean | null
          name?: string
          notes?: string | null
          order_index?: number
          sale_id?: string
          status?: string
          updated_at?: string
          via_developer?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_chosen_option"
            columns: ["chosen_option_id"]
            isOneToOne: false
            referencedRelation: "sale_extra_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_extra_categories_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_extra_categories_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_extra_options: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          detailed_specs: string | null
          highlights: Json | null
          id: string
          image_url: string | null
          is_recommended: boolean | null
          name: string
          order_index: number
          price: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          detailed_specs?: string | null
          highlights?: Json | null
          id?: string
          image_url?: string | null
          is_recommended?: boolean | null
          name: string
          order_index?: number
          price?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          detailed_specs?: string | null
          highlights?: Json | null
          id?: string
          image_url?: string | null
          is_recommended?: boolean | null
          name?: string
          order_index?: number
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_extra_options_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "sale_extra_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_invoices: {
        Row: {
          amount: number
          created_at: string
          customer_visible: boolean | null
          due_date: string | null
          file_url: string | null
          glide_invoice_id: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: string
          notes: string | null
          paid_at: string | null
          partner_id: string | null
          partner_visible: boolean | null
          related_developer_invoice_id: string | null
          sale_id: string
          sale_payment_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_visible?: boolean | null
          due_date?: string | null
          file_url?: string | null
          glide_invoice_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type: string
          notes?: string | null
          paid_at?: string | null
          partner_id?: string | null
          partner_visible?: boolean | null
          related_developer_invoice_id?: string | null
          sale_id: string
          sale_payment_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_visible?: boolean | null
          due_date?: string | null
          file_url?: string | null
          glide_invoice_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string
          notes?: string | null
          paid_at?: string | null
          partner_id?: string | null
          partner_visible?: boolean | null
          related_developer_invoice_id?: string | null
          sale_id?: string
          sale_payment_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "sale_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_invoices_related_developer_invoice_id_fkey"
            columns: ["related_developer_invoice_id"]
            isOneToOne: false
            referencedRelation: "sale_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_invoices_sale_payment_id_fkey"
            columns: ["sale_payment_id"]
            isOneToOne: false
            referencedRelation: "sale_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_milestone_activity_log: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string
          id: string
          milestone_id: string
          new_value: string | null
          note: string | null
          old_value: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string
          id?: string
          milestone_id: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          milestone_id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_milestone_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_milestone_activity_log_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "sale_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_visible: boolean
          description: string | null
          id: string
          milestone_group: string | null
          order_index: number
          partner_visible: boolean
          phase: string | null
          prerequisite_for: string | null
          priority: string | null
          sale_id: string
          target_date: string | null
          template_key: string | null
          title: string
          updated_at: string
          waiting_for: string | null
          waiting_since: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          id?: string
          milestone_group?: string | null
          order_index?: number
          partner_visible?: boolean
          phase?: string | null
          prerequisite_for?: string | null
          priority?: string | null
          sale_id: string
          target_date?: string | null
          template_key?: string | null
          title: string
          updated_at?: string
          waiting_for?: string | null
          waiting_since?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          id?: string
          milestone_group?: string | null
          order_index?: number
          partner_visible?: boolean
          phase?: string | null
          prerequisite_for?: string | null
          priority?: string | null
          sale_id?: string
          target_date?: string | null
          template_key?: string | null
          title?: string
          updated_at?: string
          waiting_for?: string | null
          waiting_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_milestones_prerequisite_for_fkey"
            columns: ["prerequisite_for"]
            isOneToOne: false
            referencedRelation: "sale_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_milestones_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_milestones_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_partners: {
        Row: {
          access_level: string
          commission_amount: number | null
          commission_paid_at: string | null
          commission_percentage: number | null
          created_at: string
          id: string
          notes: string | null
          partner_id: string
          role: Database["public"]["Enums"]["sale_partner_role"]
          sale_id: string
        }
        Insert: {
          access_level?: string
          commission_amount?: number | null
          commission_paid_at?: string | null
          commission_percentage?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_id: string
          role?: Database["public"]["Enums"]["sale_partner_role"]
          sale_id: string
        }
        Update: {
          access_level?: string
          commission_amount?: number | null
          commission_paid_at?: string | null
          commission_percentage?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string
          role?: Database["public"]["Enums"]["sale_partner_role"]
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "sale_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_partners_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_partners_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payment_proofs: {
        Row: {
          amount: number | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          notes: string | null
          payment_id: string
          uploaded_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          notes?: string | null
          payment_id: string
          uploaded_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          notes?: string | null
          payment_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payment_proofs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "sale_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          customer_visible: boolean
          description: string | null
          due_condition: string | null
          due_date: string | null
          id: string
          includes_vat: boolean | null
          order_index: number
          paid_amount: number | null
          paid_at: string | null
          partner_visible: boolean
          percentage: number | null
          proof_file_name: string | null
          proof_file_url: string | null
          proof_uploaded_at: string | null
          sale_id: string
          status: string
          title: string
          updated_at: string
          waiting_for: string | null
          waiting_since: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          due_condition?: string | null
          due_date?: string | null
          id?: string
          includes_vat?: boolean | null
          order_index?: number
          paid_amount?: number | null
          paid_at?: string | null
          partner_visible?: boolean
          percentage?: number | null
          proof_file_name?: string | null
          proof_file_url?: string | null
          proof_uploaded_at?: string | null
          sale_id: string
          status?: string
          title: string
          updated_at?: string
          waiting_for?: string | null
          waiting_since?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          due_condition?: string | null
          due_date?: string | null
          id?: string
          includes_vat?: boolean | null
          order_index?: number
          paid_amount?: number | null
          paid_at?: string | null
          partner_visible?: boolean
          percentage?: number | null
          proof_file_name?: string | null
          proof_file_url?: string | null
          proof_uploaded_at?: string | null
          sale_id?: string
          status?: string
          title?: string
          updated_at?: string
          waiting_for?: string | null
          waiting_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_purchase_costs: {
        Row: {
          actual_amount: number | null
          cost_type: string
          created_at: string | null
          due_date: string | null
          due_moment: string
          estimated_amount: number
          id: string
          is_finalized: boolean | null
          is_optional: boolean | null
          is_paid: boolean | null
          label: string
          notes: string | null
          order_index: number | null
          paid_at: string | null
          payment_proof_url: string | null
          percentage: number | null
          sale_id: string
          tooltip: string | null
          updated_at: string | null
        }
        Insert: {
          actual_amount?: number | null
          cost_type: string
          created_at?: string | null
          due_date?: string | null
          due_moment?: string
          estimated_amount?: number
          id?: string
          is_finalized?: boolean | null
          is_optional?: boolean | null
          is_paid?: boolean | null
          label: string
          notes?: string | null
          order_index?: number | null
          paid_at?: string | null
          payment_proof_url?: string | null
          percentage?: number | null
          sale_id: string
          tooltip?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_amount?: number | null
          cost_type?: string
          created_at?: string | null
          due_date?: string | null
          due_moment?: string
          estimated_amount?: number
          id?: string
          is_finalized?: boolean | null
          is_optional?: boolean | null
          is_paid?: boolean | null
          label?: string
          notes?: string | null
          order_index?: number | null
          paid_at?: string | null
          payment_proof_url?: string | null
          percentage?: number | null
          sale_id?: string
          tooltip?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_purchase_costs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_purchase_costs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_specification_approvals: {
        Row: {
          approval_type: string
          approved_at: string
          approved_by_name: string
          approved_by_user_id: string | null
          created_at: string
          customer_notes: string | null
          id: string
          ip_address: string | null
          sale_id: string
        }
        Insert: {
          approval_type: string
          approved_at?: string
          approved_by_name: string
          approved_by_user_id?: string | null
          created_at?: string
          customer_notes?: string | null
          id?: string
          ip_address?: string | null
          sale_id: string
        }
        Update: {
          approval_type?: string
          approved_at?: string
          approved_by_name?: string
          approved_by_user_id?: string | null
          created_at?: string
          customer_notes?: string | null
          id?: string
          ip_address?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_specification_approvals_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_specification_approvals_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_video_links: {
        Row: {
          created_at: string
          id: string
          sale_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sale_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sale_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_video_links_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_video_links_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_video_links_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "project_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          admin_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completion_date: string | null
          contract_date: string | null
          created_at: string
          created_by: string | null
          customer_visible_notes: string | null
          deposit_amount: number | null
          deposit_paid_at: string | null
          expected_delivery_date: string | null
          extras_initialized: boolean | null
          id: string
          notary_date: string | null
          project_id: string | null
          property_description: string | null
          property_id: string | null
          reservation_date: string | null
          sale_price: number | null
          specification_approved_at: string | null
          status: Database["public"]["Enums"]["sale_status"]
          tis_commission_fixed: number | null
          tis_commission_percentage: number | null
          tis_commission_type: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completion_date?: string | null
          contract_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_visible_notes?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          expected_delivery_date?: string | null
          extras_initialized?: boolean | null
          id?: string
          notary_date?: string | null
          project_id?: string | null
          property_description?: string | null
          property_id?: string | null
          reservation_date?: string | null
          sale_price?: number | null
          specification_approved_at?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          tis_commission_fixed?: number | null
          tis_commission_percentage?: number | null
          tis_commission_type?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completion_date?: string | null
          contract_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_visible_notes?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          expected_delivery_date?: string | null
          extras_initialized?: boolean | null
          id?: string
          notary_date?: string | null
          project_id?: string | null
          property_description?: string | null
          property_id?: string | null
          reservation_date?: string | null
          sale_price?: number | null
          specification_approved_at?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          tis_commission_fixed?: number | null
          tis_commission_percentage?: number | null
          tis_commission_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_keyword_cache: {
        Row: {
          competition: number | null
          competition_level: string | null
          cpc: number | null
          fetched_at: string
          id: string
          keyword: string
          language_code: string
          location_code: number
          search_volume: number | null
        }
        Insert: {
          competition?: number | null
          competition_level?: string | null
          cpc?: number | null
          fetched_at?: string
          id?: string
          keyword: string
          language_code?: string
          location_code?: number
          search_volume?: number | null
        }
        Update: {
          competition?: number | null
          competition_level?: string | null
          cpc?: number | null
          fetched_at?: string
          id?: string
          keyword?: string
          language_code?: string
          location_code?: number
          search_volume?: number | null
        }
        Relationships: []
      }
      snagging_inspections: {
        Row: {
          created_at: string | null
          created_by: string | null
          developer_response_deadline: string | null
          id: string
          inspection_date: string
          inspection_type: string
          inspector_name: string | null
          label: string
          notes: string | null
          sale_id: string
          sent_to_developer_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          developer_response_deadline?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_name?: string | null
          label?: string
          notes?: string | null
          sale_id: string
          sent_to_developer_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          developer_response_deadline?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_name?: string | null
          label?: string
          notes?: string | null
          sale_id?: string
          sent_to_developer_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snagging_inspections_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "snagging_inspections_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      snagging_items: {
        Row: {
          category: string
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          id: string
          inspection_id: string
          item_name: string
          notes: string | null
          photo_urls: string[] | null
          resolved_at: string | null
          resolved_notes: string | null
          severity: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          category: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          inspection_id: string
          item_name: string
          notes?: string | null
          photo_urls?: string[] | null
          resolved_at?: string | null
          resolved_notes?: string | null
          severity?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          inspection_id?: string
          item_name?: string
          notes?: string | null
          photo_urls?: string[] | null
          resolved_at?: string | null
          resolved_notes?: string | null
          severity?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snagging_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "snagging_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      snagging_photos: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          photo_url: string
          room: string | null
          snagging_item_id: string
          storage_path: string | null
          uploaded_at: string
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_url: string
          room?: string | null
          snagging_item_id: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string
          room?: string | null
          snagging_item_id?: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snagging_photos_snagging_item_id_fkey"
            columns: ["snagging_item_id"]
            isOneToOne: false
            referencedRelation: "snagging_items"
            referencedColumns: ["id"]
          },
        ]
      }
      snagging_voice_recordings: {
        Row: {
          ai_items: Json | null
          audio_url: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          inspection_id: string | null
          room_name: string
          sale_id: string
          status: string
          storage_path: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          ai_items?: Json | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          inspection_id?: string | null
          room_name: string
          sale_id: string
          status?: string
          storage_path?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          ai_items?: Json | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          inspection_id?: string | null
          room_name?: string
          sale_id?: string
          status?: string
          storage_path?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snagging_voice_recordings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "snagging_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snagging_voice_recordings_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "public_sales"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "snagging_voice_recordings_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      social_campaigns: {
        Row: {
          campaign_name: string
          campaign_type: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          facebook_post_template: string | null
          id: string
          is_active: boolean
          project_id: string | null
          starts_at: string | null
          total_clicks: number
          total_signups: number
          trigger_word: string
          updated_at: string
          utm_campaign: string
        }
        Insert: {
          campaign_name: string
          campaign_type?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          facebook_post_template?: string | null
          id?: string
          is_active?: boolean
          project_id?: string | null
          starts_at?: string | null
          total_clicks?: number
          total_signups?: number
          trigger_word?: string
          updated_at?: string
          utm_campaign: string
        }
        Update: {
          campaign_name?: string
          campaign_type?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          facebook_post_template?: string | null
          id?: string
          is_active?: boolean
          project_id?: string | null
          starts_at?: string | null
          total_clicks?: number
          total_signups?: number
          trigger_word?: string
          updated_at?: string
          utm_campaign?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_library: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          project_id: string | null
          source: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          url: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          project_id?: string | null
          source?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          url: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          project_id?: string | null
          source?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          url?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_library_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_library_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_generations: {
        Row: {
          blog_post_id: string
          briefing_snapshot: Json | null
          created_at: string
          duration_ms: number | null
          enrichment_data: Json | null
          id: string
          model_used: string | null
          polish_result: string | null
          prompts_snapshot: Json | null
          raw_ai_response: string | null
          social_post_id: string | null
          step: string
        }
        Insert: {
          blog_post_id: string
          briefing_snapshot?: Json | null
          created_at?: string
          duration_ms?: number | null
          enrichment_data?: Json | null
          id?: string
          model_used?: string | null
          polish_result?: string | null
          prompts_snapshot?: Json | null
          raw_ai_response?: string | null
          social_post_id?: string | null
          step: string
        }
        Update: {
          blog_post_id?: string
          briefing_snapshot?: Json | null
          created_at?: string
          duration_ms?: number | null
          enrichment_data?: Json | null
          id?: string
          model_used?: string | null
          polish_result?: string | null
          prompts_snapshot?: Json | null
          raw_ai_response?: string | null
          social_post_id?: string | null
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_generations_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_generations_social_post_id_fkey"
            columns: ["social_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          ai_model: string | null
          blog_post_id: string | null
          comments: number | null
          content: string
          content_item_id: string | null
          created_at: string
          created_by: string | null
          engagement_updated_at: string | null
          ghl_account_ids: string[] | null
          ghl_post_id: string | null
          hashtags: string[] | null
          id: string
          impressions: number | null
          likes: number | null
          photo_id: string | null
          platform: string
          project_id: string | null
          published_at: string | null
          reach: number | null
          scheduled_for: string | null
          status: string
          trigger_word: string | null
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          blog_post_id?: string | null
          comments?: number | null
          content: string
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          engagement_updated_at?: string | null
          ghl_account_ids?: string[] | null
          ghl_post_id?: string | null
          hashtags?: string[] | null
          id?: string
          impressions?: number | null
          likes?: number | null
          photo_id?: string | null
          platform: string
          project_id?: string | null
          published_at?: string | null
          reach?: number | null
          scheduled_for?: string | null
          status?: string
          trigger_word?: string | null
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          blog_post_id?: string | null
          comments?: number | null
          content?: string
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          engagement_updated_at?: string | null
          ghl_account_ids?: string[] | null
          ghl_post_id?: string | null
          hashtags?: string[] | null
          id?: string
          impressions?: number | null
          likes?: number | null
          photo_id?: string | null
          platform?: string
          project_id?: string | null
          published_at?: string | null
          reach?: number | null
          scheduled_for?: string | null
          status?: string
          trigger_word?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "linkedin_photo_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      style_examples: {
        Row: {
          archetype: string | null
          content_text: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          archetype?: string | null
          content_text: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          archetype?: string | null
          content_text?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          batch_info: Json | null
          completed_at: string | null
          created_at: string
          error_count: number | null
          error_details: Json | null
          id: string
          last_offset: number | null
          marked_as_sold: number | null
          new_count: number | null
          price_changes: number | null
          projects_created: number | null
          projects_marked_sold: number | null
          projects_updated: number | null
          properties_linked: number | null
          started_at: string
          status: string
          sync_type: string
          total_processed: number | null
          updated_count: number | null
        }
        Insert: {
          batch_info?: Json | null
          completed_at?: string | null
          created_at?: string
          error_count?: number | null
          error_details?: Json | null
          id?: string
          last_offset?: number | null
          marked_as_sold?: number | null
          new_count?: number | null
          price_changes?: number | null
          projects_created?: number | null
          projects_marked_sold?: number | null
          projects_updated?: number | null
          properties_linked?: number | null
          started_at?: string
          status?: string
          sync_type: string
          total_processed?: number | null
          updated_count?: number | null
        }
        Update: {
          batch_info?: Json | null
          completed_at?: string | null
          created_at?: string
          error_count?: number | null
          error_details?: Json | null
          id?: string
          last_offset?: number | null
          marked_as_sold?: number | null
          new_count?: number | null
          price_changes?: number | null
          projects_created?: number | null
          projects_marked_sold?: number | null
          projects_updated?: number | null
          properties_linked?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          total_processed?: number | null
          updated_count?: number | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean
          bio: string
          created_at: string
          email: string | null
          id: string
          image_url: string | null
          name: string
          order_index: number
          phone: string | null
          role: string
          show_on_about_page: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio: string
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          name: string
          order_index?: number
          phone?: string | null
          role: string
          show_on_about_page?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          name?: string
          order_index?: number
          phone?: string | null
          role?: string
          show_on_about_page?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          account_id: string | null
          browser: string | null
          browser_version: string | null
          created_at: string
          crm_user_id: string | null
          device_type: string | null
          event_id: string | null
          event_name: string
          event_params: Json | null
          external_sync_error: string | null
          full_url: string
          id: string
          last_heartbeat: string | null
          locale: string | null
          occurred_at: string
          os: string | null
          os_version: string | null
          partner_id: string | null
          path: string
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          session_end: string | null
          site: string
          synced_to_external: boolean | null
          time_spent_seconds: number | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visibility_changes: number | null
          visitor_id: string
        }
        Insert: {
          account_id?: string | null
          browser?: string | null
          browser_version?: string | null
          created_at?: string
          crm_user_id?: string | null
          device_type?: string | null
          event_id?: string | null
          event_name: string
          event_params?: Json | null
          external_sync_error?: string | null
          full_url: string
          id?: string
          last_heartbeat?: string | null
          locale?: string | null
          occurred_at?: string
          os?: string | null
          os_version?: string | null
          partner_id?: string | null
          path: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_end?: string | null
          site: string
          synced_to_external?: boolean | null
          time_spent_seconds?: number | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visibility_changes?: number | null
          visitor_id: string
        }
        Update: {
          account_id?: string | null
          browser?: string | null
          browser_version?: string | null
          created_at?: string
          crm_user_id?: string | null
          device_type?: string | null
          event_id?: string | null
          event_name?: string
          event_params?: Json | null
          external_sync_error?: string | null
          full_url?: string
          id?: string
          last_heartbeat?: string | null
          locale?: string | null
          occurred_at?: string
          os?: string | null
          os_version?: string | null
          partner_id?: string | null
          path?: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_end?: string | null
          site?: string
          synced_to_external?: boolean | null
          time_spent_seconds?: number | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visibility_changes?: number | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tracking_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_guide_categories: {
        Row: {
          created_at: string
          description: string | null
          google_type: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          name_singular: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          google_type?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          name_singular: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          google_type?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          name_singular?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      travel_guide_pois: {
        Row: {
          address: string | null
          category_id: string
          created_at: string
          description: string | null
          featured_image: string | null
          google_maps_url: string | null
          google_place_id: string | null
          id: string
          is_active: boolean
          is_recommended: boolean
          latitude: number | null
          longitude: number | null
          municipality: string
          name: string
          opening_hours: Json | null
          phone: string | null
          price_level: string | null
          rating: number | null
          rating_count: number | null
          region: string
          source: string
          tips: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          featured_image?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          latitude?: number | null
          longitude?: number | null
          municipality: string
          name: string
          opening_hours?: Json | null
          phone?: string | null
          price_level?: string | null
          rating?: number | null
          rating_count?: number | null
          region?: string
          source?: string
          tips?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          featured_image?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          latitude?: number | null
          longitude?: number | null
          municipality?: string
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          price_level?: string | null
          rating?: number | null
          rating_count?: number | null
          region?: string
          source?: string
          tips?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_guide_pois_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "travel_guide_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_guide_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          guide_item_id: string
          id: string
          started_at: string | null
          time_spent_seconds: number | null
          updated_at: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          guide_item_id: string
          id?: string
          started_at?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          guide_item_id?: string
          id?: string
          started_at?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_guide_progress_guide_item_id_fkey"
            columns: ["guide_item_id"]
            isOneToOne: false
            referencedRelation: "orientation_guide_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viewing_companion_notes: {
        Row: {
          budget_fit: boolean | null
          cost_indication: Json | null
          created_at: string
          created_by: string | null
          follow_up_action: string | null
          id: string
          interest_level: string | null
          media: Json | null
          note_text: string | null
          project_id: string | null
          rating: number | null
          trip_id: string
          updated_at: string
          viewing_id: string
        }
        Insert: {
          budget_fit?: boolean | null
          cost_indication?: Json | null
          created_at?: string
          created_by?: string | null
          follow_up_action?: string | null
          id?: string
          interest_level?: string | null
          media?: Json | null
          note_text?: string | null
          project_id?: string | null
          rating?: number | null
          trip_id: string
          updated_at?: string
          viewing_id: string
        }
        Update: {
          budget_fit?: boolean | null
          cost_indication?: Json | null
          created_at?: string
          created_by?: string | null
          follow_up_action?: string | null
          id?: string
          interest_level?: string | null
          media?: Json | null
          note_text?: string | null
          project_id?: string | null
          rating?: number | null
          trip_id?: string
          updated_at?: string
          viewing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_companion_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_companion_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_companion_notes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "customer_viewing_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_exports: {
        Row: {
          created_at: string | null
          created_by: string | null
          export_type: string
          file_name: string | null
          file_url: string
          id: string
          metadata: Json | null
          project_id: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          export_type: string
          file_name?: string | null
          file_url: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          export_type?: string
          file_name?: string | null
          file_url?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visual_exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_aggregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_exports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "visual_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_templates: {
        Row: {
          category: string
          created_at: string | null
          format_type: string
          height: number
          id: string
          is_active: boolean | null
          name: string
          template_data: Json
          thumbnail_url: string | null
          updated_at: string | null
          width: number
        }
        Insert: {
          category: string
          created_at?: string | null
          format_type: string
          height: number
          id?: string
          is_active?: boolean | null
          name: string
          template_data?: Json
          thumbnail_url?: string | null
          updated_at?: string | null
          width: number
        }
        Update: {
          category?: string
          created_at?: string | null
          format_type?: string
          height?: number
          id?: string
          is_active?: boolean | null
          name?: string
          template_data?: Json
          thumbnail_url?: string | null
          updated_at?: string | null
          width?: number
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          payload: Json
          result: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          payload: Json
          result?: string | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          result?: string | null
          webhook_type?: string
        }
        Relationships: []
      }
      webinar_events: {
        Row: {
          active: boolean | null
          created_at: string
          current_registrations: number | null
          date: string
          description: string | null
          duration_minutes: number | null
          id: string
          max_capacity: number | null
          time: string
          title: string
          updated_at: string
          webinar_url: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          current_registrations?: number | null
          date: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          max_capacity?: number | null
          time: string
          title: string
          updated_at?: string
          webinar_url?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          current_registrations?: number | null
          date?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          max_capacity?: number | null
          time?: string
          title?: string
          updated_at?: string
          webinar_url?: string | null
        }
        Relationships: []
      }
      webinar_registrations: {
        Row: {
          confirmed: boolean | null
          created_at: string
          crm_lead_id: string | null
          email: string
          event_id: string
          first_name: string
          ghl_appointment_id: string | null
          ghl_contact_id: string | null
          ghl_synced_at: string | null
          id: string
          last_name: string
          phone: string | null
          registration_source: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string
          crm_lead_id?: string | null
          email: string
          event_id: string
          first_name: string
          ghl_appointment_id?: string | null
          ghl_contact_id?: string | null
          ghl_synced_at?: string | null
          id?: string
          last_name: string
          phone?: string | null
          registration_source?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string
          crm_lead_id?: string | null
          email?: string
          event_id?: string
          first_name?: string
          ghl_appointment_id?: string | null
          ghl_contact_id?: string | null
          ghl_synced_at?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          registration_source?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webinar_registrations_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinar_registrations_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinar_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "webinar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reports: {
        Row: {
          created_at: string
          id: string
          report_data: Json
          status: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_data?: Json
          status?: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          report_data?: Json
          status?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      youtube_upload_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          progress_percent: number | null
          project_ids: string[] | null
          status: string
          storage_path: string
          title: string
          updated_at: string
          video_date: string
          video_type: string
          youtube_embed_url: string | null
          youtube_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          progress_percent?: number | null
          project_ids?: string[] | null
          status?: string
          storage_path: string
          title: string
          updated_at?: string
          video_date?: string
          video_type?: string
          youtube_embed_url?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          progress_percent?: number | null
          project_ids?: string[] | null
          status?: string
          storage_path?: string
          title?: string
          updated_at?: string
          video_date?: string
          video_type?: string
          youtube_embed_url?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      klant_detail_view: {
        Row: {
          admin_notes: string | null
          assigned_projects: Json | null
          country: string | null
          created_at: string | null
          crm_user_id: string | null
          customer_profile_id: string | null
          date_of_birth: string | null
          dropped_off_at: string | null
          dropped_off_notes: string | null
          dropped_off_phase: string | null
          dropped_off_reason: string | null
          email: string | null
          engagement_data: Json | null
          explicit_preferences: Json | null
          favorite_projects: string[] | null
          feedback_received_at: string | null
          feedback_requested_at: string | null
          feedback_score: number | null
          feedback_text: string | null
          first_name: string | null
          first_visit_at: string | null
          follow_up_notes: string | null
          follow_up_status: string | null
          ghl_contact_id: string | null
          id: string | null
          inferred_preferences: Json | null
          journey_phase: string | null
          journey_phase_updated_at: string | null
          journey_phase_updated_by: string | null
          last_follow_up_at: string | null
          last_ghl_refresh_at: string | null
          last_magic_link_sent_at: string | null
          last_name: string | null
          last_visit_at: string | null
          lead_temperature: string | null
          linked_visitor_ids: string[] | null
          magic_link_sent_count: number | null
          merged_at: string | null
          nationality: string | null
          next_follow_up_at: string | null
          partner_company: string | null
          partner_id: string | null
          partner_logo_url: string | null
          partner_name: string | null
          personal_data_complete: boolean | null
          personal_data_completed_at: string | null
          phone: string | null
          postal_code: string | null
          qualification_reason: string | null
          qualified_at: string | null
          reactivated_at: string | null
          recontact_after: string | null
          recontact_allowed: boolean | null
          referred_by_partner_id: string | null
          residence_city: string | null
          source_campaign: string | null
          source_email: string | null
          street_address: string | null
          tax_id_bsn: string | null
          tax_id_nie: string | null
          trips: Json | null
          updated_at: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          viewed_projects: string[] | null
          visitor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "klant_detail_view"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "crm_leads_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      project_aggregations: {
        Row: {
          available_count: number | null
          cities: string[] | null
          city: string | null
          completion_date: string | null
          country: string | null
          created_at: string | null
          description: string | null
          development_ref: string | null
          display_title: string | null
          distances_to_beach: number[] | null
          environment_video_url: string | null
          featured_image: string | null
          has_communal_pool: boolean | null
          has_pool: boolean | null
          has_private_pool: boolean | null
          has_sea_views: boolean | null
          highlights: Json | null
          id: string | null
          is_resale: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          max_area: number | null
          max_bathrooms: number | null
          max_bedrooms: number | null
          min_area: number | null
          min_bathrooms: number | null
          min_bedrooms: number | null
          min_distance_to_beach: number | null
          name: string | null
          price_from: number | null
          price_to: number | null
          priority: number | null
          project_key: string | null
          property_types: string[] | null
          region: string | null
          showhouse_video_url: string | null
          sold_count: number | null
          status: string | null
          total_count: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      public_sales: {
        Row: {
          airconditioning: boolean | null
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          communal_pool: boolean | null
          distance_to_beach_m: number | null
          garden: boolean | null
          heating: boolean | null
          key_ready: boolean | null
          latitude: number | null
          longitude: number | null
          mountain_views: boolean | null
          new_build: boolean | null
          parking: boolean | null
          plot_size_sqm: number | null
          pool: boolean | null
          private_pool: boolean | null
          project_city: string | null
          project_completion_date: string | null
          project_description: string | null
          project_display_title: string | null
          project_featured_image: string | null
          project_highlights: Json | null
          project_images: Json | null
          project_is_resale: boolean | null
          project_latitude: number | null
          project_location_intelligence: Json | null
          project_longitude: number | null
          project_max_bedrooms: number | null
          project_min_bedrooms: number | null
          project_name: string | null
          project_price_from: number | null
          project_price_to: number | null
          project_property_count: number | null
          project_property_types: string[] | null
          project_region: string | null
          property_city: string | null
          property_costa: string | null
          property_description: string | null
          property_features: Json | null
          property_image_url: string | null
          property_images: Json | null
          property_price: number | null
          property_region: string | null
          property_title: string | null
          property_type: string | null
          sale_id: string | null
          sea_views: boolean | null
          status: Database["public"]["Enums"]["sale_status"] | null
          terrace_area_sqm: number | null
        }
        Relationships: []
      }
      published_conversation_summaries: {
        Row: {
          client_pseudonym: string | null
          id: string | null
          key_topics: string[] | null
          start_time: string | null
          summary_category: string | null
          summary_full: string | null
          summary_headline: string | null
          summary_short: string | null
        }
        Insert: {
          client_pseudonym?: string | null
          id?: string | null
          key_topics?: string[] | null
          start_time?: string | null
          summary_category?: string | null
          summary_full?: string | null
          summary_headline?: string | null
          summary_short?: string | null
        }
        Update: {
          client_pseudonym?: string | null
          id?: string | null
          key_topics?: string[] | null
          start_time?: string | null
          summary_category?: string | null
          summary_full?: string | null
          summary_headline?: string | null
          summary_short?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_customer_profile: {
        Args: {
          p_crm_user_id?: string
          p_user_id?: string
          p_visitor_id?: string
        }
        Returns: undefined
      }
      auto_complete_journey_milestone: {
        Args: { p_crm_lead_id: string; p_template_key: string }
        Returns: undefined
      }
      batch_aggregate_customer_profiles: { Args: never; Returns: undefined }
      calculate_lead_qualification: {
        Args: { p_engagement_data: Json }
        Returns: string
      }
      calculate_sale_status: {
        Args: { p_sale_id: string }
        Returns: Database["public"]["Enums"]["sale_status"]
      }
      cleanup_bot_tracking_events: {
        Args: never
        Returns: {
          deleted_customer_profiles: number
          deleted_tracking_events: number
        }[]
      }
      cleanup_expired_otp_codes: { Args: never; Returns: number }
      cleanup_old_milestone_activity_logs: { Args: never; Returns: number }
      cleanup_old_otp_codes: { Args: never; Returns: undefined }
      cleanup_old_tracking_events: { Args: never; Returns: number }
      cleanup_orphaned_customer_profiles: { Args: never; Returns: number }
      cleanup_rate_limit_logs: { Args: never; Returns: undefined }
      generate_project_display_title: {
        Args: { p_city: string; p_property_types: string[] }
        Returns: string
      }
      get_city_project_counts: {
        Args: never
        Returns: {
          city: string
          project_count: number
        }[]
      }
      get_personalized_projects: {
        Args: { p_limit?: number; p_user_id?: string; p_visitor_id?: string }
        Returns: {
          match_reasons: string[]
          match_score: number
          project_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_article_progress:
        | {
            Args: {
              p_error_msg?: string
              p_report_id: string
              p_success: boolean
              p_total_items?: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_error_msg?: string
              p_item_index?: number
              p_report_id: string
              p_success: boolean
              p_total_items?: number
            }
            Returns: undefined
          }
      is_advocaat_for_lead: {
        Args: { p_crm_lead_id: string; p_user_id: string }
        Returns: boolean
      }
      is_advocaat_for_sale: {
        Args: { p_sale_id: string; p_user_id: string }
        Returns: boolean
      }
      is_assignment_for_own_estimate: {
        Args: { assignment_estimate_id: string; user_uuid: string }
        Returns: boolean
      }
      is_cost_estimate_assigned_to_user: {
        Args: { estimate_id: string; user_uuid: string }
        Returns: boolean
      }
      is_sale_document_advocaat: {
        Args: { object_name: string; user_uuid: string }
        Returns: boolean
      }
      is_sale_document_owner: {
        Args: { object_name: string; user_uuid: string }
        Returns: boolean
      }
      is_sale_document_partner: {
        Args: { object_name: string; user_uuid: string }
        Returns: boolean
      }
      refresh_project_aggregations: { Args: never; Returns: undefined }
      remove_insight_from_questions: {
        Args: { p_insight_id: string }
        Returns: undefined
      }
      upsert_insight: {
        Args: {
          p_extraction_confidence?: number
          p_impact_score?: string
          p_label: string
          p_normalized_insight: string
          p_raw_quote: string
          p_subtheme?: string
          p_suggested_archetype?: string
          p_theme?: string
          p_type: string
          p_underlying_questions?: string[]
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "lead" | "partner" | "advocaat"
      linkedin_photo_category:
        | "headshot"
        | "speaking"
        | "location"
        | "lifestyle"
        | "office"
      sale_customer_role: "buyer" | "co_buyer"
      sale_partner_role:
        | "referring_partner"
        | "financing_partner"
        | "legal_partner"
        | "other"
      sale_status:
        | "geblokkeerd"
        | "reservatie"
        | "koopcontract"
        | "voorbereiding"
        | "akkoord"
        | "overdracht"
        | "nazorg"
        | "afgerond"
        | "geannuleerd"
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
      app_role: ["admin", "user", "lead", "partner", "advocaat"],
      linkedin_photo_category: [
        "headshot",
        "speaking",
        "location",
        "lifestyle",
        "office",
      ],
      sale_customer_role: ["buyer", "co_buyer"],
      sale_partner_role: [
        "referring_partner",
        "financing_partner",
        "legal_partner",
        "other",
      ],
      sale_status: [
        "geblokkeerd",
        "reservatie",
        "koopcontract",
        "voorbereiding",
        "akkoord",
        "overdracht",
        "nazorg",
        "afgerond",
        "geannuleerd",
      ],
    },
  },
} as const
