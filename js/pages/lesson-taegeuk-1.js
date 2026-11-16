/* The original lesson uses the same shared player as the new forms. */
import {POSES,LESSON} from '../lessons/taegeuk-1-data.js';
import * as MOTION from '../animation/taegeuk-1-motion.js';
import {mountLesson} from './lesson-player.js';
await mountLesson({POSES,LESSON,MOTION});
