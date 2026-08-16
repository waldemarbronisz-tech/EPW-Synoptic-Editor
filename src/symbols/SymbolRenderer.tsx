import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import type { SynopticObject } from '../store';
import { CircuitBreakerSymbol } from './electrical/CircuitBreakerSymbol';
import { DisconnectSwitchSymbol } from './electrical/DisconnectSwitchSymbol';
import { ContactorSymbol } from './electrical/ContactorSymbol';
import { TransformerSymbol } from './electrical/TransformerSymbol';
import { BusbarSymbol } from './electrical/BusbarSymbol';
import { IndicatorLampSymbol } from './electrical/IndicatorLampSymbol';
import { PipeSymbol } from './water/PipeSymbol';
import { PipeElbowSymbol } from './water/PipeElbowSymbol';
import { TeeSymbol } from './water/TeeSymbol';
import { ValveSymbol } from './water/ValveSymbol';
import { PumpSymbol } from './water/PumpSymbol';
import { TankSymbol } from './water/TankSymbol';

export interface SymbolProps {
  obj: SynopticObject;
  state: string; // the resolved state (either preview_state or fallback default)
}

export const GenericSymbol: React.FC<SymbolProps> = ({ obj }) => {
  const isCircle = obj.type === 'graphics.circle' || (!obj.type.startsWith('graphics.') && (obj.type.includes('pump') || obj.type.includes('valve') || obj.type.includes('meter')));

  return (
    <Group>
      {isCircle ? (
        <Circle
          x={obj.width / 2}
          y={obj.height / 2}
          radius={obj.width / 2}
          fill={obj.fill || '#c0c0c0'}
          stroke={obj.border || '#000000'}
          strokeWidth={1}
        />
      ) : (
        <Rect
          width={obj.width}
          height={obj.height}
          fill={obj.fill || '#c0c0c0'}
          stroke={obj.border || '#000000'}
          strokeWidth={1}
        />
      )}
      <Text
        text={obj.text || obj.type}
        width={obj.width}
        height={obj.height}
        align="center"
        verticalAlign="middle"
        fontSize={obj.fontSize || 12}
        fontFamily={obj.font || "system-ui"}
        fill="#000"
      />
    </Group>
  );
};

export const SymbolRenderer: React.FC<{ obj: SynopticObject }> = ({ obj }) => {
  const state = obj.editor?.preview_state || 'NORMAL';

  switch (obj.type) {
    case 'electrical.circuit_breaker':
      return <CircuitBreakerSymbol obj={obj} state={state} />;
    case 'electrical.disconnect_switch':
      return <DisconnectSwitchSymbol obj={obj} state={state} />;
    case 'electrical.contactor':
      return <ContactorSymbol obj={obj} state={state} />;
    case 'electrical.transformer':
      return <TransformerSymbol obj={obj} state={state} />;
    case 'electrical.busbar':
      return <BusbarSymbol obj={obj} state={state} />;
    case 'electrical.indicator_lamp':
      return <IndicatorLampSymbol obj={obj} state={state} />;
    case 'water.pipe':
      return <PipeSymbol obj={obj} state={state} />;
    case 'water.pipe_elbow':
      return <PipeElbowSymbol obj={obj} state={state} />;
    case 'water.tee':
      return <TeeSymbol obj={obj} state={state} />;
    case 'water.valve':
      return <ValveSymbol obj={obj} state={state} />;
    case 'water.pump':
      return <PumpSymbol obj={obj} state={state} />;
    case 'water.tank':
      return <TankSymbol obj={obj} state={state} />;
    default:
      return <GenericSymbol obj={obj} state={state} />;
  }
};
