import { AlertTriangle, Zap } from 'lucide-react';

import type { FieldIssue } from '../../../domain/validation';

export interface DangerAlert {
  headline: string;
  detail: string;
}

interface ProjectAlertsProps {
  /**
   * A physical hazard: the plan draws more current than the supply can give.
   * This is the app's highest alarm level and does not share a colour with
   * anything else — an overloaded circuit is not the same class of problem as
   * a half-typed form.
   */
  danger: DangerAlert | null;
  issues: FieldIssue[];
  exportError: string | null;
}

export default function ProjectAlerts({ danger, issues, exportError }: ProjectAlertsProps) {
  return (
    <div role="alert" aria-live="assertive">
      {danger && (
        <div className="px-4 py-3 bg-[#FF4444] text-black border-b-2 border-[#7F1D1D] flex items-start gap-3">
          <Zap className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-bold uppercase tracking-widest">{danger.headline}</p>
            <p className="text-[13px] mt-0.5">{danger.detail}</p>
          </div>
        </div>
      )}

      {exportError && (
        <p className="px-4 py-3 bg-[#2A2213] border-b border-amber-500 text-amber-200 text-xs">
          {exportError}
        </p>
      )}

      {issues.length > 0 && (
        <div className="px-4 py-3 bg-[#2A2213] border-b border-amber-500 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
          <div>
            <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-1">
              {issues.length === 1 ? 'Check this value' : `Check these ${issues.length} values`}
            </p>
            <ul className="text-amber-100 text-xs space-y-1">
              {issues.map((issue) => (
                <li key={issue.field}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
