import { useState } from 'react';
import { Settings2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  DepartmentCurveSettings, 
  DistributionCurve,
  CURVE_PRESETS,
  DEFAULT_CURVE_SETTINGS,
  Department
} from '@/types/resource';

interface CurveSettingsDialogProps {
  curves: DepartmentCurveSettings;
  onCurvesChange: (curves: DepartmentCurveSettings) => void;
}

const DEPARTMENTS: Department[] = ['Animation', 'CG', 'Compositing', 'FX'];

const PRESET_NAMES = {
  flat: 'Flat',
  frontLoaded: 'Front Loaded',
  backLoaded: 'Back Loaded',
  bellCurve: 'Bell Curve',
  rampUp: 'Ramp Up',
};

function CurveEditor({ 
  department, 
  curve, 
  onChange 
}: { 
  department: Department; 
  curve: DistributionCurve; 
  onChange: (curve: DistributionCurve) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== 'custom' && CURVE_PRESETS[preset as keyof typeof CURVE_PRESETS]) {
      onChange([...CURVE_PRESETS[preset as keyof typeof CURVE_PRESETS]] as DistributionCurve);
    }
  };

  const handlePointChange = (index: number, value: number) => {
    const newCurve = [...curve] as DistributionCurve;
    newCurve[index] = value / 100;
    
    // Normalize to ensure sum = 1
    const sum = newCurve.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      const normalized = newCurve.map(v => v / sum) as DistributionCurve;
      onChange(normalized);
    }
    
    setSelectedPreset('custom');
  };

  // Visual representation of the curve
  const maxVal = Math.max(...curve);
  const barHeight = 60;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{department}</Label>
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom</SelectItem>
            {Object.entries(PRESET_NAMES).map(([key, name]) => (
              <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visual curve representation */}
      <div className="flex items-end justify-between gap-1 h-16 px-2">
        {curve.map((value, index) => (
          <div 
            key={index}
            className="flex-1 bg-primary/60 rounded-t transition-all"
            style={{ height: `${(value / maxVal) * barHeight}px` }}
          />
        ))}
      </div>

      {/* Timeline labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>Start</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>End</span>
      </div>

      {/* Sliders for each point */}
      <div className="space-y-3">
        {['Start', '25%', '50%', '75%', 'End'].map((label, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-10">{label}</span>
            <Slider
              value={[curve[index] * 100]}
              onValueChange={([value]) => handlePointChange(index, value)}
              min={1}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {(curve[index] * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CurveSettingsDialog({ curves, onCurvesChange }: CurveSettingsDialogProps) {
  const [localCurves, setLocalCurves] = useState(curves);
  const [open, setOpen] = useState(false);

  const handleDepartmentChange = (dept: Department, curve: DistributionCurve) => {
    setLocalCurves(prev => ({
      ...prev,
      [dept]: curve,
    }));
  };

  const handleSave = () => {
    onCurvesChange(localCurves);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalCurves(DEFAULT_CURVE_SETTINGS);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Distribution Settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resource Distribution Curves</DialogTitle>
          <DialogDescription>
            Configure how man-days are distributed across each episode timeline per department.
            The 5 points represent the distribution at 0%, 25%, 50%, 75%, and 100% of the episode duration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {DEPARTMENTS.map(dept => (
            <CurveEditor
              key={dept}
              department={dept}
              curve={localCurves[dept]}
              onChange={(curve) => handleDepartmentChange(dept, curve)}
            />
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
