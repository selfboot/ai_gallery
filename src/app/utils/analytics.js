export const trackEvent = (category, eventName, params = {}, options = { umami: false }) => {
  // GA4 report
  if (typeof gtag !== "undefined") {
    gtag("event", eventName, {
      event_category: category,
      event_name: eventName,
      ...params,
      timestamp: new Date().toISOString(),
    });
  }

  // Umami report
  if (options.umami && typeof window !== "undefined" && window.umami) {
    const umamiEventName = `${category}:${eventName}`;
    window.umami.track(umamiEventName, params);
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
    Success: "success",
    Generated: "generated",
    PathCompleted: "path_completed",
    Downloaded: "downloaded",
  },
};
