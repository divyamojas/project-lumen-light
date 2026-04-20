"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import ApiErrorSnackbar from "./ApiErrorSnackbar";
import {
  applySearchQuery,
  clearApiMonitorLogs,
  getDurationColor,
  getApiMonitorSnapshot,
  getMethodStyle,
  getStatusCodeColor,
  getStatusStyle,
  prettyJson,
  subscribeApiMonitor,
} from "../lib/api-monitor";
import {
  applyAdminMigrations,
  deleteAdminEntry,
  deleteAdminUser,
  executeAdminSql,
  getAdminEntries,
  getAdminMigrations,
  getAdminSchema,
  getAdminStats,
  getAdminUser,
  getAdminUsers,
  updateAdminUserRole,
} from "../lib/admin";
import { resolveAdminIdentity } from "../lib/auth";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "Users" },
  { id: "entries", label: "Entries" },
  { id: "api-monitor", label: "API Monitor" },
  { id: "schema", label: "Schema" },
  { id: "migrations", label: "Migrations" },
  { id: "sql", label: "SQL Console" },
];

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const getRoleTone = (role) => {
  if (role === "superuser") {
    return {
      backgroundColor: "color-mix(in srgb, #d8c58b 26%, transparent)",
      color: "#7c5c11",
    };
  }

  if (role === "admin") {
    return {
      backgroundColor: "color-mix(in srgb, var(--button-bg) 14%, transparent)",
      color: "var(--badge-text)",
    };
  }

  return {
    backgroundColor: "var(--button-secondary-bg)",
    color: "var(--text-secondary)",
  };
};

const getMigrationTone = (status) => {
  if (status === "applied") {
    return {
      backgroundColor: "color-mix(in srgb, #49b67d 18%, transparent)",
      color: "#256b47",
    };
  }

  if (status === "checksum_mismatch") {
    return {
      backgroundColor: "color-mix(in srgb, #c14f4f 18%, transparent)",
      color: "#8b3333",
    };
  }

  return {
    backgroundColor: "color-mix(in srgb, #d8a95e 18%, transparent)",
    color: "#8c5d11",
  };
};

