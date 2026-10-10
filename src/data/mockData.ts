import { TimelineItem, ThoughtNode, GapItem, BomItem, BenchTool, ObserverLogEntry } from '../types';

export const INITIAL_TIMELINE: TimelineItem[] = [
  {
    id: 'tl-1',
    type: 'voice',
    time: '14:02 · Voice Note',
    title: 'ESP32 relay trigger spontaneous reboot',
    categoryTag: 'wiring',
    tags: ['wiring', 'hardware-bug'],
    duration: '0:18',
    audioQuote: '“ESP32 pin 5 triggers the 5V relay. When it flips, the microcontroller reboots spontaneously.”',
    notes: 'Microcontroller Brownout observed during relay toggle.',
    verifiedLabel: 'Audio transcription synced'
  },
  {
    id: 'tl-2',
    type: 'photos',
    time: '14:08 · Bench Photo',
    title: 'ESP32 Breadboard & Scope Probe',
    categoryTag: 'breadboard',
    tags: ['breadboard'],
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2NTnult9Dz88GYp_cQ9HNWJIsfpcRfzHOfnhgxoJQUkmBGFvdW_OLW4VrNHBqVMuQrMZPUpe9-432S8biG2SwOssNscoRFtp0dfAXB5irYuBBQhnQQPGH8hFJOTozD8nY2h0N0jWo69Xi847G6a5C2KD3R6qzxLo_qJVY5QXOkM_FDAktoPKFDnqeuTCknO3wUps7NcsvmxY1WX82zj_uZNdCaO_v0ZqJ57bd6jqdO04rQlviFqo_uw',
    imageAlt: 'Probing 3.3V rail on ESP32 breadboard',
    exif: 'EXIF timestamp: 14:08:19 UTC · Rigol DS1054Z CH1',
    notes: 'Probing 3.3V power rail with oscilloscope during relay trigger.',
    verifiedLabel: 'EXIF timestamp: 14:08:19 UTC'
  },
  {
    id: 'tl-3',
    type: 'code',
    time: '14:10 · Git Commit',
    title: 'fix(firmware): add 15ms software debounce to GPIO 5 output',
    commitHash: 'c4e12a',
    notes: 'Temporary software debounce attempt prior to hardware flyback diode install.',
    codeSnippet: {
      lineStart: 18,
      lines: [
        { lineNum: 18, content: 'gpio_set_direction(GPIO_NUM_5, GPIO_MODE_OUTPUT);' },
        { lineNum: 19, content: 'vTaskDelay(pdMS_TO_TICKS(15)); // debounce coil switch', isAdded: true },
        { lineNum: 20, content: 'gpio_set_level(GPIO_NUM_5, 1);' }
      ]
    },
    verifiedLabel: 'Committed to main branch'
  },
  {
    id: 'tl-4',
    type: 'photos',
    time: '14:12 · Bench Photo',
    title: '1N4007 Diode Installed',
    categoryTag: 'hardware-fix',
    tags: ['hardware-fix'],
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAE_mZBQF9gy4lEqfYk9ujZDogPUWAtEjl6PT6m9pG7FvaKfVhOP-pCtSYDaT2I7rzsOXKcUInCR9V83ZtfQ4VL4Q5fiTZc74jcLCEkQ494Q25eEXvvsScIxtIgLznziNo4TdcXv4VbbJDQMuOhjIDBQq0--lJot9xRm-iWD1Y4x8NIEoBVuoojLWmEtPVTAmPsKkmPxeImDz8qw1r13k9ZT2cDfRUyA5gpC-QibKvg0zTcz5PYt-dcQw',
    imageAlt: '1N4007 flyback diode soldered across relay coil terminals',
    exif: 'EXIF timestamp: 14:12:44 UTC · Macro inspection',
    notes: 'Added 1N4007 flyback diode across relay coil terminals.',
    verifiedLabel: 'EXIF timestamp: 14:12:44 UTC'
  },
  {
    id: 'tl-5',
    type: 'voice',
    time: '14:14 · Voice Note',
    title: 'Brownout resolved after flyback diode',
    categoryTag: 'verification',
    tags: ['verification'],
    duration: '0:22',
    audioQuote: '“Brownout resolved after adding the flyback diode. 3.3V rail stays steady at 3.28V during switching.”',
    notes: 'Oscilloscope capture confirmed (ripple < 20mV).',
    verifiedLabel: 'Oscilloscope capture confirmed (ripple < 20mV)'
  },
  {
    id: 'tl-6',
    type: 'code',
    time: '14:19 · Git Commit',
    title: 'chore(docs): record 1N4007 diode in BOM and schematics',
    commitHash: '8f9b02',
    notes: 'Updated circuit wiring diagram and component bill of materials for inductive suppression.',
    codeSnippet: {
      lineStart: 14,
      lines: [
        { lineNum: 14, content: '| D1 | 1N4007 | DO-41 | Flyback diode for 5V relay coil |', isAdded: true }
      ]
    },
    verifiedLabel: 'Documentation updated'
  }
];

