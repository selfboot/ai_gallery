import React from "react";
import { render, fireEvent, waitFor, screen } from "@/app/test_utils";
import "@testing-library/jest-dom";
import BFSPathFind from "../content";

describe("BFSPathFind", () => {
  test("renders the grid and controls", () => {
    render(<BFSPathFind />);
    expect(screen.getByTestId("grid")).toBeInTheDocument();
    expect(screen.getByTestId("find-path-button")).toBeInTheDocument();
    expect(screen.getByTestId("reset-grid-button")).toBeInTheDocument();
  });

  test("allows setting start and end points", async () => {
    render(<BFSPathFind />);
    fireEvent.change(screen.getByTestId("grid-width-input"), { target: { value: "10" } });
    fireEvent.change(screen.getByTestId("grid-height-input"), { target: { value: "10" } });

    await waitFor(() => {
      expect(screen.getAllByTestId(/^cell-/)).toHaveLength(100);
    });

    fireEvent.click(screen.getByText("Set Start Point"));
    fireEvent.click(screen.getByTestId("cell-1-1"));

    fireEvent.click(screen.getByText("Set End Point"));
    fireEvent.click(screen.getByTestId("cell-8-8"));
  });

  test("finds a path when possible and shows a modal", async () => {
    render(<BFSPathFind />);

    fireEvent.change(screen.getByTestId("grid-width-input"), { target: { value: "5" } });
    fireEvent.change(screen.getByTestId("grid-height-input"), { target: { value: "5" } });

    await waitFor(() => {
      expect(screen.getAllByTestId(/^cell-/)).toHaveLength(25);
    });
    fireEvent.click(screen.getByTestId("reset-grid-button"));

    fireEvent.click(screen.getByText("Set Start Point"));
    fireEvent.click(screen.getByTestId("cell-0-0"));

    fireEvent.click(screen.getByText("Set End Point"));
    fireEvent.click(screen.getByTestId("cell-2-1"));

    fireEvent.click(screen.getByText("Set Obstacles"));
    fireEvent.click(screen.getByTestId("cell-1-1"));

    fireEvent.change(screen.getByTestId("search-speed-slider"), { target: { value: "100" } });

    fireEvent.click(screen.getByTestId("find-path-button"));

    await waitFor(() => {
      expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
      expect(screen.getByTestId("modal-content")).toHaveTextContent("Path Found");
    });

    const pathCells = screen.getAllByTestId(/cell-\d-\d/);
    const path = pathCells.filter((cell) => cell.classList.contains("bg-green-300"));
    expect(path.length).toBeGreaterThan(0);
  }, 15000);

  test("shows a modal when no path is found", async () => {
    render(<BFSPathFind />);

    fireEvent.change(screen.getByTestId("grid-width-input"), { target: { value: "5" } });
    fireEvent.change(screen.getByTestId("grid-height-input"), { target: { value: "5" } });

    await waitFor(() => {
      expect(screen.getAllByTestId(/^cell-/)).toHaveLength(25);
    });
    fireEvent.click(screen.getByTestId("reset-grid-button"));
    fireEvent.click(screen.getByText("Set Start Point"));
    fireEvent.click(screen.getByTestId("cell-0-0"));

    fireEvent.click(screen.getByText("Set End Point"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    fireEvent.click(screen.getByText("Set Obstacles"));
    ["cell-1-0", "cell-0-1", "cell-1-1"].forEach((cellId) => {
      fireEvent.click(screen.getByTestId(cellId));
    });

    fireEvent.change(screen.getByTestId("search-speed-slider"), { target: { value: "200" } });

    fireEvent.click(screen.getByTestId("find-path-button"));

    await waitFor(() => {
      expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
      expect(screen.getByTestId("modal-content")).toHaveTextContent("No Path Found");
    });
  });

  test("resets the grid when reset button is clicked", async () => {
    render(<BFSPathFind />);
    fireEvent.click(screen.getByTestId("reset-grid-button"));

    const cells = screen.getAllByTestId(/cell-\d-\d/);
    cells.forEach((cell) => {
      expect(cell).not.toHaveClass("bg-green-300");
      expect(cell).not.toHaveClass("bg-green-100");
      expect(cell).not.toHaveClass("bg-red-100");
    });
  });

  test("shows modal when trying to find path without start or end points", async () => {
    render(<BFSPathFind />);

    fireEvent.click(screen.getByTestId("reset-grid-button"));
    fireEvent.click(screen.getByTestId("find-path-button"));

    await waitFor(() => {
      expect(screen.getByTestId("modal-content")).toHaveTextContent("Please set start and end points");
    });
  });

  test("allows setting and removing obstacles", () => {
    render(<BFSPathFind />);
    fireEvent.click(screen.getByTestId('reset-grid-button'));
    fireEvent.click(screen.getByText("Set Obstacles"));
    fireEvent.click(screen.getByTestId("cell-1-1"));
    expect(screen.getByTestId("cell-1-1")).toHaveClass("bg-gray-200");

    fireEvent.click(screen.getByTestId("cell-1-1"));
    expect(screen.getByTestId("cell-1-1")).not.toHaveClass("bg-gray-200");
  });

  test("resets the grid when reset button is clicked", async () => {
    render(<BFSPathFind />);
    fireEvent.change(screen.getByTestId("grid-width-input"), { target: { value: "10" } });
    fireEvent.change(screen.getByTestId("grid-height-input"), { target: { value: "5" } });

    await waitFor(() => {
      expect(screen.getAllByTestId(/^cell-/)).toHaveLength(50);
    });

    fireEvent.click(screen.getByText("Set Start Point"));
    fireEvent.click(screen.getByTestId("cell-0-0"));

    fireEvent.click(screen.getByText("Set End Point"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    fireEvent.click(screen.getByTestId("reset-grid-button"));

    expect(screen.queryByTestId("cell-0-0")).not.toHaveClass("bg-green-100");
    expect(screen.queryByTestId("cell-4-4")).not.toHaveClass("bg-red-100");
  });

  test("updates search speed when slider value changes", () => {
    render(<BFSPathFind />);

    fireEvent.change(screen.getByTestId("search-speed-slider"), { target: { value: "100" } });

    expect(screen.getByTestId("search-speed-slider")).toHaveValue("100");
  });

  test("disables buttons during search", async () => {
    render(<BFSPathFind />);
    fireEvent.change(screen.getByTestId("grid-width-input"), { target: { value: "10" } });
    fireEvent.change(screen.getByTestId("grid-height-input"), { target: { value: "5" } });
    await waitFor(() => {
      expect(screen.getAllByTestId(/^cell-/)).toHaveLength(50);
    });
    fireEvent.click(screen.getByText("Set Start Point"));
    fireEvent.click(screen.getByTestId("cell-0-0"));
    fireEvent.click(screen.getByText("Set End Point"));
    fireEvent.click(screen.getByTestId("cell-4-4"));
    fireEvent.click(screen.getByTestId("find-path-button"));

    expect(screen.getByTestId("find-path-button")).toBeDisabled();
    expect(screen.getByText("Set Obstacles")).toBeDisabled();
    expect(screen.getByTestId("reset-grid-button")).toBeDisabled();

    fireEvent.change(screen.getByTestId("search-speed-slider"), { target: { value: "200" } });

    await waitFor(() => {
      expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
      expect(screen.getByTestId("modal-content")).toBeInTheDocument();
    });

    expect(screen.getByTestId("find-path-button")).not.toBeDisabled();
    expect(screen.getByText("Set Obstacles")).not.toBeDisabled();
    expect(screen.getByTestId("reset-grid-button")).not.toBeDisabled();
  });
}, 10000);
