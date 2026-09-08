// feat/site-objects-2d, mandatory test 7: no TEREN symbol component
// hard-codes a literal hex color - every color comes from ScadaTheme's
// own SITE_*/COLOR_* constants. Same `?raw` source-scan convention as
// scada-symbols.test.ts's own "no hard-coded colors" test and
// diode-colors.test.ts's own scan - extended here with each new site
// component's own source as commits 2/3/4 add them.

import { describe, it, expect } from 'vitest';

import bandedShadingSource from '../symbols/site/BandedShading.tsx?raw';
import siteSymbolStateSource from '../symbols/site/SiteSymbolState.ts?raw';
import houseSource from '../symbols/site/HouseSymbol.tsx?raw';
import warehouseSource from '../symbols/site/WarehouseSymbol.tsx?raw';
import slidingGateSource from '../symbols/site/SlidingGateSymbol.tsx?raw';
import rainTankSource from '../symbols/site/RainTankSymbol.tsx?raw';
import sewagePlantSource from '../symbols/site/SewagePlantSymbol.tsx?raw';
import waterManholeSource from '../symbols/site/WaterManholeSymbol.tsx?raw';
import lampPostSource from '../symbols/site/LampPostSymbol.tsx?raw';
import halogenSource from '../symbols/site/HalogenSymbol.tsx?raw';
import gardenLightSource from '../symbols/site/GardenLightSymbol.tsx?raw';
import cableJunctionSource from '../symbols/site/CableJunctionSymbol.tsx?raw';
import alarmBeaconSource from '../symbols/site/AlarmBeaconSymbol.tsx?raw';
import alarmHornSource from '../symbols/site/AlarmHornSymbol.tsx?raw';
import gardenSprinklerSource from '../symbols/site/GardenSprinklerSymbol.tsx?raw';

const HEX_COLOR_PATTERN = /#[0-9A-Fa-f]{3,8}\b/g;

const sources: Record<string, string> = {
  'BandedShading.tsx': bandedShadingSource,
  'SiteSymbolState.ts': siteSymbolStateSource,
  'HouseSymbol.tsx': houseSource,
  'WarehouseSymbol.tsx': warehouseSource,
  'SlidingGateSymbol.tsx': slidingGateSource,
  'RainTankSymbol.tsx': rainTankSource,
  'SewagePlantSymbol.tsx': sewagePlantSource,
  'WaterManholeSymbol.tsx': waterManholeSource,
  'LampPostSymbol.tsx': lampPostSource,
  'HalogenSymbol.tsx': halogenSource,
  'GardenLightSymbol.tsx': gardenLightSource,
  'CableJunctionSymbol.tsx': cableJunctionSource,
  'AlarmBeaconSymbol.tsx': alarmBeaconSource,
  'AlarmHornSymbol.tsx': alarmHornSource,
  'GardenSprinklerSymbol.tsx': gardenSprinklerSource
};

describe('7. no TEREN symbol component hard-codes a hex color', () => {
  it('every color used by every site/ component comes from ScadaTheme (no literal hex anywhere in src/symbols/site/)', () => {
    for (const [file, source] of Object.entries(sources)) {
      const matches = source.match(HEX_COLOR_PATTERN);
      expect(matches, `${file} must not contain a literal hex color - found: ${matches?.join(', ')}`).toBeNull();
    }
  });

  it('sanity: the scan pattern actually catches a hard-coded color (proves the test is not vacuously passing)', () => {
    const contaminated = "const fill = '#FF00FF';";
    expect(contaminated.match(HEX_COLOR_PATTERN)).not.toBeNull();
  });
});
