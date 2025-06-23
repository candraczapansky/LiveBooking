import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Lock } from "lucide-react";
import { useEasterEgg } from "@/contexts/EasterEggContext";

export function AchievementsModal() {
  const { easterEggs, totalPoints, unlockedCount } = useEasterEgg();
  const [isOpen, setIsOpen] = useState(false);

  const progressPercentage = (unlockedCount / easterEggs.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            fontSize: "14px"
          }}
        >
          <Trophy style={{ width: "16px", height: "16px" }} />
          <span>{totalPoints} pts</span>
          <Badge variant="secondary" style={{ fontSize: "12px", padding: "2px 6px" }}>
            {unlockedCount}/{easterEggs.length}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent style={{ maxWidth: "600px", maxHeight: "80vh", overflow: "auto" }}>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Trophy style={{ width: "24px", height: "24px", color: "#f59e0b" }} />
            Achievements
          </DialogTitle>
        </DialogHeader>
        
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontWeight: "600" }}>Progress</span>
            <span style={{ fontSize: "14px", color: "#6b7280" }}>
              {unlockedCount} of {easterEggs.length} unlocked
            </span>
          </div>
          <Progress value={progressPercentage} style={{ height: "8px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <span style={{ fontSize: "14px", color: "#6b7280" }}>Total Points: {totalPoints}</span>
            <span style={{ fontSize: "14px", color: "#6b7280" }}>{Math.round(progressPercentage)}% Complete</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {easterEggs.map((egg) => (
            <Card key={egg.id} style={{
              opacity: egg.unlocked ? 1 : 0.6,
              border: egg.unlocked ? "2px solid #10b981" : "1px solid #e5e7eb"
            }}>
              <CardContent style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    fontSize: "24px",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: egg.unlocked ? "#f0fdf4" : "#f9fafb",
                    borderRadius: "8px",
                    border: egg.unlocked ? "2px solid #10b981" : "1px solid #e5e7eb"
                  }}>
                    {egg.unlocked ? egg.icon : <Lock style={{ width: "20px", height: "20px", color: "#9ca3af" }} />}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <h3 style={{ 
                        fontWeight: "600", 
                        fontSize: "16px",
                        color: egg.unlocked ? "#111827" : "#6b7280"
                      }}>
                        {egg.unlocked ? egg.name : "???"}
                      </h3>
                      <Badge 
                        variant={egg.unlocked ? "default" : "secondary"}
                        style={{ fontSize: "12px", padding: "2px 6px" }}
                      >
                        {egg.points} pts
                      </Badge>
                    </div>
                    <p style={{ 
                      fontSize: "14px", 
                      color: "#6b7280",
                      margin: 0
                    }}>
                      {egg.unlocked ? egg.description : "Complete this action to unlock"}
                    </p>
                    {egg.unlocked && egg.unlockedAt && (
                      <p style={{ 
                        fontSize: "12px", 
                        color: "#9ca3af",
                        margin: "4px 0 0 0"
                      }}>
                        Unlocked: {new Date(egg.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  {egg.unlocked && (
                    <Award style={{ width: "20px", height: "20px", color: "#10b981" }} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}