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
      <CardContent className="p-3 sm:p-4 lg:p-6 flex-grow">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-2 sm:p-3", iconBgColor)}>
            {icon}
          </div>
          <div className="ml-3 sm:ml-4 lg:ml-5 w-0 flex-1 min-w-0">
            <dl>
              <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      {(linkText && (linkHref || onClick)) && (
        <CardFooter className="bg-muted/50 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
          <div className="text-xs sm:text-sm">
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
