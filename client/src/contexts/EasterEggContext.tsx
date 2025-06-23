import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

interface EasterEgg {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

interface EasterEggContextType {
  easterEggs: EasterEgg[];
  totalPoints: number;
  checkEasterEgg: (id: string) => void;
  unlockedCount: number;
}

const EasterEggContext = createContext<EasterEggContextType | undefined>(undefined);

const initialEasterEggs: EasterEgg[] = [
  {
    id: "first_appointment",
    name: "First Steps",
    description: "Created your first appointment",
    icon: "📅",
    points: 10,
    unlocked: false
  },
  {
    id: "staff_explorer",
    name: "Meet the Team",
    description: "Visited the staff management page",
    icon: "👥",
    points: 5,
    unlocked: false
  },
  {
    id: "settings_guru",
    name: "Customization Expert",
    description: "Explored the settings and customization options",
    icon: "⚙️",
    points: 5,
    unlocked: false
  },
  {
    id: "marketing_maven",
    name: "Marketing Maven",
    description: "Discovered the marketing campaign features",
    icon: "📢",
    points: 15,
    unlocked: false
  },
  {
    id: "pos_pioneer",
    name: "Sales Pioneer",
    description: "Explored the Point of Sale system",
    icon: "💰",
    points: 10,
    unlocked: false
  },
  {
    id: "analytics_ace",
    name: "Data Detective",
    description: "Checked out the analytics dashboard",
    icon: "📊",
    points: 10,
    unlocked: false
  },
  {
    id: "profile_perfectionist",
    name: "Profile Perfectionist",
    description: "Updated your profile information",
    icon: "👤",
    points: 5,
    unlocked: false
  },
  {
    id: "theme_master",
    name: "Theme Master",
    description: "Customized your app theme colors",
    icon: "🎨",
    points: 10,
    unlocked: false
  },
  {
    id: "explorer",
    name: "Platform Explorer",
    description: "Visited all major sections of the app",
    icon: "🗺️",
    points: 25,
    unlocked: false
  },
  {
    id: "completionist",
    name: "Completionist",
    description: "Unlocked all other achievements",
    icon: "🏆",
    points: 50,
    unlocked: false
  }
];

export function EasterEggProvider({ children }: { children: ReactNode }) {
  const [easterEggs, setEasterEggs] = useState<EasterEgg[]>(initialEasterEggs);
  const { toast } = useToast();

  useEffect(() => {
    const savedEggs = localStorage.getItem("easterEggs");
    if (savedEggs) {
      try {
        const parsed = JSON.parse(savedEggs);
        setEasterEggs(parsed);
      } catch (error) {
        console.error("Failed to parse saved easter eggs:", error);
      }
    }
  }, []);

  const saveEasterEggs = (eggs: EasterEgg[]) => {
    localStorage.setItem("easterEggs", JSON.stringify(eggs));
  };

  const checkEasterEgg = (id: string) => {
    setEasterEggs(prev => {
      const updated = prev.map(egg => {
        if (egg.id === id && !egg.unlocked) {
          const unlockedEgg = {
            ...egg,
            unlocked: true,
            unlockedAt: new Date()
          };

          // Show toast notification
          toast({
            title: `🎉 Achievement Unlocked!`,
            description: `${unlockedEgg.icon} ${unlockedEgg.name}: ${unlockedEgg.description} (+${unlockedEgg.points} points)`,
            duration: 5000,
          });

          return unlockedEgg;
        }
        return egg;
      });

      // Check for explorer achievement (visited 6+ sections)
      const explorerSections = ["staff_explorer", "settings_guru", "marketing_maven", "pos_pioneer", "analytics_ace"];
      const unlockedSections = updated.filter(egg => explorerSections.includes(egg.id) && egg.unlocked);
      if (unlockedSections.length >= 4 && !updated.find(egg => egg.id === "explorer")?.unlocked) {
        const explorerIndex = updated.findIndex(egg => egg.id === "explorer");
        if (explorerIndex !== -1) {
          updated[explorerIndex] = {
            ...updated[explorerIndex],
            unlocked: true,
            unlockedAt: new Date()
          };
          
          toast({
            title: `🎉 Special Achievement Unlocked!`,
            description: `🗺️ Platform Explorer: You've explored most sections of the app! (+25 points)`,
            duration: 5000,
          });
        }
      }

      // Check for completionist achievement
      const unlockedCount = updated.filter(egg => egg.unlocked && egg.id !== "completionist").length;
      const totalNonCompletionist = updated.filter(egg => egg.id !== "completionist").length;
      if (unlockedCount === totalNonCompletionist && !updated.find(egg => egg.id === "completionist")?.unlocked) {
        const completionistIndex = updated.findIndex(egg => egg.id === "completionist");
        if (completionistIndex !== -1) {
          updated[completionistIndex] = {
            ...updated[completionistIndex],
            unlocked: true,
            unlockedAt: new Date()
          };
          
          toast({
            title: `🏆 ULTIMATE ACHIEVEMENT UNLOCKED!`,
            description: `🏆 Completionist: You've unlocked everything! You're a true platform master! (+50 points)`,
            duration: 8000,
          });
        }
      }

      saveEasterEggs(updated);
      return updated;
    });
  };

  const totalPoints = easterEggs.filter(egg => egg.unlocked).reduce((sum, egg) => sum + egg.points, 0);
  const unlockedCount = easterEggs.filter(egg => egg.unlocked).length;

  return (
    <EasterEggContext.Provider value={{
      easterEggs,
      totalPoints,
      checkEasterEgg,
      unlockedCount
    }}>
      {children}
    </EasterEggContext.Provider>
  );
}

export function useEasterEgg() {
  const context = useContext(EasterEggContext);
  if (context === undefined) {
    throw new Error("useEasterEgg must be used within an EasterEggProvider");
  }
  return context;
}