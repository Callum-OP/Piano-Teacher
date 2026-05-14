//------------------------
// Wake Lock Simulation

// Simulate wake lock object
function createMockWakeLock() {
    let released = false;
    return {
        get released() { return released; },
        release: jest.fn(() => {
            released = true;
            console.log('[WakeLock] Wake lock released');
        })
    };
}

// Simulate the full wake lock state machine as close to real as possible
function createWakeLockSystem() {
    let wakeLock = null;
    let pauseWakeLockTimer = null;
    let scheduledNotes = [];
    let isPaused = false;
    let globalTime = 0;
    let totalDuration = 0;
    const PAUSE_WAKELOCK_TIMEOUT = 2 * 60 * 1000;

    function isPlaying() {
        const result = scheduledNotes.length > 0 && !isPaused && globalTime < totalDuration;
        console.log(`[isPlaying] scheduledNotes=${scheduledNotes.length}, isPaused=${isPaused}, globalTime=${globalTime}, totalDuration=${totalDuration} => ${result}`);
        return result;
    }

    function enableWakeLock() {
        if (!isPlaying()) {
            console.log('[WakeLock] enableWakeLock() called but not playing - skipped');
            return;
        }
        if (wakeLock && !wakeLock.released) {
            console.log('[WakeLock] enableWakeLock() called but already active - skipped');
            return;
        }
        wakeLock = createMockWakeLock();
        console.log('[WakeLock] Wake lock acquired');
    }

    function disableWakeLock() {
        clearTimeout(pauseWakeLockTimer);
        pauseWakeLockTimer = null;
        if (wakeLock && !wakeLock.released) {
            wakeLock.release();
            wakeLock = null;
            console.log('[WakeLock] Wake lock disabled and cleared');
        } else {
            console.log('[WakeLock] disableWakeLock() called but nothing to release');
        }
    }

    function startPauseWakeLockTimer() {
        clearTimeout(pauseWakeLockTimer);
        console.log(`[WakeLock] Pause timer started - will release in ${PAUSE_WAKELOCK_TIMEOUT / 1000}s`);
        pauseWakeLockTimer = setTimeout(() => {
            console.log('[WakeLock] Pause timer fired - releasing wake lock');
            disableWakeLock();
        }, PAUSE_WAKELOCK_TIMEOUT);
    }

    function startPlaying(notes, duration) {
        console.log('\n--- ACTION: Start playing ---');
        scheduledNotes = notes;
        totalDuration = duration;
        globalTime = 0;
        isPaused = false;
        enableWakeLock();
    }

    function pause() {
        console.log('\n--- ACTION: Pause ---');
        isPaused = true;
        startPauseWakeLockTimer();
    }

    function resume() {
        console.log('\n--- ACTION: Resume ---');
        isPaused = false;
        clearTimeout(pauseWakeLockTimer);
        pauseWakeLockTimer = null;
        enableWakeLock();
    }

    function stop() {
        console.log('\n--- ACTION: Stop ---');
        scheduledNotes = [];
        isPaused = false;
        globalTime = 0;
        totalDuration = 0;
        disableWakeLock();
    }

    function finish() {
        console.log('\n--- ACTION: Music finished ---');
        globalTime = totalDuration;
        isPaused = true;
        disableWakeLock();
    }

    function returnToApp() {
        console.log('\n--- ACTION: Return to app (visibilitychange) ---');
        if (isPlaying()) {
            enableWakeLock();
        } else if (isPaused && scheduledNotes.length > 0 && globalTime < totalDuration) {
            // Only restart timer if wake lock is still active
            // If timer already fired and released it, don't restart
            if (wakeLock && !wakeLock.released) {
                console.log('[WakeLock] Returned while paused mid-piece - restarting pause timer');
                startPauseWakeLockTimer();
            } else {
                console.log('[WakeLock] Returned while paused but wake lock already released - leaving off');
            }
        } else {
            console.log('[WakeLock] Returned but music not active - disabling wake lock');
            disableWakeLock();
        }
    }

    function leaveApp() {
        console.log('\n--- ACTION: Leave app (visibilitychange hidden) ---');
        clearTimeout(pauseWakeLockTimer);
        pauseWakeLockTimer = null;
        console.log('[WakeLock] Pause timer cleared on leaving app');
    }

    function getState() {
        return {
            wakeLockActive: wakeLock !== null && !wakeLock.released,
            isPaused,
            globalTime,
            totalDuration,
            scheduledNotesCount: scheduledNotes.length,
            timerActive: pauseWakeLockTimer !== null
        };
    }

    // Add this to createWakeLockSystem, just before the return statement:
    function _forceState(overrides) {
        if ('globalTime' in overrides) globalTime = overrides.globalTime;
        if ('isPaused' in overrides) isPaused = overrides.isPaused;
        if ('totalDuration' in overrides) totalDuration = overrides.totalDuration;
        if ('scheduledNotes' in overrides) scheduledNotes = overrides.scheduledNotes;
        console.log('[_forceState] State forced to:', overrides);
    }

    // Add _forceState to the return object:
    return { startPlaying, pause, resume, stop, finish, returnToApp, leaveApp, getState, startPauseWakeLockTimer, _forceState };
}

