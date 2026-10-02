import React from "react";
import { COLORS } from "../../styles/tokens.js";
import { BUILDINGS } from "../../data/config.js";
import { RoomTypeTag } from "../shared/Badges.jsx";
import { inputClass, inputStyle } from "../shared/Feedback.jsx";

// value: { buildingId, floorId, roomId, spot }
export function LocationPicker({ value, onChange }) {
  const building = BUILDINGS.find((b) => b.id === value.buildingId);
  const floor = building?.floors.find((f) => f.id === value.floorId);
  const room = floor?.rooms.find((r) => r.id === value.roomId);

  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Area">
          <select
            className={inputClass}
            style={inputStyle}
            value={value.buildingId}
            onChange={(e) => set({ buildingId: e.target.value, floorId: "", roomId: "" })}
          >
            <option value="">Select area</option>
            {BUILDINGS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>

        <Field label="Section">
          <select
            className={inputClass}
            style={inputStyle}
            value={value.floorId}
            disabled={!building}
            onChange={(e) => set({ floorId: e.target.value, roomId: "" })}
          >
            <option value="">Select section</option>
            {building?.floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>

        <Field label="Room">
          <select
            className={inputClass}
            style={inputStyle}
            value={value.roomId}
            disabled={!floor}
            onChange={(e) => set({ roomId: e.target.value })}
          >
            <option value="">Select room / spot</option>
            {floor?.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </div>

      {room && (
        <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.slate }}>
          <span className="font-medium" style={{ color: COLORS.ink }}>{room.name}</span>
          <RoomTypeTag roomType={room.roomType} />
          <span>· {floor.name}, {building.name}</span>
        </div>
      )}

      <Field label="Exact spot (optional)">
        <input
          className={inputClass}
          style={inputStyle}
          value={value.spot}
          maxLength={120}
          placeholder="e.g. third row, left side near the window"
          onChange={(e) => set({ spot: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.ink }}>{label}</span>
      {children}
      {hint && <span className="block text-xs mt-1" style={{ color: COLORS.slate }}>{hint}</span>}
    </label>
  );
}

export const resolveRoom = ({ buildingId, floorId, roomId }) => {
  const b = BUILDINGS.find((x) => x.id === buildingId);
  const f = b?.floors.find((x) => x.id === floorId);
  const r = f?.rooms.find((x) => x.id === roomId);
  return r ? { building: b.name, floor: f.name, roomName: r.name, roomType: r.roomType } : null;
};

export default LocationPicker;