export const INITIAL_GAPS: GapItem[] = [
  {
    id: 'gap-01',
    number: '01',
    question: 'What is the exact part number and coil resistance of the 5V relay module?',
    description: 'Needed for the Bill of Materials (BOM.md). The audio mentioned a 5V relay, but not the specific model.',
    targetDoc: 'BOM.md & SCHEMATICS.md',
    status: 'open',
    priority: 'High'
  },
  {
    id: 'gap-02',
    number: '02',
    question: 'Is the BME280 sensor running on 3.3V or 5V VCC?',
    description: 'The wiring shows I2C pull-ups, but operating voltage was not directly stated.',
    targetDoc: 'SYSTEM_SPECS.md',
    status: 'open',
    priority: 'Medium'
  }
];

export const INITIAL_BOM: BomItem[] = [
  {
    id: 'bom-1',
    name: 'ESP32 DevKit v1',
    designator: 'U1',
    spec: 'Tensilica Dual-Core, 240MHz, 38-pin DIP',
    qty: 1,
    sources: ['commit 32c9e1', 'photo 1'],
    status: 'Verified',
    unitCost: 6.50
  },
  {
    id: 'bom-2',
    name: '5V SPDT Mechanical Relay Module',
    designator: 'K1',
    spec: '5V DC coil, 10A 250VAC contact rating, active low trigger (Songle SRD-05VDC-SL-C)',
    qty: 1,
    sources: ['voice 14:02', 'photo 1'],
    status: 'Needs P/N',
    unitCost: 1.80
  },
  {
    id: 'bom-3',
    name: '1N4007 Rectifier Diode',
    designator: 'D1',
    spec: '1000V 1A DO-41, flyback clamping antiparallel to coil',
    qty: 1,
    sources: ['voice 14:12', 'photo 2', 'commit 8f9b02'],
    status: 'Verified & Installed',
    unitCost: 0.15
  },
  {
    id: 'bom-4',
    name: 'BME280 Sensor Module',
    designator: 'MOD1',
    spec: 'Temperature, humidity, pressure; I2C address 0x76, 3.3V',
    qty: 1,
    sources: ['voice 08:30', 'commit c4e12a'],
    status: 'Verified',
    unitCost: 5.75
  }
];

export const BENCH_TOOLS: BenchTool[] = [
  {
    id: 'tool-1',
    code: 'OSC-01',
    name: 'Rigol DS1054Z 50MHz Digital Oscilloscope',
    description: 'Used for 3.3V rail transient capture at 14:08 during inductive flyback testing.',
    specs: '1 GSa/s · 4 Channels',
    icon: 'show_chart'
  },
  {
    id: 'tool-2',
    code: 'SLD-02',
    name: 'TS100 Soldering Iron',
    description: 'Used for diode installation at 14:12. Set to 320°C with B2 conical tip.',
    specs: 'Lead-free SAC305',
    icon: 'mode_heat'
  },
  {
    id: 'tool-3',
    code: 'DMM-01',
    name: 'Fluke 117 True RMS Multimeter',
    description: 'Rail measurement: 5.02V supply rail, 3.28V steady-state regulator output.',
    specs: 'AutoVolt / LoZ Verified',
    icon: 'electric_bolt'
  }
];

