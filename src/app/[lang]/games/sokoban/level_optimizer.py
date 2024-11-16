#!/usr/bin/env python3

def optimize_level(level):
    """优化单个关卡的地图数据，将外部的2转换为0。
    
    Args:
        level (List[List[int]]): 关卡的二维数组数据
    
    Returns:
        List[List[int]]: 优化后的关卡数据
    """
    if not level or not level[0]:
        return level
    
    height = len(level)
    width = len(level[0])
    visited = [[False] * width for _ in range(height)]
    result = [row[:] for row in level]
    
    def flood_fill(row, col):
        """使用flood fill算法找出所有与外部相连的2"""
        if row < 0 or row >= height or col < 0 or col >= width:
            return
        if visited[row][col]:
            return
        if level[row][col] != 2:
            return
            
        visited[row][col] = True
        result[row][col] = 0
        
        # 检查四个方向
        flood_fill(row - 1, col)  # 上
        flood_fill(row + 1, col)  # 下
        flood_fill(row, col - 1)  # 左
        flood_fill(row, col + 1)  # 右
    
    # 从四条边开始flood fill
    # 顶部和底部边缘
    for col in range(width):
        if level[0][col] == 2:
            flood_fill(0, col)
        if level[height-1][col] == 2:
            flood_fill(height-1, col)
    
    # 左边和右边边缘
    for row in range(height):
        if level[row][0] == 2:
            flood_fill(row, 0)
        if level[row][width-1] == 2:
            flood_fill(row, width-1)
    
    return result

def optimize_all_levels(levels):
    """优化所有关卡的地图数据
    
    Args:
        levels (List[List[List[int]]]): 所有关卡的数据列表
    
    Returns:
        List[List[List[int]]]: 优化后的所有关卡数据
    """
    return [optimize_level(level) for level in levels]

def save_levels(levels, filename):
    """将优化后的关卡数据保存到文件
    
    Args:
        levels (List[List[List[int]]]): 优化后的关卡数据
        filename (str): 输出文件名
    """
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('LEVEL_MAPS = [\n')
        for level in levels:
            f.write('  [\n')
            for row in level:
                f.write(f'    {row},\n')
            f.write('  ],\n')
        f.write('];\n')

def load_levels(filename):
    """从文件加载关卡数据
    
    Args:
        filename (str): 输入文件名
    
    Returns:
        List[List[List[int]]]: 加载的关卡数据
    """
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
        # 将文件内容转换为Python数据结构
        # 注意：这种方法不太安全，仅用于演示
        levels = eval(content.replace('LEVEL_MAPS = ', '').replace(';', ''))
        return levels

def main():
    # 从文件加载关卡数据
    input_file = 'paste.txt'  # 输入文件名
    output_file = 'optimized_levels.txt'  # 输出文件名
    
    try:
        # 加载关卡数据
        levels = load_levels(input_file)
        
        # 优化所有关卡
        optimized_levels = optimize_all_levels(levels)
        
        # 保存优化后的数据
        save_levels(optimized_levels, output_file)
        
        print(f'Successfully optimized {len(levels)} levels.')
        print(f'Output saved to: {output_file}')
        
        # 输出一些统计信息
        total_changes = 0
        for i, (old, new) in enumerate(zip(levels, optimized_levels)):
            changes = sum(sum(1 for a, b in zip(row1, row2) if a != b) 
                         for row1, row2 in zip(old, new))
            total_changes += changes
            print(f'Level {i+1}: {changes} cells changed')
        print(f'Total changes made: {total_changes}')
        
    except Exception as e:
        print(f'Error: {str(e)}')

if __name__ == '__main__':
    main()
