import { ArrowLeft, FlaskConical, HeartPulse, NotebookPen, Pill, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { sections } from "../data/demoData.js";
import { useHealthData } from "../context/useHealthData.js";

const sectionIcons = {
  trends: TrendingUp,
  labs: FlaskConical,
  medications: Pill,
  symptoms: HeartPulse,
  journal: NotebookPen,
} satisfies Record<keyof typeof sections, LucideIcon>;

function SectionPage({ section }: { section: keyof typeof sections }) {
  const content = sections[section];
  const emptyContent = section === "labs" ? sections.trends : sections[section];
  const Icon = sectionIcons[section];
  const { labResults } = useHealthData();

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1 className="page-title">{content.title}</h1>
          <p className="page-subtitle">{content.description}</p>
        </div>
      </header>

      {section === "labs" ? (
        <section className="section-empty" aria-labelledby="lab-records-title">
          <div className="empty-icon">
            <Icon size={20} aria-hidden="true" />
          </div>
          <h2 id="lab-records-title">Sample lab records</h2>
          <p>All values below are fictional demo data and are not medical guidance.</p>
          <table className="demo-data-table">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Date</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {labResults.map((result) => (
                <tr key={result.id}>
                  <td>{result.testType}</td>
                  <td>
                    {new Date(`${result.date}T00:00:00`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    {result.value} {result.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link className="text-link" to="/">
            <ArrowLeft size={13} aria-hidden="true" />
            Back to overview
          </Link>
        </section>
      ) : (
        <section className="section-empty" aria-labelledby="empty-title">
          <div className="empty-icon">
            <Icon size={20} aria-hidden="true" />
          </div>
          <h2 id="empty-title">{emptyContent.emptyTitle}</h2>
          <p>{emptyContent.emptyMessage}</p>
          <Link className="text-link" to="/">
            {section === "symptoms" ? "Go to today's check-in" : emptyContent.action}
            <ArrowLeft size={13} aria-hidden="true" />
          </Link>
        </section>
      )}
    </>
  );
}

export default SectionPage;
