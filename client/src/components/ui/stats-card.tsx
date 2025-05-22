import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  icon: React.ReactNode;
  iconBgColor: string;
  title: string;
  value: string | number;
  linkText?: string;
  linkHref?: string;
  onClick?: () => void;
};

const StatsCard = ({
  icon,
  iconBgColor,
  title,
  value,
  linkText,
  linkHref,
  onClick
}: StatsCardProps) => {
  return (
    <Card className="stats-card flex flex-col overflow-hidden">
      <CardContent className="p-6 flex-grow">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      {(linkText && (linkHref || onClick)) && (
        <CardFooter className="bg-muted/50 px-6 py-4">
          <div className="text-sm">
            {onClick ? (
              <button 
                onClick={onClick}
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {linkText}
              </button>
            ) : (
              <a 
                href={linkHref} 
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {linkText}
              </a>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default StatsCard;
