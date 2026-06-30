import { Database } from "better-sqlite3";
import { Rotation } from "@/src/types";

export class RotationRepository {

  constructor(private db: Database) {}

  getRotations(): Rotation[] {
    return this.db.prepare("SELECT * FROM rotations").all() as Rotation[];
  }
}