export const OBSERVER_LOGS: ObserverLogEntry[] = [
  {
    id: 'obs-1',
    time: '14:02',
    type: 'speech',
    title: 'The builder observed intermittent resets on the ESP32 whenever pin 5 commanded the 5V relay module to switch.',
    body: 'Hardware trigger · Pin GPIO 5',
    tag: 'Hardware trigger · Pin GPIO 5',
    sourceLabel: 'voice 14:02'
  },
  {
    id: 'obs-2',
    time: '14:08',
    type: 'photo',
    title: 'Oscilloscope capture shows the 3.3V logic rail sagging to 2.65V at the moment of relay coil de-energization.',
    body: 'Rigol DS1054Z Capture #01 — Vmin: 2.65V · Delta: -650mV brownout',
    tag: 'Rigol DS1054Z Capture #01',
    sourceLabel: 'photo 1',
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdLHm1EQItQZ6w8ifxoODg93Dj-cav1si-VKOnfVQnTpwSl672AqKFnG7Sy8tvo91JjL3crjPoBXos5d5rvgq7GhjtFqcqFhN32KfmR7jay4BNRiMsWI5FjL_pYThUcTq2dWnV7FrzXsq8QEawH_3iXNc7R_9qJKERhyKVsNDOiKRrgQZ1E1GWooa6aE_XTyS8AqNo4hdHPDD3WTPRJt_1zIG03deSaWOaUhMJtyTbvzm_Uqi9OTnoMA',
    imageCaption: 'Rigol DS1054Z Capture #01',
    imageMeta: 'Vmin: 2.65V · Delta: -650mV brownout'
  },
  {
    id: 'obs-3',
    time: '14:10',
    type: 'commit',
    title: 'The builder committed a firmware debounce change to GPIO 5, but noted the reset still persisted in hardware.',
    body: 'main: fix(relay): add 50ms software debounce',
    tag: 'main: fix(relay): add 50ms software debounce',
    sourceLabel: 'commit c4e12a'
  },
  {
    id: 'obs-4',
    time: '14:12',
    type: 'photo',
    title: 'The builder soldered a 1N4007 diode across the relay coil terminals to suppress back-EMF inductive kickback.',
    body: 'Flyback diode addition · Cathode to +5V',
    tag: 'Flyback diode addition · Cathode to +5V',
    sourceLabel: 'photo 2',
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJvSeIkb7sNAT8O4D1wEvLoUF8G_y08lXlfIQ7WzIvryoAHy--9028zXD8WErPh4aNlE2JbmE49nGrQ_FJtWl8h8LF0LfjM0vEvbCiBTQkeWShBdQrx5PbaMrr1k5Dp7FZyLlU-lBWwzfzfcEihLeJUsbPaN2SX9H81aRr_ZYDMiHZbYGEwCuboB4s3moVzVTwVuwMNzMwf98Z2L6KJ-7s4sBwxCK04kRUdNgTYPMi_i0YnoT5HoJqxw',
    imageCaption: '1N4007 Diode Installation',
    imageMeta: 'Cathode to +5V rail · Terminal screw clamped'
  },
  {
    id: 'obs-5',
    time: '14:14',
    type: 'speech',
    title: 'The builder confirmed voltage stabilization and verified that the ESP32 no longer brownout resets.',
    body: '3.3V rail stays at 3.28V steady state during 50 rapid test actuations.',
    tag: 'Stabilized Rail',
    sourceLabel: 'voice 14:14',
    sparkline: true
  }
];

export const THOUGHT_NODES: ThoughtNode[] = [
  {
    id: 'th-1',
    time: '14:02',
    title: '14:02 · Power & Switching',
    text: 'The ESP32 microcontroller triggers the relay on pin 5. When it activates, voltage drops slightly.',
    targetId: 'power-group',
    extractedNote: 'Extracted 2 physical nodes',
    icon: 'graphic_eq'
  },
  {
    id: 'th-2',
    time: '14:10',
    title: '14:10 · Protection Added',
    text: 'Added a flyback diode across the coil terminals to suppress electrical noise.',
    targetId: 'diode-node',
    extractedNote: 'Constraint confirmed',
    icon: 'verified'
  },
  {
    id: 'th-3',
    time: '14:19',
    title: '14:19 · Environmental Reading',
    text: 'Pulling barometric readings every two seconds. Keeping the I2C wires short to prevent line induction.',
    targetId: 'sensor-group',
    extractedNote: 'Sensor bus established',
    icon: 'tune'
  }
];
