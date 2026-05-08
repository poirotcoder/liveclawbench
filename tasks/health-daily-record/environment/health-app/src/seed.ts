import type { Database } from "bun:sqlite";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function seedDatabase(db: Database): void {
  const count = db.query("SELECT COUNT(*) as c FROM health_daily_snapshot").get() as { c: number };
  if (count.c > 0) return;

  const rand = seededRandom(42);

  db.exec("BEGIN TRANSACTION");
  try {
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);

      const steps = Math.floor(3000 + rand() * 12000);
      const activeEnergy = Math.floor(150 + rand() * 500);
      const sleepHours = +(5.5 + rand() * 3.5).toFixed(1);
      const sleepQuality = +(50 + rand() * 50).toFixed(1);
      const restingHr = Math.floor(55 + rand() * 20);
      const avgHr = Math.floor(65 + rand() * 25);
      const weight = +(65 + rand() * 5).toFixed(1);
      const bodyFat = +(15 + rand() * 10).toFixed(1);
      const bloodOxygen = +(95 + rand() * 4).toFixed(1);

      db.exec(`INSERT INTO health_daily_snapshot
        (user_id, date, steps, active_energy_kcal, sleep_hours, sleep_quality,
         resting_heart_rate_bpm, avg_heart_rate_bpm, weight_kg, body_fat_percent, blood_oxygen_percent)
        VALUES (1, '${date}', ${steps}, ${activeEnergy}, ${sleepHours}, ${sleepQuality},
         ${restingHr}, ${avgHr}, ${weight}, ${bodyFat}, ${bloodOxygen})`);

      const metrics = [
        ["steps", steps],
        ["active_energy_kcal", activeEnergy],
        ["sleep_hours", sleepHours],
        ["sleep_quality", sleepQuality],
        ["resting_heart_rate_bpm", restingHr],
        ["avg_heart_rate_bpm", avgHr],
        ["weight_kg", weight],
        ["body_fat_percent", bodyFat],
        ["blood_oxygen_percent", bloodOxygen],
      ] as const;

      for (const [type, value] of metrics) {
        db.exec(`INSERT INTO health_metric_series (user_id, metric_type, date, value)
          VALUES (1, '${type}', '${date}', ${value})`);
      }
    }

    const allergens = [
      { name: "Peanuts", severity: "severe", notes: "Severe allergy, carry epinephrine pen at all times" },
      { name: "Pollen", severity: "mild", notes: "Seasonal, take antihistamines in spring" },
      { name: "Shellfish", severity: "moderate", notes: "Allergic to shrimp and crab, fish is fine" },
    ];
    for (const a of allergens) {
      db.exec(`INSERT INTO allergen (user_id, name, severity, notes)
        VALUES (1, '${a.name}', '${a.severity}', '${a.notes}')`);
    }

    const todayStr = today.toISOString().slice(0, 10);

    db.exec(`INSERT INTO medication (user_id, name, display_name, frequency, start_date, notes)
      VALUES (1, 'Vitamin D', NULL, 'daily', '${todayStr}', 'One tablet daily after meals')`);
    db.exec(`INSERT INTO medication_intake_slot (medication_id, time_hhmm, dose_amount, dose_unit, label)
      VALUES (1, '08:00', 1, 'tablet', 'After breakfast')`);

    db.exec(`INSERT INTO medication (user_id, name, display_name, frequency, start_date, notes)
      VALUES (1, 'Omega-3', 'Fish Oil', 'daily', '${todayStr}', 'Two capsules daily')`);
    db.exec(`INSERT INTO medication_intake_slot (medication_id, time_hhmm, dose_amount, dose_unit, label)
      VALUES (2, '08:00', 1, 'capsule', 'After breakfast')`);
    db.exec(`INSERT INTO medication_intake_slot (medication_id, time_hhmm, dose_amount, dose_unit, label)
      VALUES (2, '20:00', 1, 'capsule', 'After dinner')`);

    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
