const SEGMENTS = {
  0: [1, 1, 1, 1, 1, 1, 0],
  1: [0, 1, 1, 0, 0, 0, 0],
  2: [1, 1, 0, 1, 1, 0, 1],
  3: [1, 1, 1, 1, 0, 0, 1],
  4: [0, 1, 1, 0, 0, 1, 1],
  5: [1, 0, 1, 1, 0, 1, 1],
  6: [1, 0, 1, 1, 1, 1, 1],
  7: [1, 1, 1, 0, 0, 0, 0],
  8: [1, 1, 1, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1],
};

const LEDDigit = ({ value, width = 24, height = 40 }) => {
  const segments = SEGMENTS[value] || SEGMENTS[0];

  const minWidth = 12;
  const minHeight = 20;
  const actualWidth = Math.max(width, minWidth);
  const actualHeight = Math.max(height, minHeight);

  const segmentThickness = Math.max(1, Math.floor(actualWidth * 0.15));
  const horizontalWidth = Math.floor(actualWidth * 0.7);
  const horizontalOffset = Math.floor(actualWidth * 0.15);
  const verticalHeight = Math.floor(actualHeight * 0.45);
  const middleY = Math.floor(actualHeight * 0.5);
  const gap = Math.max(1, Math.floor(actualHeight * 0.05));

  return (
    <div className="relative" style={{ width: `${actualWidth}px`, height: `${actualHeight}px` }}>
      <div className={segments[0] ? 'bg-red-600' : 'bg-red-900/30'}
        style={{
          position: 'absolute',
          top: 0,
          left: `${horizontalOffset}px`,
          width: `${horizontalWidth}px`,
          height: `${segmentThickness}px`
        }} />
      <div className={segments[6] ? 'bg-red-600' : 'bg-red-900/30'}
        style={{
          position: 'absolute',
          top: `${middleY}px`,
          left: `${horizontalOffset}px`,
          width: `${horizontalWidth}px`,
          height: `${segmentThickness}px`
        }} />
      <div className={segments[3] ? 'bg-red-600' : 'bg-red-900/30'}
        style={{
          position: 'absolute',
          bottom: 0,
          left: `${horizontalOffset}px`,
          width: `${horizontalWidth}px`,
          height: `${segmentThickness}px`
        }} />

      <div className={segments[1] ? 'bg-red-600' : 'bg-red-900/30'}
        style={{
          position: 'absolute',
          top: `${gap}px`,
          right: 0,
          width: `${segmentThickness}px`,
          height: `${verticalHeight}px`
        }} />
      <div className={segments[2] ? 'bg-red-600' : 'bg-red-900/30'}
        style={{
          position: 'absolute',
          bottom: `${gap}px`,
          right: 0,
          width: `${segmentThickness}px`,
          height: `${verticalHeight}px`
        }} />
      <div className={segments[5] ? 'bg-red-600' : 'bg-red-900/30'}
        style={{
          position: 'absolute',
          top: `${gap}px`,
          left: 0,
          width: `${segmentThickness}px`,
          height: `${verticalHeight}px`
        }} />
      <div className={segments[4] ? 'bg-red-600' : 'bg-red-900/30'}
        style={{
          position: 'absolute',
          bottom: `${gap}px`,
          left: 0,
          width: `${segmentThickness}px`,
          height: `${verticalHeight}px`
        }} />
    </div>
  );
};

export default LEDDigit; 