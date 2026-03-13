let startX, startY;
let isDragging = false;
let bgImageURL = '';

const selectionBox = document.getElementById('selection-box');
const backgroundDiv = document.getElementById('screen-freeze');

window.api.onScreenshotCaptured((dataURL) => {
  bgImageURL = dataURL;
  backgroundDiv.style.backgroundImage = `url(${dataURL})`;
});

document.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  
  selectionBox.style.left = `${startX}px`;
  selectionBox.style.top = `${startY}px`;
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  selectionBox.style.display = 'block';
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  
  const currentX = e.clientX;
  const currentY = e.clientY;
  
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const left = Math.min(currentX, startX);
  const top = Math.min(currentY, startY);
  
  selectionBox.style.left = `${left}px`;
  selectionBox.style.top = `${top}px`;
  selectionBox.style.width = `${width}px`;
  selectionBox.style.height = `${height}px`;
});

document.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  
  const width = Math.abs(e.clientX - startX);
  const height = Math.abs(e.clientY - startY);

  if (width < 10 || height < 10) {
    // Treat as simple click, abandon selection
    window.api.closeOverlay();
    return;
  }
  
  const left = Math.min(e.clientX, startX);
  const top = Math.min(e.clientY, startY);
  
  const box = { x: left, y: top, width, height };
  
  window.api.processSelection(box, bgImageURL);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.api.closeOverlay();
  }
});
