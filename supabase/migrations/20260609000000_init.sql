-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS (Tenants)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. DEPARTMENTS (Belongs to Organization)
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. USERS (Profiles linked to Auth.Users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- References auth.users(id)
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'LEARNER' CHECK (role IN ('SYSTEM_ADMIN', 'ORG_ADMIN', 'LEARNER')),
    position TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. CATEGORIES (Course Classifications)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL means HQ (Global)
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. COURSES
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL means HQ (Global)
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. LESSONS (Merges Modules & Contents for simplicity and business value)
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf', 'word', 'powerpoint', 'url', 'article')),
    url TEXT,
    file_path TEXT,
    article_content TEXT, -- Markdown or HTML for system internal articles
    estimated_minutes INTEGER DEFAULT 0 NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. COURSE VISIBILITY (Controls which Tenants can see HQ courses)
CREATE TABLE public.course_visibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (course_id, organization_id)
);

-- 8. LEARNING PATHS (Roadmaps)
CREATE TABLE public.learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL means HQ (Global)
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. LEARNING PATH COURSES (Map courses to paths with ordering)
CREATE TABLE public.learning_path_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (learning_path_id, course_id)
);

-- 10. ENROLLMENTS (Track Course Status)
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percent INTEGER DEFAULT 0 NOT NULL CHECK (progress_percent BETWEEN 0 AND 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, course_id)
);

-- 11. LESSON PROGRESS (Individual Lesson Completion)
CREATE TABLE public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, lesson_id)
);

-- 12. MANDATORY COURSES (Assignments with deadlines)
CREATE TABLE public.mandatory_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE, -- NULL means entire Organization
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL means global system-wide
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL means broadcast to all users in organization
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 14. AUDIT LOGS (Compliance and Operation Trails)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

--------------------------------------------------------------------------------
-- POSTGRES TRIGGERS (Auto-calculate Course Progress from Lesson Progress)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_course_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_course_id UUID;
    v_total_lessons INT;
    v_completed_lessons INT;
    v_progress_percent INT;
    v_status TEXT;
BEGIN
    -- Get course_id for the lesson
    IF TG_OP = 'DELETE' THEN
        SELECT course_id INTO v_course_id FROM public.lessons WHERE id = OLD.lesson_id;
    ELSE
        SELECT course_id INTO v_course_id FROM public.lessons WHERE id = NEW.lesson_id;
    END IF;

    -- Count total lessons in the course
    SELECT COUNT(*) INTO v_total_lessons FROM public.lessons WHERE course_id = v_course_id;

    -- Count completed lessons by the user
    IF TG_OP = 'DELETE' THEN
        SELECT COUNT(*) INTO v_completed_lessons 
        FROM public.lesson_progress lp
        JOIN public.lessons l ON lp.lesson_id = l.id
        WHERE lp.user_id = OLD.user_id AND l.course_id = v_course_id;
    ELSE
        SELECT COUNT(*) INTO v_completed_lessons 
        FROM public.lesson_progress lp
        JOIN public.lessons l ON lp.lesson_id = l.id
        WHERE lp.user_id = NEW.user_id AND l.course_id = v_course_id;
    END IF;

    -- Calculate percentage
    IF v_total_lessons > 0 THEN
        v_progress_percent := (v_completed_lessons * 100) / v_total_lessons;
    ELSE
        v_progress_percent := 0;
    END IF;

    -- Determine enrollment status
    IF v_progress_percent = 100 THEN
        v_status := 'completed';
    ELSIF v_progress_percent > 0 THEN
        v_status := 'in_progress';
    ELSE
        v_status := 'not_started';
    END IF;

    -- Insert or update enrollment
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.enrollments (user_id, course_id, status, progress_percent, started_at, completed_at, last_accessed_at)
        VALUES (OLD.user_id, v_course_id, v_status, v_progress_percent, NOW(), CASE WHEN v_status = 'completed' THEN NOW() ELSE NULL END, NOW())
        ON CONFLICT (user_id, course_id) DO UPDATE SET
            status = EXCLUDED.status,
            progress_percent = EXCLUDED.progress_percent,
            completed_at = CASE WHEN EXCLUDED.status = 'completed' AND enrollments.status <> 'completed' THEN NOW() ELSE enrollments.completed_at END,
            last_accessed_at = NOW();
    ELSE
        INSERT INTO public.enrollments (user_id, course_id, status, progress_percent, started_at, completed_at, last_accessed_at)
        VALUES (NEW.user_id, v_course_id, v_status, v_progress_percent, NOW(), CASE WHEN v_status = 'completed' THEN NOW() ELSE NULL END, NOW())
        ON CONFLICT (user_id, course_id) DO UPDATE SET
            status = EXCLUDED.status,
            progress_percent = EXCLUDED.progress_percent,
            completed_at = CASE WHEN EXCLUDED.status = 'completed' AND enrollments.status <> 'completed' THEN NOW() ELSE enrollments.completed_at END,
            last_accessed_at = NOW();
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_course_enrollment_progress
AFTER INSERT OR DELETE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_course_enrollment_progress();

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
--------------------------------------------------------------------------------