const mockNotes = [
    { scheduledStart: 0, duration: 9000 },
    { scheduledStart: 500, duration: 9000 }
];

// --- Sequential scenario tests ---

test('scenario: start playing - wake lock should be active', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();
    
    wl.startPlaying(mockNotes, 20000);
    const state = wl.getState();
    console.log('[State]', state);
    
    expect(state.wakeLockActive).toBe(true);
    expect(state.isPaused).toBe(false);
    jest.useRealTimers();
});

test('scenario: start playing then pause - wake lock active, timer started', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();
    const state = wl.getState();
    console.log('[State]', state);

    expect(state.wakeLockActive).toBe(true); // Still active, timer hasn't fired yet
    expect(state.isPaused).toBe(true);
    expect(state.timerActive).toBe(true);
    jest.useRealTimers();
});

test('scenario: start playing, pause, then 2 min pass - wake lock should release', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();
    
    console.log('[State before timer fires]', wl.getState());
    jest.advanceTimersByTime(2 * 60 * 1000);
    
    const state = wl.getState();
    console.log('[State after timer fires]', state);

    expect(state.wakeLockActive).toBe(false);
    expect(state.timerActive).toBe(false);
    jest.useRealTimers();
});

test('scenario: start playing, pause, resume - timer cancelled, wake lock stays active', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();
    wl.resume();

    const state = wl.getState();
    console.log('[State]', state);

    expect(state.wakeLockActive).toBe(true);
    expect(state.isPaused).toBe(false);
    expect(state.timerActive).toBe(false); // Timer should be cancelled
    jest.useRealTimers();
});

test('scenario: start playing, pause, stop - wake lock released immediately', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();
    wl.stop();

    const state = wl.getState();
    console.log('[State]', state);

    expect(state.wakeLockActive).toBe(false);
    expect(state.timerActive).toBe(false);
    expect(state.scheduledNotesCount).toBe(0);
    jest.useRealTimers();
});

test('scenario: start playing then stop - wake lock released', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.stop();

    const state = wl.getState();
    console.log('[State]', state);

    expect(state.wakeLockActive).toBe(false);
    jest.useRealTimers();
});

test('scenario: music finishes naturally - wake lock released', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.finish();

    const state = wl.getState();
    console.log('[State]', state);

    expect(state.wakeLockActive).toBe(false);
    jest.useRealTimers();
});

test('scenario: leave app while playing, return - wake lock reacquired', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.leaveApp();
    wl.returnToApp();

    const state = wl.getState();
    console.log('[State]', state);

    expect(state.wakeLockActive).toBe(true);
    jest.useRealTimers();
});

test('scenario: leave app while paused, return - pause timer restarted, no wake lock reacquired', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();
    wl.leaveApp(); // Clears timer
    wl.returnToApp(); // Should restart timer, not reacquire wake lock

    const state = wl.getState();
    console.log('[State]', state);

    expect(state.wakeLockActive).toBe(true); // Still active since timer hasn't fired
    expect(state.timerActive).toBe(true); // Timer restarted
    jest.useRealTimers();
});

