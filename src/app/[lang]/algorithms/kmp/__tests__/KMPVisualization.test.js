import React from "react";
import { act, fireEvent, render, screen } from "@/app/test_utils";
import "@testing-library/jest-dom";
import { DEFAULT_KMP_EXAMPLE, getRandomKmpExample } from "../kmp";
import KMPVisualization from "../content";

jest.mock("../kmp", () => {
  const actual = jest.requireActual("../kmp");

  return {
    ...actual,
    getRandomKmpExample: jest.fn(() => actual.DEFAULT_KMP_EXAMPLE),
  };
});

describe("KMPVisualization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRandomKmpExample.mockReturnValue(DEFAULT_KMP_EXAMPLE);
  });

  test("renders the main controls", () => {
    render(<KMPVisualization />);

    expect(screen.getByTestId("kmp-text-input")).toBeInTheDocument();
    expect(screen.getByTestId("kmp-pattern-input")).toBeInTheDocument();
    expect(screen.getByTestId("kmp-build-lps")).toBeInTheDocument();
    expect(screen.getByTestId("kmp-start-match")).toBeInTheDocument();
    expect(screen.getByTestId("kmp-step")).toBeInTheDocument();
    expect(screen.getByTestId("kmp-reset")).toBeInTheDocument();
  });

  test("keeps the top area focused on controls and visualization", () => {
    render(<KMPVisualization />);

    expect(screen.queryByTestId("kmp-theory-section")).not.toBeInTheDocument();
    expect(screen.getByTestId("kmp-lps-array")).toBeInTheDocument();
    expect(screen.getByTestId("kmp-match-results")).toBeInTheDocument();
  });

  test("shows beginner guidance and disables playback controls before steps are prepared", () => {
    render(<KMPVisualization />);

    expect(screen.getByTestId("kmp-controls-guide")).toHaveTextContent(
      "Click a generate button to prepare steps, then watch them with Step or Auto Play.",
    );
    expect(screen.getByTestId("kmp-step")).toBeDisabled();
    expect(screen.getByTestId("kmp-autoplay")).toBeDisabled();
  });

  test("renders with the fixed default example on first load", () => {
    render(<KMPVisualization />);

    expect(screen.getByTestId("kmp-text-input")).toHaveValue(DEFAULT_KMP_EXAMPLE.text);
    expect(screen.getByTestId("kmp-pattern-input")).toHaveValue(DEFAULT_KMP_EXAMPLE.pattern);
  });

  test("loads a random example, retries once if it matches the current inputs, and resets playback", () => {
    const randomExample = {
      text: "xyxxyzxyxxyz",
      pattern: "xyxxyz",
    };

    getRandomKmpExample
      .mockReturnValueOnce(DEFAULT_KMP_EXAMPLE)
      .mockReturnValueOnce(randomExample);

    render(<KMPVisualization />);

    fireEvent.click(screen.getByTestId("kmp-build-lps"));
    fireEvent.click(screen.getByTestId("kmp-step"));

    fireEvent.click(screen.getByTestId("kmp-load-example"));

    expect(getRandomKmpExample).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("kmp-text-input")).toHaveValue(randomExample.text);
    expect(screen.getByTestId("kmp-pattern-input")).toHaveValue(randomExample.pattern);
    expect(screen.getByTestId("kmp-current-step")).toHaveTextContent("0 / 0");
  });

  test("builds prefix steps and starts autoplay immediately", () => {
    jest.useFakeTimers();
    render(<KMPVisualization />);

    fireEvent.change(screen.getByTestId("kmp-pattern-input"), {
      target: { value: "ababaca" },
    });

    fireEvent.click(screen.getByTestId("kmp-build-lps"));

    const initialStepText = screen.getByTestId("kmp-current-step").textContent;

    expect(screen.getByTestId("kmp-lps-array")).toBeInTheDocument();
    expect(screen.getByTestId("kmp-controls-guide")).toHaveTextContent(
      "Prefix steps are playing. Pause any time if you want to inspect them step by step.",
    );
    expect(screen.getByTestId("kmp-autoplay")).toHaveTextContent("Pause");
    expect(screen.getByTestId("kmp-step")).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(screen.getByTestId("kmp-current-step").textContent).not.toBe(initialStepText);
    jest.useRealTimers();
  });

  test("starts matching autoplay immediately and can be paused for manual stepping", () => {
    jest.useFakeTimers();
    render(<KMPVisualization />);

    fireEvent.change(screen.getByTestId("kmp-text-input"), {
      target: { value: "ababa" },
    });
    fireEvent.change(screen.getByTestId("kmp-pattern-input"), {
      target: { value: "aba" },
    });

    fireEvent.click(screen.getByTestId("kmp-start-match"));

    expect(screen.getByTestId("kmp-controls-guide")).toHaveTextContent(
      "Matching steps are playing. Pause any time if you want to inspect them step by step.",
    );
    expect(screen.getByTestId("kmp-autoplay")).toHaveTextContent("Pause");

    fireEvent.click(screen.getByTestId("kmp-autoplay"));

    expect(screen.getByTestId("kmp-controls-guide")).toHaveTextContent(
      "Matching steps are ready. Use Step to continue one move at a time, or Auto Play to keep them moving.",
    );
    expect(screen.getByTestId("kmp-autoplay")).toHaveTextContent("Auto Play");
    expect(screen.getByTestId("kmp-step")).not.toBeDisabled();

    for (let index = 0; index < 10; index += 1) {
      fireEvent.click(screen.getByTestId("kmp-step"));
    }

    expect(screen.getByTestId("kmp-match-results")).toHaveTextContent("0");
    expect(screen.getByTestId("kmp-match-results")).toHaveTextContent("2");
    jest.useRealTimers();
  });

  test("resets the visualization state", () => {
    render(<KMPVisualization />);

    fireEvent.click(screen.getByTestId("kmp-build-lps"));
    fireEvent.click(screen.getByTestId("kmp-step"));
    fireEvent.click(screen.getByTestId("kmp-reset"));

    expect(screen.getByTestId("kmp-current-step")).toHaveTextContent("0 / 0");
    expect(screen.getByTestId("kmp-match-results")).toHaveTextContent("No matches yet");
  });
});
