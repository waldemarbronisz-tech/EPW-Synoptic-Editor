// feat/device-list-ui commit 3 - a three-part (card / channel number)
// picker for one ChannelAddress field, restricted to cards of the right
// ChannelKind (DeviceSchema.ts's own CARD.KIND.CHANNEL format) and
// disabling any channel another device already occupies (the `occupied`
// map - DeviceRegistryQueries.getOccupiedChannels, called with the
// current device's own id excluded so editing a device never reports its
// own already-saved channel as taken).
//
// Uses DeviceValidation.ts's own parseChannelAddress to read the current
// value back out - never re-implements address parsing here.

import React from 'react';
import type { CardEntry, ChannelAddress, ChannelKind } from '../project/DeviceSchema';
import { parseChannelAddress } from '../project/DeviceValidation';

export interface ChannelAddressPickerProps {
  value: ChannelAddress | undefined;
  onChange: (addr: ChannelAddress | undefined) => void;
  expectedKind: ChannelKind;
  cards: CardEntry[];
  occupied: Map<string, { deviceId: string; field: string }>;
  // True for a genuinely optional field (extraInputs.diFault,
  // feedbackInput) - shows an enable checkbox that clears the value
  // entirely when unchecked. Fields whose presence is driven by another
  // choice (feedback.mode, command.outputCount) are shown/hidden by the
  // parent form instead - never pass allowEmpty for those.
  allowEmpty?: boolean;
}

export const ChannelAddressPicker: React.FC<ChannelAddressPickerProps> = ({ value, onChange, expectedKind, cards, occupied, allowEmpty }) => {
  const matchingCards = cards.filter(c => c.channelKind === expectedKind);
  const parsed = value ? parseChannelAddress(value) : null;
  const selectedCard = parsed?.card ?? matchingCards[0]?.id ?? '';
  const selectedChannel = parsed?.channel ?? 1;
  const card = matchingCards.find(c => c.id === selectedCard);

  const emit = (cardId: string, channel: number) => {
    if (!cardId) { onChange(undefined); return; }
    onChange(`${cardId}.${expectedKind}.${channel}`);
  };

  const selects = (
    <>
      <select value={selectedCard} onChange={e => emit(e.target.value, selectedChannel)} style={selectStyle}>
        {matchingCards.length === 0 && <option value="">(brak kart {expectedKind})</option>}
        {matchingCards.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
      </select>
      <select value={selectedChannel} onChange={e => emit(selectedCard, Number(e.target.value))} style={selectStyle} disabled={!card}>
        {card && Array.from({ length: card.channelCount }, (_, i) => i + 1).map(n => {
          const key = `${selectedCard}.${expectedKind}.${n}`;
          const usedBy = occupied.get(key);
          return (
            <option key={n} value={n} disabled={!!usedBy}>
              {n}{usedBy ? ` (zajety: ${usedBy.deviceId})` : ''}
            </option>
          );
        })}
      </select>
    </>
  );

  if (!allowEmpty) {
    return <div style={rowStyle}>{selects}</div>;
  }

  return (
    <div style={rowStyle}>
      <input
        type="checkbox"
        checked={!!value}
        onChange={e => e.target.checked ? emit(selectedCard, selectedChannel) : onChange(undefined)}
      />
      {value !== undefined && selects}
    </div>
  );
};

const rowStyle: React.CSSProperties = { display: 'flex', gap: '4px', alignItems: 'center' };
const selectStyle: React.CSSProperties = { fontSize: 'var(--scada-font-size-base)' };
