'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { CostSettings } from '@/types/travel';
import { Settings } from 'lucide-react';

interface SettingsPanelProps {
  settings: CostSettings;
  onUpdateMpg: (mpg: number) => void;
  onUpdatePrice: (price: number) => void;
}

export function SettingsPanel({
  settings,
  onUpdateMpg,
  onUpdatePrice,
}: SettingsPanelProps) {
  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings size={18} />
          Vehicle Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* MPG Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="mpg">Miles Per Gallon (MPG)</Label>
            <span className="text-sm font-semibold">{settings.mpg}</span>
          </div>
          <Slider
            id="mpg"
            min={10}
            max={60}
            step={1}
            value={[settings.mpg]}
            onValueChange={(value) => onUpdateMpg(value[0])}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Typical: Sedan 25-30, SUV 20-25, Truck 15-20
          </p>
        </div>

        {/* Price Input */}
        <div className="space-y-2">
          <Label htmlFor="price">Price Per Gallon</Label>
          <div className="flex items-center gap-2">
            <span className="text-xl">$</span>
            <Input
              id="price"
              type="number"
              min="1"
              max="10"
              step="0.01"
              value={settings.pricePerGallon}
              onChange={(e) => onUpdatePrice(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Current average: $3.50 - $4.00
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
