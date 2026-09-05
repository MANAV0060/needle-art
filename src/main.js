import './styles/main.css';
import './styles/print.css';
import { createIcons, icons } from 'lucide';
import { AppController } from './app/appController.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  createIcons({ icons });

  // Boot App Controller
  window.app = new AppController();
});
