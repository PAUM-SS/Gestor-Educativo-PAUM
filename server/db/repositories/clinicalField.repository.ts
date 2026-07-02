import { Database } from "better-sqlite3";
import { ClinicalField } from "@/shared/types";

export class ClinicalFieldRepository {

  constructor(private db: Database) {}

  getClinicalFields(): ClinicalField[] {
      return this.db.prepare("SELECT * FROM clinical_fields ORDER BY id DESC").all() as ClinicalField[];
  }

  async addClinicalField(field: ClinicalField) {
    const existing = this.db.prepare("SELECT id FROM clinical_fields WHERE id = ?").get(field.id);
    if (existing) return null;

    this.db.prepare(`
        INSERT INTO clinical_fields 
        (id, name, type, level, slots, status, pertinence, lastInspection, agreementExpiry) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(field.id, field.name, field.type, field.level, field.slots, field.status, field.pertinence, field.lastInspection, field.agreementExpiry);
    
    return field;
  }

  async updateClinicalField(id: string, updates: Partial<ClinicalField>) {
    const row = this.db.prepare("SELECT * FROM clinical_fields WHERE id = ?").get(id) as any;
    if (!row) return null;

    const clinicalField: ClinicalField = { ...row };
    const updated = { ...clinicalField, ...updates };

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE clinical_fields SET 
        name=?, type=?, level=?, slots=?, status=?, pertinence=?, lastInspection=?, agreementExpiry=? 
        WHERE id=?`
      ).run(updated.name, updated.type, updated.level, updated.slots, updated.status, updated.pertinence, updated.lastInspection, updated.agreementExpiry, id);
    });
    tx();

    return updated;
  }

  async deleteClinicalField(id: string) {
    const existing = this.db.prepare("SELECT id FROM clinical_fields WHERE id = ?").get(id) as { name: string } | undefined;
    if (!existing) return false;

    const tx = this.db.transaction(() => {
      this.db.prepare("UPDATE rotations SET clinicalFieldId=NULL WHERE clinicalFieldId=?").run(id);
      this.db.prepare("DELETE FROM clinical_fields WHERE id = ?").run(id);
    });
    tx();
    
    return true;
  }
}