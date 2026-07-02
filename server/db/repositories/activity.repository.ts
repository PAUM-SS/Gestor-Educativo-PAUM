import { Database } from "better-sqlite3";
import { Activity } from "@/shared/types";

export class ActivityRepository {

  constructor(private db: Database) {}

  getActivities(): Activity[] {
    return this.db.prepare("SELECT * FROM activities").all() as Activity[];
  }
}