test('scenario: return to app after music finished - wake lock stays off', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.finish();
    wl.returnToApp();

    const state = wl.getState();
    console.log('[State]', state);

    expect(state.wakeLockActive).toBe(false);
    jest.useRealTimers();
});

test('scenario: nothing playing, return to app - wake lock never acquired', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.returnToApp();

    const state = wl.getState();
    console.log('[State]', state);

    expect(state.wakeLockActive).toBe(false);
    jest.useRealTimers();
});

test('scenario: full playthrough - play, pause, resume, finish', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    expect(wl.getState().wakeLockActive).toBe(true);
    console.log('[State after play]', wl.getState());

    wl.pause();
    expect(wl.getState().wakeLockActive).toBe(true); // Still active
    expect(wl.getState().timerActive).toBe(true);
    console.log('[State after pause]', wl.getState());

    wl.resume();
    expect(wl.getState().wakeLockActive).toBe(true);
    expect(wl.getState().timerActive).toBe(false); // Timer cancelled
    console.log('[State after resume]', wl.getState());

    wl.finish();
    expect(wl.getState().wakeLockActive).toBe(false);
    console.log('[State after finish]', wl.getState());

    jest.useRealTimers();
});


//------------------------
// Obscure & Edge Case Wake Lock Tests

test('edge case: globalTime reset but scheduledNotes not cleared - should not think mid-piece', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.finish();

    // Simulate globalTime being reset without clearing scheduledNotes
    // This mimics a potential bug where state gets partially reset
    wl._forceState({ globalTime: 0 });

    const state = wl.getState();
    console.log('[State after partial reset]', state);

    // scheduledNotes still has 2 notes, globalTime is 0
    jest.useRealTimers();
});

test('edge case: globalTime reset to 0 but scheduledNotes not cleared - isPlaying returns true incorrectly', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    // Play and finish
    wl.startPlaying(mockNotes, 20000);
    wl.finish();
    console.log('[State after finish]', wl.getState());

    // Force globalTime back to 0 without clearing scheduledNotes (simulates partial reset bug)
    wl._forceState({ globalTime: 0, isPaused: false });
    const state = wl.getState();
    console.log('[State after partial reset - potential bug]', state);

    // This would incorrectly enable wake lock since isPlaying() would return true
    // The test documents this known risk
    expect(state.scheduledNotesCount).toBe(2); // Notes still there
    expect(state.globalTime).toBe(0);          // Time reset
    expect(state.isPaused).toBe(false);        // Not paused
    // Wake lock is currently off from finish() but returnToApp would reacquire it incorrectly
    wl.returnToApp();
    const stateAfterReturn = wl.getState();
    console.log('[State after returnToApp with partial reset]', stateAfterReturn);
    // Document the bug - wake lock gets reacquired even though music is done
    expect(stateAfterReturn.wakeLockActive).toBe(true); // This is the bug
    jest.useRealTimers();
});

test('edge case: rapid pause and resume multiple times - wake lock stays consistent', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    console.log('[State after play]', wl.getState());

    // Rapid pause/resume
    wl.pause();
    console.log('[State after pause 1]', wl.getState());
    wl.resume();
    console.log('[State after resume 1]', wl.getState());
    wl.pause();
    console.log('[State after pause 2]', wl.getState());
    wl.resume();
    console.log('[State after resume 2]', wl.getState());
    wl.pause();
    console.log('[State after pause 3]', wl.getState());
    wl.resume();
    console.log('[State after resume 3]', wl.getState());

    const state = wl.getState();
    expect(state.wakeLockActive).toBe(true);
    expect(state.timerActive).toBe(false); // All timers should be cancelled
    expect(state.isPaused).toBe(false);
    jest.useRealTimers();
});

test('edge case: pause, timer almost fires, then resume - timer cancelled in time', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();

    // Advance to just before timer fires
    jest.advanceTimersByTime(1 * 60 * 1000 + 59000); // 1 min 59s
    console.log('[State just before timer fires]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(true);
    expect(wl.getState().timerActive).toBe(true);

    // Resume just in time
    wl.resume();
    console.log('[State after resume]', wl.getState());

    // Advance past where timer would have fired
    jest.advanceTimersByTime(10000);
    console.log('[State after timer would have fired]', wl.getState());

    expect(wl.getState().wakeLockActive).toBe(true); // Should still be active
    expect(wl.getState().timerActive).toBe(false);   // Timer cancelled
    jest.useRealTimers();
});

