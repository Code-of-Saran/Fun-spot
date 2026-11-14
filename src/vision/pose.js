import { createTask, createTaskSingleton } from './mediapipe';

const poseTask = createTaskSingleton(() =>
  createTask(
    (mp, fileset, modelAssetPath, delegate) =>
      mp.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: 'VIDEO',
        numPoses: 4,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }),
    { file: 'pose_landmarker_lite.task', cdnPath: 'pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task' },
  ),
);

export const loadPoseLandmarker = poseTask.load;
export const disposePoseLandmarker = poseTask.dispose;
