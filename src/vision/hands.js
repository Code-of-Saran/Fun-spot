import { createTask, createTaskSingleton } from './mediapipe';

const handTask = createTaskSingleton(() =>
  createTask(
    (mp, fileset, modelAssetPath, delegate) =>
      mp.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }),
    { file: 'hand_landmarker.task', cdnPath: 'hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task' },
  ),
);

export const loadHandLandmarker = handTask.load;
export const disposeHandLandmarker = handTask.dispose;
