import React from "react";
import { render, screen } from "@/app/test_utils";
import "@testing-library/jest-dom";
import AVLTreeVisualization from "../content";

describe("AVLTreeVisualization", () => {
  test("renders operation controls", () => {
    render(<AVLTreeVisualization />);
    expect(screen.getByText("Initialize Tree")).toBeInTheDocument();
    expect(screen.getByText("Insert")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Inorder")).toBeInTheDocument();
  });
});
