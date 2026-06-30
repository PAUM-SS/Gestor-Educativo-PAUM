// SCHEMA DE LA BASE DE DATOS

export const DB_SCHEMA = `
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT,
        enrollmentId TEXT,
        semester INTEGER,
        status TEXT,
        gpa REAL,
        attendance REAL,
        email TEXT,
        cohort TEXT,
        tutor TEXT,
        alert INTEGER,
        kardex TEXT
    );

    CREATE TABLE IF NOT EXISTS modules (
        id TEXT PRIMARY KEY,
        title TEXT,
        credits INTEGER,
        description TEXT,
        competencies TEXT,
        status TEXT,
        semester TEXT,
        level TEXT,
        syllabusUrl TEXT,
        syllabusFileName TEXT,
        didacticPlanningUrl TEXT,
        didacticPlanningFileName TEXT,
        planning TEXT
    );

    CREATE TABLE IF NOT EXISTS minutes (
        id TEXT PRIMARY KEY,
        date TEXT,
        subject TEXT,
        tasks TEXT,
        fullData TEXT
    );

    CREATE TABLE IF NOT EXISTS faculty (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        level TEXT,
        dedication TEXT,
        seniority INTEGER,
        hireDate TEXT,
        compliance TEXT,
        adscription TEXT,
        email TEXT,
        phone TEXT,
        photo TEXT,
        weeklySchedule TEXT,
        permissions TEXT
    );

    CREATE TABLE IF NOT EXISTS clinical_fields (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        level INTEGER,
        slots INTEGER,
        status TEXT,
        pertinence TEXT,
        lastInspection TEXT,
        agreementExpiry TEXT
    );

    CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        moduleId TEXT NOT NULL REFERENCES modules(id),
        facultyId TEXT REFERENCES faculty(id) ON DELETE SET NULL,
        capacity INTEGER DEFAULT 0,
        enrolled INTEGER DEFAULT 0,
        schedule TEXT,
        comments TEXT,
        adjustment TEXT
    );

    CREATE TABLE IF NOT EXISTS section_enrollments (
        studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        sectionId TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        enrolledAt TEXT NOT NULL,
        PRIMARY KEY (studentId, sectionId)
    );

    CREATE TABLE IF NOT EXISTS section_daily_records (
        id TEXT PRIMARY KEY,
        sectionId TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        facultyPresent INTEGER DEFAULT 1,
        absentStudentIds TEXT DEFAULT '[]',
        justification TEXT,
        justificationType TEXT,
        topic TEXT,
        signature INTEGER DEFAULT 0,
        updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rotations (
        id TEXT PRIMARY KEY,
        studentId TEXT NOT NULL REFERENCES students(id),
        studentName TEXT,
        clinicalFieldId TEXT REFERENCES clinical_fields(id) ON DELETE SET NULL,
        facility TEXT,
        department TEXT,
        startDate TEXT,
        endDate TEXT,
        supervisor TEXT,
        status TEXT DEFAULT 'programada'
    );

    CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        type TEXT,
        title TEXT,
        timestamp TEXT,
        relatedId TEXT,
        status TEXT
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
        id          TEXT PRIMARY KEY,
        date        TEXT NOT NULL,
        title       TEXT NOT NULL,
        type        TEXT NOT NULL,
        sourceId    TEXT,
        description TEXT
    );

    CREATE TABLE IF NOT EXISTS _meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
`