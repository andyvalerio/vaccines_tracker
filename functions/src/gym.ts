import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { getMessaging } from "firebase-admin/messaging";
import { getFunctions } from "firebase-admin/functions";

export const scheduleGymRestTimer = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The user must be authenticated.');
    }

    const { deviceToken, restTimeSeconds } = request.data;
    if (!deviceToken) {
        throw new HttpsError('invalid-argument', 'Device token is required');
    }

    const scheduleDelay = restTimeSeconds || 60;

    // Calculate delivery time
    const scheduleTime = new Date(Date.now() + scheduleDelay * 1000);

    const queue = getFunctions().taskQueue("executeGymRestTimer");

    await queue.enqueue({ deviceToken }, {
        scheduleTime: scheduleTime,
        dispatchDeadlineSeconds: 60 * 5,
    });

    return { success: true, message: `Scheduled notification for ${scheduleTime.toISOString()}` };
});

export const executeGymRestTimer = onTaskDispatched({
    retryConfig: { maxAttempts: 3 },
    rateLimits: { maxConcurrentDispatches: 20 },
    region: "europe-west1"
}, async (req) => {
    const { deviceToken } = req.data;

    try {
        await getMessaging().send({
            token: deviceToken,
            notification: {
                title: 'Gym Tracker',
                body: 'Rest time is over! Time for your next set.',
            },
        });
        console.log("Successfully sent push notification");
    } catch (error) {
        console.error("Error sending push notification", error);
    }
});
