import Field from '../../../shared/ui/Field';
import { textControlClass } from '../../../shared/ui/controls';
import type { ProjectIdentity } from '../useProjectDraft';

/**
 * Only the screen's own name. The event name and the venue feed belong to the
 * event, which owns several screens, so they live in the bar above this panel.
 */
export default function ProjectIdentityPanel({ screenName, setScreenName }: ProjectIdentity) {
  return (
    <section className="p-4 sm:p-6 bg-[#161616] border-b border-[#333]">
      <Field label="Screen Name" className="flex-1">
        {(id) => (
          <input
            id={id}
            type="text"
            name="screen-name"
            autoComplete="off"
            placeholder="e.g. Main Stage / Lateral L / Totem 1"
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
            className={textControlClass}
          />
        )}
      </Field>
    </section>
  );
}
