/**
 * Built-in Sample Image presets (Portrait, Butterfly, Logo, Mandala, Line Art)
 * rendered to HTML Canvas data URLs for instant 1-click testing.
 */

export const SAMPLE_PRESETS = [
  {
    id: 'butterfly',
    name: 'Butterfly Artwork',
    recommendedMode: 'hybrid',
    description: 'Symmetric floral butterfly line art & shading',
    render: (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;

      const cx = w / 2;
      const cy = h / 2;

      // Butterfly Body
      ctx.beginPath();
      ctx.ellipse(cx, cy, 15, 80, 0, 0, Math.PI * 2);
      ctx.fill();

      // Antennae
      ctx.beginPath();
      ctx.arc(cx - 30, cy - 100, 20, 0.2, Math.PI);
      ctx.arc(cx + 30, cy - 100, 20, 0, Math.PI - 0.2);
      ctx.stroke();

      // Top Wings
      ctx.beginPath();
      ctx.ellipse(cx - 110, cy - 50, 100, 70, -0.3, 0, Math.PI * 2);
      ctx.ellipse(cx + 110, cy - 50, 100, 70, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Wing Inner Circles (Detail)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 120, cy - 60, 35, 0, Math.PI * 2);
      ctx.arc(cx + 120, cy - 60, 35, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Wings
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(cx - 80, cy + 60, 75, 55, 0.4, 0, Math.PI * 2);
      ctx.ellipse(cx + 80, cy + 60, 75, 55, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'portrait',
    name: 'Portrait Silhouette',
    recommendedMode: 'shading',
    description: 'Human portrait silhouette for tonal shading',
    render: (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#000000';

      const cx = w / 2;
      const cy = h / 2;

      // Profile silhouette
      ctx.beginPath();
      ctx.arc(cx, cy - 40, 90, 0, Math.PI * 2); // Head
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx - 90, cy + 20);
      ctx.quadraticCurveTo(cx - 140, cy + 160, cx - 180, cy + 240);
      ctx.lineTo(cx + 180, cy + 240);
      ctx.quadraticCurveTo(cx + 140, cy + 160, cx + 90, cy + 20);
      ctx.closePath();
      ctx.fill();

      // Face cutout profile
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx + 40, cy - 40, 45, 65, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'mandala',
    name: 'Geometric Mandala',
    recommendedMode: 'outline',
    description: 'Intricate circular geometric mandala lines',
    render: (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;

      const cx = w / 2;
      const cy = h / 2;

      for (let r = 30; r <= 180; r += 35) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      const petals = 12;
      for (let i = 0; i < petals; i++) {
        const angle = (i * Math.PI * 2) / petals;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 100, 30, 70, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  },
  {
    id: 'logo',
    name: 'Minimal Floral Logo',
    recommendedMode: 'outline',
    description: 'Clean vector flower emblem',
    render: (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;

      const cx = w / 2;
      const cy = h / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, 60, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
];

export function createSampleImage(presetId, width = 600, height = 600) {
  const preset = SAMPLE_PRESETS.find(p => p.id === presetId) || SAMPLE_PRESETS[0];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  preset.render(ctx, width, height);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ img, canvas, preset });
    img.src = canvas.toDataURL('image/png');
  });
}
