/** @jsxImportSource hono/jsx */
import type { OpenAPIApp } from "mock-lib";
import { initDb } from "../db";

function Layout({ title, children }: { title: string; children: any }) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} - Health Manager</title>
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        <nav class="navbar">
          <div class="nav-brand">Health Manager</div>
          <div class="nav-links">
            <a href="/" class="nav-link">Dashboard</a>
            <a href="/browse" class="nav-link">Categories</a>
            <a href="/allergens" class="nav-link">Allergens</a>
            <a href="/medications" class="nav-link">Medications</a>
          </div>
        </nav>
        <main class="container">{children}</main>
        <script src="/static/app.js"></script>
      </body>
    </html>
  );
}

function MetricCard({ label, value, unit, icon }: { label: string; value: any; unit?: string; icon: string }) {
  const display = value != null ? `${value}${unit ? " " + unit : ""}` : "--";
  return (
    <div class="metric-card">
      <div class="metric-icon">{icon}</div>
      <div class="metric-value">{display}</div>
      <div class="metric-label">{label}</div>
    </div>
  );
}

const METRIC_LABELS: Record<string, { label: string; unit: string; icon: string }> = {
  steps: { label: "Steps", unit: "", icon: "👣" },
  active_energy_kcal: { label: "Active Energy", unit: "kcal", icon: "🔥" },
  sleep_hours: { label: "Sleep Duration", unit: "hrs", icon: "😴" },
  sleep_quality: { label: "Sleep Quality", unit: "%", icon: "💤" },
  resting_heart_rate_bpm: { label: "Resting HR", unit: "bpm", icon: "❤️" },
  avg_heart_rate_bpm: { label: "Avg HR", unit: "bpm", icon: "💓" },
  weight_kg: { label: "Weight", unit: "kg", icon: "⚖️" },
  body_fat_percent: { label: "Body Fat", unit: "%", icon: "📊" },
  blood_oxygen_percent: { label: "Blood Oxygen", unit: "%", icon: "🫁" },
};

