import { Database } from "better-sqlite3";
import { AcademicMinute, ManualTask } from "@/src/types";
import { parseJSON } from "../transforms";

export class MinuteRepository {
    constructor(private db: Database) {}
    
    getMinutes(): AcademicMinute[] {
        return this.db.prepare("SELECT * FROM minutes ORDER BY date DESC").all().map((row: any) => ({
            ...row,
            tasks: parseJSON(row.tasks, []),
            fullData: parseJSON(row.fullData, undefined)
        })) as AcademicMinute[];
    }

    updateMinuteTask(minuteId: string, taskId: string, status: ManualTask['status']) {
        const row = this.db.prepare("SELECT * FROM minutes WHERE id = ?").get(minuteId) as any;
        if (!row) return null;
    
        const minute: AcademicMinute = { ...row, tasks: JSON.parse(row.tasks || "[]"), fullData: JSON.parse(row.fullData || "null") };
        const task = minute.tasks.find((item) => item.id === taskId);
    
        if (!task) return null;
    
        task.status = status;
        this.db.prepare("UPDATE minutes SET tasks=? WHERE id=?").run(JSON.stringify(minute.tasks), minuteId);
        return task;
    }
}