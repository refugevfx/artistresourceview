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
import { Label } from '@/components/ui/label';
import { 
  DepartmentCurveSettings, 
  DistributionCurve,
  CURVE_PRESETS,
  DEFAULT_CURVE_SETTINGS,
  Department
} from '@/types/resource';
import { DraggableCurveEditor } from './DraggableCurveEditor';

interface CurveSettingsDialogProps {
  curves: DepartmentCurveSettings;
  onCurvesChange: (curves: DepartmentCurveSettings) => void;
}

const DEPARTMENTS: Department[] = ['Animation', 'CG', 'Compositing', 'FX'];

const DEPARTMENT_COLORS: Record<Department, string> = {
  Animation: '#4FC3F7',
  CG: '#FF9800',
  Compositing: '#66BB6A',
  FX: '#EF5350',
};

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

  const handleCurveChange = (newCurve: DistributionCurve) => {
    onChange(newCurve);
    setSelectedPreset('custom');
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
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

      {/* Interactive curve editor */}
      <div className="flex justify-center">
        <DraggableCurveEditor
          curve={curve}
          onChange={handleCurveChange}
          color={DEPARTMENT_COLORS[department]}
        />
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

        <div className="p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">How budget filtering works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Active projects:</strong> Shows budgets with status "Awarded", "Estimate", or "Bid Sent"</li>
            <li><strong>Completed projects:</strong> Also includes budgets with status "Completed" for historical viewing</li>
          </ul>
        </div>

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
