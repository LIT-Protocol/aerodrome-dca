import { bundledVincentAbility as aerodromeBundledAbility } from '@lit-protocol/vincent-ability-aerodrome-swap';
import { getVincentAbilityClient } from '@lit-protocol/vincent-app-sdk/abilityClient';

import { delegateeSigner } from './utils/signer';

export function getAerodromeAbilityClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: aerodromeBundledAbility,
    ethersSigner: delegateeSigner,
  });
}