const CATEGORIES = [
  { name: "Fitness", icon: "🏃", metrics: ["steps", "active_energy_kcal"] },
  { name: "Sleep", icon: "😴", metrics: ["sleep_hours", "sleep_quality"] },
  { name: "Heart", icon: "❤️", metrics: ["resting_heart_rate_bpm", "avg_heart_rate_bpm"] },
  { name: "Body", icon: "⚖️", metrics: ["weight_kg", "body_fat_percent"] },
  { name: "Vitals", icon: "🫁", metrics: ["blood_oxygen_percent"] },
];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function registerFrontendRoutes(app: OpenAPIApp) {
  app.get("/", (c) => {
    const db = initDb();
    const today = formatDate(new Date());
    const queryDate = c.req.query("date") || today;
    const snapshot = db.query(
      "SELECT * FROM health_daily_snapshot WHERE user_id = 1 AND date = ?"
    ).get(queryDate) as any;

    const meds = db.query(
      "SELECT * FROM medication WHERE user_id = 1 AND archived = 0"
    ).all() as any[];
    const medsWithSlots = meds.map((m: any) => {
      const slots = db.query("SELECT * FROM medication_intake_slot WHERE medication_id = ?").all(m.id);
      const logs = db.query(
        "SELECT * FROM medication_dose_log WHERE medication_id = ? AND logged_at >= ? ORDER BY logged_at DESC"
      ).all(m.id, queryDate) as any[];
      return { ...m, slots, todayLogs: logs };
    });

    const allergenCount = (db.query("SELECT COUNT(*) as c FROM allergen WHERE user_id = 1 AND archived = 0").get() as any).c;
    const allergens = db.query(
      "SELECT name, severity FROM allergen WHERE user_id = 1 AND archived = 0 ORDER BY id DESC"
    ).all() as { name: string; severity: string | null }[];

    const prevDate = shiftDate(queryDate, -1);
    const nextDate = shiftDate(queryDate, 1);
    const isToday = queryDate === today;

    // 7-day trend data for the summary section
    const weekStart = shiftDate(queryDate, -6);
    const weekSnapshots = db.query(
      "SELECT date, steps, sleep_hours, resting_heart_rate_bpm FROM health_daily_snapshot WHERE user_id = 1 AND date >= ? AND date <= ? ORDER BY date"
    ).all(weekStart, queryDate) as any[];

    return c.html(
      <Layout title="Dashboard">
        <div class="page-header">
          <h1>Health Dashboard</h1>
          <div class="date-nav">
            <a href={`/?date=${prevDate}`} class="btn btn-sm date-nav-btn">&lt;</a>
            <span class="date-badge">{queryDate}</span>
            {!isToday && <a href={`/?date=${nextDate}`} class="btn btn-sm date-nav-btn">&gt;</a>}
            {!isToday && <a href="/" class="btn btn-sm">Today</a>}
          </div>
        </div>

        {snapshot ? (
          <div class="metrics-grid">
            <a href="/health/steps" class="metric-card-link"><MetricCard icon="👣" label="Steps" value={snapshot.steps} /></a>
            <a href="/health/active_energy_kcal" class="metric-card-link"><MetricCard icon="🔥" label="Active Energy" value={snapshot.active_energy_kcal} unit="kcal" /></a>
            <a href="/health/sleep_hours" class="metric-card-link"><MetricCard icon="😴" label="Sleep" value={snapshot.sleep_hours} unit="hrs" /></a>
            <a href="/health/sleep_quality" class="metric-card-link"><MetricCard icon="💤" label="Sleep Quality" value={snapshot.sleep_quality} unit="%" /></a>
            <a href="/health/resting_heart_rate_bpm" class="metric-card-link"><MetricCard icon="❤️" label="Resting HR" value={snapshot.resting_heart_rate_bpm} unit="bpm" /></a>
            <a href="/health/avg_heart_rate_bpm" class="metric-card-link"><MetricCard icon="💓" label="Avg HR" value={snapshot.avg_heart_rate_bpm} unit="bpm" /></a>
            <a href="/health/weight_kg" class="metric-card-link"><MetricCard icon="⚖️" label="Weight" value={snapshot.weight_kg} unit="kg" /></a>
            <a href="/health/body_fat_percent" class="metric-card-link"><MetricCard icon="📊" label="Body Fat" value={snapshot.body_fat_percent} unit="%" /></a>
            <a href="/health/blood_oxygen_percent" class="metric-card-link"><MetricCard icon="🫁" label="Blood Oxygen" value={snapshot.blood_oxygen_percent} unit="%" /></a>
          </div>
        ) : (
          <div class="empty-state">
            <p>No health data for {queryDate}</p>
          </div>
        )}

        {weekSnapshots.length > 1 && (
          <div class="section">
            <div class="section-header">
              <h2>7-Day Trends</h2>
              <a href="/browse" class="btn btn-sm">Details</a>
            </div>
            <div class="week-summary">
              <div class="week-chart" id="week-steps-chart" data-values={JSON.stringify(weekSnapshots.map((s: any) => s.steps))} data-labels={JSON.stringify(weekSnapshots.map((s: any) => s.date.slice(5)))} data-metric="Steps"></div>
              <div class="week-chart" id="week-sleep-chart" data-values={JSON.stringify(weekSnapshots.map((s: any) => s.sleep_hours))} data-labels={JSON.stringify(weekSnapshots.map((s: any) => s.date.slice(5)))} data-metric="Sleep"></div>
              <div class="week-chart" id="week-hr-chart" data-values={JSON.stringify(weekSnapshots.map((s: any) => s.resting_heart_rate_bpm))} data-labels={JSON.stringify(weekSnapshots.map((s: any) => s.date.slice(5)))} data-metric="Heart Rate"></div>
            </div>
          </div>
        )}

        <div class="section">
          <div class="section-header">
            <h2>Today's Medications</h2>
            <a href="/medications" class="btn btn-sm">Manage</a>
          </div>
          {medsWithSlots.length === 0 ? (
            <div class="empty-state"><p>No medications recorded</p></div>
          ) : (
            <div class="med-list">
              {medsWithSlots.map((m: any) => (
                <div class="med-card" key={m.id}>
                  <div class="med-header">
                    <strong>{m.display_name || m.name}</strong>
                    <span class={`freq-badge freq-${m.frequency}`}>{m.frequency === "daily" ? "Daily" : "As Needed"}</span>
                  </div>
                  {(m.slots as any[]).map((s: any) => {
                    const logged = (m.todayLogs as any[]).some((l: any) => l.slot_id === s.id);
                    return (
                      <div class={`slot-row ${logged ? "slot-taken" : ""}`} key={s.id}>
                        <span class="slot-time">{s.time_hhmm}</span>
                        <span class="slot-dose">{s.dose_amount} {s.dose_unit}</span>
                        {s.label && <span class="slot-label">{s.label}</span>}
                        {logged ? (
                          <span class="status-badge taken">Taken</span>
                        ) : (
                          <button class="btn btn-sm btn-primary log-dose-btn"
                            data-med-id={m.id} data-slot-id={s.id}>
                            Log
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div class="section">
          <div class="section-header">
            <h2>Allergens</h2>
            <a href="/allergens" class="btn btn-sm">Manage ({allergenCount})</a>
          </div>
          {allergens.length === 0 ? (
            <div class="empty-state"><p>No allergens recorded</p></div>
          ) : (
            <div class="allergen-summary">
              {allergens.map((a) => (
                <span class={`allergen-tag severity-${a.severity || "unknown"}`} key={a.name}>{a.name}</span>
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  });

  // Browse categories page
  app.get("/browse", (c) => {
    const db = initDb();
    const today = formatDate(new Date());
    const weekStart = shiftDate(today, -6);

    const categoriesWithData = CATEGORIES.map(cat => {
      const latestValues = cat.metrics.map(m => {
        const row = db.query(
          "SELECT value FROM health_metric_series WHERE user_id = 1 AND metric_type = ? ORDER BY date DESC LIMIT 1"
        ).get(m) as any;
        return { metric: m, value: row?.value ?? null, ...METRIC_LABELS[m] };
      });
      return { ...cat, latestValues };
    });

    return c.html(
      <Layout title="Browse">
        <div class="page-header">
          <h1>Health Categories</h1>
        </div>
        <div class="category-list">
          {categoriesWithData.map(cat => (
            <div class="category-card" key={cat.name}>
              <div class="category-header">
                <span class="category-icon">{cat.icon}</span>
                <div>
                  <h3>{cat.name}</h3>
                </div>
              </div>
              <div class="category-metrics">
                {cat.latestValues.map(mv => (
                  <a href={`/health/${mv.metric}`} class="category-metric-link" key={mv.metric}>
                    <span class="category-metric-label">{mv.label}</span>
                    <span class="category-metric-value">
                      {mv.value != null ? `${mv.value}${mv.unit ? " " + mv.unit : ""}` : "--"}
                    </span>
                    <span class="category-metric-arrow">&gt;</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Layout>
    );
  });

  // Health metric detail page
  app.get("/health/:type", (c) => {
    const metricType = c.req.param("type");
    const meta = METRIC_LABELS[metricType];
    if (!meta) {
      return c.html(<Layout title="Not Found"><div class="empty-state"><p>Unknown metric type</p></div></Layout>);
    }

    const db = initDb();
    const today = formatDate(new Date());
    const daysParam = c.req.query("days") || "7";
    const days = parseInt(daysParam, 10) || 7;
    const startDate = shiftDate(today, -(days - 1));

    const rows = db.query(
      "SELECT date, value FROM health_metric_series WHERE user_id = 1 AND metric_type = ? AND date >= ? AND date <= ? ORDER BY date"
    ).all(metricType, startDate, today) as { date: string; value: number }[];

    // Compute stats
    let stats = { mean: 0, min: 0, max: 0, trend: "stable" as string, insight: "" };
    if (rows.length > 0) {
      const values = rows.map(r => r.value);
      stats.mean = +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
      stats.min = +Math.min(...values).toFixed(1);
      stats.max = +Math.max(...values).toFixed(1);

      const mid = Math.floor(values.length / 2);
      if (mid > 0) {
        const firstHalf = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
        const secondHalf = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
        const change = ((secondHalf - firstHalf) / firstHalf) * 100;
        stats.trend = change > 5 ? "rising" : change < -5 ? "falling" : "stable";
      }
      stats.insight = stats.trend === "rising"
        ? `${meta.label} has been rising over the past ${days} days, averaging ${stats.mean}${meta.unit ? " " + meta.unit : ""}`
        : stats.trend === "falling"
          ? `${meta.label} has been falling over the past ${days} days, averaging ${stats.mean}${meta.unit ? " " + meta.unit : ""}`
          : `${meta.label} has been stable over the past ${days} days, averaging ${stats.mean}${meta.unit ? " " + meta.unit : ""}`;
    }

    return c.html(
      <Layout title={meta.label}>
        <div class="page-header">
          <h1>{meta.icon} {meta.label}</h1>
          <a href="/browse" class="btn btn-sm">Back</a>
        </div>

        <div class="period-tabs">
          <a href={`/health/${metricType}?days=7`} class={`period-tab ${days === 7 ? "active" : ""}`}>7 Days</a>
          <a href={`/health/${metricType}?days=14`} class={`period-tab ${days === 14 ? "active" : ""}`}>14 Days</a>
          <a href={`/health/${metricType}?days=30`} class={`period-tab ${days === 30 ? "active" : ""}`}>30 Days</a>
        </div>

        {rows.length > 0 ? (
          <div class="detail-content">
            <div class="chart-container">
              <div class="bar-chart" id="detail-chart"
                data-values={JSON.stringify(rows.map(r => r.value))}
                data-labels={JSON.stringify(rows.map(r => r.date.slice(5)))}
                data-unit={meta.unit}></div>
            </div>

            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{stats.mean}{meta.unit ? ` ${meta.unit}` : ""}</div>
                <div class="stat-label">Average</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{stats.min}{meta.unit ? ` ${meta.unit}` : ""}</div>
                <div class="stat-label">Min</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{stats.max}{meta.unit ? ` ${meta.unit}` : ""}</div>
                <div class="stat-label">Max</div>
              </div>
              <div class="stat-item">
                <div class="stat-value trend-{stats.trend === 'rising' ? 'up' : stats.trend === 'falling' ? 'down' : 'flat'}">
                  {stats.trend === "rising" ? "↑ Rising" : stats.trend === "falling" ? "↓ Falling" : "→ Stable"}
                </div>
                <div class="stat-label">Trend</div>
              </div>
            </div>

            {stats.insight && (
              <div class="insight-card">
                <div class="insight-icon">💡</div>
                <div class="insight-text">{stats.insight}</div>
              </div>
            )}

            <div class="section">
              <h3>Data Records</h3>
              <div class="data-list">
                {[...rows].reverse().map(r => (
                  <div class="data-row" key={r.date}>
                    <span class="data-date">{r.date}</span>
                    <span class="data-value">{r.value}{meta.unit ? ` ${meta.unit}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div class="empty-state">
            <p>No {meta.label} data for the past {days} days</p>
          </div>
        )}
      </Layout>
    );
  });

  app.get("/allergens", (c) => {
    const db = initDb();
    const allergens = db.query(
      "SELECT * FROM allergen WHERE user_id = 1 AND archived = 0 ORDER BY id DESC"
    ).all() as any[];

    return c.html(
      <Layout title="Allergens">
        <div class="page-header">
          <h1>Allergen Management</h1>
          <button class="btn btn-primary" id="add-allergen-btn">Add Allergen</button>
        </div>

        <div id="allergen-form" class="form-card hidden">
          <h3 id="allergen-form-title">Add Allergen</h3>
          <input type="hidden" id="allergen-edit-id" value="" />
          <div class="form-group">
            <label>Name *</label>
            <input type="text" id="allergen-name" placeholder="e.g. Peanuts" required />
          </div>
          <div class="form-group">
            <label>Severity</label>
            <select id="allergen-severity">
              <option value="">Not specified</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="allergen-notes" placeholder="Describe allergic reactions..."></textarea>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="allergen-submit">Save</button>
            <button class="btn" id="allergen-cancel">Cancel</button>
          </div>
        </div>

        {allergens.length === 0 ? (
          <div class="empty-state"><p>No allergens recorded. Click the button above to add one.</p></div>
        ) : (
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Severity</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allergens.map((a: any) => (
                  <tr key={a.id} data-id={a.id}>
                    <td><strong>{a.name}</strong></td>
                    <td>
                      <span class={`severity-badge severity-${a.severity || "unknown"}`}>
                        {a.severity === "severe" ? "Severe" : a.severity === "moderate" ? "Moderate" : a.severity === "mild" ? "Mild" : "Not specified"}
                      </span>
                    </td>
                    <td class="notes-cell">{a.notes || "--"}</td>
                    <td>
                      <button class="btn btn-sm edit-allergen-btn"
                        data-id={a.id} data-name={a.name} data-severity={a.severity || ""}
                        data-notes={a.notes || ""}>Edit</button>
                      <button class="btn btn-sm btn-danger delete-allergen-btn" data-id={a.id}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Layout>
    );
  });

  app.get("/medications", (c) => {
    const db = initDb();
    const meds = db.query(
      "SELECT * FROM medication WHERE user_id = 1 AND archived = 0 ORDER BY id DESC"
    ).all() as any[];
    const medsWithSlots = meds.map((m: any) => {
      const slots = db.query("SELECT * FROM medication_intake_slot WHERE medication_id = ?").all(m.id);
      return { ...m, slots };
    });

    return c.html(
      <Layout title="Medications">
        <div class="page-header">
          <h1>Medications</h1>
          <button class="btn btn-primary" id="add-med-btn">Add Medication</button>
        </div>

        <div id="med-form" class="form-card hidden">
          <h3 id="med-form-title">Add Medication</h3>
          <input type="hidden" id="med-edit-id" value="" />
          <div class="form-row">
            <div class="form-group">
              <label>Medication Name *</label>
              <input type="text" id="med-name" placeholder="e.g. Vitamin D" required />
            </div>
            <div class="form-group">
              <label>Display Name</label>
              <input type="text" id="med-display-name" placeholder="e.g. Vit D" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Frequency *</label>
              <select id="med-frequency">
                <option value="daily">Daily</option>
                <option value="as_needed">As Needed</option>
              </select>
            </div>
            <div class="form-group">
              <label>Start Date *</label>
              <input type="date" id="med-start-date" />
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="med-notes" placeholder="Dosage instructions..."></textarea>
          </div>
          <div class="slots-section">
            <div class="section-header">
              <h4>Intake Slots</h4>
              <button class="btn btn-sm" id="add-slot-btn" type="button">+ Add Slot</button>
            </div>
            <div id="slots-container"></div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="med-submit">Save</button>
            <button class="btn" id="med-cancel">Cancel</button>
          </div>
        </div>

        {medsWithSlots.length === 0 ? (
          <div class="empty-state"><p>No medications recorded. Click the button above to add one.</p></div>
        ) : (
          <div class="med-grid">
            {medsWithSlots.map((m: any) => (
              <div class="med-detail-card" key={m.id}>
                <div class="med-detail-header">
                  <div>
                    <h3>{m.display_name || m.name}</h3>
                    {m.display_name && <span class="med-subname">{m.name}</span>}
                  </div>
                  <div class="med-actions">
                    <button class="btn btn-sm edit-med-btn"
                      data-id={m.id} data-name={m.name}
                      data-display-name={m.display_name || ""}
                      data-frequency={m.frequency}
                      data-start-date={m.start_date}
                      data-notes={m.notes || ""}
                      data-slots={JSON.stringify(m.slots)}>Edit</button>
                    <button class="btn btn-sm btn-danger delete-med-btn" data-id={m.id}>Discontinue</button>
                  </div>
                </div>
                <div class="med-meta">
                  <span class={`freq-badge freq-${m.frequency}`}>
                    {m.frequency === "daily" ? "Daily" : "As Needed"}
                  </span>
                  <span>Started {m.start_date}</span>
                </div>
                {m.notes && <p class="med-notes">{m.notes}</p>}
                {(m.slots as any[]).length > 0 && (
                  <div class="slots-display">
                    {(m.slots as any[]).map((s: any) => (
                      <div class="slot-chip" key={s.id}>
                        <span class="slot-time">{s.time_hhmm}</span>
                        <span class="slot-dose">{s.dose_amount} {s.dose_unit}</span>
                        {s.label && <span class="slot-label">({s.label})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Layout>
    );
  });
}
