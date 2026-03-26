--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: trigger_auto_link_property(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_auto_link_property() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  -- Only trigger if property has coordinates but no project_id
  IF (NEW.project_id IS NULL AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
    -- Call edge function asynchronously using pg_net
    PERFORM extensions.http_post(
      url := 'https://xeiyoaocyyjrnsxbxyev.supabase.co/functions/v1/auto-link-property-single',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXlvYW9jeXlqcm5zeGJ4eWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjM1MjksImV4cCI6MjA3ODg5OTUyOX0.xm5HGEOJQZ4Hp98e-uo35S5jjXlLublDeJI0TY_ddKI'
      ),
      body := jsonb_build_object('propertyId', NEW.id)
    );
    
    -- Log the trigger
    RAISE NOTICE 'Auto-link trigger fired for property %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    intro text NOT NULL,
    content jsonb NOT NULL,
    example_section text,
    online_limitation text,
    seo_bullets text[] DEFAULT '{}'::text[] NOT NULL,
    category text NOT NULL,
    featured_image text,
    author text DEFAULT 'Viva Vastgoed'::text,
    meta_description text,
    meta_keywords text[],
    published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: city_info_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.city_info_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city text NOT NULL,
    country text DEFAULT 'Spanje'::text NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    property_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    CONSTRAINT favorites_notes_length_check CHECK ((char_length(notes) <= 2000))
);


--
-- Name: journey_checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journey_checklist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    phase integer NOT NULL,
    item_key text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT journey_checklist_items_phase_check CHECK (((phase >= 1) AND (phase <= 6)))
);


--
-- Name: journey_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journey_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    phase integer NOT NULL,
    document_type text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT journey_documents_phase_check CHECK (((phase >= 1) AND (phase <= 6)))
);