test('edge case: multiple leave and return cycles while playing', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);

    // Switch away and back multiple times
    for (let i = 0; i < 5; i++) {
        wl.leaveApp();
        console.log(`[State after leave ${i + 1}]`, wl.getState());
        wl.returnToApp();
        console.log(`[State after return ${i + 1}]`, wl.getState());
        expect(wl.getState().wakeLockActive).toBe(true);
    }

    const state = wl.getState();
    expect(state.wakeLockActive).toBe(true);
    expect(state.timerActive).toBe(false);
    jest.useRealTimers();
});

test('edge case: multiple leave and return cycles while paused', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();

    // Switch away and back multiple times while paused
    for (let i = 0; i < 3; i++) {
        wl.leaveApp();
        console.log(`[State after leave ${i + 1}]`, wl.getState());
        // Timer should be cleared when leaving
        expect(wl.getState().timerActive).toBe(false);

        wl.returnToApp();
        console.log(`[State after return ${i + 1}]`, wl.getState());
        // Timer should restart each time
        expect(wl.getState().timerActive).toBe(true);
        expect(wl.getState().wakeLockActive).toBe(true);
    }

    // Now let timer fire after last return
    jest.advanceTimersByTime(2 * 60 * 1000);
    console.log('[State after timer fires]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(false);
    jest.useRealTimers();
});

test('edge case: leave app while pause timer is counting, return before it fires', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();

    // Advance 1 minute into the 2 minute timer
    jest.advanceTimersByTime(60000);
    console.log('[State after 1min paused]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(true);
    expect(wl.getState().timerActive).toBe(true);

    // Leave app - clears timer
    wl.leaveApp();
    console.log('[State after leaving app]', wl.getState());
    expect(wl.getState().timerActive).toBe(false);

    // Return - restarts full 2 minute timer from scratch
    wl.returnToApp();
    console.log('[State after returning]', wl.getState());
    expect(wl.getState().timerActive).toBe(true);

    // Advance 1 minute - timer should NOT have fired yet (restarted from scratch)
    jest.advanceTimersByTime(60000);
    console.log('[State after 1min since return]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(true);

    // Advance another minute - now timer fires
    jest.advanceTimersByTime(60000);
    console.log('[State after 2min since return]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(false);
    jest.useRealTimers();
});

test('edge case: stop called while pause timer is active', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();
    expect(wl.getState().timerActive).toBe(true);

    wl.stop();
    console.log('[State after stop during pause]', wl.getState());

    // Timer should be cleared
    expect(wl.getState().timerActive).toBe(false);
    expect(wl.getState().wakeLockActive).toBe(false);

    // Advance past where timer would have fired
    jest.advanceTimersByTime(2 * 60 * 1000);
    console.log('[State after timer would have fired]', wl.getState());
    // Wake lock should still be off
    expect(wl.getState().wakeLockActive).toBe(false);
    jest.useRealTimers();
});

test('edge case: finish called while pause timer is active', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();
    expect(wl.getState().timerActive).toBe(true);

    // Music somehow finishes while paused (e.g. scrubbed to end)
    wl.finish();
    console.log('[State after finish during pause]', wl.getState());

    expect(wl.getState().timerActive).toBe(false);
    expect(wl.getState().wakeLockActive).toBe(false);
    jest.useRealTimers();
});

test('edge case: returnToApp called multiple times rapidly', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();

    // Rapid visibility changes (e.g. screen flicker or OS switching)
    wl.leaveApp();
    wl.returnToApp();
    wl.leaveApp();
    wl.returnToApp();
    wl.leaveApp();
    wl.returnToApp();

    const state = wl.getState();
    console.log('[State after rapid visibility changes]', state);

    // Should end up in a consistent state
    expect(state.wakeLockActive).toBe(true);
    expect(state.timerActive).toBe(true); // Timer restarted on last return
    jest.useRealTimers();
});

