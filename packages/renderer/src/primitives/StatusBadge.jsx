/**
 * StatusBadge — semantic colored chip для status fields (U-derive Phase 1).
 *
 * Preset palette covering common job/run/lifecycle states.
 * Originally `JobStatusBadge` в gravitino host (U7).
 */
const PALETTE = {
  success:   { bg: "rgba(113,221,55,0.18)",  text: "#71DD37", label: "Success" },
  failed:    { bg: "rgba(255,62,29,0.18)",   text: "#FF3E1D", label: "Failed" },
  running:   { bg: "rgba(3,195,236,0.18)",   text: "#03C3EC", label: "Running" },
  queued:    { bg: "rgba(255,171,0,0.18)",   text: "#FFAB00", label: "Queued" },
  cancelled: { bg: "rgba(148,163,184,0.18)", text: "#94a3b8", label: "Cancelled" },
  active:    { bg: "rgba(113,221,55,0.18)",  text: "#71DD37", label: "Active" },
  inactive:  { bg: "rgba(148,163,184,0.18)", text: "#94a3b8", label: "Inactive" },
};

export default function StatusBadge({ status, label }) {
  const s = PALETTE[status] || { bg: "rgba(148,163,184,0.18)", text: "#94a3b8", label: status };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px", borderRadius: 4, fontSize: 11,
      background: s.bg, color: s.text, fontWeight: 600,
      textTransform: "capitalize",
    }}>{label || s.label}</span>
  );
}

export { PALETTE as STATUS_PALETTE };
