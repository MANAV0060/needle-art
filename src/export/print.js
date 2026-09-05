import { exportToSVG } from './svgExporter.js';

/**
 * Triggers browser print at 100% scale.
 */

export function triggerPrint(appState) {
  const svgString = exportToSVG(appState);

  let printContainer = document.getElementById('print-svg-container');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'print-svg-container';
    printContainer.style.display = 'none';
    document.body.appendChild(printContainer);
  }

  printContainer.innerHTML = svgString;
  window.print();
}