--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    company text NOT NULL,
    category text NOT NULL,
    bio text NOT NULL,
    description text NOT NULL,
    image_url text,
    website text,
    email text,
    phone text,
    order_index integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partners_category_check CHECK ((category = ANY (ARRAY['vastgoed_nl_be'::text, 'hypotheek_nl_be'::text, 'juridisch'::text, 'hypotheek_spanje'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    budget_min numeric,
    budget_max numeric,
    preferred_property_types text[],
    preferred_cities text[],
    preferred_bedrooms integer,
    preferred_bathrooms integer,
    max_distance_to_beach_m integer,
    investment_purpose text,
    preferences_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_key text NOT NULL,
    description text NOT NULL,
    highlights text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name text DEFAULT ''::text NOT NULL,
    location text,
    city text,
    region text,
    country text DEFAULT 'Spanje'::text,
    status text DEFAULT 'active'::text,
    showhouse_video_url text,
    environment_video_url text,
    featured_image text,
    price_from numeric,
    price_to numeric,
    completion_date text,
    active boolean DEFAULT true,
    latitude numeric,
    longitude numeric
);


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    postal_code text,
    country text DEFAULT 'Nederland'::text,
    property_type text NOT NULL,
    bedrooms integer DEFAULT 0 NOT NULL,
    bathrooms integer DEFAULT 0 NOT NULL,
    area_sqm numeric(10,2),
    plot_size_sqm numeric(10,2),
    year_built integer,
    image_url text,
    images jsonb DEFAULT '[]'::jsonb,
    features jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'available'::text,
    api_source text,
    api_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    distance_to_beach_m integer,
    latitude numeric,
    longitude numeric,
    project_id uuid
);


--
-- Name: user_journey; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_journey (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_phase integer DEFAULT 1 NOT NULL,
    phase_started_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_journey_current_phase_check CHECK (((current_phase >= 1) AND (current_phase <= 6)))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: city_info_cache city_info_cache_city_country_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.city_info_cache
    ADD CONSTRAINT city_info_cache_city_country_key UNIQUE (city, country);


--
-- Name: city_info_cache city_info_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.city_info_cache
    ADD CONSTRAINT city_info_cache_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_user_id_property_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_property_id_key UNIQUE (user_id, property_id);


--
-- Name: journey_checklist_items journey_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_checklist_items
    ADD CONSTRAINT journey_checklist_items_pkey PRIMARY KEY (id);


--
-- Name: journey_checklist_items journey_checklist_items_user_id_phase_item_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_checklist_items
    ADD CONSTRAINT journey_checklist_items_user_id_phase_item_key_key UNIQUE (user_id, phase, item_key);


--
-- Name: journey_documents journey_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_documents
    ADD CONSTRAINT journey_documents_pkey PRIMARY KEY (id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: projects project_descriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT project_descriptions_pkey PRIMARY KEY (id);


--
-- Name: projects project_descriptions_project_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT project_descriptions_project_key_key UNIQUE (project_key);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: user_journey user_journey_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_journey
    ADD CONSTRAINT user_journey_pkey PRIMARY KEY (id);


--
-- Name: user_journey user_journey_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_journey
    ADD CONSTRAINT user_journey_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_blog_posts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_category ON public.blog_posts USING btree (category);


--
-- Name: idx_blog_posts_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_published ON public.blog_posts USING btree (published, published_at DESC);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_city_info_cache_city_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_city_info_cache_city_country ON public.city_info_cache USING btree (city, country);


--
-- Name: idx_favorites_property_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_property_id ON public.favorites USING btree (property_id);


--
-- Name: idx_favorites_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);


--
-- Name: idx_partners_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_category ON public.partners USING btree (category);


--
-- Name: idx_partners_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partners_order ON public.partners USING btree (order_index);


--
-- Name: idx_project_descriptions_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_descriptions_key ON public.projects USING btree (project_key);


--
-- Name: idx_projects_coordinates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_coordinates ON public.projects USING btree (latitude, longitude);


--
-- Name: idx_properties_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_city ON public.properties USING btree (city);


--
-- Name: idx_properties_coordinates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_coordinates ON public.properties USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_properties_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_price ON public.properties USING btree (price);


--
-- Name: idx_properties_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_project_id ON public.properties USING btree (project_id);


--
-- Name: idx_properties_property_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_property_type ON public.properties USING btree (property_type);


--
-- Name: idx_properties_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_status ON public.properties USING btree (status);


--
-- Name: properties auto_link_property_on_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_link_property_on_insert AFTER INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_link_property();


--
-- Name: properties auto_link_property_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_link_property_on_update AFTER UPDATE ON public.properties FOR EACH ROW WHEN (((old.project_id IS NULL) AND (new.project_id IS NULL) AND (new.latitude IS NOT NULL) AND (new.longitude IS NOT NULL) AND ((old.latitude IS DISTINCT FROM new.latitude) OR (old.longitude IS DISTINCT FROM new.longitude)))) EXECUTE FUNCTION public.trigger_auto_link_property();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: city_info_cache update_city_info_cache_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_city_info_cache_updated_at BEFORE UPDATE ON public.city_info_cache FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: partners update_partners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_project_descriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_descriptions_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: properties update_properties_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_journey update_user_journey_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_journey_updated_at BEFORE UPDATE ON public.user_journey FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: favorites favorites_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: journey_checklist_items journey_checklist_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_checklist_items
    ADD CONSTRAINT journey_checklist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: journey_documents journey_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_documents
    ADD CONSTRAINT journey_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: properties properties_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: user_journey user_journey_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_journey
    ADD CONSTRAINT user_journey_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blog_posts Admins can create blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create blog posts" ON public.blog_posts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blog_posts Admins can delete blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete blog posts" ON public.blog_posts FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partners Admins can delete partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete partners" ON public.partners FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: projects Admins can delete projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: properties Admins can delete properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partners Admins can insert partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert partners" ON public.partners FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: projects Admins can insert projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert projects" ON public.projects FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: properties Admins can insert properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert properties" ON public.properties FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blog_posts Admins can update blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update blog posts" ON public.blog_posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partners Admins can update partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update partners" ON public.partners FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: projects Admins can update projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update projects" ON public.projects FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: properties Admins can update properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update properties" ON public.properties FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blog_posts Admins can view all blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all blog posts" ON public.blog_posts FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partners Admins can view all partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all partners" ON public.partners FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: projects Admins can view all projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all projects" ON public.projects FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partners Anyone can view active partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active partners" ON public.partners FOR SELECT USING ((active = true));


--
-- Name: projects Anyone can view active projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active projects" ON public.projects FOR SELECT USING ((active = true));


--
-- Name: city_info_cache Anyone can view city info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view city info" ON public.city_info_cache FOR SELECT USING (true);


--
-- Name: properties Anyone can view properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view properties" ON public.properties FOR SELECT USING (true);


--
-- Name: blog_posts Anyone can view published blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts FOR SELECT USING ((published = true));


--
-- Name: user_roles Only admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: city_info_cache Service role can manage city info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage city info" ON public.city_info_cache USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: favorites Users can add their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add their own favorites" ON public.favorites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: journey_checklist_items Users can delete their own checklist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own checklist items" ON public.journey_checklist_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: journey_documents Users can delete their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own documents" ON public.journey_documents FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: favorites Users can delete their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: journey_checklist_items Users can insert their own checklist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own checklist items" ON public.journey_checklist_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: journey_documents Users can insert their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own documents" ON public.journey_documents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_journey Users can insert their own journey; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own journey" ON public.user_journey FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: journey_checklist_items Users can update their own checklist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own checklist items" ON public.journey_checklist_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_journey Users can update their own journey; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own journey" ON public.user_journey FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: journey_checklist_items Users can view their own checklist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own checklist items" ON public.journey_checklist_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: journey_documents Users can view their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own documents" ON public.journey_documents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: favorites Users can view their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_journey Users can view their own journey; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own journey" ON public.user_journey FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: city_info_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.city_info_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: journey_checklist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journey_checklist_items ENABLE ROW LEVEL SECURITY;

--
-- Name: journey_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journey_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: partners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: properties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

--
-- Name: user_journey; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_journey ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


