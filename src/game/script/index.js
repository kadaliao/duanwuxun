// 剧本入口。
import { CLUES } from './clues.js';
import { intro } from './intro.js';
import { setupDay, endDay } from './day.js';
import { night, useGong } from './night.js';
export const SCRIPT = { clues: CLUES, intro, setupDay, endDay, night, useGong };
