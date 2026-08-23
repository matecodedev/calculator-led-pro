import { AlertTriangle, Info, X, Zap } from 'lucide-react';

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
  /**
   * Physical hazards, most urgent first: the show overrunning the venue feed
   * and this screen overrunning its own supply are both fires, and they share
   * one channel so neither can be missed by scrolling past the other.
   */
  dangers: DangerAlert[];
  issues: FieldIssue[];
  exportError: string | null;
  /** Something the app did to the user's work that they need to know about. */
  notice: { message: string; onDismiss: () => void } | null;
}

export default function ProjectAlerts({
  dangers,
  issues,
  exportError,
  notice,
}: ProjectAlertsProps) {
  return (
    <div role="alert" aria-live="assertive">
      {dangers.map((danger) => (
        <div
          key={danger.headline}
          className="px-4 py-3 bg-[#FF4444] text-black border-b-2 border-[#7F1D1D] flex items-start gap-3"
        >
          <Zap className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-bold uppercase tracking-widest">{danger.headline}</p>
            <p className="text-[13px] mt-0.5">{danger.detail}</p>
          </div>
        </div>
      ))}

      {exportError && (
        <p className="px-4 py-3 bg-[#2A2213] border-b border-amber-500 text-amber-200 text-xs">
          {exportError}
        </p>
      )}

      {notice && (
        <div className="px-4 py-3 bg-[#10282F] border-b border-[#2F6D80] flex items-start gap-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#7FD4E8]" aria-hidden="true" />
          <p className="text-[#CFEAF2] text-xs flex-1">{notice.message}</p>
          <button
            type="button"
            onClick={notice.onDismiss}
            aria-label="Cerrar aviso"
            className="text-[#7FD4E8] hover:text-white shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {issues.length > 0 && (
        <div className="px-4 py-3 bg-[#2A2213] border-b border-amber-500 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
          <div>
            <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-1">
              {issues.length === 1 ? 'Revisá este valor' : `Revisá estos ${issues.length} valores`}
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
