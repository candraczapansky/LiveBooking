import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface TipSelectionProps {
  serviceAmount: number;
  onTipChange: (tipAmount: number) => void;
  selectedTip: number;
}

export default function TipSelection({ serviceAmount, onTipChange, selectedTip }: TipSelectionProps) {
  const [customTip, setCustomTip] = useState("");
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null);

  // Predefined tip percentages
  const tipPercentages = [15, 18, 20, 25];

  const handlePercentageClick = (percentage: number) => {
    const tipAmount = serviceAmount * (percentage / 100);
    setSelectedPercentage(percentage);
    setCustomTip("");
    onTipChange(tipAmount);
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    setSelectedPercentage(null);
    
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      onTipChange(numericValue);
    } else if (value === "") {
      onTipChange(0);
    }
  };

  const handleNoTip = () => {
    setSelectedPercentage(null);
    setCustomTip("");
    onTipChange(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="text-center">
            <Label className="text-base font-medium">Add a tip?</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Service amount: {formatCurrency(serviceAmount)}
            </p>
          </div>

          {/* Percentage Tip Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {tipPercentages.map((percentage) => {
              const tipAmount = serviceAmount * (percentage / 100);
              const isSelected = selectedPercentage === percentage;
              
              return (
                <Button
                  key={percentage}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-12 flex flex-col ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => handlePercentageClick(percentage)}
                >
                  <span className="text-sm font-medium">{percentage}%</span>
                  <span className="text-xs opacity-80">{formatCurrency(tipAmount)}</span>
                </Button>
              );
            })}
          </div>

          {/* Custom Tip Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-tip" className="text-sm">Custom tip amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="custom-tip"
                type="number"
                placeholder="0.00"
                value={customTip}
                onChange={(e) => handleCustomTipChange(e.target.value)}
                className="pl-7"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* No Tip Button */}
          <Button
            variant={selectedTip === 0 ? "default" : "outline"}
            className={`w-full ${selectedTip === 0 ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={handleNoTip}
          >
            No tip
          </Button>

          {/* Total Display */}
          <div className="border-t pt-3 mt-4">
            <div className="flex justify-between items-center text-sm">
              <span>Service:</span>
              <span>{formatCurrency(serviceAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Tip:</span>
              <span>{formatCurrency(selectedTip)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-semibold border-t pt-2 mt-2">
              <span>Total:</span>
              <span>{formatCurrency(serviceAmount + selectedTip)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}