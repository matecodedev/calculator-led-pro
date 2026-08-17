import type { FieldIssue } from '../../../domain/validation';

interface ProjectAlertsProps {
  issues: FieldIssue[];
  exportError: string | null;
}

/** Anything the technician needs to fix before the numbers mean anything. */
export default function ProjectAlerts({ issues, exportError }: ProjectAlertsProps) {
  return (
    <div role="alert" aria-live="polite">
      {exportError && (
        <p className="px-4 py-3 bg-[#2C1A17] border-b border-[#FF4444] text-[#FF9F91] text-xs">
          {exportError}
        </p>
      )}
      {issues.length > 0 && (
        <div className="px-4 py-3 bg-[#2C1A17] border-b border-[#FF4444]">
          <p className="text-[#FF4444] text-[11px] font-bold uppercase tracking-widest mb-1.5">
            {issues.length === 1 ? 'Check this value' : `Check these ${issues.length} values`}
          </p>
          <ul className="text-[#FF9F91] text-xs space-y-1">
            {issues.map((issue) => (
              <li key={issue.field}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
