/**
 * What a stream reading means for everyday life, in plain English.
 * Sources are listed on the Learn tab (EPA, Iowa DNR, Iowa State University, NIH).
 */
import { formatMgL, levelFor } from './nitrate';

export interface Guidance {
  title: string;
  status: 'ok' | 'caution' | 'info';
  text: string;
}

export function residentGuidance(value: number): Guidance[] {
  const level = levelFor(value);
  const v = formatMgL(value);

  const drinking: Guidance =
    level === 'high'
      ? {
          title: 'Drinking water',
          status: 'caution',
          text: `This stream (${v}) is above the 10 mg/L drinking water limit. If your town gets water from a river like this, the utility has to treat or blend it to stay under the limit. In June 2025 nitrate got so high that Central Iowa Water Works banned lawn watering for the first time. City tap water must still meet the limit; your water utility's annual report shows its nitrate results.`,
        }
      : level === 'watch'
        ? {
            title: 'Drinking water',
            status: 'caution',
            text: `This stream (${v}) is below the 10 mg/L limit but getting close. City and town water systems must keep tap water under the limit and test it regularly. Heavy rain can push streams like this higher.`,
          }
        : {
            title: 'Drinking water',
            status: 'ok',
            text: `This stream (${v}) is well under the 10 mg/L limit. City and town water systems must keep tap water under the limit and test it regularly.`,
          };

  const swimming: Guidance = {
    title: 'Swimming and wading',
    status: 'info',
    text: "Nitrate only matters if you drink it; swimming or wading in it won't hurt you. In Iowa the bigger swimming risks are E. coli bacteria and toxic blue-green algae, and nitrogen and phosphorus help feed that algae. Check Iowa DNR beach advisories before you swim, and stay out of water that looks like green paint or has scum on top.",
  };

  const fishing: Guidance = {
    title: 'Fishing',
    status: 'info',
    text:
      'Nitrate does not build up in fish, so it does not make fish unsafe to eat. ' +
      (level === 'low'
        ? 'Streams with low nitrate tend to have fewer algae problems.'
        : 'But high nutrients feed algae, and when algae die and decay they can use up the oxygen fish need. Downstream, this is what causes the Gulf "dead zone."'),
  };

  return [drinking, swimming, fishing];
}

/** The private-well tip shown in Resident mode. */
export const WELL_TIP =
  "Have a private well? Test it for nitrate and bacteria at least once a year, more often if it's shallow or near fields or livestock. " +
  "Iowa's Grants to Counties program offers free testing through your county health department while funds last. " +
  'If a well tests over 10 mg/L, use other water for babies and for mixing formula. Boiling does not remove nitrate; it makes it more concentrated.';
