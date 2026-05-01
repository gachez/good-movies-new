import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Clapperboard,
  ListChecks,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandLink } from "@/components/BrandLogo";
import { db, ensureAppTables } from "@/lib/db";
import { getAdminSession, getConfiguredAdminEmails } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface CountRow {
  value: number;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
  interactionCount: number;
  listCount: number;
  lastEventAt: string | null;
}

interface BreakdownRow {
  label: string;
  count: number;
}

interface RecentEventRow {
  eventName: string;
  userEmail: string | null;
  anonymousId: string | null;
  createdAt: string;
}

function count(sql: string) {
  return (db.prepare(sql).get() as CountRow | undefined)?.value ?? 0;
}

function getDashboardData() {
  ensureAppTables();

  const totals = {
    users: count(`SELECT COUNT(*) AS value FROM "user"`),
    newUsersToday: count(
      `SELECT COUNT(*) AS value FROM "user" WHERE date(createdAt) = date('now')`
    ),
    newUsers7d: count(
      `SELECT COUNT(*) AS value FROM "user" WHERE datetime(createdAt) >= datetime('now', '-7 days')`
    ),
    activeUsers7d: count(
      `SELECT COUNT(DISTINCT user_id) AS value FROM analytics_event WHERE user_id IS NOT NULL AND datetime(created_at) >= datetime('now', '-7 days')`
    ),
    anonymousVisitors7d: count(
      `SELECT COUNT(DISTINCT anonymous_id) AS value FROM analytics_event WHERE user_id IS NULL AND anonymous_id IS NOT NULL AND datetime(created_at) >= datetime('now', '-7 days')`
    ),
    events24h: count(
      `SELECT COUNT(*) AS value FROM analytics_event WHERE datetime(created_at) >= datetime('now', '-1 day')`
    ),
    discoverSearches7d: count(
      `SELECT COUNT(*) AS value FROM analytics_event WHERE event_name IN ('discover_searched', 'discover_prompt_used', 'discover_refined', 'discover_refine_chip_used') AND datetime(created_at) >= datetime('now', '-7 days')`
    ),
    lists: count(`SELECT COUNT(*) AS value FROM movie_list`),
    publicLists: count(`SELECT COUNT(*) AS value FROM movie_list WHERE is_public = 1`),
    feedback7d: count(
      `SELECT COUNT(*) AS value FROM feedback_event WHERE datetime(created_at) >= datetime('now', '-7 days')`
    ),
  };

  const interactionBreakdown = db
    .prepare(
      `
        SELECT action AS label, COUNT(*) AS count
        FROM movie_interaction
        GROUP BY action
        ORDER BY count DESC
      `
    )
    .all() as BreakdownRow[];

  const feedbackBreakdown = db
    .prepare(
      `
        SELECT feedback AS label, COUNT(*) AS count
        FROM feedback_event
        WHERE datetime(created_at) >= datetime('now', '-30 days')
        GROUP BY feedback
        ORDER BY count DESC
      `
    )
    .all() as BreakdownRow[];

  const topEvents = db
    .prepare(
      `
        SELECT event_name AS label, COUNT(*) AS count
        FROM analytics_event
        WHERE datetime(created_at) >= datetime('now', '-7 days')
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT 8
      `
    )
    .all() as BreakdownRow[];

  const recentUsers = db
    .prepare(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          u.createdAt,
          u.updatedAt,
          COUNT(DISTINCT mi.id) AS interactionCount,
          COUNT(DISTINCT ml.id) AS listCount,
          MAX(ae.created_at) AS lastEventAt
        FROM "user" u
        LEFT JOIN movie_interaction mi ON mi.user_id = u.id
        LEFT JOIN movie_list ml ON ml.user_id = u.id
        LEFT JOIN analytics_event ae ON ae.user_id = u.id
        GROUP BY u.id
        ORDER BY datetime(u.createdAt) DESC
        LIMIT 10
      `
    )
    .all() as UserRow[];

  const recentEvents = db
    .prepare(
      `
        SELECT
          ae.event_name AS eventName,
          u.email AS userEmail,
          ae.anonymous_id AS anonymousId,
          ae.created_at AS createdAt
        FROM analytics_event ae
        LEFT JOIN "user" u ON u.id = ae.user_id
        ORDER BY datetime(ae.created_at) DESC
        LIMIT 12
      `
    )
    .all() as RecentEventRow[];

  return {
    totals,
    interactionBreakdown,
    feedbackBreakdown,
    topEvents,
    recentUsers,
    recentEvents,
  };
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

export default async function AdminDashboardPage() {
  const configuredAdmins = getConfiguredAdminEmails();
  const adminSession = await getAdminSession();

  if (!configuredAdmins.length) {
    notFound();
  }

  if (!adminSession) {
    redirect("/profile");
  }

  const data = getDashboardData();

  return (
    <main className="min-h-dvh bg-[#05080b] px-5 py-6 text-white">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandLink className="text-xl" />
            <div className="mt-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  Admin
                </p>
                <h1 className="text-3xl font-black tracking-tight">
                  Dashboard
                </h1>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
            Signed in as{" "}
            <span className="font-bold text-white">
              {adminSession.user.email}
            </span>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Users}
            label="Total users"
            value={data.totals.users}
            detail={`${data.totals.newUsers7d} new this week`}
          />
          <MetricCard
            icon={Activity}
            label="Active users"
            value={data.totals.activeUsers7d}
            detail={`${data.totals.anonymousVisitors7d} anonymous visitors this week`}
          />
          <MetricCard
            icon={BarChart3}
            label="Events"
            value={data.totals.events24h}
            detail="Tracked in the last 24 hours"
          />
          <MetricCard
            icon={Clapperboard}
            label="Discover searches"
            value={data.totals.discoverSearches7d}
            detail="Searches and refinements this week"
          />
          <MetricCard
            icon={ListChecks}
            label="Lists"
            value={data.totals.lists}
            detail={`${data.totals.publicLists} shared publicly`}
          />
          <MetricCard
            icon={MessageSquare}
            label="Feedback"
            value={data.totals.feedback7d}
            detail="Recommendation feedback this week"
          />
          <MetricCard
            icon={CalendarDays}
            label="New today"
            value={data.totals.newUsersToday}
            detail="Accounts created today"
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <BreakdownCard title="Interactions" rows={data.interactionBreakdown} />
          <BreakdownCard title="Feedback" rows={data.feedbackBreakdown} />
          <BreakdownCard title="Top events" rows={data.topEvents} />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-md border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 p-4">
              <h2 className="font-black">Recent users</h2>
              <p className="mt-1 text-sm text-white/50">
                Latest accounts with basic activity counts.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-white/42">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Interactions</th>
                    <th className="px-4 py-3">Lists</th>
                    <th className="px-4 py-3">Last event</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/6">
                      <td className="px-4 py-3">
                        <p className="font-bold text-white">
                          {user.name || "Unnamed user"}
                        </p>
                        <p className="mt-1 text-xs text-white/45">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-white/62">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {user.interactionCount}
                      </td>
                      <td className="px-4 py-3 font-bold">{user.listCount}</td>
                      <td className="px-4 py-3 text-white/62">
                        {formatDate(user.lastEventAt)}
                      </td>
                    </tr>
                  ))}
                  {data.recentUsers.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-white/45" colSpan={5}>
                        No users yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 p-4">
              <h2 className="font-black">Recent activity</h2>
              <p className="mt-1 text-sm text-white/50">
                Latest analytics events.
              </p>
            </div>
            <div className="divide-y divide-white/8">
              {data.recentEvents.map((event, index) => (
                <div key={`${event.eventName}-${event.createdAt}-${index}`} className="p-4">
                  <p className="text-sm font-bold text-white">
                    {formatLabel(event.eventName)}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/45">
                    {event.userEmail || event.anonymousId || "Unknown visitor"}
                  </p>
                  <p className="mt-2 text-xs text-white/35">
                    {formatDate(event.createdAt)}
                  </p>
                </div>
              ))}
              {data.recentEvents.length === 0 && (
                <div className="p-8 text-center text-sm text-white/45">
                  No analytics events yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="mt-8 flex justify-between gap-4 text-sm text-white/45">
          <Link href="/profile" className="font-bold hover:text-cyan-200">
            Back to profile
          </Link>
          <span>Admin access is controlled by ADMIN_EMAILS.</span>
        </footer>
      </section>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/20 text-cyan-200">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-3xl font-black">{value.toLocaleString()}</p>
      </div>
      <h2 className="mt-4 font-bold">{label}</h2>
      <p className="mt-1 text-sm leading-5 text-white/48">{detail}</p>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <h2 className="font-black">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const width = total > 0 ? Math.max((row.count / total) * 100, 4) : 0;
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold capitalize text-white/75">
                  {formatLabel(row.label)}
                </span>
                <span className="text-white/45">{row.count.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-cyan-300"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-white/45">No data yet.</p>
        )}
      </div>
    </div>
  );
}
