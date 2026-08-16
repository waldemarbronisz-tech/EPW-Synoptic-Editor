import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import type { SynopticObject } from '../store';
import { CircuitBreakerSymbol } from './electrical/CircuitBreakerSymbol';
import { DisconnectSwitchSymbol } from './electrical/DisconnectSwitchSymbol';
import { ContactorSymbol } from './electrical/ContactorSymbol';
import { TransformerSymbol } from './electrical/TransformerSymbol';
import { BusbarSymbol } from './electrical/BusbarSymbol';
import { IndicatorLampSymbol } from './electrical/IndicatorLampSymbol';
import { GeneratorSymbol } from './electrical/GeneratorSymbol';
import { FuseSymbol } from './electrical/FuseSymbol';
import { RelaySymbol } from './electrical/RelaySymbol';
import { MotorSymbol } from './electrical/MotorSymbol';
import { TerminalSymbol } from './electrical/TerminalSymbol';
import { CableSymbol } from './electrical/CableSymbol';
import { CableTraySymbol } from './electrical/CableTraySymbol';
import { EarthSymbol } from './electrical/EarthSymbol';
import { ACWireSymbol } from './electrical/ACWireSymbol';
import { ThreePhaseLineSymbol } from './electrical/ThreePhaseLineSymbol';
import { GridSourceSymbol } from './electrical/GridSourceSymbol';
import { RCDSymbol } from './electrical/RCDSymbol';
import { SPDSymbol } from './electrical/SPDSymbol';
import { GenericLoadSymbol } from './electrical/GenericLoadSymbol';
import { PipeSymbol } from './water/PipeSymbol';
import { PipeElbowSymbol } from './water/PipeElbowSymbol';
import { TeeSymbol } from './water/TeeSymbol';
import { ValveSymbol } from './water/ValveSymbol';
import { GateValveSymbol } from './water/GateValveSymbol';
import { BallValveSymbol } from './water/BallValveSymbol';
import { DrainSymbol } from './water/DrainSymbol';
import { SolenoidValveSymbol } from './water/SolenoidValveSymbol';
import { DrainValveSymbol } from './water/DrainValveSymbol';
import { PumpSymbol } from './water/PumpSymbol';
import { TankSymbol } from './water/TankSymbol';
import { MeasurementDisplaySymbol } from './measurements/MeasurementDisplaySymbol';
import { VoltageDisplaySymbol, CurrentDisplaySymbol, TemperatureDisplaySymbol } from './measurements/SpecificDisplaySymbols';
import { FanSymbol } from './hvac/FanSymbol';
import { HeaterSymbol } from './hvac/HeaterSymbol';
import { TemperatureSensorSymbol } from './instrumentation/TemperatureSensorSymbol';
import { DuctSymbol } from './hvac/DuctSymbol';
import { DuctElbowSymbol } from './hvac/DuctElbowSymbol';
import { DuctTeeSymbol } from './hvac/DuctTeeSymbol';
import { ReducerSymbol } from './hvac/ReducerSymbol';
import { DamperSymbol } from './hvac/DamperSymbol';
import { PressureSensorSymbol } from './instrumentation/PressureSensorSymbol';
import { LevelSensorSymbol } from './instrumentation/LevelSensorSymbol';
import { HumiditySensorSymbol } from './instrumentation/HumiditySensorSymbol';
import { LeakSensorSymbol } from './instrumentation/LeakSensorSymbol';
import { PLCSymbol } from './automation/PLCSymbol';
import { RemoteIOSymbol } from './automation/RemoteIOSymbol';
import { ELAInputsSymbol } from './automation/ELAInputsSymbol';
import { ADAOutputsSymbol } from './automation/ADAOutputsSymbol';
import { EPWCoreSymbol } from './automation/EPWCoreSymbol';
import { EPMSymbol } from './automation/EPMSymbol';
import { PSU24VSymbol } from './automation/PSU24VSymbol';

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
    case 'electrical.generator':
      return <GeneratorSymbol obj={obj} state={state} />;
    case 'electrical.grid_source':
      return <GridSourceSymbol obj={obj} state={state} />;
    case 'electrical.fuse':
      return <FuseSymbol obj={obj} state={state} />;
    case 'electrical.rcd':
      return <RCDSymbol obj={obj} state={state} />;
    case 'electrical.spd':
      return <SPDSymbol obj={obj} state={state} />;
    case 'electrical.generic_load':
      return <GenericLoadSymbol obj={obj} state={state} />;
    case 'electrical.relay':
      return <RelaySymbol obj={obj} state={state} />;
    case 'electrical.motor':
      return <MotorSymbol obj={obj} state={state} />;
    case 'electrical.terminal':
      return <TerminalSymbol obj={obj} state={state} />;
    case 'electrical.cable':
      return <CableSymbol obj={obj} state={state} />;
    case 'electrical.ac_wire':
      return <ACWireSymbol obj={obj} state={state} />;
    case 'electrical.three_phase_line':
      return <ThreePhaseLineSymbol obj={obj} state={state} />;
    case 'electrical.cable_tray':
      return <CableTraySymbol obj={obj} state={state} />;
    case 'electrical.earth':
      return <EarthSymbol obj={obj} state={state} />;
    case 'water.pipe':
      return <PipeSymbol obj={obj} state={state} />;
    case 'water.pipe_elbow':
      return <PipeElbowSymbol obj={obj} state={state} />;
    case 'water.tee':
      return <TeeSymbol obj={obj} state={state} />;
    case 'water.valve':
      return <ValveSymbol obj={obj} state={state} />;
    case 'water.gate_valve':
      return <GateValveSymbol obj={obj} state={state} />;
    case 'water.ball_valve':
      return <BallValveSymbol obj={obj} state={state} />;
    case 'water.drain':
      return <DrainSymbol obj={obj} state={state} />;
    case 'water.solenoid_valve':
      return <SolenoidValveSymbol obj={obj} state={state} />;
    case 'water.drain_valve':
      return <DrainValveSymbol obj={obj} state={state} />;
    case 'water.pump':
      return <PumpSymbol obj={obj} state={state} />;
    case 'water.tank':
      return <TankSymbol obj={obj} state={state} />;
    case 'measurements.generic_display':
      return <MeasurementDisplaySymbol obj={obj} state={state} />;
    case 'measurements.voltage_display':
      return <VoltageDisplaySymbol obj={obj} state={state} />;
    case 'measurements.current_display':
      return <CurrentDisplaySymbol obj={obj} state={state} />;
    case 'measurements.temperature_display':
      return <TemperatureDisplaySymbol obj={obj} state={state} />;
    case 'hvac.duct': return <DuctSymbol obj={obj} state={state} />;
    case 'hvac.duct_elbow': return <DuctElbowSymbol obj={obj} state={state} />;
    case 'hvac.duct_tee': return <DuctTeeSymbol obj={obj} state={state} />;
    case 'hvac.reducer': return <ReducerSymbol obj={obj} state={state} />;
    case 'hvac.damper': return <DamperSymbol obj={obj} state={state} />;
    case 'hvac.fan':
      return <FanSymbol obj={obj} state={state} />;
    case 'hvac.heater':
      return <HeaterSymbol obj={obj} state={state} />;
    case 'instrumentation.temperature_sensor':
      return <TemperatureSensorSymbol obj={obj} state={state} />;
    case 'instrumentation.pressure_sensor':
      return <PressureSensorSymbol obj={obj} state={state} />;
    case 'instrumentation.level_sensor':
      return <LevelSensorSymbol obj={obj} state={state} />;
    case 'instrumentation.humidity_sensor':
      return <HumiditySensorSymbol obj={obj} state={state} />;
    case 'instrumentation.leak_sensor':
      return <LeakSensorSymbol obj={obj} state={state} />;
    case 'automation.plc':
      return <PLCSymbol obj={obj} state={state} />;
    case 'automation.remote_io':
      return <RemoteIOSymbol obj={obj} state={state} />;
    case 'automation.ela_inputs':
      return <ELAInputsSymbol obj={obj} state={state} />;
    case 'automation.ada_outputs':
      return <ADAOutputsSymbol obj={obj} state={state} />;
    case 'automation.epw_core':
      return <EPWCoreSymbol obj={obj} state={state} />;
    case 'automation.epm':
      return <EPMSymbol obj={obj} state={state} />;
    case 'automation.psu_24v':
      return <PSU24VSymbol obj={obj} state={state} />;
    default:
      return <GenericSymbol obj={obj} state={state} />;
  }
};
