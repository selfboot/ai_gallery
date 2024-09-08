import React, { Profiler } from 'react';
import { render } from '@/app/test_utils';
import BinarySearchTreeVisualization from '../content';

describe('BinarySearchTreeVisualization Performance', () => {
  it('should render large trees efficiently', () => {
    const onRender = jest.fn();
    render(
      <Profiler id="test" onRender={onRender}>
        <BinarySearchTreeVisualization initialNodeCount={100} />
      </Profiler>
    );
    
    const [, , actualDuration] = onRender.mock.calls[0];
    expect(actualDuration).toBeLessThan(100); // 假设渲染时间应小于100ms
  });
});
