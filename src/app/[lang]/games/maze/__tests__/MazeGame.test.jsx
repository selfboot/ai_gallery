import { render, fireEvent, waitFor, screen } from "@/app/test_utils";
import MazeGame from "../content";

describe("MazeGame Component", () => {
  test("renders maze game", () => {
    render(<MazeGame />);
    expect(screen.getByText("Generate Maze")).toBeInTheDocument();
  });

  test("generates new maze on button click", () => {
    render(<MazeGame />);
    const generateButton = screen.getByText("Generate Maze");
    fireEvent.click(generateButton);
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  test("starts game on play button click", () => {
    render(<MazeGame />);
    const playButton = screen.getByText("Start Game");
    fireEvent.click(playButton);
    expect(screen.getByText("Stop Game")).toBeInTheDocument();
  });
});
