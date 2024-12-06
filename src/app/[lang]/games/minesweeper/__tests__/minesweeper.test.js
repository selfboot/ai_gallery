import Minesweeper from "../content";
import { render, fireEvent, waitFor, screen } from "@/app/test_utils";
import { __TEST_HOOKS__ } from "../content";

describe("Minesweeper", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should load and apply saved difficulty settings on mount", async () => {
    localStorage.setItem(
      "minesweeper-difficulty",
      JSON.stringify({
        value: "medium",
        timestamp: Date.now(),
      })
    );
    render(<Minesweeper />);
    const gameInstance = __TEST_HOOKS__.getGameInstance();
    expect(gameInstance.rows).toBe(16);
    expect(gameInstance.cols).toBe(16);
    expect(gameInstance.mines).toBe(40);

    // localStorage.clear();
    // localStorage.setItem("minesweeper-difficulty", JSON.stringify("expert"));
    // render(<Minesweeper />);

    // const expertGame = __TEST_HOOKS__.getGameInstance();
    // expect(expertGame.rows).toBe(16);
    // expect(expertGame.cols).toBe(30);
    // expect(expertGame.mines).toBe(99);
  });

  // it("should persist difficulty changes and apply them on reload", async () => {
  //   const { container } = render(<Minesweeper />);

  //   // 初始应该是 Easy 难度
  //   expect(screen.getByRole("button", { name: /Easy/i })).toBeInTheDocument();
  //   let gameInstance = container.querySelector('[data-testid="minesweeper-game"]').__gameInstance;
  //   expect(gameInstance.rows).toBe(9);
  //   expect(gameInstance.cols).toBe(9);
  //   expect(gameInstance.mines).toBe(10);

  //   // 切换到 Medium 难度
  //   fireEvent.click(screen.getByRole("button", { name: /Easy/i }));
  //   fireEvent.click(screen.getByText("Medium"));

  //   // 验证本地存储已更新
  //   expect(JSON.parse(localStorage.getItem("minesweeper-difficulty"))).toBe("medium");

  //   // 模拟页面刷新
  //   rerender(<Minesweeper />);

  //   // 验证难度保持为 Medium
  //   expect(screen.getByRole("button", { name: /Medium/i })).toBeInTheDocument();

  //   // 验证游戏板尺寸符合中等难度
  //   const canvas = screen.getByRole("canvas");
  //   expect(canvas.width).toBe(16 * 40);
  //   expect(canvas.height).toBe(16 * 40);
  // });

  // it("should correctly apply autoFlag setting after reload", async () => {
  //   // 设置初始 autoFlag 为 true
  //   localStorage.setItem(
  //     "minesweeper-settings",
  //     JSON.stringify({
  //       rows: 9,
  //       cols: 9,
  //       mines: 10,
  //       autoFlag: true,
  //     })
  //   );

  //   const { rerender } = render(<Minesweeper />);

  //   // 验证 autoFlag 复选框被选中
  //   expect(screen.getByRole("checkbox", { name: /auto flag/i })).toBeChecked();

  //   // 模拟取消选中
  //   fireEvent.click(screen.getByRole("checkbox", { name: /auto flag/i }));

  //   // 验证设置已保存
  //   const savedSettings = JSON.parse(localStorage.getItem("minesweeper-settings"));
  //   expect(savedSettings.autoFlag).toBe(false);

  //   // 模拟页面刷新
  //   rerender(<Minesweeper />);

  //   // 验证设置保持为未选中状态
  //   expect(screen.getByRole("checkbox", { name: /auto flag/i })).not.toBeChecked();
  // });
});
