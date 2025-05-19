import './App.css'
import RadialMenu from '@/components/RadialMenu';
import { Settings, Share2, Trash2, Edit3, Copy, Plus } from 'lucide-react';

const menuItems = [
  { id: 'settings', icon: <Settings size={24} />, label: 'Settings', color: '#FFC107' },
  { id: 'share', icon: <Share2 size={24} />, label: 'Share', color: '#4CAF50' },
  { id: 'delete', icon: <Trash2 size={24} />, label: 'Delete', color: '#F44336' },
  { id: 'edit', icon: <Edit3 size={24} />, label: 'Edit', color: '#2196F3' },
  { id: 'copy', icon: <Copy size={24} />, label: 'Copy', color: '#9C27B0' },
  { id: 'add', icon: <Plus size={24} />, label: 'Add', color: '#795548' },
];

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Menu Radial Dynamique</h1>
        <p>Faites glisser le bouton central et survolez les items.</p>
      </header>
      <RadialMenu items={menuItems} />
      <footer className="app-footer">
        <p>Créé avec React, TypeScript, Framer Motion et Tailwind CSS (via Shadcn UI)</p>
      </footer>
    </div>
  )
}

export default App