-- Non-recursive Helpers (Security Definers bypass RLS)
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandatory_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Organizations
CREATE POLICY org_select ON public.organizations FOR SELECT TO authenticated USING (id = public.get_my_org_id() OR public.get_my_role() = 'SYSTEM_ADMIN');
CREATE POLICY org_write ON public.organizations FOR ALL TO authenticated USING (public.get_my_role() = 'SYSTEM_ADMIN');

-- Departments
CREATE POLICY dept_select ON public.departments FOR SELECT TO authenticated USING (organization_id = public.get_my_org_id() OR public.get_my_role() = 'SYSTEM_ADMIN');
CREATE POLICY dept_write ON public.departments FOR ALL TO authenticated USING ((organization_id = public.get_my_org_id() AND public.get_my_role() = 'ORG_ADMIN') OR public.get_my_role() = 'SYSTEM_ADMIN');

-- Users
CREATE POLICY user_select ON public.users FOR SELECT TO authenticated USING (organization_id = public.get_my_org_id() OR public.get_my_role() = 'SYSTEM_ADMIN');
CREATE POLICY user_write ON public.users FOR ALL TO authenticated USING ((organization_id = public.get_my_org_id() AND public.get_my_role() = 'ORG_ADMIN') OR public.get_my_role() = 'SYSTEM_ADMIN' OR id = auth.uid());

-- Categories
CREATE POLICY cat_select ON public.categories FOR SELECT TO authenticated USING (organization_id IS NULL OR organization_id = public.get_my_org_id() OR public.get_my_role() = 'SYSTEM_ADMIN');
CREATE POLICY cat_write ON public.categories FOR ALL TO authenticated USING (public.get_my_role() = 'SYSTEM_ADMIN' OR (organization_id = public.get_my_org_id() AND public.get_my_role() = 'ORG_ADMIN'));

-- Courses
CREATE POLICY course_select ON public.courses FOR SELECT TO authenticated 
USING (
    organization_id = public.get_my_org_id() 
    OR public.get_my_role() = 'SYSTEM_ADMIN' 
    OR (organization_id IS NULL AND EXISTS (SELECT 1 FROM public.course_visibility cv WHERE cv.course_id = id AND cv.organization_id = public.get_my_org_id()))
);
CREATE POLICY course_write ON public.courses FOR ALL TO authenticated USING (public.get_my_role() = 'SYSTEM_ADMIN' OR (organization_id = public.get_my_org_id() AND public.get_my_role() = 'ORG_ADMIN'));

-- Lessons
CREATE POLICY lesson_select ON public.lessons FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.courses c 
        WHERE c.id = course_id 
        AND (c.organization_id = public.get_my_org_id() OR c.organization_id IS NULL OR public.get_my_role() = 'SYSTEM_ADMIN')
    )
);
CREATE POLICY lesson_write ON public.lessons FOR ALL TO authenticated 
USING (
    public.get_my_role() = 'SYSTEM_ADMIN' 
    OR EXISTS (
        SELECT 1 FROM public.courses c 
        WHERE c.id = course_id 
        AND c.organization_id = public.get_my_org_id() 
        AND public.get_my_role() = 'ORG_ADMIN'
    )
);