function SectionShell({ title, eyebrow, actions, children }) {
  return (
    <section
      className="rounded-[30px] border p-5 md:p-7"
      style={{
        backgroundColor: "color-mix(in srgb, var(--surface-strong) 92%, transparent)",
        borderColor: "var(--surface-border)",
      }}
    >
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between" style={{ borderColor: "var(--surface-border)" }}>
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
            {eyebrow}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ title, description }) {
  return (
    <div
      className="rounded-[24px] border px-5 py-8 text-center"
      style={{
        borderColor: "var(--surface-border)",
        backgroundColor: "color-mix(in srgb, var(--surface) 86%, transparent)",
      }}
    >
      <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}

function TableShell({ children }) {
  return (
    <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: "var(--surface-border)" }}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminPanel() {
  const auth = useAuth();
  const [access, setAccess] = useState(null);
  const [accessError, setAccessError] = useState("");
  const [isResolvingAccess, setIsResolvingAccess] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState({ data: [], total: 0, page: 1, page_size: 20, has_next: false });
  const [entries, setEntries] = useState({ data: [], total: 0, page: 1, page_size: 20, has_next: false });
  const [schema, setSchema] = useState(null);
  const [migrations, setMigrations] = useState([]);
  const [sqlQuery, setSqlQuery] = useState("select * from public.user_roles limit 10;");
  const [sqlResult, setSqlResult] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [apiError, setApiError] = useState(null);
  const [monitorSnapshot, setMonitorSnapshot] = useState(() => getApiMonitorSnapshot());
  const [monitorMethodFilter, setMonitorMethodFilter] = useState("ALL");
  const [monitorStatusFilter, setMonitorStatusFilter] = useState("ALL");
  const [monitorSourceFilter, setMonitorSourceFilter] = useState("ALL");
  const [monitorSearch, setMonitorSearch] = useState("");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [highlightedLogId, setHighlightedLogId] = useState(null);
  const [scrollToLogId, setScrollToLogId] = useState(null);

  const showApiError = (errorInfo) => {
    if (errorInfo) {
      setApiError(errorInfo);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");
    if (section) setActiveSection(section);
    const highlight = params.get("highlight");
    if (!highlight) return;
    setExpandedLogId(highlight);
    setScrollToLogId(highlight);
    setHighlightedLogId(highlight);
    const flashTimer = setTimeout(() => setHighlightedLogId(null), 2500);
    return () => clearTimeout(flashTimer);
  }, []);

  useEffect(() => {
    if (!scrollToLogId || activeSection !== "api-monitor") return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-log-id="${scrollToLogId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrollToLogId(null);
    }, 120);
    return () => clearTimeout(timer);
  }, [scrollToLogId, activeSection]);

  useEffect(() => {
    if (activeSection !== "api-monitor") {
      return undefined;
    }

    setMonitorSnapshot(getApiMonitorSnapshot());

    return subscribeApiMonitor(() => {
      setMonitorSnapshot(getApiMonitorSnapshot());
    });
  }, [activeSection]);

  const filteredLogs = useMemo(() => applySearchQuery(
    monitorSnapshot.logs,
    monitorSearch,
    { method: monitorMethodFilter, status: monitorStatusFilter, source: monitorSourceFilter },
  ), [monitorSnapshot.logs, monitorSearch, monitorMethodFilter, monitorStatusFilter, monitorSourceFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadAccess = async () => {
      if (auth.isLoading) {
        return;
      }

      if (!auth.isAuthenticated) {
        setIsResolvingAccess(false);
        setAccess(null);
        return;
      }

      setIsResolvingAccess(true);
      setAccessError("");

      try {
        const nextAccess = await resolveAdminIdentity();

        if (!isMounted) {
          return;
        }

        if (!nextAccess.allowed) {
          setAccess(null);
          setAccessError(nextAccess.failureReason || "You do not have access to this admin panel.");
          showApiError(nextAccess.errorInfo);
          return;
        }

        setAccess(nextAccess);
        setNotice("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAccessError(error.message || "Unable to confirm admin access.");
      } finally {
        if (isMounted) {
          setIsResolvingAccess(false);
        }
      }
    };

    loadAccess();

    return () => {
      isMounted = false;
    };
  }, [auth.isAuthenticated, auth.isLoading]);
  const isSuperuser = access?.roleInfo?.role === "superuser";

  const loadDashboard = async () => {
    if (!access?.session?.token) {
      return;
    }

    setIsBusy(true);

    try {
      const [nextStats, nextUsers, nextEntries] = await Promise.all([
        getAdminStats(),
        getAdminUsers({ page: 1, pageSize: 6 }),
        getAdminEntries({ page: 1, pageSize: 6 }),
      ]);

      setStats(nextStats.data);
      setUsers(nextUsers.data);
      setEntries(nextEntries.data);
      showApiError(nextStats.errorInfo || nextUsers.errorInfo || nextEntries.errorInfo);
      setNotice(
        nextStats.error ||
        nextUsers.error ||
        nextEntries.error ||
        ""
      );
    } finally {
      setIsBusy(false);
    }
  };

  const loadUsers = async (page = 1, pageSize = 100) => {
    if (!access?.session?.token) {
      return;
    }

    setIsBusy(true);

    try {
      const nextUsers = await getAdminUsers({ page, pageSize });
      setUsers(nextUsers.data);
      showApiError(nextUsers.errorInfo);
      setNotice(nextUsers.error || "");
    } finally {
      setIsBusy(false);
    }
  };

  const loadEntries = async (page = 1, userId = selectedUserId) => {
    if (!access?.session?.token) {
      return;
    }

    setIsBusy(true);

    try {
      const nextEntries = await getAdminEntries({
        page,
        pageSize: 12,
        userId,
      });
      setEntries(nextEntries.data);
      showApiError(nextEntries.errorInfo);
      setNotice(nextEntries.error || "");
    } finally {
      setIsBusy(false);
    }
  };

  const loadSchema = async (refresh = false) => {
    if (!access?.session?.token) {
      return;
    }

    setIsBusy(true);

    try {
      const nextSchema = await getAdminSchema({ refresh });
      setSchema(nextSchema.data);
      showApiError(nextSchema.errorInfo);
      setNotice(nextSchema.error || "");
    } finally {
      setIsBusy(false);
    }
  };

  const loadMigrations = async () => {
    if (!access?.session?.token) {
      return;
    }

    setIsBusy(true);

    try {
      const nextMigrations = await getAdminMigrations();
      setMigrations(nextMigrations.data);
      showApiError(nextMigrations.errorInfo);
      setNotice(nextMigrations.error || "");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!access?.session?.token) {
      return;
    }

    if (activeSection === "dashboard") {
      loadDashboard();
    }

    if (activeSection === "users") {
      loadUsers(1);
    }

    if (activeSection === "entries") {
      loadUsers(1);
      loadEntries(1, selectedUserId);
    }

    if (activeSection === "schema") {
      loadSchema(false);
    }

    if (activeSection === "migrations") {
      loadMigrations();
    }
  }, [access?.session?.token, activeSection]);

  const recentActivity = useMemo(() => {
    const entryEvents = (entries.data || []).map((entry) => ({
      id: entry.id,
      kind: "entry",
      title: entry.title,
      subtitle: entry.user_id,
      timestamp: entry.updatedAt || entry.createdAt,
    }));

    const signInEvents = (users.data || [])
      .filter((user) => user.last_sign_in_at)
      .map((user) => ({
        id: `${user.user_id}-signin`,
        kind: "signin",
        title: user.email || user.user_id,
        subtitle: "Signed in",
        timestamp: user.last_sign_in_at,
      }));

    return [...entryEvents, ...signInEvents]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 6);
  }, [entries.data, users.data]);

  const handleRoleChange = async (userId, role) => {
    const result = await updateAdminUserRole(userId, role);
    showApiError(result.errorInfo);
    setNotice(result.error || "");
    await loadUsers(users.page);

    if (selectedUserId === userId) {
      const detailResult = await getAdminUser(userId);
      setSelectedUserDetail(detailResult.data);
      showApiError(detailResult.errorInfo);
    }
  };

  const handleDeleteUser = async (userId) => {
    const result = await deleteAdminUser(userId);
    showApiError(result.errorInfo);
    setNotice(result.error || "");
    await loadUsers(users.page);
    if (selectedUserId === userId) {
      setSelectedUserId("");
      setSelectedUserDetail(null);
    }
  };

  const handleSelectUser = async (userId) => {
    setSelectedUserId(userId);

    if (!userId) {
      setSelectedUserDetail(null);
      return;
    }

    const detailResult = await getAdminUser(userId);
    setSelectedUserDetail(detailResult.data);
    showApiError(detailResult.errorInfo);
    setNotice(detailResult.error || "");
  };

  const handleDeleteEntry = async (entryId) => {
    const result = await deleteAdminEntry(entryId);
    showApiError(result.errorInfo);
    setNotice(result.error || "");
    await loadEntries(entries.page, selectedUserId);
  };

  const handleApplyMigrations = async () => {
    const result = await applyAdminMigrations();
    setMigrations(result.data);
    showApiError(result.errorInfo);
    setNotice(result.error || "");
  };

  const handleExecuteSql = async () => {
    setIsBusy(true);

    try {
      const result = await executeAdminSql(sqlQuery);
      setSqlResult(result.data);
      showApiError(result.errorInfo);
      setNotice(result.error || "");
    } finally {
      setIsBusy(false);
    }
  };

  if (auth.isLoading || isResolvingAccess) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="skeleton h-[320px] rounded-[28px]" />
          <div className="skeleton h-[520px] rounded-[32px]" />
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <>
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          <SectionShell eyebrow="Admin Access" title="Sign in to continue">
            <EmptyState
              title="This console is protected."
              description="Use the access dock to start backend-managed Google sign-in."
            />
          </SectionShell>
        </div>
        <ApiErrorSnackbar error={apiError} onClose={() => setApiError(null)} />
      </>
    );
  }

  if (accessError) {
    return (
      <>
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          <SectionShell eyebrow="Admin Access" title="We could not verify permissions">
            <p className="text-sm leading-6" style={{ color: "var(--button-danger-bg)" }}>
              {accessError}
            </p>
          </SectionShell>
        </div>
        <ApiErrorSnackbar error={apiError} onClose={() => setApiError(null)} />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside
          className="hero-panel rounded-[30px] border p-4 lg:sticky lg:top-6 lg:h-fit"
          style={{
            backgroundColor: "color-mix(in srgb, var(--surface-strong) 88%, transparent)",
            borderColor: "var(--surface-border)",
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
            Lumen Admin
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl" style={{ color: "var(--text-primary)" }}>
            Control Room
          </h1>
          <div className="mt-4 rounded-[22px] border px-4 py-3" style={{ borderColor: "var(--surface-border)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {access?.roleInfo?.email || access?.roleInfo?.user_id || "Authenticated session"}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              Signed in via backend token
            </p>
            <span
              className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
              style={getRoleTone(access?.roleInfo?.role)}
            >
              {access?.roleInfo?.role}
            </span>
          </div>
          <nav className="mt-4 space-y-2">
            {SECTIONS.map((section) => {
              const disabled = (section.id === "sql" || section.id === "api-monitor") && !isSuperuser;
              const isDisabled = disabled;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => !isDisabled && setActiveSection(section.id)}
                  disabled={isDisabled}
                  className="flex w-full items-center justify-between rounded-[20px] px-4 py-3 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    backgroundColor:
                      activeSection === section.id
                        ? "var(--button-bg)"
                        : "var(--button-secondary-bg)",
                    color:
                      activeSection === section.id
                        ? "var(--button-text)"
                        : "var(--button-secondary-text)",
                  }}
                >
                  <span>{section.label}</span>
                  {isDisabled ? <span className="text-[10px] uppercase tracking-[0.16em]">superuser</span> : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-5">
          {notice ? (
            <div
              className="rounded-[24px] border px-4 py-4 text-sm"
              style={{
                borderColor: "var(--surface-border)",
                backgroundColor: "color-mix(in srgb, var(--badge-bg) 84%, transparent)",
                color: "var(--text-secondary)",
              }}
            >
              {notice}
            </div>
          ) : null}

          {activeSection === "dashboard" ? (
            <SectionShell eyebrow="Overview" title="Dashboard">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Total Users", value: stats?.total_users ?? "—" },
                  { label: "Entries", value: stats?.total_entries ?? "—" },
                  { label: "Entries Today", value: stats?.entries_today ?? "—" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="metric-card rounded-[24px] border p-5"
                    style={{
                      borderColor: "var(--surface-border)",
                      background:
                        "linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, transparent), color-mix(in srgb, var(--app-bg-secondary) 32%, var(--surface)))",
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                      {item.label}
                    </p>
                    <p className="mt-3 text-4xl font-semibold" style={{ color: "var(--text-primary)" }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="command-card rounded-[24px] border p-4" style={{ borderColor: "var(--surface-border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Recent activity
                  </p>
                  <div className="mt-4 space-y-3">
                    {recentActivity.length ? recentActivity.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-[18px] px-3 py-3"
                        style={{ backgroundColor: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {item.title}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {item.kind === "entry" ? `Entry updated by ${item.subtitle}` : item.subtitle}
                          </p>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatDateTime(item.timestamp)}
                        </p>
                      </div>
                    )) : (
                      <EmptyState title="No recent activity yet" description="As data starts flowing in, fresh entry and sign-in events will show up here." />
                    )}
                  </div>
                </div>

                <div className="hero-panel rounded-[24px] border p-4" style={{ borderColor: "var(--surface-border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Session mode
                  </p>
                  <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                    Bearer-authenticated requests are active against the backend admin API. If an endpoint is unavailable, this panel shows an empty or unavailable state instead of placeholder data.
                  </p>
                </div>
              </div>
            </SectionShell>
          ) : null}

          {activeSection === "users" ? (
            <SectionShell eyebrow="Identity" title="Users">
              <TableShell>
                <table className="min-w-full divide-y" style={{ color: "var(--text-primary)", borderColor: "var(--surface-border)" }}>
                  <thead style={{ backgroundColor: "color-mix(in srgb, var(--surface) 88%, transparent)" }}>
                    <tr className="text-left text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Entries</th>
                      <th className="px-4 py-3">Last sign-in</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.data.length ? users.data.map((user) => (
                      <tr key={user.user_id} className="border-t" style={{ borderColor: "var(--surface-border)" }}>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleSelectUser(user.user_id)}
                            className="text-left"
                          >
                            <span className="block text-sm font-medium">{user.email || user.user_id}</span>
                            <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{user.user_id}</span>
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          {isSuperuser ? (
                            <select
                              value={user.role}
                              onChange={(event) => handleRoleChange(user.user_id, event.target.value)}
                              className="rounded-full px-3 py-2 text-sm"
                              style={{
                                backgroundColor: "var(--button-secondary-bg)",
                                color: "var(--button-secondary-text)",
                                border: "1px solid var(--surface-border)",
                              }}
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                              <option value="superuser">superuser</option>
                            </select>
                          ) : (
                            <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]" style={getRoleTone(user.role)}>
                              {user.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">{user.entry_count}</td>
                        <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                          {formatDateTime(user.last_sign_in_at)}
                        </td>
                        <td className="px-4 py-4">
                          {isSuperuser ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.user_id)}
                              className="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
                              style={{
                                backgroundColor: "color-mix(in srgb, var(--button-danger-bg) 12%, transparent)",
                                color: "var(--button-danger-bg)",
                              }}
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              Superuser only
                            </span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8">
                          <EmptyState title="No users found" description="New accounts will appear here once the backend starts returning user records." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableShell>

              {selectedUserDetail ? (
                <div className="mt-4 rounded-[24px] border p-4" style={{ borderColor: "var(--surface-border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Selected user
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>Email</p>
                      <p className="mt-1 text-sm">{selectedUserDetail.email || selectedUserDetail.user_id}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>Created</p>
                      <p className="mt-1 text-sm">{formatDateTime(selectedUserDetail.created_at)}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </SectionShell>
          ) : null}

          {activeSection === "entries" ? (
            <SectionShell eyebrow="Moderation" title="Entries">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <select
                  value={selectedUserId}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    handleSelectUser(nextValue);
                    loadEntries(1, nextValue);
                  }}
                  className="rounded-full px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "var(--button-secondary-bg)",
                    color: "var(--button-secondary-text)",
                    border: "1px solid var(--surface-border)",
                  }}
                >
                  <option value="">All users</option>
                  {users.data.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.email || user.user_id}
                    </option>
                  ))}
                </select>
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {isSuperuser ? "Delete is available for superusers." : "Moderation actions are hidden unless you are a superuser."}
                </div>
              </div>

              <TableShell>
                <table className="min-w-full divide-y" style={{ color: "var(--text-primary)", borderColor: "var(--surface-border)" }}>
                  <thead style={{ backgroundColor: "color-mix(in srgb, var(--surface) 88%, transparent)" }}>
                    <tr className="text-left text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Tags</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.data.length ? entries.data.map((entry) => (
                      <tr key={entry.id} className="border-t" style={{ borderColor: "var(--surface-border)" }}>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium">{entry.title}</p>
                          <p className="mt-1 max-w-lg text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                            {entry.body}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm">{entry.user_id}</td>
                        <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {(entry.tags || []).length ? entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.12em]"
                                style={{
                                  backgroundColor: "var(--chip-bg)",
                                  color: "var(--chip-text)",
                                }}
                              >
                                {tag}
                              </span>
                            )) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>No tags</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {isSuperuser ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
                              style={{
                                backgroundColor: "color-mix(in srgb, var(--button-danger-bg) 12%, transparent)",
                                color: "var(--button-danger-bg)",
                              }}
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              Superuser only
                            </span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8">
                          <EmptyState title="No entries found" description="Adjust the user filter or wait for the backend to return entry data." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableShell>
            </SectionShell>
          ) : null}

          {activeSection === "api-monitor" && isSuperuser ? (
            <SectionShell
              eyebrow="Observability"
              title="API Monitor"
              actions={(
                <button
                  type="button"
                  onClick={() => { clearApiMonitorLogs(); setExpandedLogId(null); }}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--button-secondary-bg)",
                    color: "var(--button-secondary-text)",
                    border: "1px solid var(--surface-border)",
                  }}
                >
                  Clear log
                </button>
              )}
            >
              <style>{`
                @keyframes lumen-highlight-flash {
                  0%   { background-color: color-mix(in srgb, var(--button-bg) 18%, transparent); }
                  40%  { background-color: color-mix(in srgb, var(--button-bg) 10%, transparent); }
                  100% { background-color: transparent; }
                }
                @keyframes lumen-detail-in {
                  from { opacity: 0; transform: translateY(-5px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
                .lumen-log-highlighted { animation: lumen-highlight-flash 2.4s ease forwards; border-left: 3px solid var(--button-bg) !important; }
                .lumen-detail-panel { animation: lumen-detail-in 0.18s ease; }
              `}</style>
              {(() => {
                const samples = monitorSnapshot.logs.filter((log) => typeof log.durationMs === "number");
                const avgLatency = samples.length
                  ? Math.round(samples.reduce((sum, log) => sum + log.durationMs, 0) / samples.length)
                  : null;
                const errorCount = monitorSnapshot.logs.filter((log) => log.status === "error").length;
                const successCount = monitorSnapshot.logs.filter((log) => log.status === "success").length;
                const p95 = (() => {
                  const sorted = samples.map((l) => l.durationMs).sort((a, b) => a - b);
                  if (!sorted.length) return null;
                  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
                })();

                return (
                  <>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                      {[
                        { label: "Total", value: monitorSnapshot.logs.length },
                        { label: "Live", value: monitorSnapshot.activeCount },
                        { label: "Errors", value: errorCount, danger: errorCount > 0 },
                        { label: "Success", value: successCount },
                        { label: "Avg Latency", value: avgLatency !== null ? `${avgLatency} ms` : "—" },
                        { label: "P95 Latency", value: p95 !== null ? `${p95} ms` : "—" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-[20px] border p-4"
                          style={{
                            borderColor: item.danger
                              ? "color-mix(in srgb, var(--button-danger-bg) 30%, var(--surface-border))"
                              : "var(--surface-border)",
                            background: item.danger
                              ? "color-mix(in srgb, var(--button-danger-bg) 6%, var(--surface))"
                              : "linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, transparent), color-mix(in srgb, var(--app-bg-secondary) 32%, var(--surface)))",
                          }}
                        >
                          <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: item.danger ? "var(--button-danger-bg)" : "var(--text-muted)" }}>
                            {item.label}
                          </p>
                          <p className="mt-2 text-2xl font-semibold" style={{ color: item.danger ? "var(--button-danger-bg)" : "var(--text-primary)" }}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[24px] border" style={{ borderColor: "var(--surface-border)" }}>
                      <div className="space-y-2 border-b px-4 py-3" style={{ borderColor: "var(--surface-border)" }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] uppercase tracking-[0.14em] w-14 shrink-0" style={{ color: "var(--text-muted)" }}>Method</span>
                          <div className="flex flex-wrap gap-1">
                            {["ALL", "GET", "POST", "PATCH", "DELETE"].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setMonitorMethodFilter(m)}
                                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                                style={{
                                  backgroundColor: monitorMethodFilter === m ? "var(--button-bg)" : "var(--button-secondary-bg)",
                                  color: monitorMethodFilter === m ? "var(--button-text)" : "var(--button-secondary-text)",
                                  border: "1px solid var(--surface-border)",
                                }}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] uppercase tracking-[0.14em] w-14 shrink-0" style={{ color: "var(--text-muted)" }}>Status</span>
                          <div className="flex flex-wrap gap-1">
                            {[{ key: "ALL", label: "All" }, { key: "success", label: "Success" }, { key: "error", label: "Error" }, { key: "pending", label: "Pending" }].map((s) => (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => setMonitorStatusFilter(s.key)}
                                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                                style={{
                                  backgroundColor: monitorStatusFilter === s.key
                                    ? (s.key === "error" ? "color-mix(in srgb, var(--button-danger-bg) 14%, transparent)" : "var(--button-bg)")
                                    : "var(--button-secondary-bg)",
                                  color: monitorStatusFilter === s.key
                                    ? (s.key === "error" ? "var(--button-danger-bg)" : "var(--button-text)")
                                    : "var(--button-secondary-text)",
                                  border: "1px solid var(--surface-border)",
                                }}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] uppercase tracking-[0.14em] w-14 shrink-0" style={{ color: "var(--text-muted)" }}>Source</span>
                          <div className="flex flex-wrap gap-1">
                            {[{ key: "ALL", label: "All" }, { key: "requestJson", label: "requestJson" }, { key: "auth", label: "auth" }, { key: "app", label: "app" }].map((s) => (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => setMonitorSourceFilter(s.key)}
                                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                                style={{
                                  backgroundColor: monitorSourceFilter === s.key ? "var(--button-bg)" : "var(--button-secondary-bg)",
                                  color: monitorSourceFilter === s.key ? "var(--button-text)" : "var(--button-secondary-text)",
                                  border: "1px solid var(--surface-border)",
                                }}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={monitorSearch}
                          onChange={(e) => setMonitorSearch(e.target.value)}
                          placeholder="Search across all fields — or use field:value syntax (source:auth status:500 method:GET)"
                          className="w-full rounded-[14px] px-4 py-2 text-sm"
                          style={{
                            backgroundColor: "var(--button-secondary-bg)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--surface-border)",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div className="divide-y" style={{ borderColor: "var(--surface-border)" }}>
                        {filteredLogs.length ? filteredLogs.map((log) => {
                          const isExpanded = expandedLogId === log.id;
                          const isFlashing = highlightedLogId === log.id;
                          const methodColors = getMethodStyle(log.method);
                          const durationColor = getDurationColor(log.durationMs);
                          const statusCodeColor = getStatusCodeColor(log.statusCode);
                          return (
                            <div
                              key={log.id}
                              data-log-id={log.id}
                              className={isFlashing ? "lumen-log-highlighted" : ""}
                              style={{ borderLeft: isExpanded && !isFlashing ? "3px solid color-mix(in srgb, var(--button-bg) 40%, transparent)" : isFlashing ? undefined : "3px solid transparent", transition: "border-color 0.2s ease" }}
                            >
                              <button
                                type="button"
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="w-full px-4 py-3 text-left"
                                style={{ cursor: "pointer" }}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] font-mono"
                                      style={{ backgroundColor: methodColors.bg, color: methodColors.color, minWidth: "3.5rem", textAlign: "center" }}
                                    >
                                      {log.method}
                                    </span>
                                    <span
                                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                                      style={getStatusStyle(log.status)}
                                    >
                                      {log.status}
                                    </span>
                                    <span className="truncate text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                                      {log.url.replace(/^https?:\/\/[^/]+/, "")}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-3 text-[11px] font-mono">
                                    <span style={{ color: statusCodeColor, fontWeight: 600 }}>{log.statusCode || "—"}</span>
                                    <span style={{ color: durationColor, fontWeight: 600 }}>{typeof log.durationMs === "number" ? `${log.durationMs}ms` : "—"}</span>
                                    <span style={{ color: "var(--text-muted)" }}>{new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(log.startedAt))}</span>
                                    <span style={{ color: "var(--text-muted)", opacity: 0.45, fontSize: "9px" }}>{isExpanded ? "▲" : "▼"}</span>
                                  </div>
                                </div>
                                {log.errorMessage && !isExpanded ? (
                                  <p className="mt-1.5 pl-[3.75rem] text-xs font-mono" style={{ color: "#ef4444" }}>
                                    {log.errorCode ? <span className="opacity-60">[{log.errorCode}] </span> : null}{log.errorMessage}
                                  </p>
                                ) : null}
                              </button>

                              {isExpanded ? (
                                <div
                                  className="lumen-detail-panel border-t px-5 pb-5 pt-4 space-y-4"
                                  style={{ borderColor: "var(--surface-border)", background: "linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 60%, transparent), color-mix(in srgb, var(--surface-strong) 30%, transparent))" }}
                                >
                                  <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="sm:col-span-2">
                                      <p className="text-[9px] uppercase tracking-[0.18em] mb-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>URL</p>
                                      <p className="break-all text-xs font-mono leading-5" style={{ color: "var(--text-secondary)" }}>{log.url}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      {[
                                        ["Method", log.method],
                                        ["HTTP", log.statusCode ? String(log.statusCode) : "—"],
                                        ["Duration", typeof log.durationMs === "number" ? `${log.durationMs}ms` : "—"],
                                        ["Source", log.source],
                                        ["Time", new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(log.startedAt))],
                                        ["ID", log.id.slice(-8)],
                                      ].map(([k, v]) => (
                                        <div key={k}>
                                          <p className="text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: "var(--text-muted)" }}>{k}</p>
                                          <p className="mt-0.5 text-[11px] font-mono break-all" style={{ color: "var(--text-primary)" }}>{v}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {[
                                    log.requestHeaders && { label: "Request Headers", value: JSON.stringify(log.requestHeaders, null, 2) },
                                    log.requestBody && { label: "Request Body", value: prettyJson(log.requestBody) },
                                    log.responseSnippet && { label: "Response Body", value: prettyJson(log.responseSnippet) },
                                  ].filter(Boolean).map(({ label, value }) => (
                                    <div key={label}>
                                      <p className="text-[9px] uppercase tracking-[0.18em] mb-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
                                      <pre
                                        className="overflow-auto rounded-[12px] p-3 text-[11px] leading-5 whitespace-pre-wrap break-all font-mono"
                                        style={{ background: "color-mix(in srgb, var(--surface-strong) 80%, transparent)", color: "var(--text-secondary)", border: "1px solid var(--surface-border)" }}
                                      >
                                        {value}
                                      </pre>
                                    </div>
                                  ))}

                                  {log.errorMessage ? (
                                    <div className="rounded-[12px] px-3 py-3" style={{ background: "color-mix(in srgb, #ef4444 10%, transparent)", border: "1px solid color-mix(in srgb, #ef4444 25%, transparent)" }}>
                                      <p className="text-[9px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: "#ef4444" }}>
                                        Error{log.errorCode ? ` · ${log.errorCode}` : ""}
                                      </p>
                                      <p className="text-xs font-mono" style={{ color: "#ef4444" }}>{log.errorMessage}</p>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        }) : (
                          <div className="px-4 py-8">
                            <EmptyState
                              title={monitorSearch || monitorMethodFilter !== "ALL" || monitorStatusFilter !== "ALL" || monitorSourceFilter !== "ALL" ? "No matching requests" : "No API traffic yet"}
                              description={monitorSearch || monitorMethodFilter !== "ALL" || monitorStatusFilter !== "ALL" || monitorSourceFilter !== "ALL" ? "Try adjusting your filters." : "Use the app normally and tracked requests will appear here in real time."}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </SectionShell>
          ) : null}

          {activeSection === "schema" ? (
            <SectionShell
              eyebrow="Database"
              title="Schema Snapshot"
              actions={(
                <button
                  type="button"
                  onClick={() => loadSchema(true)}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--button-bg)",
                    color: "var(--button-text)",
                  }}
                >
                  Refresh
                </button>
              )}
            >
              {schema ? (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                    Captured {formatDateTime(schema.captured_at)}
                  </p>
                  {Object.values(schema.tables || {}).map((table) => (
                    <div key={`${table.schema}.${table.name}`} className="rounded-[24px] border p-4" style={{ borderColor: "var(--surface-border)" }}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{table.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{table.schema}</p>
                        </div>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {table.columns.length} columns
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {table.columns.map((column) => (
                          <div
                            key={`${table.name}-${column.name}`}
                            className="rounded-[18px] border px-3 py-3"
                            style={{ borderColor: "var(--surface-border)", backgroundColor: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
                          >
                            <p className="text-sm font-semibold">{column.name}</p>
                            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                              {column.type} / {column.udt_name}
                            </p>
                            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                              {column.nullable ? "Nullable" : "Required"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No schema snapshot yet" description="Use refresh to fetch the latest database structure." />
              )}
            </SectionShell>
          ) : null}

          {activeSection === "migrations" ? (
            <SectionShell
              eyebrow="Database"
              title="Migrations"
              actions={isSuperuser ? (
                <button
                  type="button"
                  onClick={handleApplyMigrations}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--button-bg)",
                    color: "var(--button-text)",
                  }}
                >
                  Apply pending
                </button>
              ) : null}
            >
              <div className="space-y-3">
                {migrations.length ? migrations.map((migration) => (
                  <div
                    key={migration.filename}
                    className="flex flex-col gap-3 rounded-[22px] border px-4 py-4 md:flex-row md:items-center md:justify-between"
                    style={{ borderColor: "var(--surface-border)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold">{migration.filename}</p>
                      <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                        checksum {migration.checksum}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]" style={getMigrationTone(migration.status)}>
                        {migration.status}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatDateTime(migration.applied_at)}
                      </span>
                    </div>
                  </div>
                )) : (
                  <EmptyState title="No migrations found" description="Migration status will appear here once the backend exposes records." />
                )}
              </div>
            </SectionShell>
          ) : null}

          {activeSection === "sql" ? (
            <SectionShell eyebrow="Database" title="SQL Console">
              {isSuperuser ? (
                <>
                  <textarea
                    value={sqlQuery}
                    onChange={(event) => setSqlQuery(event.target.value)}
                    className="min-h-[180px] w-full rounded-[24px] border px-4 py-4 outline-none"
                    style={{
                      borderColor: "var(--surface-border)",
                      backgroundColor: "color-mix(in srgb, var(--surface) 88%, transparent)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="select * from public.user_roles limit 10;"
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleExecuteSql}
                      className="rounded-full px-5 py-3 text-sm font-semibold"
                      style={{
                        backgroundColor: "var(--button-bg)",
                        color: "var(--button-text)",
                      }}
                    >
                      Execute
                    </button>
                  </div>

                  {sqlResult ? (
                    <div className="mt-5 rounded-[24px] border p-4" style={{ borderColor: "var(--surface-border)" }}>
                      <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
                        <span>Status {sqlResult.status}</span>
                        <span>Rows {sqlResult.row_count}</span>
                        <span>{sqlResult.duration_ms} ms</span>
                      </div>
                      <TableShell>
                        <table className="mt-4 min-w-full">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                              {Object.keys(sqlResult.rows?.[0] || { result: "" }).map((key) => (
                                <th key={key} className="px-4 py-3">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(sqlResult.rows || []).map((row, index) => (
                              <tr key={`row-${index}`} className="border-t" style={{ borderColor: "var(--surface-border)" }}>
                                {Object.keys(sqlResult.rows?.[0] || { result: "" }).map((key) => (
                                  <td key={`${index}-${key}`} className="px-4 py-3 text-sm">
                                    {typeof row[key] === "object" ? JSON.stringify(row[key]) : String(row[key] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </TableShell>
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState title="Superuser access required" description="This console is intentionally hidden from admin-level accounts." />
              )}
            </SectionShell>
          ) : null}

          {isBusy ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Syncing with the admin API...
            </p>
          ) : null}
        </div>
      </div>
      <ApiErrorSnackbar error={apiError} onClose={() => setApiError(null)} />
    </div>
  );
}

export default AdminPanel;
