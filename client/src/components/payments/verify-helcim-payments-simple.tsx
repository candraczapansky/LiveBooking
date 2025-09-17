import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyHelcimPaymentsSimple() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Helcim Payment Verification</CardTitle>
        <CardDescription>
          Verify and match Helcim transactions with appointments in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Payment verification system is loading...</p>
      </CardContent>
    </Card>
  );
}



