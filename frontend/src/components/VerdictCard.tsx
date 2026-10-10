import type { CompatResult, Verdict } from "../types";

const TITLE: Record<Verdict, string> = {
  compatible: "Compatible",
  partly_compatible: "Partly compatible",
  not_compatible: "Not compatible",
  not_enough_info: "Not enough information",
};
const MARK: Record<string, string> = { pass: "✓", fail: "✕", unknown: "?" };

export default function VerdictCard({ result, onAgain }: { result: CompatResult; onAgain(): void }) {
  return (
    <section className={`verdict ${result.verdict}`} aria-live="polite">
      <header>
        <h2>{TITLE[result.verdict]}</h2>
        <span className="tag">{result.source === "rules" ? "Checked with product rules" : "Rules + AI photo check"}</span>
      </header>

      {result.reasons.length > 0 && (
        <ul className="reasons">{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      )}

      {result.checks.length > 0 && (
        <table className="checks">
          <caption className="sr">Checks performed</caption>
          <tbody>
            {result.checks.map((c) => (
              <tr key={c.rule}>
                <th scope="row"><span className={`mark ${c.status}`} aria-label={c.status}>{MARK[c.status]}</span> {c.rule}</th>
                <td>{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result.missing_info.length > 0 && (
        <div className="missing">
          <h3>What would settle this</h3>
          <ul>{result.missing_info.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <button className="btn" onClick={onAgain}>Try another</button>
    </section>
  );
}