test('edge case: autoPlay called again while already playing - wake lock stays active', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    console.log('[State after first play]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(true);

    // Simulate restarting (stopAll then autoPlay)
    wl.stop();
    console.log('[State after stop]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(false);

    wl.startPlaying(mockNotes, 20000);
    console.log('[State after second play]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(true);
    jest.useRealTimers();
});

test('edge case: tab switching simulation - leave, leave again (no matching return), return', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);

    // Some browsers fire multiple hidden events
    wl.leaveApp();
    wl.leaveApp(); // Duplicate hidden event
    console.log('[State after double leave]', wl.getState());

    wl.returnToApp();
    console.log('[State after return]', wl.getState());

    expect(wl.getState().wakeLockActive).toBe(true);
    jest.useRealTimers();
});

test('edge case: very long pause - timer fires, then user returns and resumes', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();

    // Timer fires after 2 minutes
    jest.advanceTimersByTime(2 * 60 * 1000);
    console.log('[State after timer fires]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(false);
    expect(wl.getState().timerActive).toBe(false);

    // User returns to app - wake lock already released so timer should NOT restart
    wl.returnToApp();
    console.log('[State after return with expired timer]', wl.getState());
    expect(wl.getState().timerActive).toBe(false); // Corrected: timer should NOT restart
    expect(wl.getState().wakeLockActive).toBe(false); // Wake lock stays off

    // User resumes - now wake lock should reacquire
    wl.resume();
    console.log('[State after resume]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(true); // Reacquired on resume
    expect(wl.getState().timerActive).toBe(false);
    jest.useRealTimers();
});

test('pause, wait exactly 2 minutes - wake lock releases at exactly 2 min not before', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();

    // 1 second before - should still be active
    jest.advanceTimersByTime((2 * 60 * 1000) - 1000);
    console.log('[State 1s before timer fires]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(true);
    expect(wl.getState().timerActive).toBe(true);

    // Exactly at 2 minutes
    jest.advanceTimersByTime(1000);
    console.log('[State at exactly 2 minutes]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(false);
    expect(wl.getState().timerActive).toBe(false);
    jest.useRealTimers();
});

test('pause, wait 2 minutes, timer fires, then user resumes - wake lock reacquired', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();

    jest.advanceTimersByTime(2 * 60 * 1000);
    console.log('[State after timer fires]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(false);

    // User comes back and resumes
    wl.resume();
    console.log('[State after resume post-timer]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(true); // Must reacquire
    expect(wl.getState().timerActive).toBe(false);
    jest.useRealTimers();
});

test('pause, wait 2 minutes, timer fires, user leaves and returns - still no wake lock until resume', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    wl.startPlaying(mockNotes, 20000);
    wl.pause();
    jest.advanceTimersByTime(2 * 60 * 1000);
    console.log('[State after timer fires]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(false);

    // User leaves and returns without resuming
    wl.leaveApp();
    wl.returnToApp();
    console.log('[State after return without resuming]', wl.getState());
    // Should restart timer but NOT reacquire wake lock since still paused
    expect(wl.getState().wakeLockActive).toBe(false);
    expect(wl.getState().timerActive).toBe(false); // No timer since wake lock already off

    jest.useRealTimers();
});

test('never playing - wake lock should never activate under any circumstances', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    // Try all actions without ever starting play
    wl.leaveApp();
    wl.returnToApp();
    wl.leaveApp();
    wl.returnToApp();
    console.log('[State after multiple returns without playing]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(false);
    expect(wl.getState().timerActive).toBe(false);
    jest.useRealTimers();
});

test('playing with no scheduled notes - wake lock should not activate', () => {
    jest.useFakeTimers();
    const wl = createWakeLockSystem();

    // Force playing state but with empty notes (edge case)
    wl._forceState({ globalTime: 0, isPaused: false, totalDuration: 20000, scheduledNotes: [] });
    wl.returnToApp();
    console.log('[State with no scheduled notes]', wl.getState());
    expect(wl.getState().wakeLockActive).toBe(false);
    jest.useRealTimers();
});