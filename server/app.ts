import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { db } from './db/index.ts';
import { StartServerOptions } from './index.ts';

import { studentsRouter } from './routes/student.router.ts';
import { facultyRouter } from './routes/faculty.router.ts';
import { curriculumRouter } from './routes/curriculum.router.ts';
import { sectionsRouter } from './routes/schedule.router.ts';
import { sectionRecordsRouter } from './routes/sectionRecord.router.ts';
import { calendarRouter } from './routes/calendar.router.ts';
import { minutesRouter } from './routes/minute.router.ts';
import { reportsRouter } from './routes/report.router.ts';
import { clinicalFieldsRouter } from './routes/clinicalField.router.ts';
import { miscRouter } from './routes/misc.router.ts';


dotenv.config();

export function createServer({ staticDir }: Pick<StartServerOptions, 'staticDir'> = {}) {
    const app = express();

    app.use(cors());
    app.use(express.json());

    const uploadsDir = db.getUploadsDir();
    fs.mkdirSync(uploadsDir, { recursive: true });
    app.use('/uploads', express.static(uploadsDir));

    app.use('/api/students', studentsRouter);
    app.use('/api/faculty', facultyRouter);
    app.use('/api/curriculum', curriculumRouter);
    app.use('/api/sections', sectionsRouter);
    app.use('/api/section-records', sectionRecordsRouter);
    app.use('/api/calendar', calendarRouter);
    app.use('/api/minutes', minutesRouter);
    app.use('/api/reports', reportsRouter);
    app.use('/api/clinical-fields', clinicalFieldsRouter);
    app.use('/api', miscRouter);

    if (staticDir) {
        const resolvedStaticDir = path.resolve(staticDir);
        const indexFile = path.join(resolvedStaticDir, 'index.html');

        app.use(express.static(resolvedStaticDir));
        app.get(/^\/(?!api).*/, (_req, res) => {
        if (fs.existsSync(indexFile)) {
            res.sendFile(indexFile);
            return;
        }
        res.status(500).send(`No se encontro el build del frontend en ${resolvedStaticDir}`);
        });
    }

    return app;
}