import BookingWidget from "./booking-widget";

type BookingWidgetMobileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number;
  overlayColor?: string;
};

export default function BookingWidgetMobile({ open, onOpenChange, userId, overlayColor }: BookingWidgetMobileProps) {
  return (
    <BookingWidget
      open={open}
      onOpenChange={onOpenChange}
      userId={userId}
      overlayColor={overlayColor}
      variant="mobile"
    />
  );
}








