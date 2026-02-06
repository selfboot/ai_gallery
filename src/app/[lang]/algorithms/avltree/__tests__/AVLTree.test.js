import { AVLTree } from "../content";

const isBalanced = (tree, node) => {
  if (!node) return true;
  const leftHeight = tree._height(node.left);
  const rightHeight = tree._height(node.right);
  const bf = Math.abs(leftHeight - rightHeight);
  return bf <= 1 && isBalanced(tree, node.left) && isBalanced(tree, node.right);
};

describe("AVLTree", () => {
  let avl;
  const t = (key, params = {}) => {
    let text = key;
    Object.keys(params).forEach((k) => {
      text = text.replace(`{{${k}}}`, String(params[k]));
    });
    return text;
  };

  beforeEach(() => {
    avl = new AVLTree();
  });

  test("insert should keep tree balanced for LL case", () => {
    avl.insertWithTrace(30, t);
    avl.insertWithTrace(20, t);
    avl.insertWithTrace(10, t);

    expect(avl.root.key).toBe(20);
    expect(avl.root.left.key).toBe(10);
    expect(avl.root.right.key).toBe(30);
    expect(isBalanced(avl, avl.root)).toBe(true);
  });

  test("insert should keep tree balanced for LR case", () => {
    avl.insertWithTrace(30, t);
    avl.insertWithTrace(10, t);
    avl.insertWithTrace(20, t);

    expect(avl.root.key).toBe(20);
    expect(avl.root.left.key).toBe(10);
    expect(avl.root.right.key).toBe(30);
    expect(isBalanced(avl, avl.root)).toBe(true);
  });

  test("delete should keep tree balanced", () => {
    [20, 10, 30, 25, 40, 22].forEach((key) => avl.insertWithTrace(key, t));
    const result = avl.deleteWithTrace(10, t);

    expect(result.deleted).toBe(true);
    expect(isBalanced(avl, avl.root)).toBe(true);
  });

  test("search should find existing/non-existing nodes", () => {
    [15, 8, 25, 3, 11].forEach((key) => avl.insertWithTrace(key, t));

    expect(avl.searchWithTrace(11, t).found).toBe(true);
    expect(avl.searchWithTrace(99, t).found).toBe(false);
  });

  test("traversal should return expected order", () => {
    [20, 10, 30, 5, 15, 25, 40].forEach((key) => avl.insertWithTrace(key, t));

    expect(avl.inorder()).toEqual([5, 10, 15, 20, 25, 30, 40]);
    expect(avl.preorder()).toEqual([20, 10, 5, 15, 30, 25, 40]);
    expect(avl.postorder()).toEqual([5, 15, 10, 25, 40, 30, 20]);
    expect(avl.levelorder()).toEqual([20, 10, 30, 5, 15, 25, 40]);
  });
});
