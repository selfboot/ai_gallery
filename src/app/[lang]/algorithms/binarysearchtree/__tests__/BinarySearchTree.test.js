import { BinarySearchTree} from '../content';

describe('BinarySearchTree', () => {
  let bst;

  beforeEach(() => {
    bst = new BinarySearchTree();
  });

  test('insert should add a node correctly', () => {
    bst.insert(5);
    expect(bst.root.key).toBe(5);
    bst.insert(3);
    expect(bst.root.left.key).toBe(3);
    bst.insert(7);
    expect(bst.root.right.key).toBe(7);
  });

  test('search should find existing nodes', () => {
    bst.insert(5);
    bst.insert(3);
    bst.insert(7);
    expect(bst.search(3).found).toBeTruthy();
    expect(bst.search(8).found).toBeFalsy();
  });

  test('delete should remove nodes correctly', () => {
    bst.insert(5);
    bst.insert(3);
    bst.insert(7);
    bst.delete(3);
    expect(bst.search(3).found).toBeFalsy();
    expect(bst.root.left).toBeNull();
  });

  test('_updateLayout should set x and y coordinates', () => {
    bst.insert(5);
    bst.insert(3);
    bst.insert(7);
    bst._updateLayout();
    expect(bst.root.x).toBeDefined();
    expect(bst.root.y).toBeDefined();
    expect(bst.root.left.x).toBeDefined();
    expect(bst.root.left.y).toBeDefined();
  });
});
