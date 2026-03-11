"use client";

import { useState, useEffect } from "react";
import { Bot, Plus, Users, Play, Pause, X } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle";
  icon: string;
  color: string;
}

interface Team {
  name: string;
  agents: string[];
  active: boolean;
}

const defaultAgents: Agent[] = [
  {
    id: "ceo",
    name: "CEO Agent",
    role: "Orchestrator",
    status: "active",
    icon: "👔",
    color: "#6366f1",
  },
  {
    id: "dev",
    name: "Developer",
    role: "Code & Debug",
    status: "active",
    icon: "💻",
    color: "#8b5cf6",
  },
  {
    id: "researcher",
    name: "Researcher",
    role: "Web Research",
    status: "idle",
    icon: "🔬",
    color: "#06b6d4",
  },
  {
    id: "writer",
    name: "Writer",
    role: "Content Creation",
    status: "idle",
    icon: "✍️",
    color: "#ec4899",
  },
];

const defaultTeams: Team[] = [
  {
    name: "Dev Team",
    agents: ["CEO Agent", "Developer", "Researcher"],
    active: true,
  },
  { name: "Research Team", agents: ["Researcher", "Writer"], active: false },
  {
    name: "Full Stack",
    agents: ["CEO Agent", "Developer", "Researcher", "Writer"],
    active: false,
  },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  useEffect(() => {
    const savedAgents = localStorage.getItem("delirium_agents");
    if (savedAgents)
      try {
        setAgents(JSON.parse(savedAgents));
      } catch {}
    const savedTeams = localStorage.getItem("delirium_teams");
    if (savedTeams)
      try {
        setTeams(JSON.parse(savedTeams));
      } catch {}
  }, []);

  const saveAgents = (updated: Agent[]) => {
    setAgents(updated);
    localStorage.setItem("delirium_agents", JSON.stringify(updated));
  };

  const saveTeams = (updated: Team[]) => {
    setTeams(updated);
    localStorage.setItem("delirium_teams", JSON.stringify(updated));
  };

  const toggleAgent = (id: string) => {
    saveAgents(
      agents.map((a) =>
        a.id === id
          ? ({
              ...a,
              status: a.status === "active" ? "idle" : "active",
            } as Agent)
          : a,
      ),
    );
  };

  const createAgent = () => {
    if (!newName.trim()) return;
    const id = newName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    const icons = ["🤖", "🧠", "⚡", "🎯", "🔮"];
    const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#ec4899", "#10b981"];
    const newAgent: Agent = {
      id,
      name: newName,
      role: newRole || "Custom Agent",
      status: "idle",
      icon: icons[agents.length % icons.length],
      color: colors[agents.length % colors.length],
    };
    saveAgents([...agents, newAgent]);
    setNewName("");
    setNewRole("");
    setShowCreate(false);
  };

  const deleteAgent = (id: string) => {
    saveAgents(agents.filter((a) => a.id !== id));
  };

  const toggleTeam = (name: string) => {
    saveTeams(
      teams.map((t) => (t.name === name ? { ...t, active: !t.active } : t)),
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <Bot size={18} style={{ color: "var(--accent-indigo)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Agents
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {agents.filter((a) => a.status === "active").length} active ·{" "}
              {agents.length} total
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary flex items-center gap-1.5 text-[12px]"
        >
          <Plus size={13} /> Create Agent
        </button>
      </div>

      {showCreate && (
        <div className="liquid-glass p-4 animate-fade-in">
          <div className="space-y-3 relative z-10">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Agent name..."
              className="input-glass w-full"
            />
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Role (e.g. Code Review, Data Analysis)..."
              className="input-glass w-full"
            />
            <div className="flex gap-2">
              <button onClick={createAgent} className="btn-primary text-xs">
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {agents.map((a) => (
          <div
            key={a.id}
            className="liquid-glass liquid-glass-hover p-4 transition-all group cursor-pointer"
            onClick={() => toggleAgent(a.id)}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${a.color}10` }}
                >
                  {a.icon}
                </div>
                <div className="flex items-center gap-2">
                  {!defaultAgents.some((d) => d.id === a.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAgent(a.id);
                      }}
                      className="p-1 rounded-lg hover:bg-white/5"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      <X size={12} />
                    </button>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`status-dot ${a.status === "active" ? "status-online" : ""}`}
                      style={{
                        width: 6,
                        height: 6,
                        background:
                          a.status === "active"
                            ? "var(--success)"
                            : "var(--text-ghost)",
                      }}
                    />
                    <span
                      className="text-[10px] capitalize font-medium"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      {a.status}
                    </span>
                  </div>
                </div>
              </div>
              <h3
                className="text-[13px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {a.name}
              </h3>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {a.role}
              </p>
            </div>
          </div>
        ))}
      </div>

      <h2
        className="text-[13px] font-semibold flex items-center gap-2 pt-2"
        style={{ color: "var(--text-primary)" }}
      >
        <Users size={13} style={{ color: "var(--accent-violet)" }} /> Team
        Templates
      </h2>
      <div className="space-y-2">
        {teams.map((team, i) => (
          <div
            key={i}
            className="liquid-glass flex items-center justify-between p-3.5"
          >
            <div className="relative z-10 flex-1 min-w-0">
              <h3
                className="text-[12px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {team.name}
              </h3>
              <p
                className="text-[10px] truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {team.agents.join(" · ")}
              </p>
            </div>
            <button
              onClick={() => toggleTeam(team.name)}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all relative z-10 shrink-0"
              style={{
                background: team.active
                  ? "rgba(16,185,129,0.1)"
                  : "var(--bg-elevated)",
                color: team.active ? "var(--success)" : "var(--text-muted)",
                border: `1px solid ${team.active ? "rgba(16,185,129,0.2)" : "var(--glass-border)"}`,
              }}
            >
              {team.active ? (
                <>
                  <Pause size={11} /> Active
                </>
              ) : (
                <>
                  <Play size={11} /> Activate
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
