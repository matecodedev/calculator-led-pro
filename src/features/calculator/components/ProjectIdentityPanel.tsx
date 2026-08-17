import Field from '../../../shared/ui/Field';
import { textControlClass } from '../../../shared/ui/controls';
import type { ProjectIdentity } from '../useProjectDraft';

export default function ProjectIdentityPanel({
  eventName,
  screenName,
  setEventName,
  setScreenName,
}: ProjectIdentity) {
  return (
    <section className="p-4 sm:p-6 bg-[#161616] border-b border-[#333] flex flex-col sm:flex-row gap-4">
      <Field label="Event Name" className="flex-1">
        {(id) => (
          <input
            id={id}
            type="text"
            name="event-name"
            autoComplete="off"
            placeholder="e.g. Lollapalooza 2026"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className={textControlClass}
          />
        )}
      </Field>
      <Field label="Screen Name" className="flex-1">
        {(id) => (
          <input
            id={id}
            type="text"
            name="screen-name"
            autoComplete="off"
            placeholder="e.g. Main Stage / DJ Booth"
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
            className={textControlClass}
          />
        )}
      </Field>
    </section>
  );
}
