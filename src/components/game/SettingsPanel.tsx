import { useState } from 'react';
import { useGameSettings } from '@/hooks/useGameSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Settings, X } from 'lucide-react';

interface SettingsPanelProps {
  onExitGameplay?: () => void;
}

export const SettingsPanel = ({ onExitGameplay }: SettingsPanelProps) => {
  const { settings, toggle, setPopupDensity } = useGameSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-[2000]">
      {!open && (
        <Button variant="secondary" className="btn-pixel flex items-center gap-2" onClick={() => setOpen(true)}>
          <Settings className="w-4 h-4" />
          SETTINGS
        </Button>
      )}
      {open && (
        <Card className="p-4 w-72 border-4 border-primary bg-background/95 backdrop-blur-sm space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-primary flex items-center gap-2"><Settings className="w-4 h-4" /> PERFORMANCE</h3>
            <Button size="sm" variant="destructive" onClick={() => setOpen(false)} className="px-2 py-1"><X className="w-4 h-4" /></Button>
          </div>

          <div className="space-y-3 text-sm">
            <ToggleRow label="Post FX" value={settings.postProcessing} onClick={() => toggle('postProcessing')} />
            <ToggleRow label="Particles" value={settings.particles} onClick={() => toggle('particles')} />
            <ToggleRow label="Haptics" value={settings.haptics} onClick={() => toggle('haptics')} />
            <ToggleRow label="Tap Zones" value={settings.tapZones} onClick={() => toggle('tapZones')} />
            <div className="flex items-center justify-between">
              <span>Popup Density</span>
              <select
                value={settings.popupDensity}
                onChange={(e) => setPopupDensity(e.target.value as any)}
                className="bg-card border-2 border-border rounded px-2 py-1 text-xs"
              >
                <option value="full">Full</option>
                <option value="reduced">Reduced</option>
              </select>
            </div>
          </div>
          {onExitGameplay && (
            <Button variant="secondary" className="w-full btn-pixel" onClick={onExitGameplay}>EXIT TO STAGE SELECT</Button>
          )}
          <p className="text-xs text-muted-foreground mt-2">Settings auto-save locally.</p>
        </Card>
      )}
    </div>
  );
};

interface ToggleRowProps { label: string; value: boolean; onClick: () => void; }
const ToggleRow = ({ label, value, onClick }: ToggleRowProps) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between w-full text-xs px-2 py-1 border-2 rounded ${value ? 'border-primary bg-card' : 'border-border bg-muted/20'}`}
  >
    <span>{label}</span>
    <span className={`font-bold ${value ? 'text-primary' : 'text-muted-foreground'}`}>{value ? 'ON' : 'OFF'}</span>
  </button>
);
