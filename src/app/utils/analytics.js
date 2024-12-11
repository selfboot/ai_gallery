export const trackEvent = (category, eventName, params = {}, options = { umami: false }) => {
  const reportEventName = `${category}:${eventName}`;
  const isLocalhost = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // In local environment, only log to console
  if (isLocalhost) {
    console.log("[Analytics Event]", {
      name: reportEventName,
      ...params,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // GA4 report
  if (typeof gtag !== "undefined") {
    gtag("event", reportEventName, {
      event_name: reportEventName,
      ...params,
      timestamp: new Date().toISOString(),
    });
  }

  // Umami report
  if (options.umami && typeof window !== "undefined" && window.umami) {
    window.umami.track(reportEventName, params);
  }
};

export const CATEGORIES = {
  Minesweeper: "minesweeper",
  Maze: "maze",
};

export const EVENTS = {
  Minesweeper: {
    Success: "success",
    Fail: "fail",
  },
  Maze: {
    Generated: "generated",
    PathCompleted: "pathcompleted",
    Downloaded: "downloaded",
    AlgorithmChanged: 'algorithm_changed',
    ShapeChanged: 'shape_changed',
    SeedEntered: 'seed_entered',
    ShowGenerationProcess: 'generation_process_toggled',
    GameStarted: 'game_started',
    GameStopped: 'game_stopped',
  },
};
