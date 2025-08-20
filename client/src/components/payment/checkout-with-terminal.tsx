import { Button } from "@/components/ui/button";
import { useTerminalPayment } from "@/hooks/use-terminal-payment";
import SmartTerminalPaymentDialog from "./smart-terminal-payment-dialog";

interface CheckoutWithTerminalProps {
  locationId: string;
  amount: number;
  tipAmount?: number;
  reference?: string;
  description?: string;
  onPaymentComplete: (result: any) => void;
  onPaymentError: (error: string) => void;
}

export default function CheckoutWithTerminal({
  locationId,
  amount,
  tipAmount = 0,
  reference,
  description,
  onPaymentComplete,
  onPaymentError,
}: CheckoutWithTerminalProps) {
  const {
    isOpen,
    setIsOpen,
    startTerminalPayment,
    paymentOptions,
    handleSuccess,
    handleError,
  } = useTerminalPayment({
    locationId,
    onSuccess: onPaymentComplete,
    onError: onPaymentError,
  });

  const handlePayClick = () => {
    startTerminalPayment({
      amount,
      tipAmount,
      reference,
      description,
    });
  };

  return (
    <>
      <Button onClick={handlePayClick}>
        Pay with Terminal
      </Button>

      {paymentOptions && (
        <SmartTerminalPaymentDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          locationId={locationId}
          amount={paymentOptions.amount}
          tipAmount={paymentOptions.tipAmount}
          reference={paymentOptions.reference}
          description={paymentOptions.description}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}
    </>
  );
}