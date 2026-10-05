"use client";
import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Wrench,
  CloudLightning,
  Users,
  HeartPulse,
  Ban,
  RotateCcw,
  ExternalLink,
  Database,
  Play,
} from "lucide-react";
import { useDemo } from "../domain/store";
import { Badge, Panel, Stamp, Empty } from "./ui-kit";
import { SOURCES } from "../domain/seed";
export function Alerts() {
  const { state: s, role, act } = useDemo(),
    [showResolved, setShowResolved] = useState(false);
  const alerts = s.alerts.filter((a) => showResolved || !a.resolved);
  return (
    <>
      <div className="toolbar">
        <h2>
          {alerts.length} {showResolved ? "total" : "active"} alerts
        </h2>
        <label className="check-label">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Include resolved
        </label>
      </div>
      <div className="alerts-page">
        {alerts.map((a) => (
          <Panel key={a.id}>
            <div className="row between">
              <div className="row">
                <AlertTriangle size={22} />
                <h2>{a.title}</h2>
              </div>
              <Badge status={a.resolved ? "COMPLETED" : a.severity} />
            </div>
            <p>{a.detail}</p>
            <div className="row between">
              <small className="muted">
                {a.entity} · <Stamp value={a.timestamp} />
              </small>
              <button
                className="btn"
                disabled={a.acknowledged}
                onClick={() => act({ type: "ACK", alertId: a.id, actor: role })}
              >
                {a.acknowledged ? (
                  <>
                    <Check size={15} />
                    Acknowledged
                  </>
                ) : (
                  "Acknowledge"
                )}
              </button>
            </div>
          </Panel>
        ))}
      </div>
      {!alerts.length && (
        <Empty
          title="No active alerts"
          detail="New operational conflicts will appear here automatically."
        />
      )}
    </>
  );
}
export function Audit() {
  const { state: s } = useDemo(),
    [query, setQuery] = useState("");
  const list = s.audit.filter((a) =>
    [a.action, a.entity, a.actor, a.missionId]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="toolbar">
        <input
          className="wide-input"
          aria-label="Search audit events"
          placeholder="Search action, aircraft, mission or actor…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="muted">{list.length} events · newest first</span>
      </div>
      <Panel
        title="Operational audit trail"
        sub="Undo creates a new event; historical actions remain recorded."
      >
        <div className="audit-list">
          {list.map((a) => (
            <article className="audit-event" key={a.id}>
              <div className="audit-line-icon">
                <Clock size={16} />
              </div>
              <div>
                <div className="row between">
                  <strong>{a.action}</strong>
                  <small>
                    <Stamp value={a.timestamp} />
                  </small>
                </div>
                <p>
                  {a.entity} <span className="muted">· {a.actor}</span>
                </p>
                <div className="audit-state">
                  <span>{a.previous}</span>
                  <span>→</span>
                  <b>{a.next}</b>
                </div>
                <p className="muted">{a.reason}</p>
                {a.missionId && (
                  <small className="cyan-text">
                    Related mission: {a.missionId}
                  </small>
                )}
              </div>
            </article>
          ))}
        </div>
        {!list.length && <Empty title="No matching audit events" />}
      </Panel>
    </>
  );
}
export function Scenarios({
  inspect,
  replan,
}: {
  inspect: () => void;
  replan: () => void;
}) {
  const { state: s, role, act } = useDemo();
  const steps = [
    [
      "Inspect TR-03",
      "Select the left engine and record a major EGT sensor anomaly.",
    ],
    [
      "Observe the impact",
      "Aircraft grounded, RLF-204 conflicted, a work order and critical alerts created.",
    ],
    [
      "Compare alternatives",
      "TR-07 is ready at 14:18; TR-06 at 14:47. Review constraints and calculated metrics.",
    ],
    [
      "Approve the replan",
      "The planner approves a replacement. All operational views use the new assignment.",
    ],
    [
      "Clear maintenance",
      "Complete the repair, record a passed inspection and issue clearance. TR-03 returns to service.",
    ],
  ];
  return (
    <>
      <div className="callout">
        <Play size={22} />
        <div>
          <strong>A complete disruption-to-recovery demonstration</strong>
          <p>
            Scenario controls inject synthetic events regardless of the selected
            demo role. Normal operational actions remain role gated.
          </p>
        </div>
      </div>
      <div className="scenario-grid">
        {[
          {
            title: "Record engine fault",
            icon: Wrench,
            desc: "Ground TR-03 and flag RLF-204. Creates MX work order and reserves an EGT sensor.",
            action: () =>
              act({
                type: "FAULT",
                aircraftId: "VAAYU-TR-03",
                componentId: "left-engine",
                fault: "EGT sensor anomaly",
                severity: "Major",
                repairMinutes: 150,
                actor: role,
                demo: true,
              }),
            disabled: s.aircraft[2].components[0].status === "FAULT",
          },
          {
            title: "Introduce severe weather",
            icon: CloudLightning,
            desc: "Thunderstorm over Relief Zone Delta. Visibility 1 km, wind 42 kt, until 15:30 IST.",
            action: () => act({ type: "WEATHER", actor: role }),
            disabled: s.weather.some((w) => w.severity === "SEVERE"),
          },
          {
            title: "Mark crew unavailable",
            icon: Users,
            desc: "Crew-03 becomes unavailable. All assigned missions are revalidated immediately.",
            action: () =>
              act({
                type: "CREW",
                crewId: "CREW-03",
                available: false,
                actor: role,
                demo: true,
              }),
            disabled: !s.crew[2].available,
          },
          {
            title: "Add urgent medevac",
            icon: HeartPulse,
            desc: "Create a P1 evacuation request. A medical aircraft and supervisor approval are required.",
            action: () => act({ type: "URGENT", actor: role }),
            disabled: s.missions.some((m) => m.id === "MED-URGENT"),
          },
          {
            title: "Add airspace restriction",
            icon: Ban,
            desc: "Close the fictional Alpha–Delta corridor until 15:00 IST. Delay or replan affected missions.",
            action: () => act({ type: "AIRSPACE", actor: role }),
            disabled: s.restrictions.some((r) => r.id === "DEMO-N-03"),
          },
          {
            title: "Reset demo",
            icon: RotateCcw,
            desc: "Restore all seeded aircraft, missions, crew, weather, work orders, resources and audit events.",
            action: () => act({ type: "RESET" }),
            disabled: false,
          },
        ].map((x) => (
          <Panel className="scenario-card" key={x.title}>
            <x.icon size={28} />
            <h2>{x.title}</h2>
            <p>{x.desc}</p>
            <button className="btn" disabled={x.disabled} onClick={x.action}>
              {x.disabled ? "Scenario active" : x.title}
            </button>
          </Panel>
        ))}
      </div>
      <Panel
        title="Hero demonstration"
        sub="Start from Reset Demo for the exact TR-03 → TR-07 flow"
      >
        <div className="demo-steps">
          {steps.map(([title, desc], i) => (
            <div key={title}>
              <span>{i + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="row">
          <button className="btn primary" onClick={inspect}>
            Open TR-03 inspection
          </button>
          <button className="btn" onClick={replan}>
            Open replanning
          </button>
        </div>
      </Panel>
    </>
  );
}
export function Sources() {
  const { state: s, persistence, isDemo } = useDemo();
  return (
    <>
      <div className="callout warning">
        <Database size={23} />
        <div>
          <strong>
            {isDemo
              ? "DEMO MODE · SYNTHETIC RECORDS"
              : "NO OPERATIONAL DATA FEED CONNECTED"}
          </strong>
          <p>
            {isDemo
              ? "Operational records in this optional scenario are synthetic. The geographic basemap is public reference data."
              : "The map provides geographic context. Aircraft telemetry, mission assignments, weather and airspace feeds are unavailable. No operational data is inferred from the map."}
          </p>
        </div>
      </div>
      <Panel title="Geographic map sources">
        <p>
          Bundled basemap: Natural Earth public-domain boundaries, India point
          of view. Jammu &amp; Kashmir and Ladakh are shown in full, including
          PoK, Gilgit-Baltistan, Aksai Chin and the Shaksgam Valley. City labels
          are geographic reference points, not operating bases.
        </p>
        <div className="row">
          <a
            className="text-btn"
            href="https://www.naturalearthdata.com/about/terms-of-use/"
            target="_blank"
            rel="noreferrer"
          >
            Natural Earth
          </a>
        </div>
        <p className="muted">
          The basemap is bundled and needs no external tile service. It is a
          small-scale reference map, not a Survey of India product, and supplies
          no aviation weather, aircraft positions or airspace clearance.
        </p>
      </Panel>
      <div className="source-grid">
        {SOURCES.map((source) => (
          <Panel
            key={source.name}
            title={source.name}
            action={<Badge status={isDemo ? source.mode : "UNAVAILABLE"} />}
          >
            <p>{source.description}</p>
            <div className="source-meta">
              <span>Operational feed</span>
              <b>UNAVAILABLE</b>
              <span>Retrieved operational data</span>
              <b>Never</b>
              <span>Public context checked</span>
              <b>
                02 Oct 2026
                {source.mode === "UNAVAILABLE" ? " · site access blocked" : ""}
              </b>
            </div>
            <a
              className="text-btn"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              Public reference
              <ExternalLink size={14} />
            </a>
          </Panel>
        ))}
      </div>
      <Panel title="Dataset status">
        <div className="detail-grid">
          <div>
            <span>Environment</span>
            <strong>
              {isDemo ? "Local demonstration" : "Clean workspace"}
            </strong>
          </div>
          <div>
            <span>Persistence</span>
            <strong>{persistence}</strong>
          </div>
          <div>
            <span>Last state update</span>
            <strong>
              {isDemo ? (
                <Stamp value={s.updatedAt} />
              ) : (
                "No operational records"
              )}
            </strong>
          </div>
          <div>
            <span>Planning date / clock</span>
            <strong>
              {isDemo ? "02 Oct 2026 · 13:30 IST (frozen)" : "Not active"}
            </strong>
          </div>
        </div>
        {isDemo && (
          <p className="muted">
            The planning clock is fixed so the demonstration is repeatable.
            Audit timestamps record the actual interaction time. Weather
            freshness is relative to the simulated planning clock; unknown and
            stale component data block aircraft assignment.
          </p>
        )}
        <p className="muted">
          The complete official SIH26250 brief has not been independently
          verified. No claim of full official-brief compliance is made. Public
          reference links provide context only; generated records are never
          presented as government observations.
        </p>
      </Panel>
      {isDemo && (
        <Panel title="Weather record provenance">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Record / location</th>
                  <th>Source context</th>
                  <th>Mode</th>
                  <th>Updated</th>
                  <th>Freshness</th>
                </tr>
              </thead>
              <tbody>
                {s.weather.map((w) => (
                  <tr key={w.id}>
                    <td>
                      {w.id} / {w.locationId}
                    </td>
                    <td>
                      <a href={w.sourceUrl} target="_blank" rel="noreferrer">
                        {w.sourceName}
                      </a>
                    </td>
                    <td>
                      <Badge status={w.dataMode} />
                    </td>
                    <td>
                      <Stamp value={w.updatedAt} />
                    </td>
                    <td>{w.isStale ? "STALE" : "Demo current"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <Panel title="Airspace record provenance">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference / constraint</th>
                <th>Source context</th>
                <th>Mode</th>
                <th>Updated</th>
                <th>Window IST</th>
              </tr>
            </thead>
            <tbody>
              {s.restrictions.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.id}
                    <small>{r.name}</small>
                  </td>
                  <td>
                    <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                      {r.sourceName}
                    </a>
                  </td>
                  <td>
                    <Badge status={r.dataMode} />
                  </td>
                  <td>
                    <Stamp value={r.updatedAt} />
                  </td>
                  <td>
                    {Math.floor(r.start / 60)}:
                    {String(r.start % 60).padStart(2, "0")}–
                    {Math.floor(r.end / 60)}:
                    {String(r.end % 60).padStart(2, "0")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