-- Course Visibility
CREATE POLICY cv_select ON public.course_visibility FOR SELECT TO authenticated USING (organization_id = public.get_my_org_id() OR public.get_my_role() = 'SYSTEM_ADMIN');
CREATE POLICY cv_write ON public.course_visibility FOR ALL TO authenticated USING (public.get_my_role() = 'SYSTEM_ADMIN');

-- Learning Paths (Roadmaps)
CREATE POLICY lp_select ON public.learning_paths FOR SELECT TO authenticated USING (organization_id IS NULL OR organization_id = public.get_my_org_id() OR public.get_my_role() = 'SYSTEM_ADMIN');
CREATE POLICY lp_write ON public.learning_paths FOR ALL TO authenticated USING (public.get_my_role() = 'SYSTEM_ADMIN' OR (organization_id = public.get_my_org_id() AND public.get_my_role() = 'ORG_ADMIN'));

-- Learning Path Courses
CREATE POLICY lpc_select ON public.learning_path_courses FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.learning_paths lp 
        WHERE lp.id = learning_path_id 
        AND (lp.organization_id = public.get_my_org_id() OR lp.organization_id IS NULL OR public.get_my_role() = 'SYSTEM_ADMIN')
    )
);
CREATE POLICY lpc_write ON public.learning_path_courses FOR ALL TO authenticated 
USING (
    public.get_my_role() = 'SYSTEM_ADMIN' 
    OR EXISTS (
        SELECT 1 FROM public.learning_paths lp 
        WHERE lp.id = learning_path_id 
        AND lp.organization_id = public.get_my_org_id() 
        AND public.get_my_role() = 'ORG_ADMIN'
    )
);

-- Enrollments
CREATE POLICY enroll_select ON public.enrollments FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() 
    OR (
        public.get_my_role() IN ('ORG_ADMIN', 'SYSTEM_ADMIN') 
        AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.organization_id = public.get_my_org_id())
    )
);
CREATE POLICY enroll_write ON public.enrollments FOR ALL TO authenticated 
USING (
    user_id = auth.uid() 
    OR public.get_my_role() IN ('ORG_ADMIN', 'SYSTEM_ADMIN')
);

-- Lesson Progress
CREATE POLICY lp_progress_select ON public.lesson_progress FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() 
    OR (
        public.get_my_role() IN ('ORG_ADMIN', 'SYSTEM_ADMIN') 
        AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.organization_id = public.get_my_org_id())
    )
);
CREATE POLICY lp_progress_write ON public.lesson_progress FOR ALL TO authenticated USING (user_id = auth.uid());

-- Mandatory Courses
CREATE POLICY mandatory_select ON public.mandatory_courses FOR SELECT TO authenticated USING (organization_id = public.get_my_org_id() OR public.get_my_role() = 'SYSTEM_ADMIN');
CREATE POLICY mandatory_write ON public.mandatory_courses FOR ALL TO authenticated USING ((organization_id = public.get_my_org_id() AND public.get_my_role() = 'ORG_ADMIN') OR public.get_my_role() = 'SYSTEM_ADMIN');

-- Notifications
CREATE POLICY notify_select ON public.notifications FOR SELECT TO authenticated USING (organization_id = public.get_my_org_id() OR organization_id IS NULL OR public.get_my_role() = 'SYSTEM_ADMIN');
CREATE POLICY notify_write ON public.notifications FOR ALL TO authenticated USING (public.get_my_role() = 'SYSTEM_ADMIN' OR (organization_id = public.get_my_org_id() AND public.get_my_role() = 'ORG_ADMIN'));

-- Audit Logs
CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated USING ((organization_id = public.get_my_org_id() AND public.get_my_role() IN ('ORG_ADMIN', 'SYSTEM_ADMIN')) OR public.get_my_role() = 'SYSTEM_ADMIN');
CREATE POLICY audit_write ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
