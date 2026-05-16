"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeGymRestTimer = exports.scheduleGymRestTimer = void 0;
const https_1 = require("firebase-functions/v2/https");
const tasks_1 = require("firebase-functions/v2/tasks");
const messaging_1 = require("firebase-admin/messaging");
const functions_1 = require("firebase-admin/functions");
exports.scheduleGymRestTimer = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The user must be authenticated.');
    }
    const { deviceToken, restTimeSeconds } = request.data;
    if (!deviceToken) {
        throw new https_1.HttpsError('invalid-argument', 'Device token is required');
    }
    const scheduleDelay = restTimeSeconds || 60;
    // Calculate delivery time
    const scheduleTime = new Date(Date.now() + scheduleDelay * 1000);
    const queue = (0, functions_1.getFunctions)().taskQueue("executeGymRestTimer");
    await queue.enqueue({ deviceToken }, {
        scheduleTime: scheduleTime,
        dispatchDeadlineSeconds: 60 * 5,
    });
    return { success: true, message: `Scheduled notification for ${scheduleTime.toISOString()}` };
});
exports.executeGymRestTimer = (0, tasks_1.onTaskDispatched)({
    retryConfig: { maxAttempts: 3 },
    rateLimits: { maxConcurrentDispatches: 20 },
    region: "europe-west1"
}, async (req) => {
    const { deviceToken } = req.data;
    try {
        await (0, messaging_1.getMessaging)().send({
            token: deviceToken,
            notification: {
                title: 'Gym Tracker',
                body: 'Rest time is over! Time for your next set.',
            },
        });
        console.log("Successfully sent push notification");
    }
    catch (error) {
        console.error("Error sending push notification", error);
    }
});
//# sourceMappingURL=gym.js.map